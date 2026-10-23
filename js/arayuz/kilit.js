// Kilit ekranı, bölüm perdesi olarak: bölümün numarası ve adı, o günün göğü, tarih, saat, yer; ya da romanın sonu.

import { el, ikon, havaIkonu } from './dom.js';
import { gokKur } from './gok.js';
import { karanlikMi } from '../motor/tarih.js';

export class Kilit {
  constructor(app) {
    this.app = app;
    this.kok = document.getElementById('ekran-kilit');
  }

  ac() { this.ciz(); }

  ciz() {
    if (this.app.oyun) this.perdeCiz();
  }

  perdeCiz() {
    const app = this.app;
    const oyun = app.oyun;
    const s = oyun.simdi();
    const gece = karanlikMi(oyun.t);
    gokKur(this.kok, oyun.t, s.hava);
    const zemin = this.kok.querySelector('.gok-zemin');
    this.kok.replaceChildren(zemin);
    const b = oyun.bolumBilgisi();

    if (!b) {
      const bitti = oyun.durum.oyunBitti;
      this.kok.append(
        el('div.perde-kart.perde-son', {},
          el('h1.bolum-adi', {}, bitti ? 'Son.' : 'Şimdilik bu kadar.'),
          el('p.perde-not', {}, bitti
            ? 'Pırnallı’da bir kış. Baştan okursan başka biri kalabilir, başka biri gidebilir.'
            : 'Romanın yazılmış kısmı burada bitiyor. Yeni bölümler eklendikçe tam buradan devam edeceksin.')),
        el('footer.perde-alt', {},
          bitti ? el('button.dugme.birincil', { onclick: () => { app.git('giris'); app.ekranlar.giris.yeniOyunSor(); } }, 'Baştan oku') : null,
          el('button.dugme.ikincil', { onclick: () => app.git('telefon') }, ikon('telefon'), ' Telefon')));
      return;
    }

    const hava = s.hava
      ? el('span', {}, ikon(havaIkonu(s.hava.durum, gece)), `${gece ? s.hava.gece : s.hava.gunduz}°`)
      : null;
    this.kok.append(
      el('div.perde-kart', {},
        b.perde ? el('div.perde-adi', {}, `${ROMA[b.perde.no] || b.perde.no}. Perde · ${b.perde.ad}`) : null,
        el('div.bolum-no', {}, `Bölüm ${b.no}`),
        el('h1.bolum-adi', {}, b.baslik),
        el('div.perde-zaman', {}, `${s.gunAdi}, ${s.tarih}`, el('span.saat', {}, s.saatMetni)),
        el('div.kilit-bilgi', {}, hava, b.yer ? el('span', {}, ikon('konum'), b.yer) : null)),
      el('footer.perde-alt', {},
        el('button.dugme.birincil', { onclick: () => app.git('sahne') }, b.basladi ? 'Kaldığın yerden' : 'Başla')));
  }
}

const ROMA = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

