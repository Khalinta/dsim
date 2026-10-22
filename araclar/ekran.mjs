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

await sayfa.goto(`http://localhost:${PORT}/`);
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
await cek('sahne-acilis');
await sayfa.locator('#ekran-sahne .sahne-kaydirma').evaluate((d) => { d.scrollTop = d.scrollHeight; });
await cek('sahne-acilis-secimler');
await tikla('#ekran-sahne .secim', 'Gitmiyorum');
await sayfa.waitForTimeout(1500);
await cek('sahne-gitmiyorum');
await tikla('#ekran-sahne .secim', 'üniversiteye');
await sayfa.waitForTimeout(2200);
await sayfa.locator('#ekran-sahne .sahne-kaydirma').evaluate((d) => { d.scrollTop = d.scrollHeight; });
await cek('sahne-burak');
if (await sayfa.locator('.sahne-telefon-dugmesi.gorunur').count()) {
  await tikla('.sahne-telefon-dugmesi');
  await sayfa.waitForTimeout(1500);
  await sayfa.locator('#ekran-sahne .sahne-kaydirma').evaluate((d) => { d.scrollTop = d.scrollHeight; });
  await cek('sahne-telefona-bakti');
}
await tikla('#ekran-sahne .secim', 'Onda');
await sayfa.waitForSelector('.sahne-son .dugme', { timeout: 8000 });
await sayfa.locator('#ekran-sahne .sahne-kaydirma').evaluate((d) => { d.scrollTop = d.scrollHeight; });
await cek('sahne-son');
await tikla('.sahne-son .dugme');
await sayfa.waitForSelector('#ekran-kilit.aktif');
await cek('kilit-sabah');
await tikla('.telefon-dugmesi');
await sayfa.waitForSelector('#ekran-telefon.aktif');
await cek('telefon-liste');
await tikla('.sohbet-satiri', 'Onur');
await cek('sohbet-onur');
await tikla('.cevap', 'saat kaçta');
await sayfa.waitForTimeout(4500);
await cek('sohbet-onur-cevap');
await tikla('.geri');
await tikla('.sohbet-satiri', 'Babam');
await cek('sohbet-babam');
await tikla('.geri');
await tikla('.sohbet-satiri', 'Annem');
await cek('sohbet-annem');
await tikla('.cevap', 'selam');
await sayfa.waitForTimeout(1600);
await cek('sohbet-annem-yaziyor');
await sayfa.waitForTimeout(7000);
await cek('sohbet-annem-cevap');
await tikla('.geri');
await tikla('.sekme', 'Ayarlar');
await cek('ayarlar');
await tikla('.kutu-satiri', 'Kayıt kodunu al');
await sayfa.waitForTimeout(700);
await cek('kayit-kodu');
await sayfa.mouse.click(195, 60);
await sayfa.waitForTimeout(500);
await tikla('.sekme', 'Kilitle');
await sayfa.waitForSelector('#ekran-kilit.aktif');

// Söküm eylemi: uzun bir sahne, sonra akşam.
await tikla('.eylem', 'sökümde');
await sayfa.waitForSelector('#ekran-sahne .secim', { timeout: 8000 });
await sayfa.waitForTimeout(1500);
await cek('sokum');
await tikla('#ekran-sahne .secim', 'kalıyorum');
await sayfa.waitForTimeout(1500);
await tikla('#ekran-sahne .secim');
await sayfa.waitForSelector('.sahne-son .dugme', { timeout: 8000 });
await tikla('.sahne-son .dugme');
await sayfa.waitForSelector('#ekran-kilit.aktif');
await cek('kilit-aksam');
await tikla('.eylem', 'Kordona');
await sayfa.waitForSelector('#ekran-sahne .secim', { timeout: 8000 });
await sayfa.waitForTimeout(1200);
await cek('kordon-gunbatimi');
await tikla('#ekran-sahne .secim');
await sayfa.waitForSelector('.sahne-son .dugme', { timeout: 8000 });
await tikla('.sahne-son .dugme');
await sayfa.waitForSelector('#ekran-kilit.aktif');
for (let i = 0; i < 6; i++) {
  const oyalan = sayfa.locator('.eylem', { hasText: 'oyalan' });
  if (!(await oyalan.count())) break;
  await oyalan.first().click();
  await sayfa.waitForTimeout(200);
}
await cek('kilit-gece');
await tikla('.telefon-dugmesi');
await cek('telefon-gece');
await tikla('.sekme', 'Kilitle');
await tikla('.eylem', 'Uyu');
await sayfa.waitForTimeout(600);
await cek('kilit-ertesi-sabah');

// Taşınma: rehbere kaydetme ve gündüz sahnesi.
for (let i = 0; i < 4; i++) {
  if (await sayfa.locator('.eylem', { hasText: 'taşın' }).count()) break;
  await tikla('.eylem', 'oyalan');
  await sayfa.waitForTimeout(200);
}
await tikla('.eylem', 'taşın');
await sayfa.waitForSelector('#ekran-sahne .secim', { timeout: 8000 });
await sayfa.waitForTimeout(1200);
await cek('tasinma');
for (let i = 0; i < 3; i++) {
  await tikla('#ekran-sahne .secim');
  await sayfa.waitForTimeout(1600);
}
await sayfa.waitForSelector('.sahne-rehber', { timeout: 8000 });
await sayfa.locator('#ekran-sahne .sahne-kaydirma').evaluate((d) => { d.scrollTop = d.scrollHeight; });
await cek('rehber-kaydi');

console.log(hatalar.length ? `Tarayıcı hataları:\n${hatalar.join('\n')}` : 'Tarayıcı hatası yok.');
await tarayici.close();
sunucu.close();
