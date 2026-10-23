// Oyunu kendi kendine oynayan robot. Okuma aracı ve testler kullanır.
// Ekranın yaptığını taklit eder: sahneleri oynatır, mesajlara cevap verir, eylem seçer.

import { Oyun } from '../js/motor/oyun.js';
import { gunNo, saatYaz, tarihYaz } from '../js/motor/tarih.js';

export function rastgeleUretici(tohum) {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// strateji: 'rastgele' | 'ilk' | 'son' | 'özenli'
// eylemIstegi: kilit ekranında yazılmış bir eylemi seçme olasılığı (düşükse robot "tembel" oynar).
// 'özenli': bir karaktere (ilgi) özen gösteren oyuncu. Her seçimde seçenekleri oyunun bir kopyasında
// dener, puan(durum.d) en yüksek olanı seçer; mesajlara hep cevap verir, o karakterin eylemlerini önce seçer.
export function oyna(icerik, { tohum = 1, strateji = 'rastgele', ad = 'Kaan', adimSiniri = 5000, eylemIstegi = 0.7, ilgi = null, puan = null } = {}) {
  if (icerik.roman) return romanOyna(icerik, { tohum, strateji, ad, ilgi, puan });
  const rng = rastgeleUretici(tohum);
  const sec = (n) => (strateji === 'ilk' ? 0 : strateji === 'son' ? n - 1 : Math.floor(rng() * n));
  const ozenli = strateji === 'özenli';
  const puanla = puan || ((d) => d[`${ilgi}.yakinlik`] || 0);
  const oyun = new Oyun(icerik);
  oyun.basla(ad);

  // Bir seçimin hemen sonrasını kopyada oynatıp puanlar.
  const kopyadaDene = (uygula) => {
    const k = new Oyun(icerik, JSON.parse(oyun.disaVer()));
    uygula(k);
    for (let n = 0; n < 60; n++) {
      if (k.sahne) {
        const s = k.sahne;
        if (s.bitti) { k.sahneKapat(); continue; }
        if (!s.akis.secim) { k.sahneDevam(); continue; }
        k.sahneSec(s.kayit[s.kayit.length - 1].secenekler[0].i);
        continue;
      }
      const y = k.yakinOlay();
      if (!y) break;
      k.ilerle(y.t);
    }
    return puanla(k.durum.d);
  };
  const enIyi = (secenekler, uygula) => {
    let iyi = secenekler[0];
    let iyiPuan = -Infinity;
    for (const x of secenekler) {
      const p = kopyadaDene((k) => uygula(k, x));
      if (p > iyiPuan) { iyiPuan = p; iyi = x; }
    }
    return iyi;
  };

  const dokum = [];
  const gorulenSatirlar = [];
  let sonGun = null;
  let sonMesajNo = 0;
  const yaz = (s) => dokum.push(s);

  const gunBasligi = () => {
    const g = gunNo(oyun.t);
    if (g !== sonGun) { sonGun = g; yaz(`\n## ${tarihYaz(oyun.t)}\n`); }
  };

  // Gelen ve giden yeni mesajları zaman sırasıyla dökümde göster.
  const mesajlariYaz = () => {
    const yeni = [];
    for (const [kisi, liste] of Object.entries(oyun.durum.sohbet)) {
      for (const m of liste) if (m.n > sonMesajNo) yeni.push({ kisi, ...m });
    }
    yeni.sort((a, b) => a.t - b.t || a.n - b.n);
    let sonKisi = null;
    for (const m of yeni) {
      if (m.t < oyun.icerik.ayar.baslangic) continue;
      if (m.kisi !== sonKisi) { yaz(`\n**📱 ${oyun.gorunenAd(m.kisi)}**`); sonKisi = m.kisi; }
      const kim = m.k === 'b' ? 'Sen' : oyun.gorunenAd(m.kisi);
      yaz(`- \`${saatYaz(m.t)}\` ${kim}: ${m.m}`);
      gorulenSatirlar.push(m.m);
      sonMesajNo = Math.max(sonMesajNo, m.n);
    }
    for (const liste of Object.values(oyun.durum.sohbet)) for (const m of liste) sonMesajNo = Math.max(sonMesajNo, m.n);
  };

  const bloklariYaz = (bloklar) => {
    for (const b of bloklar) {
      switch (b.t) {
        case 'anlatı': yaz(b.metin); yaz(''); gorulenSatirlar.push(b.metin); break;
        case 'söz': yaz(`**${b.ad}:** ${b.metin}`); yaz(''); gorulenSatirlar.push(b.metin); break;
        case 'ben': yaz(`**Sen:** ${b.metin}`); yaz(''); break;
        case 'seçildi': yaz(`*→ ${b.metin}*`); yaz(''); break;
        case 'yer': yaz(`*[${b.yer}]*`); break;
        case 'rehber': yaz(`> 📇 Rehbere kaydet (${b.numara}): ${b.secenekler.map((s) => s.metin).join(' / ')}`); break;
        case 'kaydedildi': yaz(`*→ Rehbere "${b.ad}" olarak kaydedildi*`); yaz(''); break;
        case 'telefon': yaz(`> 📱 Telefona bakıyorsun: ${b.bildirimler.map((x) => `${x.ad}: "${x.m}"`).join(' · ') || '(yeni bir şey yok)'}`); yaz(''); break;
        case 'seçim': yaz(`> Seçenekler: ${b.secenekler.map((s, i) => `${i + 1}) ${s.metin}`).join('  ')}`); break;
        case 'son': yaz('— *sahne sonu* —'); break;
      }
    }
  };

  const canliAkis = () => {
    for (let k = 0; k < 200; k++) {
      const y = oyun.yakinOlay();
      if (!y || oyun.sahne) break;
      oyun.ilerle(y.t);
    }
  };

  let sonT = -1;
  let ayniYerde = 0;
  for (let adim = 0; adim < adimSiniri; adim++) {
    if (oyun.sahne) {
      const s = oyun.sahne;
      if (s.bitti) { oyun.sahneKapat(); continue; }
      if (!s.akis.secim) {
        mesajlariYaz();
        gunBasligi();
        const parca = oyun.parca(s.kimlik);
        yaz(`\n### ${saatYaz(oyun.t)} · ${parca.tur === 'eylem' ? 'Eylem' : 'Sahne'}: ${s.kimlik} · ${s.yer}\n`);
        bloklariYaz(oyun.sahneDevam());
        continue;
      }
      const sonBlok = s.kayit[s.kayit.length - 1];
      const secenekler = sonBlok.secenekler;
      const secilen = ozenli ? enIyi(secenekler, (k, x) => k.sahneSec(x.i)) : secenekler[sec(secenekler.length)];
      bloklariYaz(oyun.sahneSec(secilen.i));
      continue;
    }

    mesajlariYaz();
    if (oyun.bittiMi()) { yaz(`\n*— İçerik sonu (${tarihYaz(oyun.t)} ${saatYaz(oyun.t)}) —*`); break; }

    // Bekleyen mesajlara cevap ver (bazen hiç vermeden bırak).
    let cevapVerildi = false;
    for (const { kisi } of oyun.sohbetler()) {
      const s = oyun.secenekler(kisi);
      if (s.tur === 'yok') continue;
      if (s.tur === 'açılış' && (ozenli || rng() > 0.35)) continue;
      if (s.tur === 'cevap' && !ozenli && rng() > 0.8) continue;
      oyun.oku(kisi);
      const secilen = ozenli && s.tur === 'cevap'
        ? enIyi(s.secenekler, (k, x) => k.cevapla(kisi, x.i))
        : s.secenekler[sec(s.secenekler.length)];
      mesajlariYaz();
      gunBasligi();
      if (s.tur === 'rehber') yaz(`*→ ${oyun.gorunenAd(kisi)} rehbere "${secilen.metin}" olarak kaydedildi*`);
      else if (secilen.tip === 'eylem') yaz(`*→ ${secilen.metin}*`);
      oyun.cevapla(kisi, secilen.i);
      canliAkis();
      mesajlariYaz();
      cevapVerildi = true;
      break;
    }
    if (cevapVerildi) continue;

    const eylemler = oyun.eylemler();
    const icerikli = eylemler.filter((e) => !e.yerlesik);
    const e = ozenli
      ? (icerikli.find((x) => x.kimlik.startsWith(`${ilgi}_`)) || icerikli.find((x) => /^(vardiya|ders)/.test(x.kimlik)) || icerikli[0] || eylemler[eylemler.length - 1])
      : icerikli.length && rng() < eylemIstegi ? icerikli[sec(icerikli.length)] : eylemler[eylemler.length - 1];
    gunBasligi();
    if (e.yerlesik) yaz(`\n*${saatYaz(oyun.t)} · ${e.baslik}*`);
    oyun.eylemSec(e.kimlik);

    if (oyun.t === sonT && !oyun.sahne) {
      if (++ayniYerde > 50) throw new Error(`Oyun ilerlemiyor: ${tarihYaz(oyun.t)} ${saatYaz(oyun.t)}`);
    } else { ayniYerde = 0; sonT = oyun.t; }
  }
  if (!oyun.bittiMi()) throw new Error(`Adım sınırına ulaşıldı: ${tarihYaz(oyun.t)} ${saatYaz(oyun.t)}`);

  return { oyun, dokum: dokum.join('\n'), gorulenSatirlar };
}

// ---------- Roman ----------

// Roman yapısında oynar: bölümleri sırayla okur, her seçimde stratejiye göre seçer.
// 'özenli' + ilgi: her seçimde seçenekleri oyunun kopyasında dener; puan(durum.d) en yüksek olanı seçer.
// Varsayılan puan: ilgi kişisinin ("ada.") sayısal değişkenlerinin toplamı ve doğru olan işaretlerinin sayısı.
export function romanOyna(icerik, { tohum = 1, strateji = 'rastgele', ad = 'Kaan', adimSiniri = 20000, ilgi = null, puan = null } = {}) {
  const rng = rastgeleUretici(tohum);
  const sec = (n) => (strateji === 'ilk' ? 0 : strateji === 'son' ? n - 1 : Math.floor(rng() * n));
  const ozenli = strateji === 'özenli';
  const puanla = puan || ((d) => Object.entries(d).filter(([k]) => k.startsWith(`${ilgi}.`))
    .reduce((t, [, v]) => t + (typeof v === 'number' ? v : v ? 1 : 0), 0));
  const oyun = new Oyun(icerik);
  oyun.basla(ad);

  const secenekleri = (k) => k.sahne.kayit[k.sahne.kayit.length - 1].secenekler;
  const kopyadaDene = (i) => {
    const k = new Oyun(icerik, JSON.parse(oyun.disaVer()));
    k.sahneSec(i);
    const bolum = k.sahne && k.sahne.bolum;
    for (let n = 0; n < 200 && k.sahne && k.sahne.bolum === bolum; n++) {
      if (k.sahne.bitti) break;
      if (!k.sahne.akis.secim) { k.sahneDevam(); continue; }
      k.sahneSec(secenekleri(k)[0].i);
    }
    return puanla(k.durum.d);
  };

  const dokum = [];
  const gorulenSatirlar = [];
  const yaz = (s) => dokum.push(s);
  const bloklariYaz = (bloklar) => {
    for (const b of bloklar) {
      const kim = b.kanal ? oyun.gorunenAd(b.kanal) : '';
      switch (b.t) {
        case 'anlatı': yaz(b.metin); yaz(''); gorulenSatirlar.push(b.metin); break;
        case 'söz': yaz(`**${b.ad}:** ${b.metin}`); yaz(''); gorulenSatirlar.push(b.metin); break;
        case 'ben': yaz(`**Sen:** ${b.metin}`); yaz(''); break;
        case 'seçildi': yaz(b.kanal ? `- *→ ${b.metin}*` : `*→ ${b.metin}*`); if (!b.kanal) yaz(''); break;
        case 'gün': yaz(`*— ${tarihYaz(b.an)} —*`); yaz(''); break;
        case 'kanal':
          if (b.kisi) yaz(`**📱 ${oyun.gorunenAd(b.kisi)}** *(${tarihYaz(b.an, false)} ${saatYaz(b.an)})*`);
          else yaz('');
          break;
        case 'mesaj':
          yaz(`- \`${saatYaz(b.an)}\` ${b.k === 'b' ? 'Sen' : kim}: ${b.metin}`);
          if (b.k === 'o') gorulenSatirlar.push(b.metin);
          break;
        case 'ara': yaz(`- *(${Math.round(b.sure / 60)} dk geçer)*`); break;
        case 'okundu': yaz(`- *(görüldü ${saatYaz(b.an)})*`); break;
        case 'rehber': yaz(`> 📇 Rehbere kaydet (${b.numara}): ${b.secenekler.map((s) => s.metin).join(' / ')}`); break;
        case 'kaydedildi': yaz(`*→ Rehbere "${b.ad}" olarak kaydedildi*`); yaz(''); break;
        case 'seçim': yaz(`> Seçenekler: ${b.secenekler.map((s, i) => `${i + 1}) ${s.metin}`).join('  ')}`); break;
        case 'son': yaz(b.oyunBitti ? '— *son* —' : '— *bölüm sonu* —'); break;
      }
    }
  };

  let sonBolum = null;
  for (let adim = 0; adim < adimSiniri; adim++) {
    const s = oyun.sahne;
    if (!s) break;
    if (s.bolum !== sonBolum) {
      sonBolum = s.bolum;
      const b = oyun.bolumBilgisi();
      yaz(`\n# Bölüm ${b.no} · ${b.baslik}${b.perde ? ` (${b.perde.no}. perde: ${b.perde.ad})` : ''}\n`);
      yaz(`*${tarihYaz(b.baslangic)}, ${saatYaz(b.baslangic)} · ${b.yer || ''}*\n`);
    }
    if (s.bitti) { oyun.sahneKapat(); continue; }
    if (!s.akis.secim) { bloklariYaz(oyun.sahneDevam()); continue; }
    const secenekler = secenekleri(oyun);
    let secilen = secenekler[sec(secenekler.length)];
    if (ozenli && !s.akis.secim.rehber && secenekler.length > 1) {
      let iyiPuan = -Infinity;
      for (const x of secenekler) {
        const p = kopyadaDene(x.i);
        if (p > iyiPuan) { iyiPuan = p; secilen = x; }
      }
    }
    bloklariYaz(oyun.sahneSec(secilen.i));
  }
  if (!oyun.bittiMi()) throw new Error(`Adım sınırına ulaşıldı: bölüm ${sonBolum}`);
  return { oyun, dokum: dokum.join('\n'), gorulenSatirlar };
}
