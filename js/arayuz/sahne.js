// Sahne ekranı: kitap sayfası gibi akan anlatı, söz ve seçimler.

import { el, ikon, bekle } from './dom.js';
import { karanlikMi, tarihYaz, saatYaz, goreliZaman } from '../motor/tarih.js';

const VARSAYILAN_RENK = '#2c5f7a';

export class Sahne {
  constructor(app) {
    this.app = app;
    this.kok = document.getElementById('ekran-sahne');
    this.mesgul = false;
    this.kimlik = null;
    this.ilkParagrafVar = false;
  }

  async ac() {
    const oyun = this.app.oyun;
    const s = oyun && oyun.sahne;
    if (!s) { this.app.devam(); return; }
    const yeniSahne = this.kimlik !== `${s.kimlik}@${s.baslangic}`;
    this.kimlik = `${s.kimlik}@${s.baslangic}`;

    const k = s.kisi ? oyun.kisi(s.kisi) : null;
    this.kok.style.setProperty('--k', (k && k.renk) || VARSAYILAN_RENK);
    this.kok.classList.toggle('gece', s.ton === 'gece' || (s.ton !== 'gündüz' && karanlikMi(s.baslangic)));

    this.icerik = el('div.sahne-icerik');
    this.kaydirma = el('div.sahne-kaydirma', {}, this.icerik);
    this.telefonDugmesi = el('button.sahne-telefon-dugmesi', { onclick: () => this.telefonuAc(), 'aria-label': 'Telefonu aç' }, ikon('telefon'));
    this.perde = el('div.perde', {}, el('div.yer', {}, s.yer || ''), el('div.zaman', {}, `${tarihYaz(s.baslangic)} · ${saatYaz(s.baslangic)}`));
    this.kok.replaceChildren(this.kaydirma, this.telefonDugmesi, this.perde);

    this.icerik.append(el('header.sahne-ust', {},
      el('span.yer', {}, s.yer || ''),
      el('span.zaman', {}, `${tarihYaz(s.baslangic)}, ${saatYaz(s.baslangic)}`)));
    this.ilkParagrafVar = false;

    // Daha önce oynanmış kısım (kayıttan dönüş) sessizce yerine konur.
    const kayit = s.kayit.slice();
    const sonSecim = !s.bitti && s.akis.secim ? kayit.pop() : null;
    for (const b of kayit) if (b.t !== 'seçim' && b.t !== 'rehber') this.blokEkle(b, false);

    if (!kayit.length && yeniSahne) {
      this.perde.classList.add('acik');
      await bekle(1700);
      this.perde.classList.remove('acik');
      await bekle(250);
    }

    if (s.bitti) { this.blokEkle({ t: 'son' }, true); return; }
    if (sonSecim) {
      this.blokEkle(sonSecim, true);
      this.telefonGuncelle();
      if (!yeniSahne) this.kaydirma.scrollTop = this.kaydirma.scrollHeight; // telefondan dönüş
      return;
    }
    const yeni = this.app.calistir(() => oyun.sahneDevam(), 'sahne') || [];
    this.app.kaydet();
    await this.goster(yeni);
  }

  ciz() { /* sahne kendi akışını yönetir */ }

  async goster(bloklar) {
    this.mesgul = true;
    const oncedenIcerikVar = this.icerik.querySelectorAll('p, .soz').length > 0;
    let ilk = null;
    for (const b of bloklar) {
      const d = this.blokEkle(b, true);
      if (!ilk && d) ilk = d;
      if (b.t === 'anlatı' || b.t === 'söz' || b.t === 'ben') await bekle(110);
    }
    if (ilk && oncedenIcerikVar) {
      const hedef = ilk.offsetTop - 70;
      if (hedef > this.kaydirma.scrollTop + 20) this.kaydirma.scrollTo({ top: hedef, behavior: 'smooth' });
    }
    this.telefonGuncelle();
    this.mesgul = false;
  }

  blokEkle(b, animasyonlu) {
    let d = null;
    switch (b.t) {
      case 'anlatı': {
        d = el('p', {}, tipografi(b.metin));
        if (!this.ilkParagrafVar) { d.classList.add('ilk'); this.ilkParagrafVar = true; }
        break;
      }
      case 'söz':
        d = el('div.soz', {}, el('span.kim', {}, b.ad), el('span.metin', {}, tipografi(b.metin)));
        this.ilkParagrafVar = true;
        break;
      case 'ben':
        d = el('div.soz.ben', {}, el('span.kim', {}, 'Sen'), el('span.metin', {}, tipografi(b.metin)));
        break;
      case 'seçildi':
        d = el('div.secildi', {}, tipografi(b.metin.replace(/^\((.*)\)$/, '$1')));
        break;
      case 'yer':
        break;
      case 'telefon':
        d = el('div.sahne-telefon', {},
          el('div.ust-satir', {}, ikon('telefon'), 'Telefonuna bakıyorsun'),
          ...(b.bildirimler.length
            ? b.bildirimler.map((x) => el('div.bil', {}, el('b', {}, x.ad), el('time', {}, goreliZaman(x.t, this.app.oyun.t)), el('span', {}, kisalt(x.m))))
            : [el('div.bil', {}, el('span', {}, 'Yeni bir şey yok.'))]));
        break;
      case 'kaydedildi':
        d = el('div.kaydedildi', {}, `Rehbere “${b.ad}” olarak kaydedildi.`);
        break;
      case 'rehber':
        d = el('div.sahne-rehber', {},
          el('div.ust-satir', {}, 'Yeni kişi'),
          el('div.numara', {}, b.numara || ''),
          el('div.adlar', {}, ...b.secenekler.map((s) => el('button', { onclick: () => this.sec(s.i, d) }, s.metin))));
        break;
      case 'seçim':
        d = el('div.secimler', {}, ...b.secenekler.map((s, sira) => {
          const eylem = s.tip === 'eylem';
          const dugme = el(`button.secim${eylem ? '.eylem-secimi' : ''}`, { onclick: () => this.sec(s.i, d) },
            tipografi(eylem ? s.metin.replace(/^\((.*)\)$/, '$1') : `"${s.metin}"`));
          dugme.style.animationDelay = `${120 + sira * 70}ms`;
          return dugme;
        }));
        break;
      case 'son':
        d = el('div.sahne-son', {}, el('div.susler', {}, '· · ·'),
          el('button.dugme', { onclick: () => this.bitir() }, 'Devam'));
        break;
    }
    if (!d) return null;
    if (animasyonlu) d.classList.add('blok-gel');
    this.icerik.append(d);
    return d;
  }

  async sec(i, kap) {
    if (this.mesgul) return;
    this.mesgul = true;
    kap.classList.add('secildi-gitti');
    this.telefonDugmesi.classList.remove('gorunur');
    const oyun = this.app.oyun;
    const yeni = this.app.calistir(() => oyun.sahneSec(i), 'sahne seçimi') || [];
    this.app.kaydet();
    await bekle(220);
    kap.remove();
    this.mesgul = false;
    await this.goster(yeni);
  }

  // Telefona bakmak sahneyi değiştirmez: telefon açılır, "Sahneye dön" ile kalınan yere dönülür.
  telefonuAc() {
    if (this.mesgul) return;
    this.app.git('telefon');
  }

  telefonGuncelle() {
    const oyun = this.app.oyun;
    const s = oyun.sahne;
    const okunmamis = oyun.toplamOkunmamis();
    const gorunur = Boolean(s && !s.bitti && s.akis.secim && !s.akis.secim.rehber);
    this.telefonDugmesi.classList.toggle('gorunur', gorunur);
    this.telefonDugmesi.querySelector('.rozet')?.remove();
    if (gorunur && okunmamis > 0) this.telefonDugmesi.append(el('span.rozet', {}, okunmamis));
  }

  bitir() {
    const app = this.app;
    app.calistir(() => app.oyun.sahneKapat(), 'sahne kapanışı');
    app.kaydet();
    this.kimlik = null;
    app.devam();
  }
}

// Kitap tipografisi: düz tırnaklar “ ” olur, kesme işareti ’ olur.
function tipografi(metin) {
  return metin
    .replace(/(^|[\s(—–-])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(\p{L})'(\p{L})/gu, '$1’$2')
    .replace(/'/g, '’');
}

function kisalt(m) {
  const foto = m.match(/^\[Fotoğraf: [^\]]*\]\s*(.*)$/);
  if (foto) return foto[1] ? `📷 ${foto[1]}` : '📷 Fotoğraf';
  return m.length > 140 ? `${m.slice(0, 138)}…` : m;
}
