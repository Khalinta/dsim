// Okuma aracı: oyunu farklı yollardan otomatik oynatır, ortaya çıkan bütün metni
// okuma/ klasörüne okunabilir dosyalar olarak döker ve bir özet çıkarır.
//
// Çalıştırma:  node araclar/oku.mjs            (10 rastgele oyun + "hep ilk" + "hep son" + özenli okumalar)
//              node araclar/oku.mjs 40          (40 rastgele oyun)
//              node araclar/oku.mjs --icerik test/ornek   (başka bir içerik klasörü)

import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { diskIcerik, yasakliKaliplar, KOK } from './ortak.mjs';
import { oyna } from './bot.mjs';
import { denetle } from '../js/motor/denetim.js';

const argumanlar = process.argv.slice(2);
const klasorSirasi = argumanlar.indexOf('--icerik');
const klasor = klasorSirasi >= 0 ? argumanlar.splice(klasorSirasi, 2)[1] : 'icerik';
const rastgeleSayisi = Number(argumanlar[0] || 10);
const icerik = await diskIcerik(klasor);
const cikti = new URL('okuma/', KOK);
rmSync(cikti, { recursive: true, force: true });
mkdirSync(cikti, { recursive: true });

// Özenli oyuncu: o karakterin en iyi yolunu dener (yakınlık ve önemli anlar puan getirir, kaçışlar götürür).
const defnePuani = (d) => (d['defne.yakinlik'] || 0) - 0.5 * (d['defne.kis'] || 0)
  + 3 * ['defne.sevgili', 'defne.kurallar', 'defne.kalan_gece', 'defne.firtina_yardim', 'defne.yanindaydi', 'defne.kal_dedi',
    'defne.kalacak_dedi', 'defne.sir', 'defne.kontrat', 'karar.kaldi', 'son.defne_kaldi'].filter((k) => d[k]).length
  - 5 * ['defne.uzak', 'defne.bitti', 'defne.kotu_gece_yalniz', 'defne.kapatiyor'].filter((k) => d[k]).length
  - 2 * (d['defne.kurtarici'] || 0);

// Romanda her kişi için bir özenli okuma: içerikte değişkeni olan ("ada.yakin") her kişi.
const ilgiler = () => {
  const adlar = new Set();
  for (const p of icerik.parcalar.values()) {
    for (const liste of p.listeler) {
      for (const d of liste) if (d.t === 'işlem') for (const x of d.islemler) adlar.add(x.ad.split('.')[0]);
    }
  }
  const kadinlar = ['ilgin', 'sude', 'ceren', 'defne', 'ela', 'lara'].filter((k) => icerik.kisiler[k]);
  return (kadinlar.length ? kadinlar : Object.keys(icerik.kisiler)).filter((k) => adlar.has(k));
};

const kosular = icerik.roman ? [
  ...ilgiler().map((ilgi) => ({ ad: `ozenli-${ilgi}`, strateji: 'özenli', ilgi, tohum: 1 })),
  { ad: 'hep-ilk', strateji: 'ilk', tohum: 1 },
  { ad: 'hep-son', strateji: 'son', tohum: 1 },
  ...Array.from({ length: rastgeleSayisi }, (_, i) => ({ ad: `rastgele-${String(i + 1).padStart(2, '0')}`, strateji: 'rastgele', tohum: i + 1 })),
] : [
  { ad: 'ozenli-defne', strateji: 'özenli', ilgi: 'defne', puan: defnePuani, tohum: 1 },
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
    const { oyun, dokum, gorulenSatirlar } = oyna(icerik, { ...k, ad: 'Kaan' });
    writeFileSync(new URL(`dokum-${k.ad}.md`, cikti), `# Döküm: ${k.ad}\n${dokum}\n`);
    for (const id of Object.keys(oyun.durum.gorulen)) gorulenParcalar.set(id, (gorulenParcalar.get(id) || 0) + 1);

    // Aynı oyunda aynı satır iki kez göründü mü?
    const sayac = new Map();
    for (const s of gorulenSatirlar) sayac.set(s, (sayac.get(s) || 0) + 1);
    const tekrarlar = [...sayac].filter(([s, n]) => n > 1 && s.length > 12);
    const kelime = dokum.replace(/[*#>`_-]/g, ' ').split(/\s+/).filter(Boolean).length;
    const bolumSayisi = (dokum.match(/^# Bölüm /gm) || []).length;
    const bolumBasina = bolumSayisi ? ` (bölüm başına ${Math.round(kelime / bolumSayisi)})` : '';
    ozet.push(`- **${k.ad}**: ${Object.keys(oyun.durum.gorulen).length} parça görüldü, ${gorulenSatirlar.length} satır, yaklaşık ${kelime} kelime${bolumBasina}` +
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
