// Oyunu kendi kendine oynayan robot. Okuma aracı ve testler kullanır.
// Ekranın yaptığını taklit eder: bölümleri sırayla okur, sayfadaki ve telefondaki seçimleri yapar.

import { Oyun } from '../js/motor/oyun.js';
import { saatYaz, tarihYaz } from '../js/motor/tarih.js';

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

// strateji: 'rastgele' | 'ilk' | 'son' | 'özenli'. Her seçimde stratejiye göre seçer.
// 'özenli' + ilgi: her seçimde seçenekleri oyunun kopyasında dener; puan(durum.d) en yüksek olanı seçer.
// Varsayılan puan: ilgi kişisinin ("ada.") sayısal değişkenlerinin toplamı ve doğru olan işaretlerinin sayısı.
export function oyna(icerik, { tohum = 1, strateji = 'rastgele', ad = 'Kaan', adimSiniri = 20000, ilgi = null, puan = null } = {}) {
  const rng = rastgeleUretici(tohum);
  const sec = (n) => (strateji === 'ilk' ? 0 : strateji === 'son' ? n - 1 : Math.floor(rng() * n));
  const ozenli = strateji === 'özenli';
  // Eşitlikte, başka kadınlara yakınlaştıran seçenek biraz geride kalır (o kişiye özen gösteren oyuncu öbür kapıları seçmez).
  const KADINLAR = ['ilgin', 'sude', 'ceren', 'defne', 'ela', 'lara'];
  const deger = (d, kisi) => Object.entries(d).filter(([k]) => k.startsWith(`${kisi}.`))
    .reduce((t, [, v]) => t + (typeof v === 'number' ? v : v ? 1 : 0), 0);
  const puanla = puan || ((d) => deger(d, ilgi) - 0.1 * KADINLAR.filter((k) => k !== ilgi).reduce((t, k) => t + deger(d, k), 0));
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
  const uyarilar = [];
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
          // İlk kez yazan birini oyuncu yazışmanın içinde kaydedebilir; yazışma bittiğinde hâlâ kayıtsızsa sorun var.
          if (b.onceki && !oyun.durum.rehber[b.onceki]) uyarilar.push(`bölüm ${oyun.sahne && oyun.sahne.bolum}: ${b.onceki} rehbere kaydedilmeden yazışma bitti`);
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
  return { oyun, dokum: dokum.join('\n'), gorulenSatirlar, uyarilar };
}
