// Kilit ekranı: oyunun "şimdi"si. Saat, gök, bildirimler, ne yapacaksın.

import { el, ikon, havaIkonu, ilkHarf } from './dom.js';
import { gokKur } from './gok.js';
import { karanlikMi, goreliZaman, gunNo, saatYaz, tarihYaz } from '../motor/tarih.js';

export class Kilit {
  constructor(app) {
    this.app = app;
    this.kok = document.getElementById('ekran-kilit');
    this.sonCizilenN = 0;
  }

  ac() { this.ciz(); }

  ciz() {
    const oyun = this.app.oyun;
    if (!oyun) return;
    const s = oyun.simdi();
    const gece = karanlikMi(oyun.t);
    gokKur(this.kok, oyun.t, s.hava);
    const zemin = this.kok.querySelector('.gok-zemin');
    this.kok.replaceChildren(zemin);

    const hava = s.hava
      ? el('span', {}, ikon(havaIkonu(s.hava.durum, gece)), `${gece ? s.hava.gece : s.hava.gunduz}°`)
      : null;
    this.kok.append(el('header.kilit-ust', {},
      el('div.kilit-tarih', {}, `${s.gunAdi}, ${s.tarih}`),
      el('div.kilit-saat', {}, s.saatMetni),
      el('div.kilit-bilgi', {}, hava, el('span', {}, ikon('konum'), s.yer)),
    ));

    const tumu = oyun.bildirimler(60);
    const enYeni = tumu.reduce((a, b) => Math.max(a, b.n), 0);
    const gruplar = new Map();
    for (const b of tumu) {
      if (!gruplar.has(b.kisi)) gruplar.set(b.kisi, { ...b, fazla: 0 });
      else gruplar.get(b.kisi).fazla += 1;
    }
    this.kok.append(el('div.bildirimler', {}, ...[...gruplar.values()].slice(0, 5).map((b) => {
      const k = oyun.kisi(b.kisi);
      const ad = oyun.gorunenAd(b.kisi);
      const kart = el('button.bildirim', {
        degisken: { '--k': k.renk || '#8a8f98' },
        onclick: () => this.app.git('telefon', b.kisi),
      },
      el('span.avatar', { degisken: { '--k': k.renk || '#8a8f98' } }, oyun.durum.rehber[b.kisi] ? ilkHarf(ad) : ikon('rehber')),
      el('b', {}, ad),
      el('time', {}, goreliZaman(b.t, oyun.t)),
      el('p', {}, onizleme(b.m)),
      b.fazla ? el('small', {}, `${b.fazla} mesaj daha`) : null);
      if (b.n <= this.sonCizilenN) kart.style.animation = 'none';
      return kart;
    })));
    this.sonCizilenN = Math.max(this.sonCizilenN, enYeni);

    const alt = el('footer.kilit-alt');
    for (const r of oyun.randevular()) {
      const k = r.kisi ? oyun.kisi(r.kisi) : null;
      alt.append(el('div.randevu', { degisken: { '--k': (k && k.renk) || '#8a8f98' } },
        el('span.randevu-saat', {}, `${gunNo(r.t) === gunNo(oyun.t) ? 'Bugün' : gunNo(r.t) - gunNo(oyun.t) === 1 ? 'Yarın' : tarihYaz(r.t, false)} ${saatYaz(r.t)}`),
        el('span.randevu-yer', {}, r.yer)));
    }
    if (oyun.durum.oyunBitti) {
      alt.append(el('div.icerik-sonu', {},
        el('h2', {}, 'Son.'),
        el('p', {}, 'Pırnallı\'da bir sezon. Baştan oynarsan başka bir kış çıkabilir.')),
        el('button.dugme.ikincil', { onclick: () => { this.app.git('giris'); this.app.ekranlar.giris.yeniOyunSor(); } }, 'Yeni oyun'));
    } else if (oyun.bittiMi()) {
      alt.append(el('div.icerik-sonu', {},
        el('h2', {}, 'Şimdilik bu kadar.'),
        el('p', {}, 'Oyunun yazılmış kısmı burada bitiyor. Yeni bölümler eklendikçe tam buradan devam edeceksin.')));
    } else {
      const eylemler = oyun.eylemler();
      alt.append(el('section.ne-yapacaksin', {},
        el('h2', {}, 'Ne yapacaksın?'),
        ...eylemler.map((e) => el(`button.eylem${e.yerlesik ? '.yerlesik' : ''}`, { onclick: () => this.eylem(e.kimlik) },
          el('span', {}, e.baslik), ikon('ileri', 'ok')))));
    }
    const okunmamis = oyun.toplamOkunmamis();
    alt.append(el('button.telefon-dugmesi', { onclick: () => this.app.git('telefon') },
      ikon('telefon'), 'Telefon', okunmamis ? el('span.rozet', {}, okunmamis) : null));
    this.kok.append(alt);
  }

  eylem(kimlik) {
    const app = this.app;
    app.calistir(() => app.oyun.eylemSec(kimlik), `eylem:${kimlik}`);
    app.kaydet();
    if (app.oyun.sahne) app.git('sahne');
    else this.ciz();
  }
}

function onizleme(m) {
  const foto = m.match(/^\[Fotoğraf: [^\]]*\]\s*(.*)$/);
  if (foto) return foto[1] ? `📷 ${foto[1]}` : '📷 Fotoğraf';
  if (/^\[(Cevapsız arama|Arama)/.test(m)) return 'Cevapsız arama';
  return m;
}
