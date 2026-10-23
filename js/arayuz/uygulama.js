// Uygulamanın girişi: içeriği yükler, kaydı açar, ekranlar arasında geçişi yönetir.

import { icerigiYukle } from '../motor/yukleme.js';
import { Oyun } from '../motor/oyun.js';
import { SURUM } from '../surum.js';
import * as hata from './hata.js';
import { uyari } from './katman.js';
import { Giris } from './giris.js';
import { Kilit } from './kilit.js';
import { Telefon } from './telefon.js';
import { Sahne } from './sahne.js';
import { hataRaporuAc } from './ayarlar.js';

const KAYIT = 'pirnalli.kayit';
const YEDEK = 'pirnalli.kayit.yedek';

const app = {
  surum: SURUM,
  icerik: null,
  oyun: null,
  ekran: 'yukleniyor',
  ekranlar: {},

  git(ad, ...arg) {
    for (const s of document.querySelectorAll('.ekran')) s.classList.toggle('aktif', s.id === `ekran-${ad}`);
    const onceki = this.ekran;
    this.ekran = ad;
    if (onceki !== ad && this.ekranlar[onceki] && this.ekranlar[onceki].kapan) this.ekranlar[onceki].kapan();
    const ekran = this.ekranlar[ad];
    if (ekran) {
      try { ekran.ac(...arg); } catch (e) { hata.kaydet(e, `ekran:${ad}`); }
    }
  },

  // Ekranı açmadan yalnızca görünür yapar (akış ekranlar arasında geçerken, ekran kendini baştan kurmasın diye).
  gorunur(ad) {
    for (const s of document.querySelectorAll('.ekran')) s.classList.toggle('aktif', s.id === `ekran-${ad}`);
    const onceki = this.ekran;
    this.ekran = ad;
    if (onceki !== ad && this.ekranlar[onceki] && this.ekranlar[onceki].kapan) this.ekranlar[onceki].kapan();
  },

  // Oyunun bir sonraki doğal ekranı: süren bölüm sayfada açılır; başlamamış bölüm önce perdesiyle (kilit ekranı).
  // Roman bittiyse de kilit ekranı (son sayfası).
  devam() {
    const b = this.oyun && this.oyun.bolumBilgisi();
    this.git(b && b.basladi ? 'sahne' : 'kilit');
  },

  kaydet() {
    if (!this.oyun || !this.oyun.durum) return;
    try {
      const onceki = localStorage.getItem(KAYIT);
      if (onceki) localStorage.setItem(YEDEK, onceki);
      localStorage.setItem(KAYIT, this.oyun.disaVer());
    } catch (e) {
      hata.kaydet(e, 'kayıt', true);
    }
  },

  // Motorda bir şey değişti: kaydet ve açık ekranı yenile.
  degisti() {
    this.kaydet();
    const ekran = this.ekranlar[this.ekran];
    if (ekran && ekran.ciz) {
      try { ekran.ciz(); } catch (e) { hata.kaydet(e, `çizim:${this.ekran}`); }
    }
  },

  // Motor çağrılarını hata yakalayarak sarar.
  calistir(is, kaynak) {
    try {
      return is();
    } catch (e) {
      hata.kaydet(e, kaynak);
      return undefined;
    }
  },

  yeniOyun(ad) {
    this.oyun = new Oyun(this.icerik);
    this.oyun.basla(ad);
    this.kaydet();
    this.devam();
  },

  kayitYukle(durum) {
    const oyun = new Oyun(this.icerik, durum);
    // Roman yapısından önceki bir kayıt sürdürülemez: giriş ekranı açıklar, yeni oyun önerir. Kayıt, yeni oyun başlayana kadar silinmez.
    if (oyun.uyumsuz) { this.oyun = null; this.eskiKayit = true; return; }
    this.oyun = oyun;
    this.kaydet();
    if (oyun.onarimlar.length) hata.kaydet(new Error(`Kayıt onarıldı: ${oyun.onarimlar.join(' | ')}`), 'kayıt', true);
  },

  kayitSil() {
    try { localStorage.removeItem(KAYIT); } catch { /* yok say */ }
    this.oyun = null;
  },
};

function kayitOku() {
  for (const anahtar of [KAYIT, YEDEK]) {
    try {
      const ham = localStorage.getItem(anahtar);
      if (!ham) continue;
      const durum = JSON.parse(ham);
      if (durum && typeof durum.t === 'number' && durum.oyuncu) return durum;
    } catch (e) {
      hata.kaydet(e, `kayıt okunamadı (${anahtar})`, true);
    }
  }
  return null;
}

function servisCalisaniKaydet() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const ilkKurulum = !navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch((e) => hata.kaydet(e, 'servis çalışanı', true));
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (ilkKurulum) return;
    uyari('Oyunun yeni sürümü hazır.', { yazi: 'Yenile', tikla: () => location.reload() }, 12000);
  });
}

async function basla() {
  hata.kur(() => app, () => hataRaporuAc(app));
  servisCalisaniKaydet();

  app.ekranlar.giris = new Giris(app);
  app.ekranlar.kilit = new Kilit(app);
  app.ekranlar.telefon = new Telefon(app);
  app.ekranlar.sahne = new Sahne(app);

  try {
    app.icerik = await icerigiYukle(async (yol) => {
      const yanit = await fetch(`icerik/${yol}`);
      if (!yanit.ok) throw new Error(`${yol} yüklenemedi (${yanit.status})`);
      return yanit.text();
    });
  } catch (e) {
    hata.kaydet(e, 'içerik yükleme');
    document.querySelector('.yukleniyor-yazi').textContent = 'Oyun yüklenemedi.';
    return;
  }
  if (app.icerik.hatalar.length) {
    hata.kaydet(new Error(`İçerikte ${app.icerik.hatalar.length} hata var: ${app.icerik.hatalar[0].dosya}:${app.icerik.hatalar[0].satir} ${app.icerik.hatalar[0].mesaj}`), 'içerik');
  }

  const durum = kayitOku();
  if (durum) {
    try { app.kayitYukle(durum); } catch (e) { hata.kaydet(e, 'kayıt açılamadı'); app.oyun = null; }
  }
  if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
  app.git('giris');
}

window.__pirnalli = app;
basla();
