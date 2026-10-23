// Oyunun içindeki telefon: sohbet listesi, sohbet, rehber, ayarlar.
// İki hâli var: arşiv (her an açılır, okumak hikâyeyi etkilemez) ve canlı yazışma
// (akış bir ">> yazışma"ya gelince sahne.js telefonu öne çıkarır; mesajlar "yazıyor…" ile tek tek gelir).

import { el, ikon, bekle, ilkHarf } from './dom.js';
import { karanlikMi, saatYaz, gunNo, goreliGun, tarihYaz } from '../motor/tarih.js';
import { kayitKoduGoster, kayitKoduYukle, hataRaporuAc } from './ayarlar.js';
import { SURUM } from '../surum.js';

const FOTO = /^\[Fotoğraf: ([^\]]*)\]\s*(.*)$/s;
const ARAMA = /^\[(Cevapsız arama|Arama[^\]]*)\]$/;
const GRUP_ARALIGI = 180;

export class Telefon {
  constructor(app) {
    this.app = app;
    this.kok = document.getElementById('ekran-telefon');
    this.sayfa = 'liste';
    this.kisi = null;
    this.cizilenN = new Map();
    this.canli = null; // { kisi, gosterN, gosterT, yaziyor, secim, kapat }
  }

  ac(kisi = null) {
    this.canli = null;
    if (kisi) { this.sayfa = 'sohbet'; this.kisi = kisi; }
    else if (this.sayfa === 'sohbet' && !this.kisi) this.sayfa = 'liste';
    this.ciz();
  }

  ciz() {
    const oyun = this.app.oyun;
    if (!oyun) return;
    this.kok.classList.toggle('karanlik', karanlikMi(oyun.t));
    if (this.sayfa === 'sohbet') oyun.oku(this.kisi);

    const govde = el('div.uygulama-govde');
    if (this.sayfa === 'sohbet') govde.append(this.sohbetCiz());
    else if (this.sayfa === 'rehber') govde.append(this.rehberCiz());
    else if (this.sayfa === 'ayarlar') govde.append(this.ayarlarCiz());
    else govde.append(this.listeCiz());

    const parcalar = [govde];
    if (this.sayfa !== 'sohbet') parcalar.push(this.sekmelerCiz());
    const eskiKaydirma = this.kok.querySelector('.mesajlar');
    const enAlttaydi = !eskiKaydirma || eskiKaydirma.scrollHeight - eskiKaydirma.scrollTop - eskiKaydirma.clientHeight < 80;
    this.kok.replaceChildren(...parcalar);

    const mesajlar = this.kok.querySelector('.mesajlar');
    if (mesajlar && enAlttaydi) mesajlar.scrollTop = mesajlar.scrollHeight;
  }

  git(sayfa, kisi = null) {
    this.sayfa = sayfa;
    this.kisi = kisi;
    this.ciz();
    this.app.kaydet();
  }

  // ---------- Sohbet listesi ----------

  listeCiz() {
    const oyun = this.app.oyun;
    const sayfa = el('div.sayfa');
    sayfa.append(el('header.baslik-cubugu', {}, el('h1', {}, 'Mesajlar'), el('span.saat-kucuk', {}, `${tarihYaz(oyun.t)} · ${saatYaz(oyun.t)}`)));
    const liste = el('div.liste');
    for (const s of oyun.sohbetler()) {
      const k = oyun.kisi(s.kisi);
      const ad = oyun.gorunenAd(s.kisi);
      const onizleme = s.son.k === 'b' ? `Sen: ${kisaMetin(s.son.m)}` : kisaMetin(s.son.m);
      liste.append(el(`button.sohbet-satiri${s.okunmamis ? '.okunmamis' : ''}`, { onclick: () => this.git('sohbet', s.kisi) },
        this.avatar(s.kisi, k),
        el('div.orta', {}, el('b', {}, ad), el('span.onizleme', {}, onizleme)),
        el('div.sag', {}, el('time', {}, listeZamani(s.son.t, oyun.t)), s.okunmamis ? el('span.rozet', {}, s.okunmamis) : null)));
    }
    sayfa.append(liste);
    return sayfa;
  }

  avatar(kisi, k = this.app.oyun.kisi(kisi)) {
    const kayitli = this.app.oyun.durum.rehber[kisi];
    return el('span.avatar', { degisken: { '--k': kayitli ? (k.renk || '#8a8f98') : '#9a9aa0' } },
      kayitli ? ilkHarf(kayitli) : ikon('rehber'));
  }

  sekmelerCiz() {
    const oyun = this.app.oyun;
    const okunmamis = oyun.toplamOkunmamis();
    const sekme = (ad, yazi, ikonAdi, tikla, rozet = 0) => el(`button.sekme${this.sayfa === ad ? '.aktif' : ''}`, { onclick: tikla },
      ikon(ikonAdi), yazi, rozet ? el('span.rozet', {}, rozet) : null);
    return el('nav.sekmeler', {},
      sekme('liste', 'Mesajlar', 'mesaj', () => this.git('liste'), okunmamis),
      sekme('rehber', 'Rehber', 'rehber', () => this.git('rehber')),
      sekme('ayarlar', 'Ayarlar', 'ayarlar', () => this.git('ayarlar')),
      sekme('kilit', 'Hikâyeye dön', 'geri', () => { this.sayfa = 'liste'; this.app.devam(); }));
  }

  // ---------- Sohbet ----------

  sohbetCiz() {
    const oyun = this.app.oyun;
    const kisi = this.kisi;
    const k = oyun.kisi(kisi);
    const sayfa = el('div.sayfa', { degisken: { '--k': k.renk || '#8a8f98' } });

    const c = this.canli && this.canli.kisi === kisi ? this.canli : null;
    const simdi = c ? c.gosterT : oyun.t;
    const yaziyor = Boolean(c && c.yaziyor);
    sayfa.append(el('header.sohbet-basligi', {},
      c ? el('span') : el('button.geri', { onclick: () => this.git('liste'), 'aria-label': 'Geri' }, ikon('geri')),
      this.avatar(kisi, k),
      el('div', {}, el('b', {}, oyun.gorunenAd(kisi)), el(`small${yaziyor ? '.canli' : ''}`, {}, this.durumSatiri(kisi, yaziyor, simdi)))));

    const kutu = el('div.mesajlar');
    const mesajlar = (oyun.durum.sohbet[kisi] || []).filter((m) => !c || m.n <= c.gosterN);
    const oncekiN = this.cizilenN.get(kisi) ?? Infinity;
    let onceki = null;
    for (const m of mesajlar) {
      if (!onceki || gunNo(onceki.t) !== gunNo(m.t)) {
        kutu.append(el('div.gun-ayraci', {}, goreliGun(m.t, simdi)));
        onceki = null;
      }
      const yeni = m.n > oncekiN;
      const arama = m.k === 'o' && m.m.match(ARAMA);
      if (arama) {
        kutu.append(el('div.arama-satiri', {}, ikon('arama'), `${arama[1]} · ${saatYaz(m.t)}`));
        onceki = null;
        continue;
      }
      const grupIci = onceki && onceki.k === m.k && m.t - onceki.t < GRUP_ARALIGI;
      kutu.append(this.balon(m, k, { grupIci, yeni, simdi }));
      onceki = m;
    }
    if (yaziyor) kutu.append(el('div.balon.gelen.yeni.grup-yeni', { degisken: { '--k': k.renk || '#8a8f98' } }, el('span.yaziyor-balonu', {}, el('i'), el('i'), el('i'))));
    this.cizilenN.set(kisi, mesajlar.reduce((a, m) => Math.max(a, m.n), 0));
    sayfa.append(kutu);
    if (c) sayfa.append(this.canliYazmaAlani(c));
    return sayfa;
  }

  balon(m, k, { grupIci, yeni, simdi }) {
    const giden = m.k === 'b';
    const okundu = m.okundu !== null && m.okundu !== undefined && m.okundu <= simdi;
    const sinif = `div.balon.${giden ? 'giden' : 'gelen'}${grupIci ? '.grup-ici' : '.grup-yeni'}${yeni ? '.yeni' : ''}`;
    const zaman = el('span.zaman', {}, saatYaz(m.t),
      giden ? ikon(okundu ? 'ciftTik' : 'tik', `tik${okundu ? ' okundu' : ''}`) : null);
    const foto = m.m.match(FOTO);
    if (foto) {
      return el(`${sinif}.foto`, { degisken: { '--k': k.renk || '#8a8f98' } },
        el('div.foto-kart', {}, foto[1]),
        el('div.alt-yazi', {}, foto[2] || '', zaman));
    }
    return el(sinif, { degisken: { '--k': k.renk || '#8a8f98' } }, m.m, zaman);
  }

  durumSatiri(kisi, yaziyor, simdi = this.app.oyun.t) {
    const oyun = this.app.oyun;
    if (yaziyor) return 'yazıyor…';
    if (this.canli && this.canli.kisi === kisi) {
      // Canlı yazışmada "son görülme" ekranın gösterdiği ana göre: son gelen mesaj ya da okuma.
      const son = (oyun.durum.sohbet[kisi] || []).filter((m) => m.n <= this.canli.gosterN)
        .reduce((a, m) => Math.max(a, m.k === 'o' ? m.t : (m.okundu !== null && m.okundu <= simdi ? m.okundu : -Infinity)), -Infinity);
      if (simdi - son < 120) return 'çevrimiçi';
    } else if (oyun.cevrimici(kisi)) return 'çevrimiçi';
    const son = oyun.sonGorulme(kisi);
    if (son === undefined || son === null || son === -Infinity) return oyun.durum.rehber[kisi] ? '' : 'Rehberde kayıtlı değil';
    const gun = goreliGun(Math.min(son, simdi), simdi);
    if (gun === 'Bugün') return `son görülme bugün ${saatYaz(son)}`;
    if (gun === 'Dün') return `son görülme dün ${saatYaz(son)}`;
    return `son görülme ${gun.split(' ').slice(0, 2).join(' ')}`;
  }

  // ---------- Canlı yazışma ----------

  // gosterN: ekranda gösterilecek son mesajın numarası (motor bütün mesajları önceden ekler; ekran tek tek açar).
  canliBasla(kisi, gosterN, gosterT) {
    this.canli = { kisi, gosterN, gosterT, yaziyor: false, secim: null, kapat: null };
    this.sayfa = 'sohbet';
    this.kisi = kisi;
  }

  // Sahnenin oynattığı bir yazışma bloğunu canlandırır; bitince döner.
  async canliBlok(b) {
    const c = this.canli;
    if (!c) return;
    switch (b.t) {
      case 'mesaj':
        if (b.k === 'o') {
          if (b.okunduAn !== null && b.okunduAn !== undefined) { await bekle(450); c.gosterT = b.okunduAn; this.ciz(); await bekle(700); }
          if (b.yazma > 0) {
            c.yaziyor = true;
            this.ciz();
            await bekle(Math.min(2600, Math.max(900, 600 + b.metin.length * 24)));
            c.yaziyor = false;
          } else await bekle(200);
        }
        c.gosterN = Math.max(c.gosterN, b.n);
        c.gosterT = b.an;
        this.ciz();
        await bekle(b.k === 'b' ? 500 : 350);
        return;
      case 'okundu':
        await bekle(500);
        c.gosterT = b.an;
        this.ciz();
        await bekle(600);
        return;
      case 'ara':
        await bekle(800);
        c.gosterT = b.an;
        this.ciz();
        return;
      case 'seçim':
      case 'rehber':
        c.secim = b;
        this.ciz();
        return;
      case 'kaydedildi':
        this.ciz();
        await bekle(300);
        return;
      default:
        await bekle(200);
    }
  }

  // Yazışma bitti: "Telefonu bırak"a dokunulunca söz sayfaya döner.
  canliBitir() {
    return new Promise((coz) => {
      if (!this.canli) { coz(); return; }
      this.canli.secim = null;
      this.canli.kapat = () => { this.canli = null; coz(); };
      this.ciz();
    });
  }

  canliYazmaAlani(c) {
    const oyun = this.app.oyun;
    const alan = el('div.yazma-alani.canli-alan');
    if (c.kapat) {
      alan.append(el('button.telefonu-birak', { onclick: () => c.kapat() }, 'Telefonu bırak'));
      return alan;
    }
    if (!c.secim) return alan;
    if (c.secim.t === 'rehber') {
      alan.append(el('div.ipucu', {}, `Kişiyi kaydet · ${oyun.kisi(c.secim.kisi).numara || ''}`));
      for (const sec of c.secim.secenekler) alan.append(el('button.cevap.rehber-cevabi', { onclick: () => this.canliSec(sec.i) }, sec.metin));
      return alan;
    }
    for (const sec of c.secim.secenekler) {
      const eylem = sec.tip === 'eylem';
      alan.append(el(`button.cevap${eylem ? '.eylem-cevabi' : ''}`, { onclick: () => this.canliSec(sec.i) },
        eylem ? sec.metin.replace(/^\((.*)\)$/, '$1') : sec.metin));
    }
    return alan;
  }

  canliSec(i) {
    const c = this.canli;
    if (!c || !c.secim) return;
    c.secim = null;
    this.ciz();
    this.app.ekranlar.sahne.secimYap(i);
  }

  // ---------- Rehber ----------

  rehberCiz() {
    const oyun = this.app.oyun;
    const sayfa = el('div.sayfa');
    sayfa.append(el('header.baslik-cubugu', {}, el('h1', {}, 'Rehber')));
    const kisiler = Object.entries(oyun.durum.rehber).sort((a, b) => a[1].localeCompare(b[1], 'tr'));
    const liste = el('div.liste');
    const kutu = el('div.kutu');
    for (const [kisi, ad] of kisiler) {
      kutu.append(el('button.kutu-satiri', { onclick: () => this.git('sohbet', kisi) },
        this.avatar(kisi), el('span', {}, ad), el('small', {}, oyun.kisi(kisi).numara || '')));
    }
    liste.append(el('div', { stil: { height: '8px' } }), kutu);
    sayfa.append(liste);
    return sayfa;
  }

  // ---------- Ayarlar ----------

  ayarlarCiz() {
    const app = this.app;
    const sayfa = el('div.sayfa');
    sayfa.append(el('header.baslik-cubugu', {}, el('h1', {}, 'Ayarlar')));
    const satir = (yazi, tikla, sinif = '') => el(`button.kutu-satiri${sinif}`, { onclick: tikla }, el('span', {}, yazi), ikon('ileri'));
    sayfa.append(el('div.liste', {},
      el('div.bolum-baslik', {}, 'Kayıt'),
      el('div.kutu', {},
        satir('Kayıt kodunu al', () => kayitKoduGoster(app)),
        satir('Kayıt kodunu yükle', () => kayitKoduYukle(app, () => app.devam()))),
      el('p.aciklama', {}, 'Oyun her adımda bu telefona kendiliğinden kaydedilir. Kayıt kodu bir yedektir: başka bir telefonda ya da her şey silinirse onunla devam edersin.'),
      el('div.bolum-baslik', {}, 'Yardım'),
      el('div.kutu', {}, satir('Hata raporu', () => hataRaporuAc(app))),
      el('div.bolum-baslik', {}, 'Oyun'),
      el('div.kutu', {},
        satir('Başlangıç ekranı', () => app.git('giris')),
        satir('Yeni oyun', () => { app.git('giris'); app.ekranlar.giris.yeniOyunSor(); }, '.tehlike')),
      el('p.aciklama', {}, `Pırnallı · sürüm ${SURUM}`)));
    return sayfa;
  }
}

function kisaMetin(m) {
  const foto = m.match(FOTO);
  if (foto) return foto[2] ? `📷 ${foto[2]}` : '📷 Fotoğraf';
  if (ARAMA.test(m)) return 'Cevapsız arama';
  return m;
}

function listeZamani(t, simdi) {
  const g = goreliGun(t, simdi);
  if (g === 'Bugün') return saatYaz(t);
  if (g === 'Dün') return 'Dün';
  return g.split(' ').slice(0, 2).join(' ');
}
