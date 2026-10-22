// Okuma aracı: oyunu farklı yollardan otomatik oynatır, ortaya çıkan bütün metni
// okuma/ klasörüne okunabilir dosyalar olarak döker ve bir özet çıkarır.
//
// Çalıştırma:  node araclar/oku.mjs            (10 rastgele oyun + "hep ilk" + "hep son")
//              node araclar/oku.mjs 40          (40 rastgele oyun)

import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { diskIcerik, yasakliKaliplar, KOK } from './ortak.mjs';
import { oyna } from './bot.mjs';
import { denetle } from '../js/motor/denetim.js';

const rastgeleSayisi = Number(process.argv[2] || 10);
const icerik = await diskIcerik();
const cikti = new URL('okuma/', KOK);
rmSync(cikti, { recursive: true, force: true });
mkdirSync(cikti, { recursive: true });

const kosular = [
  { ad: 'hep-ilk', strateji: 'ilk', tohum: 1 },
  { ad: 'hep-son', strateji: 'son', tohum: 1 },
  ...Array.from({ length: 4 }, (_, i) => ({ ad: `tembel-${i + 1}`, strateji: 'rastgele', tohum: 101 + i, eylemIstegi: 0.05 })),
  ...Array.from({ length: rastgeleSayisi }, (_, i) => ({ ad: `rastgele-${String(i + 1).padStart(2, '0')}`, strateji: 'rastgele', tohum: i + 1 })),
];

const gorulenParcalar = new Map();
const ozet = [];
const hatalar = [];

for (const k of kosular) {
  try {
    const { oyun, dokum, gorulenSatirlar } = oyna(icerik, k);
    writeFileSync(new URL(`dokum-${k.ad}.md`, cikti), `# Döküm: ${k.ad}\n${dokum}\n`);
    for (const id of Object.keys(oyun.durum.gorulen)) gorulenParcalar.set(id, (gorulenParcalar.get(id) || 0) + 1);

    // Aynı oyunda aynı satır iki kez göründü mü?
    const sayac = new Map();
    for (const s of gorulenSatirlar) sayac.set(s, (sayac.get(s) || 0) + 1);
    const tekrarlar = [...sayac].filter(([s, n]) => n > 1 && s.length > 12);
    ozet.push(`- **${k.ad}**: ${Object.keys(oyun.durum.gorulen).length} parça görüldü, ${gorulenSatirlar.length} satır metin` +
      (tekrarlar.length ? `, **${tekrarlar.length} tekrar**: ${tekrarlar.map(([s, n]) => `"${s}" ×${n}`).join('; ')}` : ''));
  } catch (e) {
    hatalar.push(`${k.ad}: ${e.message}`);
  }
}

// İçerikteki aynı cümleler (farklı yerlerde birebir aynı yazılmış satırlar).
const satirYerleri = new Map();
for (const p of icerik.parcalar.values()) {
  p.listeler.forEach((liste) => liste.forEach((d) => {
    if ((d.t === 'anlatı' || d.t === 'söz') && d.metin.length > 15 && !d.metin.startsWith('[')) {
      const yerler = satirYerleri.get(d.metin) || [];
      yerler.push(`${p.dosya}:${d.no}`);
      satirYerleri.set(d.metin, yerler);
    }
  }));
}
const ayniSatirlar = [...satirYerleri].filter(([, y]) => y.length > 1);

const { hatalar: denetimHatalari, uyarilar } = denetle(icerik, { yasakliKaliplar: yasakliKaliplar() });
const hicGorulmeyen = [...icerik.parcalar.values()].filter((p) => p.tur !== 'tepki' && !gorulenParcalar.has(p.kimlik)).map((p) => `${p.kimlik} (${p.dosya})`);

const rapor = [
  '# Okuma özeti',
  '',
  `${kosular.length} oyun oynandı. ${icerik.parcalar.size} parça var.`,
  '',
  '## Oyunlar',
  ...ozet,
  '',
  '## Oynanırken çıkan hatalar',
  ...(hatalar.length ? hatalar.map((h) => `- ${h}`) : ['- yok']),
  '',
  '## Denetim',
  ...(denetimHatalari.length ? denetimHatalari.map((h) => `- ${h}`) : ['- hata yok']),
  ...uyarilar.map((u) => `- uyarı: ${u}`),
  '',
  '## Hiçbir oyunda görülmeyen parçalar',
  ...(hicGorulmeyen.length ? hicGorulmeyen.map((p) => `- ${p}`) : ['- yok']),
  '',
  '## İçerikte birebir aynı yazılmış satırlar',
  ...(ayniSatirlar.length ? ayniSatirlar.map(([s, y]) => `- "${s}" → ${y.join(', ')}`) : ['- yok']),
  '',
];
writeFileSync(new URL('ozet.md', cikti), rapor.join('\n'));
console.log(rapor.join('\n'));
console.log(`Dökümler: okuma/ klasöründe.`);
if (hatalar.length || denetimHatalari.length) process.exitCode = 1;
