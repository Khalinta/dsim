import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diskIcerik, yasakliKaliplar } from '../araclar/ortak.mjs';
import { denetle } from '../js/motor/denetim.js';
import { dizinCoz } from '../js/motor/yukleme.js';
import { oyna } from '../araclar/bot.mjs';
import { SURUM } from '../js/surum.js';

const KOK = fileURLToPath(new URL('../', import.meta.url));
const icerik = await diskIcerik();

function dosyalar(klasor, uzanti) {
  const sonuc = [];
  for (const ad of readdirSync(join(KOK, klasor))) {
    const yol = join(KOK, klasor, ad);
    if (statSync(yol).isDirectory()) sonuc.push(...dosyalar(relative(KOK, yol), uzanti));
    else if (!uzanti || ad.endsWith(uzanti)) sonuc.push(relative(KOK, yol));
  }
  return sonuc;
}

test('içerik: denetimden hatasız geçer', () => {
  const { hatalar } = denetle(icerik, { yasakliKaliplar: yasakliKaliplar() });
  assert.deepEqual(hatalar, []);
});

test('içerik: her .dsim dosyası dizin.txt\'de', () => {
  const dizin = new Set(dizinCoz(readFileSync(join(KOK, 'icerik/dizin.txt'), 'utf8')));
  for (const d of dosyalar('icerik', '.dsim')) {
    assert.ok(dizin.has(relative('icerik', d)), `dizin.txt'de yok: ${d}`);
  }
});

test('içerik: kişilerin renkleri geçerli', () => {
  for (const [ad, k] of Object.entries(icerik.kisiler)) {
    if (k.renk) assert.match(k.renk, /^#[0-9a-f]{6}$/i, ad);
  }
});

test('içerik: hava bütün oyun günlerini kapsıyor', () => {
  assert.equal(icerik.hava.length, 115);
  icerik.hava.forEach((g, i) => assert.equal(g.gun, i));
});

test('oynanış: farklı yollardan oynanınca takılmadan içerik sonuna varır', () => {
  const kosular = [
    { strateji: 'ilk' }, { strateji: 'son' },
    ...Array.from({ length: 12 }, (_, i) => ({ strateji: 'rastgele', tohum: i + 1 })),
    ...Array.from({ length: 4 }, (_, i) => ({ strateji: 'rastgele', tohum: 50 + i, eylemIstegi: 0.05 })),
  ];
  for (const k of kosular) {
    const { oyun } = oyna(icerik, k);
    assert.ok(oyun.bittiMi(), JSON.stringify(k));
  }
});

test('yayın: servis çalışanı bütün dosyaları biliyor ve sürümler aynı', () => {
  const sw = readFileSync(join(KOK, 'sw.js'), 'utf8');
  const swSurum = sw.match(/const SURUM = '([^']+)'/)[1];
  assert.equal(swSurum, SURUM, 'sw.js ve js/surum.js sürümleri farklı');
  const liste = new Set([...sw.matchAll(/^\s*'([^']+)',$/gm)].map((m) => m[1]));
  const gerekli = [
    'index.html', 'manifest.webmanifest',
    ...dosyalar('css'), ...dosyalar('js'), ...dosyalar('fontlar', '.woff2'), ...dosyalar('ikonlar'),
    'icerik/dizin.txt', 'icerik/kisiler.json', 'icerik/oyun.json', 'icerik/hava.json',
  ];
  const tarayicidaKullanilmayan = new Set(['js/motor/denetim.js']);
  for (const d of gerekli) if (!tarayicidaKullanilmayan.has(d)) assert.ok(liste.has(d), `sw.js listesinde yok: ${d}`);
  for (const d of liste) if (d !== './') assert.ok(statSync(join(KOK, d)).isFile(), `sw.js listesindeki dosya yok: ${d}`);
});
