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

// Her kadın için bir özenli okuma: içerikte değişkeni olan ("ada.yakin") her kişi.
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

const kosular = [
  ...ilgiler().map((ilgi) => ({ ad: `ozenli-${ilgi}`, strateji: 'özenli', ilgi, tohum: 1 })),
  { ad: 'hep-ilk', strateji: 'ilk', tohum: 1 },
  { ad: 'hep-son', strateji: 'son', tohum: 1 },
  ...Array.from({ length: rastgeleSayisi }, (_, i) => ({ ad: `rastgele-${String(i + 1).padStart(2, '0')}`, strateji: 'rastgele', tohum: i + 1 })),
];

const gorulenParcalar = new Map();
const ozet = [];
const hatalar = [];

for (const k of kosular) {
  try {
    const { oyun, dokum, gorulenSatirlar, uyarilar: oyunUyarilari = [] } = oyna(icerik, { ...k, ad: 'Kaan' });
    for (const u of new Set(oyunUyarilari)) hatalar.push(`${k.ad}: ${u}`);
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

// Ses ölçümü: altı kadının replikleri (konuşma ve mesaj) cümle ritmi ve kimin kalıbı kimin ağzında.
// Hedefler ve kalıpların sahipleri yazim/rehber.md, "Ses ayrımı".
const SES_HEDEF = {
  defne: [7, 11, 10], sude: [7, 11, 8], ceren: [6, 9, 12], lara: [5, 8, 15], ilgin: [3, 5, 30], ela: [3, 5, 30],
};
const SES_KALIPLARI = [
  ['neyse', /\bneyse\b/i, 'lara'],
  ['bir şey demiyorum', /(bir ?şey|bişey) demiyorum/i, 'ela'],
  ['kural', /\bkural/i, 'defne'],
  ['kampanya / küçük punto', /kampanya|küçük puntoyla/i, 'defne'],
  ['sayma / sayılır', /\bsay(ma|ılır|ıyorum|ılıyor)\b/i, 'lara'],
  ['bilgin olsun / bunu bil', /bilgin olsun|bunu bil\b/i, 'sude'],
  ['bu bir … (kendini etiketleme)', /\bbu bir \p{L}+[.!]?$/iu, 'sude'],
  ['fark var', /fark(ı)? var/i, 'ilgin'],
  ['gerçek bir / kibar ve gerçek', /\bgerçek (bir|cevap)|kibar .* gerçek/i, 'ceren'],
  ['kimseye söyleme', /kimseye söyleme/i, null],
  ['söylemem gerek(miyordu)', /söylemem (gerek|lazım)/i, null],
  ['niye/neden söyledim', /(niye|neden) söyl(üyorum|edim)/i, null],
];
const sesSatirlari = new Map(Object.keys(SES_HEDEF).map((k) => [k, []]));
// Replikler iç içe durur (seçenek, koşul, yazışma); ağacın tamamı gezilir.
const sesTopla = (d, gorulen) => {
  if (!d || typeof d !== 'object' || gorulen.has(d)) return;
  gorulen.add(d);
  if (Array.isArray(d)) { d.forEach((x) => sesTopla(x, gorulen)); return; }
  const kim = d.kim || d.kisi || d.konusan;
  if (d.t === 'söz' && sesSatirlari.has(kim)) sesSatirlari.get(kim).push(d.metin);
  for (const v of Object.values(d)) if (v && typeof v === 'object') sesTopla(v, gorulen);
};
const sesGorulen = new Set();
for (const p of icerik.parcalar.values()) sesTopla(p.listeler, sesGorulen);
const sesRaporu = ['| Kişi | Satır | Kelime/cümle (hedef) | Tek kelimelik cümle % (en çok) |', '|---|---|---|---|'];
const kalipRaporu = [];
for (const [kim, satirlar] of sesSatirlari) {
  if (!satirlar.length) continue;
  const cumleler = satirlar.flatMap((s) => s.split(/[.!?…]+/)).map((c) => c.trim()).filter(Boolean);
  const ort = cumleler.reduce((t, c) => t + c.split(/\s+/).length, 0) / cumleler.length;
  const tek = (100 * cumleler.filter((c) => c.split(/\s+/).length === 1).length) / cumleler.length;
  const [alt, ust, tekUst] = SES_HEDEF[kim];
  const isaret = ort < alt || ort > ust || tek > tekUst ? ' ⚠' : '';
  sesRaporu.push(`| ${kim} | ${satirlar.length} | ${ort.toFixed(1)} (${alt}–${ust}) | ${tek.toFixed(0)} (${tekUst})${isaret} |`);
  for (const [ad, desen, sahip] of SES_KALIPLARI) {
    if (sahip === kim) continue;
    const n = satirlar.filter((s) => desen.test(s)).length;
    if (n) kalipRaporu.push(`- "${ad}" ${kim} ağzında ${n} kez` + (sahip ? ` (sahibi: ${sahip})` : ' (kimsenin değil)'));
  }
}

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
  '## Ses ayrımı (bütün içerik)',
  ...sesRaporu,
  '',
  ...(kalipRaporu.length ? kalipRaporu : ['- başkasının kalıbı yok']),
  '',
  '## İçerikte birebir aynı yazılmış satırlar',
  ...(ayniSatirlar.length ? ayniSatirlar.map(([s, y]) => `- "${s}" → ${y.join(', ')}`) : ['- yok']),
  '',
];
writeFileSync(new URL('ozet.md', cikti), rapor.join('\n'));
console.log(rapor.join('\n'));
console.log(`Dökümler: okuma/ klasöründe.`);
if (hatalar.length || denetimHatalari.length) process.exitCode = 1;
