// Ekran görüntüsü aracı: oyunu iPhone boyutunda açar, romanı ilk seçeneklerle okur,
// her yeni durumun görüntüsünü ekran/ klasörüne kaydeder ve tarayıcı hatalarını yazdırır.
// Çalıştırma: node araclar/ekran.mjs            (oyunun kendi içeriği, ilk 2 bölüm)
//             node araclar/ekran.mjs 5          (ilk 5 bölüm)
//             node araclar/ekran.mjs roman      (test/ornek/ deneme romanı, baştan sona; ekran/roman/)
// Playwright gerekir (geliştirme ortamında hazır; oyunun kendisi kullanmaz).

import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { sunucuAc } from './sunucu.mjs';

const ROMAN = process.argv[2] === 'roman';
const BOLUM_SINIRI = ROMAN ? Infinity : Number(process.argv[2] || 2);

function playwrightBul() {
  for (const yer of [import.meta.url, '/opt/node-tools/node_modules/']) {
    try { return createRequire(yer)('playwright'); } catch { /* sıradaki */ }
  }
  throw new Error('Playwright bulunamadı.');
}

const { chromium } = playwrightBul();
const PORT = 8091;
const sunucu = await sunucuAc(PORT);
const cikti = new URL(ROMAN ? '../ekran/roman/' : '../ekran/', import.meta.url).pathname;
rmSync(cikti, { recursive: true, force: true });
mkdirSync(cikti, { recursive: true });

const tarayici = await chromium.launch();
const baglam = await tarayici.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'tr-TR',
  serviceWorkers: 'block',
});
const sayfa = await baglam.newPage();
if (ROMAN) {
  // İçerik istekleri deneme romanına yönlendirilir.
  const ornek = new URL('../test/ornek/', import.meta.url);
  await sayfa.route('**/icerik/**', (r) => {
    const ad = new URL(r.request().url()).pathname.split('/icerik/')[1];
    try { r.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: readFileSync(new URL(ad, ornek)) }); } catch { r.fulfill({ status: 404, body: 'yok' }); }
  });
}
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

const aktif = (ekran) => sayfa.locator(`#ekran-${ekran}.aktif`).count();
const kaydir = () => sayfa.locator('#ekran-sahne .sahne-kaydirma').evaluate((d) => { d.scrollTop = d.scrollHeight; });

// Romanı ilk seçeneklerle okur; her yeni durumun görüntüsünü bir kez alır. Bölüm sınırını aşınca durur.
async function romanOyna() {
  const gorulen = new Set();
  const bir = async (ad) => { if (!gorulen.has(ad)) { gorulen.add(ad); await cek(ad); } };
  await sayfa.goto(`http://localhost:${PORT}/`);
  await sayfa.waitForSelector('#ekran-giris.aktif');
  await sayfa.evaluate(() => localStorage.clear());
  await sayfa.reload();
  await sayfa.waitForTimeout(2200);
  await tikla('#ekran-giris .dugme.birincil');
  await sayfa.waitForTimeout(500);
  await sayfa.fill('#ad', 'kaan');
  await tikla('.ad-sor .dugme');
  await sayfa.waitForSelector('#ekran-kilit.aktif');
  await sayfa.waitForTimeout(1600);
  let yenidenYuklendi = false;
  let arsivAcildi = false;
  for (let adim = 0; adim < 3000; adim++) {
    await sayfa.waitForTimeout(500);
    if (await aktif('kilit')) {
      const dugme = sayfa.locator('.perde-alt .dugme.birincil');
      const metin = await sayfa.locator('#ekran-kilit').innerText();
      if (/Son\.|Şimdilik/.test(metin)) { await cek('roman-sonu'); return; }
      const no = Number((metin.match(/bölüm (\d+)/iu) || [0, 0])[1]);
      if (no > BOLUM_SINIRI) return;
      await bir(`perde-bolum-${no}`);
      await dugme.click();
      await sayfa.waitForTimeout(900);
      continue;
    }
    if (await aktif('telefon')) {
      if (await sayfa.locator('.telefonu-birak').count()) { await bir('telefon-birak'); await tikla('.telefonu-birak'); await sayfa.waitForTimeout(900); await bir('yazisma-izi'); continue; }
      const cevaplar = sayfa.locator('.canli-alan .cevap');
      if (await cevaplar.count()) {
        await bir('canli-yazisma-secim');
        if (!yenidenYuklendi) {
          // Yazışmanın ortasında uygulama kapanıp açılırsa: giriş → perde → telefon aynı seçimle.
          yenidenYuklendi = true;
          await sayfa.reload();
          await sayfa.waitForTimeout(2600);
          await tikla('#ekran-giris .dugme.birincil');
          await sayfa.waitForTimeout(1500);
          await cek('perde-kaldigin-yer');
          await tikla('.perde-alt .dugme.birincil');
          await sayfa.waitForTimeout(1200);
          await cek('yeniden-acilinca-telefon');
          continue;
        }
        await cevaplar.first().click();
        await sayfa.waitForTimeout(700);
        if (await sayfa.locator('.yaziyor-balonu').count()) await bir('canli-yaziyor');
        await sayfa.waitForTimeout(2500);
        await bir('canli-cevap-geldi');
        continue;
      }
      if (await sayfa.locator('.sekme', { hasText: 'Hikâyeye dön' }).count()) { await tikla('.sekme', 'Hikâyeye dön'); continue; }
      if (await sayfa.locator('.geri').count()) { await tikla('.geri'); continue; }
      continue;
    }
    if (await aktif('sahne')) {
      await kaydir();
      if (await sayfa.locator('.telefon-titriyor').count()) { await bir('telefonuna-bak'); await tikla('.telefon-titriyor'); await sayfa.waitForTimeout(1200); await bir('canli-ilk-mesaj'); continue; }
      if (await sayfa.locator('.sahne-son .dugme').count()) { await bir(`bolum-sonu-${gorulen.size}`); await tikla('.sahne-son .dugme'); continue; }
      if (await sayfa.locator('.sahne-rehber button').count()) { await bir('sayfada-rehber'); await sayfa.locator('.sahne-rehber button').first().click(); continue; }
      const secimler = sayfa.locator('#ekran-sahne .secim');
      if (await secimler.count()) {
        if (await sayfa.locator('.gun-ayraci-kitap').count()) await bir('gun-ayraci');
        await bir(`secim-${await secimler.count()}-${gorulen.size}`);
        if (!arsivAcildi && await sayfa.locator('.sahne-telefon-dugmesi.gorunur').count()) {
          arsivAcildi = true;
          await tikla('.sahne-telefon-dugmesi');
          await sayfa.waitForTimeout(600);
          await cek('arsiv-liste');
          await sayfa.locator('.sohbet-satiri').last().click();
          await sayfa.waitForTimeout(400);
          await cek('arsiv-sohbet');
          await tikla('.geri');
          await tikla('.sekme', 'Hikâyeye dön');
          await sayfa.waitForTimeout(800);
          continue;
        }
        await secimler.first().click();
      }
    }
  }
  console.log('Roman sonuna varılamadı.');
}

await romanOyna();
console.log(hatalar.length ? `Tarayıcı hataları:\n${hatalar.join('\n')}` : 'Tarayıcı hatası yok.');
await tarayici.close();
sunucu.close();
