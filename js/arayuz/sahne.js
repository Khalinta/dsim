// Sahne ekranı: kitap sayfası gibi akan anlatı, söz ve seçimler.
// Bütün bölüm bu sayfada akar. Akış bir yazışmaya gelince telefon ekranı öne çıkar (telefon.js, canlı kip);
// yazışma bitince sayfaya dönülür ve yazışmanın küçük bir izi sayfada kalır.

import { el, ikon, bekle } from './dom.js';
import { karanlikMi, tarihYaz, saatYaz, gunBilgisi } from '../motor/tarih.js';

const VARSAYILAN_RENK = '#2c5f7a';

export class Sahne {
  constructor(app) {
    this.app = app;
    this.kok = document.getElementById('ekran-sahne');
    this.mesgul = false;
    this.ilkParagrafVar = false;
    this.mod = 'kitap'; // ya da yazışılan kişi
    this.iz = null; // süren yazışmanın sayfada kalacak izi
  }

  ac() { this.romanAc(); }

  ciz() { /* sayfa kendi akışını yönetir */ }

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
      case 'son': {
        const yazi = b.sonraki ? 'Sonraki bölüm' : b.oyunBitti ? 'Son' : 'Devam';
        d = el('div.sahne-son', {}, el('div.susler', {}, '· · ·'),
          el('button.dugme', { onclick: () => this.bitir() }, yazi));
        break;
      }
      case 'gün': {
        const g = gunBilgisi(b.an);
        d = el('div.gun-ayraci-kitap', {}, `${g.gunAdi}, ${g.tarih}`);
        this.ilkParagrafVar = false;
        break;
      }
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
    await this.oynat(yeni);
  }

  // Telefona bakmak hikâyeyi değiştirmez: telefon açılır, "Hikâyeye dön" ile kalınan yere dönülür.
  telefonuAc() {
    if (this.mesgul) return;
    this.app.git('telefon');
  }

  telefonGuncelle() {
    const oyun = this.app.oyun;
    const s = oyun.sahne;
    const okunmamis = oyun.toplamOkunmamis();
    const gorunur = Boolean(s && !s.bitti && s.akis.secim && !s.akis.secim.rehber && !s.kanal);
    this.telefonDugmesi.classList.toggle('gorunur', gorunur);
    this.telefonDugmesi.querySelector('.rozet')?.remove();
    if (gorunur && okunmamis > 0) this.telefonDugmesi.append(el('span.rozet', {}, okunmamis));
  }

  romanAc() {
    const app = this.app;
    const oyun = app.oyun;
    const s = oyun.sahne;
    if (!s) { app.devam(); return; }
    const k = s.kisi ? oyun.kisi(s.kisi) : null;
    this.kok.style.setProperty('--k', (k && k.renk) || VARSAYILAN_RENK);
    this.kok.classList.toggle('gece', s.ton === 'gece' || (s.ton !== 'gündüz' && karanlikMi(s.baslangic)));

    this.icerik = el('div.sahne-icerik');
    this.kaydirma = el('div.sahne-kaydirma', {}, this.icerik);
    this.telefonDugmesi = el('button.sahne-telefon-dugmesi', { onclick: () => this.telefonuAc(), 'aria-label': 'Telefonu aç' }, ikon('telefon'));
    this.kok.replaceChildren(this.kaydirma, this.telefonDugmesi);
    const b = oyun.bolumBilgisi();
    this.icerik.append(el('header.bolum-ust', {},
      el('span.bolum-no', {}, `Bölüm ${b.no}`),
      el('h1', {}, b.baslik),
      el('span.zaman', {}, `${tarihYaz(s.baslangic)}, ${saatYaz(s.baslangic)}${b.yer ? ` · ${b.yer}` : ''}`)));
    this.ilkParagrafVar = false;
    this.mod = 'kitap';
    this.iz = null;

    // Bölümün okunmuş kısmı sessizce yerine konur.
    const kayit = s.kayit;
    const bekleyen = !s.bitti && s.akis.secim ? kayit[kayit.length - 1] : null;
    for (const blok of kayit) {
      if (blok === bekleyen) break;
      if (blok.t !== 'seçim' && blok.t !== 'rehber') this.kitabaEkle(blok, false);
    }
    if (kayit.length) requestAnimationFrame(() => { this.kaydirma.scrollTop = this.kaydirma.scrollHeight; });
    if (s.bitti) return;
    if (bekleyen) {
      if (bekleyen.kanal) {
        // Yazışmanın ortasında kalınmış: telefon, cevap bekleyen hâliyle açılır.
        const telefon = app.ekranlar.telefon;
        this.mod = bekleyen.kanal;
        telefon.canliBasla(bekleyen.kanal, oyun.durum.sayac, oyun.t);
        telefon.canliBlok(bekleyen);
        app.gorunur('telefon');
        telefon.ciz();
        return;
      }
      this.blokEkle(bekleyen, false);
      this.telefonGuncelle();
      return;
    }
    const yeni = app.calistir(() => oyun.sahneDevam(), 'sahne') || [];
    app.kaydet();
    this.oynat(yeni);
  }

  // Blok kitapta görünür ya da süren yazışmanın izine eklenir. Kanal blokları izi açar ve kapatır.
  kitabaEkle(b, animasyonlu) {
    if (b.t === 'kanal') {
      let d = null;
      if (this.iz) { d = this.izCiz(this.iz, animasyonlu); this.iz = null; }
      if (b.kisi) this.iz = { kisi: b.kisi, an: b.an, bloklar: [] };
      return d;
    }
    if (b.kanal) {
      if (this.iz) this.iz.bloklar.push(b);
      return null;
    }
    return this.blokEkle(b, animasyonlu);
  }

  // Yeni blokları sırayla oynatır: anlatı sayfada, yazışma telefonda.
  async oynat(bloklar) {
    this.mesgul = true;
    const app = this.app;
    const telefon = app.ekranlar.telefon;
    let ilk = null;
    let okunacak = false; // sayfaya okunacak yeni metin geldi mi (seçimin izi sayılmaz)
    let oncedenIcerikVar = this.icerik.querySelectorAll('p, .soz').length > 0;
    try {
      for (let n = 0; n < bloklar.length; n++) {
        const b = bloklar[n];
        if (b.t === 'kanal') {
          if (b.kisi) {
            const sonraki = bloklar.slice(n + 1).find((x) => x.t === 'mesaj' && x.kanal === b.kisi);
            if (this.mod === 'kitap') {
              // Sayfaya yeni metin geldiyse telefon kendiliğinden öne çıkmaz: oyuncu okuyup telefona kendisi bakar.
              if (okunacak) { this.kaydir(ilk); await this.telefonTitre(); } else await bekle(250);
              ilk = null;
              okunacak = false;
            } else await bekle(900);
            telefon.canliBasla(b.kisi, sonraki ? sonraki.n - 1 : app.oyun.durum.sayac, b.an);
            if (this.mod === 'kitap') app.gorunur('telefon');
            telefon.ciz();
            await bekle(450);
          } else {
            await telefon.canliBitir();
            app.gorunur('sahne');
            oncedenIcerikVar = true;
          }
          this.mod = b.kisi || 'kitap';
          const d = this.kitabaEkle(b, true);
          if (!ilk && d) ilk = d;
          continue;
        }
        if (b.kanal) {
          this.kitabaEkle(b, true);
          await telefon.canliBlok(b);
          continue;
        }
        const d = this.kitabaEkle(b, true);
        if (!ilk && d) ilk = d;
        if (b.t === 'anlatı' || b.t === 'söz' || b.t === 'gün') okunacak = true;
        if (b.t === 'anlatı' || b.t === 'söz' || b.t === 'ben') await bekle(110);
      }
      if (this.mod === 'kitap' && oncedenIcerikVar) this.kaydir(ilk);
      this.telefonGuncelle();
    } finally {
      this.mesgul = false;
    }
  }

  telefonTitre() {
    return new Promise((coz) => {
      const d = el('button.telefon-titriyor.blok-gel', { onclick: () => { d.remove(); coz(); } },
        ikon('telefon'), el('span', {}, 'Telefonuna bak'));
      this.icerik.append(d);
    });
  }

  kaydir(hedefDugum) {
    if (!hedefDugum) return;
    const hedef = hedefDugum.offsetTop - 70;
    if (hedef > this.kaydirma.scrollTop + 20) this.kaydirma.scrollTo({ top: hedef, behavior: 'smooth' });
  }

  // Telefondaki seçim: telefon ekranı cevabı gösterir, akış buradan sürer.
  async secimYap(i) {
    if (this.mesgul) return;
    const app = this.app;
    const yeni = app.calistir(() => app.oyun.sahneSec(i), 'yazışma seçimi') || [];
    app.kaydet();
    await this.oynat(yeni);
  }

  // Yazışmanın sayfada kalan izi: kimle, saat kaçta, ne yazışıldı. Dokununca o sohbet açılır.
  izCiz(iz, animasyonlu) {
    const oyun = this.app.oyun;
    const k = oyun.kisi(iz.kisi);
    const satirlar = [];
    for (const b of iz.bloklar) {
      if (b.t === 'mesaj') satirlar.push(el(`div.iz-m.${b.k === 'b' ? 'giden' : 'gelen'}`, {}, kisalt(b.metin)));
      else if (b.t === 'seçildi') satirlar.push(el('div.iz-not', {}, tipografi(b.metin.replace(/^\((.*)\)$/, '$1'))));
      else if (b.t === 'ara' && b.sure >= 600) satirlar.push(el('div.iz-not', {}, sureYaz(b.sure)));
    }
    if (!satirlar.length) return null;
    const d = el('button.yazisma-izi', { degisken: { '--kk': k.renk || '#8a8f98' }, onclick: () => this.arsivAc(iz.kisi) },
      el('div.iz-ust', {}, ikon('mesaj'), el('b', {}, oyun.gorunenAd(iz.kisi)), el('time', {}, saatYaz(iz.an))),
      ...satirlar);
    if (animasyonlu) d.classList.add('blok-gel');
    this.icerik.append(d);
    return d;
  }

  arsivAc(kisi) {
    if (this.mesgul) return;
    this.app.git('telefon', kisi);
  }

  bitir() {
    const app = this.app;
    app.calistir(() => app.oyun.sahneKapat(), 'sahne kapanışı');
    app.kaydet();
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

function sureYaz(sn) {
  const dk = Math.round(sn / 60);
  if (dk < 60) return `${dk} dakika sonra`;
  const sa = Math.round(dk / 60);
  return sa === 1 ? 'Bir saat sonra' : `${sa} saat sonra`;
}

function kisalt(m) {
  const foto = m.match(/^\[Fotoğraf: [^\]]*\]\s*(.*)$/);
  if (foto) return foto[1] ? `📷 ${foto[1]}` : '📷 Fotoğraf';
  return m.length > 140 ? `${m.slice(0, 138)}…` : m;
}
