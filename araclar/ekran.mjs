// Ekran görüntüsü aracı: oyunu iPhone boyutunda açar, bir yol boyunca tıklar,
// ekran/ klasörüne görüntüler kaydeder ve tarayıcı hatalarını yazdırır.
// Çalıştırma: node araclar/ekran.mjs
// Playwright gerekir (geliştirme ortamında hazır; oyunun kendisi kullanmaz).

import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { sunucuAc } from './sunucu.mjs';

function playwrightBul() {
  for (const yer of [import.meta.url, '/opt/node-tools/node_modules/']) {
    try { return createRequire(yer)('playwright'); } catch { /* sıradaki */ }
  }
  throw new Error('Playwright bulunamadı.');
}

const { chromium } = playwrightBul();
const PORT = 8091;
const sunucu = await sunucuAc(PORT);
const cikti = new URL('../ekran/', import.meta.url).pathname;
mkdirSync(cikti, { recursive: true });

const tarayici = await chromium.launch();
const baglam = await tarayici.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'tr-TR',
  serviceWorkers: 'block',
});
const sayfa = await baglam.newPage();
const hatalar = [];
sayfa.on('pageerror', (e) => hatalar.push(`sayfa: ${e.message}`));
sayfa.on('console', (m) => { if (m.type() === 'error') hatalar.push(`konsol: ${m.text()}`); });
sayfa.on('requestfailed', (r) => hatalar.push(`istek: ${r.url()} (${r.failure()?.errorText})`));
sayfa.on('response', (r) => { if (r.status() >= 400) hatalar.push(`istek: ${r.url()} (${r.status()})`); });

let sira = 0;
const cek = async (ad) => {
  sira += 1;
  await sayfa.waitForTimeout(450);
  await sayfa.screenshot({ path: `${cikti}${String(sira).padStart(2, '0')}-${ad}.png` });
};
const tikla = async (secici, metin) => {
  const hedef = metin ? sayfa.locator(secici, { hasText: metin }).first() : sayfa.locator(secici).first();
  await hedef.click();
};

const kaydir = () => sayfa.locator('#ekran-sahne .sahne-kaydirma').evaluate((d) => { d.scrollTop = d.scrollHeight; });
const aktif = (ekran) => sayfa.locator(`#ekran-${ekran}.aktif`).count();

// Açık sahneyi sonuna kadar oynar: tercih listesindeki ilk eşleşen seçeneği, yoksa ilk seçeneği seçer.
// ekranAl: { 'metin parçası': 'dosya-adı' } — o metin ekranda görününce görüntü alır.
async function sahneyiOyna(tercihler = [], ekranAl = {}, telefonaBak = false) {
  for (let adim = 0; adim < 60; adim++) {
    await sayfa.waitForTimeout(700);
    await kaydir();
    const metin = await sayfa.locator('#ekran-sahne').innerText();
    for (const [parca, ad] of Object.entries(ekranAl)) {
      if (metin.includes(parca)) { await cek(ad); delete ekranAl[parca]; }
    }
    if (await sayfa.locator('.sahne-son .dugme').count()) {
      await tikla('.sahne-son .dugme');
      await sayfa.waitForTimeout(500);
      return;
    }
    if (await sayfa.locator('.sahne-rehber .secim, .sahne-rehber button').count()) {
      await sayfa.locator('.sahne-rehber .secim, .sahne-rehber button').first().click();
      continue;
    }
    const secimler = sayfa.locator('#ekran-sahne .secim');
    const n = await secimler.count();
    if (!n) continue;
    if (telefonaBak && (await sayfa.locator('.sahne-telefon-dugmesi.gorunur').count())) {
      telefonaBak = false;
      await tikla('.sahne-telefon-dugmesi');
      await sayfa.waitForSelector('#ekran-telefon.aktif');
      await cek('sahne-sirasinda-telefon');
      await tikla('.sekme', 'Sahneye dön');
      await sayfa.waitForSelector('#ekran-sahne.aktif');
      await sayfa.waitForTimeout(600);
      await cek('sahneye-donus');
      continue;
    }
    let secildi = false;
    for (const t of tercihler) {
      const aday = sayfa.locator('#ekran-sahne .secim', { hasText: t });
      if (await aday.count()) { await aday.first().click(); secildi = true; break; }
    }
    if (!secildi) await secimler.first().click();
  }
}

await sayfa.goto(`http://localhost:${PORT}/`);
await sayfa.waitForSelector('#ekran-giris.aktif');
await sayfa.evaluate(() => localStorage.clear());
await sayfa.reload();
await sayfa.waitForSelector('#ekran-giris.aktif');
await sayfa.waitForTimeout(2200);
await cek('giris');
await tikla('#ekran-giris .dugme.birincil');
await sayfa.waitForTimeout(600);
await sayfa.fill('#ad', 'kaan');
await cek('ad');
await tikla('.ad-sor .dugme');
await sayfa.waitForTimeout(500);
await cek('perde');
await sayfa.waitForSelector('#ekran-sahne .secim', { timeout: 8000 });
await sayfa.waitForTimeout(1200);
await cek('prolog-acilis');

// Prolog: kalan yolu (öpüşmeden, numara alarak), telefona bir kez bakılır.
await sahneyiOyna(
  ['Dört', 'iade yok', 'Gitmiyorum', 'Kaan', 'Ritüelin adı', 'ekmek kuyruğunda bakarım'],
  { 'Sen ne zaman gidiyorsun': 'prolog-soru', 'Yeni kişi': 'rehber-kaydi' },
  true,
);
// Ertesi sabahın sahnesi (açılış) kendiliğinden gelir.
if (await aktif('sahne')) { await sayfa.waitForTimeout(800); await cek('sabah-sahnesi'); await sahneyiOyna(); }
await sayfa.waitForSelector('#ekran-kilit.aktif', { timeout: 8000 });
await cek('kilit-sabah');
await tikla('.telefon-dugmesi');
await sayfa.waitForSelector('#ekran-telefon.aktif');
await cek('telefon-liste');
await tikla('.sohbet-satiri', 'Onur');
await cek('sohbet-onur');
await tikla('.geri');
await tikla('.sekme', 'Rehber');
await sayfa.waitForTimeout(400);
await cek('rehber');
await tikla('.sekme', 'Ayarlar');
await cek('ayarlar');
await tikla('.kutu-satiri', 'Kayıt kodunu al');
await sayfa.waitForTimeout(700);
await cek('kayit-kodu');
await sayfa.mouse.click(195, 60);
await sayfa.waitForTimeout(500);
await tikla('.sekme', 'Kilitle');
await sayfa.waitForSelector('#ekran-kilit.aktif');

// Günler geçer: Defne yazarsa cevap verilir; kilit ekranında randevu kartı görününce durulur.
let randevuCekildi = false;
for (let adim = 0; adim < 90 && !randevuCekildi; adim++) {
  if (await aktif('sahne')) { await sahneyiOyna(['İşten çıkınca', 'gelirim']); continue; }
  if (!(await aktif('kilit'))) { if (await sayfa.locator('.geri').count()) await tikla('.geri'); await tikla('.sekme', 'Kilitle'); continue; }
  if (await sayfa.locator('.randevu').count()) {
    await cek('kilit-randevu');
    randevuCekildi = true;
    break;
  }
  if (await sayfa.locator('.bildirim', { hasText: 'Defne' }).count()) {
    await tikla('.bildirim', 'Defne');
    await sayfa.waitForSelector('#ekran-telefon.aktif');
    await sayfa.waitForTimeout(800);
    if (await sayfa.locator('.cevap').count()) {
      await cek('sohbet-defne');
      const tercih = sayfa.locator('.cevap', { hasText: 'gelirim' });
      await ((await tercih.count()) ? tercih.first() : sayfa.locator('.cevap').first()).click();
      await sayfa.waitForTimeout(3000);
      await cek('sohbet-defne-cevap');
    }
    if (await sayfa.locator('.geri').count()) await tikla('.geri');
    await tikla('.sekme', 'Kilitle');
    continue;
  }
  const eylemler = sayfa.locator('.eylem');
  const yazili = eylemler.filter({ hasNotText: /^\s*(Bekle|Uyu)\s*$/ });
  if (await yazili.count()) { await yazili.first().click(); continue; }
  const uyu = sayfa.locator('.eylem', { hasText: 'Uyu' });
  if (await uyu.count()) { await uyu.first().click(); continue; }
  await eylemler.last().click();
  await sayfa.waitForTimeout(200);
}

console.log(hatalar.length ? `Tarayıcı hataları:\n${hatalar.join('\n')}` : 'Tarayıcı hatası yok.');
console.log(randevuCekildi ? 'Randevu kartı çekildi.' : 'Randevu kartı görülmedi.');
await tarayici.close();
sunucu.close();
