// .dsim içerik dosyalarını okur. Biçimin tarifi: icerik/BICIM.md

import { ifadeCoz } from './ifade.js';
import { tarihCoz, sureCoz, saatCoz } from './tarih.js';

const BASLIKLAR = new Set(['tür', 'kişi', 'zaman', 'başlık', 'yer', 'ton', 'not', 'bölüm', 'perde']);
const TURLER = new Set(['bölüm', 'sahne', 'geçmiş']);
const KOMUTLAR = new Set(['bekle', 'zaman', 'saat', 'yer', 'bitir', 'rehber', 'tanış', 'okudu', 'okunmadı',
  'son', 'eğer', 'yoksa', 'yazışma', 'oyna', 'geç']);
const AD = /^[\p{Ll}_][\p{Ll}\p{N}_]*$/u;
const DEGISKEN = /^[\p{L}_][\p{L}\p{N}_.]*$/u;

export function ayristir(metin, dosya = '?') {
  const hatalar = [];
  const parcalar = [];
  const satirlar = metin.replace(/\r\n?/g, '\n').split('\n');
  const hata = (satir, mesaj) => hatalar.push({ dosya, satir, mesaj });

  let i = 0;
  while (i < satirlar.length) {
    const s = satirlar[i];
    if (!s.trim() || s.trim().startsWith('#')) { i++; continue; }
    if (!s.startsWith('=== ')) {
      hata(i + 1, 'Parça dışında metin. Her parça "=== kimlik" ile başlamalı.');
      i++;
      continue;
    }
    const kimlik = s.slice(4).trim();
    if (!AD.test(kimlik)) hata(i + 1, `Geçersiz parça kimliği "${kimlik}". Küçük harf, rakam ve _ kullan.`);
    const baslangic = i + 1;
    let j = i + 1;
    while (j < satirlar.length && !satirlar[j].startsWith('=== ')) j++;
    const parca = parcaOku(kimlik, satirlar.slice(i + 1, j), baslangic + 1, dosya, hata);
    parca.satir = baslangic;
    parcalar.push(parca);
    i = j;
  }
  return { parcalar, hatalar };
}

function parcaOku(kimlik, satirlar, ilkSatirNo, dosya, hata) {
  const baslik = {};
  let k = 0;
  while (k < satirlar.length && satirlar[k].trim()) {
    const m = satirlar[k].match(/^([\p{L}_]+)\s*:\s*(.*)$/u);
    if (!m) { hata(ilkSatirNo + k, `Başlık satırı "anahtar: değer" biçiminde olmalı. Başlıktan sonra bir boş satır bırak.`); k++; continue; }
    if (!BASLIKLAR.has(m[1])) hata(ilkSatirNo + k, `Bilinmeyen başlık "${m[1]}".`);
    baslik[m[1]] = m[2].trim();
    k++;
  }

  const parca = {
    kimlik, dosya,
    tur: baslik['tür'],
    kisi: baslik['kişi'] || null,
    baslik,
    listeler: [[]],
    etiketler: {},
  };
  if (!TURLER.has(parca.tur)) hata(ilkSatirNo, `"${kimlik}": tür eksik ya da bilinmiyor (${baslik['tür'] ?? 'yok'}).`);

  baslikCoz(parca, ilkSatirNo, hata);

  // Gövde: yorum ve boş satırları at, girintiyi ölç.
  const govde = [];
  for (let n = k; n < satirlar.length; n++) {
    const ham = satirlar[n];
    if (!ham.trim()) continue;
    if (/^\t| \t/.test(ham)) { hata(ilkSatirNo + n, 'Sekme karakteri kullanma; girinti iki boşluktur.'); continue; }
    const girinti = ham.match(/^ */)[0].length;
    const icerik = ham.slice(girinti).replace(/\s+$/, '');
    if (icerik.startsWith('#')) continue;
    if (girinti % 2 !== 0) hata(ilkSatirNo + n, 'Girinti iki boşluğun katı olmalı.');
    govde.push({ girinti, icerik, no: ilkSatirNo + n });
  }

  const durum = { i: 0 };
  blokOku(parca, govde, durum, 0, 0, hata);
  return parca;
}

function baslikCoz(parca, satir, hata) {
  const b = parca.baslik;
  const ad = parca.kimlik;
  if (b['zaman'] !== undefined) {
    parca.zaman = tarihCoz(b['zaman']);
    if (parca.zaman === null) hata(satir, `"${ad}": zaman anlaşılmadı (${b['zaman']}). Örnek: 15 Eylül 08:10`);
  }
  if (b['bölüm'] !== undefined) {
    parca.bolum = Number(b['bölüm']);
    if (!Number.isInteger(parca.bolum) || parca.bolum < 1) hata(satir, `"${ad}": bölüm numarası pozitif bir tam sayı olmalı (${b['bölüm']}).`);
  }
  if (parca.tur === 'bölüm' && b['bölüm'] === undefined) hata(satir, `"${ad}": bölümün numarası yok (bölüm: 4).`);
}

function blokOku(parca, satirlar, durum, girinti, listeNo, hata) {
  const liste = parca.listeler[listeNo];

  while (durum.i < satirlar.length) {
    const s = satirlar[durum.i];
    if (s.girinti < girinti) return;
    if (s.girinti > girinti) {
      hata(s.no, 'Beklenmeyen girinti. Bir seçeneğin ya da "eğer"in altında değilse satır sola yaslanmalı.');
      durum.i++;
      continue;
    }
    const c = s.icerik;

    if (c.startsWith('* ') || c === '*') {
      const secim = { t: 'seçim', secenekler: [], no: s.no };
      while (durum.i < satirlar.length && satirlar[durum.i].girinti === girinti && satirlar[durum.i].icerik.startsWith('*')) {
        const ss = satirlar[durum.i];
        const m = ss.icerik.match(/^\*\s+(?:\{([^}]*)\}\s*)?(.*)$/);
        const secenek = { no: ss.no, metin: (m ? m[2] : '').trim() };
        if (m && m[1] !== undefined) {
          try { secenek.kosul = ifadeCoz(m[1]); } catch (e) { hata(ss.no, `Seçenek koşulu hatalı: ${e.message}`); }
        }
        if (!secenek.metin) hata(ss.no, 'Boş seçenek.');
        if (/^\(.*\)$/.test(secenek.metin)) secenek.tip = 'eylem';
        else if (/^".*"$/.test(secenek.metin)) { secenek.tip = 'söz'; secenek.metin = secenek.metin.slice(1, -1); }
        else secenek.tip = 'düz';
        durum.i++;
        secenek.govde = parca.listeler.push([]) - 1;
        blokOku(parca, satirlar, durum, girinti + 2, secenek.govde, hata);
        secim.secenekler.push(secenek);
      }
      liste.push(secim);
      continue;
    }

    durum.i++;

    if (c.startsWith('::')) {
      const ad = c.slice(2).trim();
      if (girinti !== 0) hata(s.no, 'Etiketler (::) yalnızca en dış seviyede olabilir.');
      if (!AD.test(ad)) hata(s.no, `Geçersiz etiket adı "${ad}".`);
      if (parca.etiketler[ad] !== undefined) hata(s.no, `Etiket iki kez tanımlanmış: ${ad}`);
      parca.etiketler[ad] = liste.length;
      liste.push({ t: 'etiket', ad, no: s.no });
      continue;
    }

    if (c.startsWith('->')) {
      const hedef = c.slice(2).trim();
      if (!AD.test(hedef)) hata(s.no, `Geçersiz atlama hedefi "${hedef}".`);
      liste.push({ t: 'git', hedef, no: s.no });
      continue;
    }

    if (c.startsWith('[')) {
      if (!c.endsWith(']')) { hata(s.no, 'İşlem satırı "]" ile bitmeli.'); continue; }
      const islemler = [];
      for (const ham of c.slice(1, -1).split(';')) {
        const p = ham.trim();
        if (!p) continue;
        let m;
        if ((m = p.match(/^([\p{L}_][\p{L}\p{N}_.]*)\s*([+-])\s*(\d+)$/u))) islemler.push({ ad: m[1], op: m[2], v: Number(m[3]) });
        else if ((m = p.match(/^([\p{L}_][\p{L}\p{N}_.]*)\s*=\s*(.+)$/u))) islemler.push({ ad: m[1], op: '=', v: degerCoz(m[2].trim(), s.no, hata) });
        else if ((m = p.match(/^değil\s+([\p{L}_][\p{L}\p{N}_.]*)$/u))) islemler.push({ ad: m[1], op: '=', v: false });
        else if (DEGISKEN.test(p)) islemler.push({ ad: p, op: '=', v: true });
        else hata(s.no, `İşlem anlaşılmadı: "${p}"`);
      }
      liste.push({ t: 'işlem', islemler, no: s.no });
      continue;
    }

    if (c.startsWith('>>')) {
      const m = c.slice(2).trim().match(/^([\p{L}_]+)\s*(.*)$/u);
      if (!m || !KOMUTLAR.has(m[1])) { hata(s.no, `Bilinmeyen komut: ${c}`); continue; }
      const ad = m[1];
      const arg = m[2].trim();

      if (ad === 'eğer') {
        const dugum = { t: 'eğer', dallar: [], no: s.no };
        dalEkle(parca, dugum, arg, satirlar, durum, girinti, s.no, hata);
        while (durum.i < satirlar.length && satirlar[durum.i].girinti === girinti && /^>>\s*yoksa\b/u.test(satirlar[durum.i].icerik)) {
          const y = satirlar[durum.i];
          durum.i++;
          const yArg = y.icerik.replace(/^>>\s*yoksa\s*/u, '');
          if (yArg.startsWith('eğer')) dalEkle(parca, dugum, yArg.slice(4).trim(), satirlar, durum, girinti, y.no, hata);
          else if (yArg === '') {
            dugum.yoksa = parca.listeler.push([]) - 1;
            blokOku(parca, satirlar, durum, girinti + 2, dugum.yoksa, hata);
          } else hata(y.no, `"yoksa" anlaşılmadı: ${y.icerik}`);
        }
        liste.push(dugum);
        continue;
      }
      if (ad === 'yoksa') { hata(s.no, '"yoksa" öncesinde bir "eğer" yok.'); continue; }

      // Hikâyenin içinde yaşanan yazışma: altındaki satırlar telefonda, o kişiyle olur.
      if (ad === 'yazışma') {
        if (!AD.test(arg)) hata(s.no, `"yazışma" bir kişi kimliği ister: ${c}`);
        const dugum = { t: 'yazışma', kisi: arg, govde: parca.listeler.push([]) - 1, no: s.no };
        blokOku(parca, satirlar, durum, girinti + 2, dugum.govde, hata);
        if (!parca.listeler[dugum.govde].length) hata(s.no, 'Boş yazışma: altına iki boşluk içeride mesajlar yaz.');
        liste.push(dugum);
        continue;
      }

      const komut = komutCoz(ad, arg, s.no, hata);
      if (komut) liste.push(komut);
      continue;
    }

    if (c.startsWith('@')) {
      const m = c.match(/^@([\p{Ll}_][\p{Ll}\p{N}_]*)(?:\(([^)]*)\))?:\s*(.*)$/u);
      if (!m) { hata(s.no, `Konuşma satırı "@kişi: metin" biçiminde olmalı: ${c}`); continue; }
      if (!m[3]) hata(s.no, 'Boş konuşma satırı.');
      const dugum = { t: 'söz', kisi: m[1], metin: m[3], no: s.no };
      if (m[2]) dugum.ad = m[2].trim();
      liste.push(dugum);
      continue;
    }

    liste.push({ t: 'anlatı', metin: c, no: s.no });
  }
}

function dalEkle(parca, dugum, kosulMetni, satirlar, durum, girinti, no, hata) {
  let kosul = null;
  try { kosul = ifadeCoz(kosulMetni); } catch (e) { hata(no, `Koşul hatalı: ${e.message}`); }
  const govde = parca.listeler.push([]) - 1;
  blokOku(parca, satirlar, durum, girinti + 2, govde, hata);
  dugum.dallar.push({ kosul, govde });
}

function degerCoz(metin, no, hata) {
  if (metin === 'evet') return true;
  if (metin === 'bugün') return { ozel: 'bugün' };
  if (metin === 'hayır') return false;
  if (/^-?\d+(\.\d+)?$/.test(metin)) return Number(metin);
  if (/^".*"$/.test(metin)) return metin.slice(1, -1);
  hata(no, `Değer anlaşılmadı: ${metin}`);
  return null;
}

function komutCoz(ad, arg, no, hata) {
  const k = { t: 'komut', ad, no };
  switch (ad) {
    case 'bekle': {
      k.sure = sureCoz(arg);
      if (k.sure === null) hata(no, `Süre anlaşılmadı: ${arg}`);
      return k;
    }
    case 'zaman': {
      k.zaman = tarihCoz(arg);
      if (k.zaman === null) hata(no, `Zaman anlaşılmadı: ${arg}`);
      return k;
    }
    case 'saat': {
      k.saat = saatCoz(arg);
      if (k.saat === null) hata(no, `Saat anlaşılmadı: ${arg}. Örnek: >> saat 01:15`);
      return k;
    }
    case 'yer': {
      if (!arg) hata(no, `"${ad}" komutu bir yer adı ister.`);
      k.yer = arg;
      return k;
    }
    case 'rehber': {
      const m = arg.match(/^([\p{Ll}_][\p{Ll}\p{N}_]*)\s*:\s*(.+)$/u);
      if (!m) { hata(no, '"rehber" biçimi: >> rehber kişi: Ad 1 | Ad 2 | Ad 3'); return null; }
      k.kisi = m[1];
      k.adlar = m[2].split('|').map((a) => a.trim()).filter(Boolean);
      if (k.adlar.length < 2) hata(no, 'Rehber için en az iki ad seçeneği yaz.');
      return k;
    }
    case 'oyna':
    case 'geç': {
      if (!AD.test(arg)) hata(no, `"${ad}" bir parça kimliği ister: ${arg}`);
      k.hedef = arg;
      return k;
    }
    case 'tanış': {
      if (!AD.test(arg)) hata(no, `"tanış" bir kişi kimliği ister: ${arg}`);
      k.kisi = arg;
      return k;
    }
    case 'okudu':
    case 'okunmadı':
    case 'bitir':
    case 'son':
      if (arg) hata(no, `"${ad}" komutu argüman almaz.`);
      return k;
  }
  return null;
}
