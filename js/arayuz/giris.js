// Giriş ekranı: başlık, devam et / yeni oyun, ad sorma.

import { el } from './dom.js';
import { gokKur } from './gok.js';
import { altPencere } from './katman.js';

const AD_ORNEGI = 'Kaan';

export class Giris {
  constructor(app) {
    this.app = app;
    this.kok = document.getElementById('ekran-giris');
  }

  ac() {
    this.kok.replaceChildren();
    gokKur(this.kok, null, null);
    const app = this.app;
    const dugmeler = app.oyun
      ? [
        el('button.dugme.birincil', { onclick: () => (app.oyun.icerik.roman ? app.git('kilit') : app.devam()) }, 'Devam et'),
        el('button.dugme.ikincil', { onclick: () => this.yeniOyunSor() }, 'Yeni oyun'),
      ]
      : [el('button.dugme.birincil', { onclick: () => this.adSor() }, 'Başla')];
    this.kok.append(
      el('div.giris-baslik', {}, el('h1', {}, 'Pırnallı'), el('p', {}, 'Sezon bitiyor.')),
      el('div.giris-dugmeler', {},
        !app.oyun && app.eskiKayit
          ? el('p.giris-not', {}, 'Oyun bir romana dönüştü. Eski kaydın bu yapıda sürmüyor; hikâyeye baştan başlaman gerekiyor.')
          : null,
        ...dugmeler),
    );
  }

  yeniOyunSor() {
    altPencere('Yeni oyun başlasın mı?', [
      el('p', {}, 'Şimdiki oyunun silinecek. Saklamak istersen önce telefondaki Ayarlar\'dan kayıt kodunu al.'),
    ], [
      { yazi: 'Yeni oyun başlat', tur: 'tehlike', tikla: () => { this.app.kayitSil(); this.adSor(); } },
      { yazi: 'Vazgeç', tur: 'ikincil' },
    ]);
  }

  adSor() {
    this.kok.querySelector('.giris-dugmeler')?.remove();
    const girdi = el('input', {
      id: 'ad', type: 'text', placeholder: AD_ORNEGI, autocomplete: 'off', autocapitalize: 'words',
      spellcheck: 'false', maxlength: '16', enterkeyhint: 'go',
    });
    const basla = () => {
      const ad = adiDuzelt(girdi.value) || AD_ORNEGI;
      girdi.blur();
      this.app.yeniOyun(ad);
    };
    girdi.addEventListener('keydown', (e) => { if (e.key === 'Enter') basla(); });
    this.kok.append(el('div.ad-sor', {},
      el('label', { for: 'ad' }, 'Adın ne?'),
      girdi,
      el('p.not', {}, 'Herkes seni bu adla tanıyacak.'),
      el('button.dugme.birincil', { onclick: basla }, 'Başla'),
    ));
    setTimeout(() => girdi.focus(), 350);
  }
}

// Yalnızca harf, boşluk, kesme işareti ve tire; ilk harfler büyük (Türkçe kurallarıyla).
function adiDuzelt(metin) {
  const temiz = String(metin).replace(/[^\p{L}\s'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return temiz.split(' ').map((p) => p.charAt(0).toLocaleUpperCase('tr') + p.slice(1)).join(' ');
}
