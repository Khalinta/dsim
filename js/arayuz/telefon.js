// Oyunun içindeki telefon: sohbet listesi, sohbet, rehber, ayarlar.

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
    this.canliYaziyor = null;
    this.dongude = false;
  }

  ac(kisi = null) {
    if (kisi) { this.sayfa = 'sohbet'; this.kisi = kisi; }
    else if (this.sayfa === 'sohbet' && !this.kisi) this.sayfa = 'liste';
    this.ciz();
    this.canliDongu();
  }

  kapan() {
    this.canliYaziyor = null;
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
    this.canliDongu();
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
      const yaziyor = s.yaziyor || this.canliYaziyor === s.kisi;
      const onizleme = yaziyor ? 'yazıyor…' : (s.son.k === 'b' ? `Sen: ${kisaMetin(s.son.m)}` : kisaMetin(s.son.m));
      liste.append(el(`button.sohbet-satiri${s.okunmamis ? '.okunmamis' : ''}`, { onclick: () => this.git('sohbet', s.kisi) },
        this.avatar(s.kisi, k),
        el('div.orta', {}, el('b', {}, ad), el(`span.onizleme${yaziyor ? '.yaziyor' : ''}`, {}, onizleme)),
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
      sekme('kilit', 'Kilitle', 'kilit', () => { this.sayfa = 'liste'; this.app.git('kilit'); }));
  }

  // ---------- Sohbet ----------

  sohbetCiz() {
    const oyun = this.app.oyun;
    const kisi = this.kisi;
    const k = oyun.kisi(kisi);
    const sayfa = el('div.sayfa', { degisken: { '--k': k.renk || '#8a8f98' } });

    const yaziyor = oyun.yaziyor(kisi) || this.canliYaziyor === kisi;
    sayfa.append(el('header.sohbet-basligi', {},
      el('button.geri', { onclick: () => this.git('liste'), 'aria-label': 'Geri' }, ikon('geri')),
      this.avatar(kisi, k),
      el('div', {}, el('b', {}, oyun.gorunenAd(kisi)), el(`small${yaziyor ? '.canli' : ''}`, {}, this.durumSatiri(kisi, yaziyor)))));

    const kutu = el('div.mesajlar');
    const mesajlar = oyun.durum.sohbet[kisi] || [];
    const oncekiN = this.cizilenN.get(kisi) ?? Infinity;
    let onceki = null;
    for (const m of mesajlar) {
      if (!onceki || gunNo(onceki.t) !== gunNo(m.t)) {
        kutu.append(el('div.gun-ayraci', {}, goreliGun(m.t, oyun.t)));
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
      kutu.append(this.balon(m, k, { grupIci, yeni }));
      onceki = m;
    }
    if (yaziyor) kutu.append(el('div.balon.gelen.yeni.grup-yeni', { degisken: { '--k': k.renk || '#8a8f98' } }, el('span.yaziyor-balonu', {}, el('i'), el('i'), el('i'))));
    this.cizilenN.set(kisi, mesajlar.reduce((a, m) => Math.max(a, m.n), 0));
    sayfa.append(kutu, this.yazmaAlani(kisi, yaziyor));
    return sayfa;
  }

  balon(m, k, { grupIci, yeni }) {
    const oyun = this.app.oyun;
    const giden = m.k === 'b';
    const sinif = `div.balon.${giden ? 'giden' : 'gelen'}${grupIci ? '.grup-ici' : '.grup-yeni'}${yeni ? '.yeni' : ''}`;
    const zaman = el('span.zaman', {}, saatYaz(m.t),
      giden ? ikon(oyun.okunduMu(m) ? 'ciftTik' : 'tik', `tik${oyun.okunduMu(m) ? ' okundu' : ''}`) : null);
    const foto = m.m.match(FOTO);
    if (foto) {
      return el(`${sinif}.foto`, { degisken: { '--k': k.renk || '#8a8f98' } },
        el('div.foto-kart', {}, foto[1]),
        el('div.alt-yazi', {}, foto[2] || '', zaman));
    }
    return el(sinif, { degisken: { '--k': k.renk || '#8a8f98' } }, m.m, zaman);
  }

  durumSatiri(kisi, yaziyor) {
    const oyun = this.app.oyun;
    if (yaziyor) return 'yazıyor…';
    if (oyun.cevrimici(kisi)) return 'çevrimiçi';
    const son = oyun.sonGorulme(kisi);
    if (son === undefined || son === null || son === -Infinity) return oyun.durum.rehber[kisi] ? '' : 'Rehberde kayıtlı değil';
    const gun = goreliGun(son, oyun.t);
    if (gun === 'Bugün') return `son görülme bugün ${saatYaz(son)}`;
    if (gun === 'Dün') return `son görülme dün ${saatYaz(son)}`;
    return `son görülme ${gun.split(' ').slice(0, 2).join(' ')}`;
  }

  yazmaAlani(kisi, yaziyor) {
    const oyun = this.app.oyun;
    const s = oyun.secenekler(kisi);
    const alan = el('div.yazma-alani');
    if (s.tur === 'yok' || !s.secenekler.length) {
      if (!yaziyor) alan.append(el('div.bos', {}, 'Şu an yazacak bir şeyin yok.'));
      return alan;
    }
    if (s.tur === 'rehber') {
      alan.append(el('div.ipucu', {}, `Kişiyi kaydet · ${oyun.kisi(s.kisi).numara || ''}`));
      for (const sec of s.secenekler) {
        alan.append(el('button.cevap.rehber-cevabi', { onclick: () => this.cevapla(kisi, sec.i) }, sec.metin));
      }
      return alan;
    }
    if (s.tur === 'açılış') alan.append(el('div.ipucu', {}, 'Yaz'));
    for (const sec of s.secenekler) {
      const eylem = sec.tip === 'eylem';
      alan.append(el(`button.cevap${eylem ? '.eylem-cevabi' : ''}`, { onclick: () => this.cevapla(kisi, sec.i) },
        eylem ? sec.metin.replace(/^\((.*)\)$/, '$1') : sec.metin));
    }
    return alan;
  }

  cevapla(kisi, i) {
    const app = this.app;
    app.calistir(() => app.oyun.cevapla(kisi, i), `cevap:${kisi}`);
    app.kaydet();
    if (app.oyun.sahne) { app.git('sahne'); return; }
    this.ciz();
    this.canliDongu();
  }

  // Ekran açıkken yakındaki mesajlar kendiliğinden gelir: "yazıyor…", sonra mesaj.
  async canliDongu() {
    if (this.dongude) return;
    this.dongude = true;
    const app = this.app;
    try {
      for (let tur = 0; tur < 400; tur++) {
        if (app.ekran !== 'telefon' || !app.oyun) break;
        const y = app.oyun.yakinOlay(300);
        if (!y) break;
        const acik = this.sayfa === 'sohbet' && this.kisi === y.kisi;
        if (y.yaziyor) {
          this.canliYaziyor = y.kisi;
          this.ciz();
          const sure = acik ? Math.min(2600, Math.max(900, 650 + (y.metin || '').length * 22)) : 1400;
          await bekle(sure);
        } else {
          await bekle(acik ? 700 : 400);
        }
        this.canliYaziyor = null;
        if (app.ekran !== 'telefon') break;
        app.calistir(() => app.oyun.ilerle(y.t), 'canlı akış');
        app.kaydet();
        if (app.oyun.sahne) { app.git('sahne'); break; }
        this.ciz();
      }
    } finally {
      this.canliYaziyor = null;
      this.dongude = false;
    }
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
