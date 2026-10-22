// icerik/hava.json dosyasını dunya/takvim.md'deki hava akışına göre üretir.
// Çalıştırma: node araclar/hava-uret.mjs
// Elle düzeltilmesi gereken günler aşağıdaki OZEL tablosundadır.

import { writeFileSync } from 'node:fs';
import { tarihCoz, gunNo } from '../js/motor/tarih.js';

const GUN_SAYISI = 115;

// Takvim tablosundan sıcaklıklar (gündüz, gece) — doğrusal ara değer.
const SICAKLIK = [
  [0, 30, 21],
  [17, 26, 17],
  [48, 20, 12],
  [78, 15, 8],
  [110, 13, 6],
];

function sicaklik(g) {
  for (let i = 1; i < SICAKLIK.length; i++) {
    const [g1, a1, b1] = SICAKLIK[i - 1];
    const [g2, a2, b2] = SICAKLIK[i];
    if (g <= g2) {
      const o = (g - g1) / (g2 - g1);
      return [a1 + (a2 - a1) * o, b1 + (b2 - b1) * o];
    }
  }
  return SICAKLIK[SICAKLIK.length - 1].slice(1);
}

// Tekrarlanabilir küçük oynama (her çalıştırmada aynı sonuç).
function oynama(g, tohum) {
  const x = Math.sin(g * 12.9898 + tohum * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const g = (metin) => gunNo(tarihCoz(metin));

// Elle belirlenen günler: [ilk gün, son gün, durum, sıcaklık farkı]
const OZEL = [
  [g('3 Ekim'), g('3 Ekim'), 'yağmurlu', -3],
  [g('4 Ekim'), g('4 Ekim'), 'bulutlu', -2],
  [g('20 Ekim'), g('22 Ekim'), 'rüzgârlı', -1],
  [g('24 Ekim'), g('24 Ekim'), 'rüzgârlı', 0],
  [g('27 Ekim'), g('2 Kasım'), 'açık', +4],
  [g('3 Kasım'), g('6 Kasım'), 'rüzgârlı', -2],
  [g('12 Kasım'), g('13 Kasım'), 'yağmurlu', -2],
  [g('24 Kasım'), g('30 Kasım'), 'yağmurlu', -2],
  [g('3 Aralık'), g('3 Aralık'), 'bulutlu', -1],
  [g('4 Aralık'), g('4 Aralık'), 'fırtına', -2],
  [g('5 Aralık'), g('5 Aralık'), 'fırtına', -3],
  [g('6 Aralık'), g('6 Aralık'), 'bulutlu', -2],
  [g('17 Aralık'), g('19 Aralık'), 'yağmurlu', -1],
  [g('31 Aralık'), g('1 Ocak'), 'açık', -2],
];

function durumSec(gun) {
  const o = oynama(gun, 1);
  if (gun < g('1 Ekim')) return o < 0.85 ? 'açık' : 'az bulutlu';
  if (gun < g('1 Kasım')) return o < 0.55 ? 'açık' : o < 0.8 ? 'az bulutlu' : o < 0.92 ? 'bulutlu' : 'rüzgârlı';
  if (gun < g('1 Aralık')) return o < 0.3 ? 'açık' : o < 0.55 ? 'az bulutlu' : o < 0.75 ? 'bulutlu' : o < 0.88 ? 'rüzgârlı' : 'yağmurlu';
  return o < 0.25 ? 'açık' : o < 0.45 ? 'az bulutlu' : o < 0.7 ? 'bulutlu' : o < 0.82 ? 'rüzgârlı' : 'yağmurlu';
}

const gunler = [];
for (let gun = 0; gun < GUN_SAYISI; gun++) {
  let durum = durumSec(gun);
  let fark = Math.round((oynama(gun, 2) - 0.5) * 2);
  for (const [bas, son, d, f] of OZEL) {
    if (gun >= bas && gun <= son) { durum = d; fark = f; }
  }
  if (durum === 'yağmurlu' || durum === 'fırtına') fark = Math.min(fark, -1);
  const [gunduz, gece] = sicaklik(gun);
  gunler.push({ gun, durum, gunduz: Math.round(gunduz + fark), gece: Math.round(gece + fark / 2) });
}

writeFileSync(new URL('../icerik/hava.json', import.meta.url), JSON.stringify(gunler) + '\n');
console.log(`${gunler.length} gün yazıldı.`);
