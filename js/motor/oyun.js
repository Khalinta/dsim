// Oyunun motoru. Ekrandan bağımsızdır: hem tarayıcıda hem Node'da (testler, okuma aracı) çalışır.

import { ayristir } from './ayristirici.js';
import { hesapla, dogru } from './ifade.js';
import { tarihCoz, gunBilgisi, gunNo, saatYaz, tarihYaz, GUN } from './tarih.js';

export const DURUM_SURUMU = 1;
const GUNLUK_SINIRI = 80;

// dosyalar: [{ ad, metin }], veri: { kisiler, ayar, hava }
export function icerikDerle(dosyalar, veri) {
  const parcalar = new Map();
  const hatalar = [];
  for (const { ad, metin } of dosyalar) {
    const sonuc = ayristir(metin, ad);
    hatalar.push(...sonuc.hatalar);
    for (const p of sonuc.parcalar) {
      if (parcalar.has(p.kimlik)) {
        hatalar.push({ dosya: ad, satir: p.satir, mesaj: `Parça kimliği iki kez kullanılmış: ${p.kimlik} (ilki ${parcalar.get(p.kimlik).dosya})` });
        continue;
      }
      parcalar.set(p.kimlik, p);
    }
  }
  const ayar = {
    baslangic: tarihCoz(veri.ayar.başlangıç),
    ilkYer: veri.ayar.ilk_yer,
  };
  if (ayar.baslangic === null) hatalar.push({ dosya: 'oyun.json', satir: 0, mesaj: 'başlangıç zamanı anlaşılmadı' });

  // Oyun bir romandır: bölümden bölüme akar. Sahneleri bölümler ">> oyna" / ">> geç" ile çağırır.
  const bolumler = [...parcalar.values()].filter((p) => p.tur === 'bölüm').sort((a, b) => a.bolum - b.bolum);
  if (!bolumler.length) hatalar.push({ dosya: 'dizin.txt', satir: 0, mesaj: 'İçerikte hiç bölüm yok' });

  return { parcalar, hatalar, kisiler: veri.kisiler, ayar, hava: veri.hava || [], bolumler };
}

export class Oyun {
  constructor(icerik, durum = null) {
    this.icerik = icerik;
    this.durum = durum || null;
    this.onarimlar = [];
    if (this.durum) this._onar();
  }

  // ---------- Başlangıç ----------

  basla(oyuncuAdi) {
    const { ayar } = this.icerik;
    this.durum = {
      surum: DURUM_SURUMU,
      roman: true,
      oyuncu: { ad: oyuncuAdi },
      t: ayar.baslangic,
      yer: ayar.ilkYer,
      d: {},
      gorulen: {},
      biten: {},
      sohbet: {},
      rehber: {},
      bilinen: {},
      sonGorulme: {},
      sahne: null,
      oyunBitti: false,
      sayac: 0,
      gunluk: [],
    };
    for (const [kisi, k] of Object.entries(this.icerik.kisiler)) {
      if (k.rehberde) this.durum.rehber[kisi] = k.rehberde;
      if (k.biliniyor) this.durum.bilinen[kisi] = true;
    }
    for (const p of this.icerik.parcalar.values()) if (p.tur === 'geçmiş') this._gecmisOynat(p);
    this._gunlukYaz(`oyun başladı (${oyuncuAdi})`);
    this._bolumBaslat(this.icerik.bolumler[0]);
  }

  _gecmisOynat(parca) {
    const kisi = parca.kisi;
    const akis = this._akisOlustur(parca);
    let t = this.durum.t;
    let okunmamis = false;
    for (let g = 0; g < 2000; g++) {
      const o = this._sonraki(akis);
      if (o.t === 'son') break;
      if (o.t === 'komut') {
        if (o.d.ad === 'zaman') t = o.d.zaman;
        else if (o.d.ad === 'bekle') t += o.d.sure;
        else if (o.d.ad === 'okunmadı') okunmamis = true;
        else if (o.d.ad === 'tanış') this.durum.bilinen[o.d.kisi] = true;
        continue;
      }
      if (o.t === 'söz') {
        const benden = o.kisi === 'ben';
        this._mesajEkle(kisi, {
          k: benden ? 'b' : 'o',
          m: o.metin,
          t,
          okundu: benden ? t + 60 : (okunmamis ? null : t + 60),
        });
        if (!benden) this.durum.sonGorulme[kisi] = Math.max(this.durum.sonGorulme[kisi] || -Infinity, t);
        t += 20;
      }
    }
    this.durum.gorulen[parca.kimlik] = 1;
    this.durum.biten[parca.kimlik] = 1;
  }

  // ---------- Okuma yardımcıları ----------

  parca(kimlik) {
    return this.icerik.parcalar.get(kimlik);
  }

  get t() { return this.durum.t; }

  simdi() {
    const b = gunBilgisi(this.durum.t);
    const hava = this.icerik.hava[b.gun] || null;
    return { ...b, saatMetni: saatYaz(this.durum.t), tarihMetni: tarihYaz(this.durum.t), yer: this.durum.yer, hava };
  }

  kisi(kimlik) {
    return this.icerik.kisiler[kimlik] || { ad: kimlik, tanimsiz: kimlik };
  }

  // Telefonda görünen ad: rehberdeki kayıt, yoksa numara.
  gorunenAd(kisi) {
    return this.durum.rehber[kisi] || this.kisi(kisi).numara || kisi;
  }

  // Sahnede görünen ad: tanışıldıysa adı, değilse tarifi.
  sahneAdi(kisi) {
    const k = this.kisi(kisi);
    if (k.sahnede) return k.sahnede; // aile: sahnede "Baban", "Annen"
    return this.durum.bilinen[kisi] ? k.ad : (k.tanimsiz || k.ad);
  }

  degisken(ad) {
    const b = gunBilgisi(this.durum.t);
    switch (ad) {
      case 'saat': return b.saat;
      case 'dakika': return b.dakika;
      case 'tarih':
      case 'gün': return b.gun;
      case 'an': return this.durum.t;
      case 'haftagünü': return b.haftagunu;
      case 'hava': return (this.icerik.hava[b.gun] || {}).durum || 'açık';
      default: return this.durum.d[ad] ?? 0;
    }
  }

  kosulDogru(agac) {
    if (!agac) return true;
    return dogru(hesapla(agac, {
      degisken: (ad) => this.degisken(ad),
      cagir: (ad, arg) => {
        const k = arg[0];
        if (ad === 'gördü') return (this.durum.gorulen[k] || 0) > 0;
        if (ad === 'bitti') return (this.durum.biten[k] || 0) > 0;
        if (ad === 'kaç') return this.durum.gorulen[k] || 0;
        if (ad === 'tanıdı') return Boolean(this.durum.bilinen[k]);
        if (ad === 'kayıtlı') return Boolean(this.durum.rehber[k]);
        throw new Error(`Bilinmeyen fonksiyon: ${ad}`);
      },
      tarihCevir: (s) => {
        const v = tarihCoz(s);
        if (v === null) throw new Error(`Tarih anlaşılmadı: ${s}`);
        return s.includes(':') ? v : gunNo(v);
      },
    }));
  }

  _yerlestir(metin) {
    return metin.replace(/\{ad\}/g, this.durum.oyuncu.ad);
  }

  _islemYap(islemler) {
    const d = this.durum.d;
    for (const { ad, op, v } of islemler) {
      if (v && typeof v === 'object' && v.ozel === 'bugün') d[ad] = gunNo(this.durum.t);
      else if (op === '=') d[ad] = v;
      else d[ad] = (Number(d[ad]) || 0) + (op === '+' ? v : -v);
    }
  }

  _gunlukYaz(metin) {
    const g = this.durum.gunluk;
    g.push(`${tarihYaz(this.durum.t, false)} ${saatYaz(this.durum.t)} ${metin}`);
    if (g.length > GUNLUK_SINIRI) g.splice(0, g.length - GUNLUK_SINIRI);
  }

  // ---------- Akış yorumlayıcısı ----------

  _akisOlustur(parca) {
    return { kimlik: parca.kimlik, kisi: parca.kisi, yigin: [{ l: 0, i: 0 }], secim: null };
  }

  // Akışın yığını çerçevelerden oluşur: { p: parça (yoksa akışın kendi parçası), l: liste, i: sıra }.
  // ">> oyna" başka bir parçayı yığına koyar, bitince kalınan yere dönülür; ">> geç" o anki parçanın yerine geçer.
  // ">> yazışma kişi" bloğunun çerçevesinde y: kişi durur; yığında böyle bir çerçeve varken akış telefondadır.
  // Bir sonraki çıktıyı üretir: anlatı, söz, seçim, komut ya da son.
  _sonraki(akis) {
    for (let koruma = 0; koruma < 10000; koruma++) {
      const ust = akis.yigin[akis.yigin.length - 1];
      if (!ust) return { t: 'son' };
      const pk = ust.p || akis.kimlik;
      const parca = this.parca(pk);
      const liste = parca.listeler[ust.l];
      if (!liste || ust.i >= liste.length) { this._cerceveCikar(akis); continue; }
      const d = liste[ust.i++];
      switch (d.t) {
        case 'anlatı': return { t: 'anlatı', metin: this._yerlestir(d.metin) };
        case 'söz': return { t: 'söz', kisi: d.kisi, ad: d.ad, metin: this._yerlestir(d.metin) };
        case 'işlem': this._islemYap(d.islemler); continue;
        case 'etiket': continue;
        case 'git':
          this._parcadanCik(akis, pk);
          if (d.hedef !== 'son' && d.hedef !== 'geri') akis.yigin.push({ p: ust.p, l: 0, i: parca.etiketler[d.hedef] + 1, taban: true });
          continue;
        case 'eğer': {
          let govde = d.yoksa;
          for (const dal of d.dallar) {
            if (this.kosulDogru(dal.kosul)) { govde = dal.govde; break; }
          }
          if (govde !== undefined) akis.yigin.push({ p: ust.p, l: govde, i: 0 });
          continue;
        }
        case 'yazışma':
          akis.yigin.push({ p: ust.p, l: d.govde, i: 0, y: d.kisi });
          continue;
        case 'seçim': {
          const secenekler = d.secenekler
            .map((s, i) => ({ i, metin: this._yerlestir(s.metin), tip: s.tip }))
            .filter((s) => this.kosulDogru(d.secenekler[s.i].kosul));
          if (!secenekler.length) continue;
          akis.secim = { p: ust.p, l: ust.l, i: ust.i - 1 };
          return { t: 'seçim', secenekler };
        }
        case 'komut':
          if (d.ad === 'son') return { t: 'son' };
          if (d.ad === 'oyna' || d.ad === 'geç') {
            if (d.ad === 'geç') this._parcadanCik(akis, pk);
            akis.yigin.push({ p: d.hedef, l: 0, i: 0, taban: true });
            this.durum.gorulen[d.hedef] = (this.durum.gorulen[d.hedef] || 0) + 1;
            continue;
          }
          return { t: 'komut', d };
      }
    }
    throw new Error(`${akis.kimlik}: akış sonsuz döngüye girdi`);
  }

  _cerceveCikar(akis) {
    const c = akis.yigin.pop();
    if (c && c.taban && c.p) this.durum.biten[c.p] = (this.durum.biten[c.p] || 0) + 1;
  }

  // "-> son", "-> etiket" ve ">> geç": o anki parçanın bütün çerçevelerini kaldırır (çağıran parçaya dönülür).
  _parcadanCik(akis, pk) {
    while (akis.yigin.length && (akis.yigin[akis.yigin.length - 1].p || akis.kimlik) === pk) this._cerceveCikar(akis);
  }

  // Akış şu an kiminle yazışıyor (telefonda mı)? Yoksa null.
  _kanal(akis) {
    for (let i = akis.yigin.length - 1; i >= 0; i--) if (akis.yigin[i].y) return akis.yigin[i].y;
    return null;
  }

  _secenegiUygula(akis, i) {
    const parca = this.parca(akis.secim.p || akis.kimlik);
    const dugum = parca.listeler[akis.secim.l][akis.secim.i];
    const secenek = dugum.secenekler[i];
    if (!secenek || !this.kosulDogru(secenek.kosul)) throw new Error(`${akis.kimlik}: geçersiz seçenek ${i}`);
    akis.yigin.push({ p: akis.secim.p, l: secenek.govde, i: 0 });
    akis.secim = null;
    return { ...secenek, metin: this._yerlestir(secenek.metin) };
  }

  // ---------- Telefon ----------

  _mesajEkle(kisi, mesaj) {
    const s = this.durum.sohbet[kisi] || (this.durum.sohbet[kisi] = []);
    mesaj.n = ++this.durum.sayac;
    s.push(mesaj);
    return mesaj;
  }

  _yazmaSuresi(kisi, metin) {
    const hiz = this.kisi(kisi).yazmaHizi || 1;
    return Math.round((6 + metin.length * 0.9) / hiz);
  }

  _okumaGecikmesi(kisi) {
    return this.kisi(kisi).okumaGecikmesi ?? 40;
  }

  _oyuncuMesajlariniOku(kisi, t) {
    const d = this.durum;
    for (const m of d.sohbet[kisi] || []) if (m.k === 'b' && m.okundu === null) m.okundu = t;
    d.sonGorulme[kisi] = Math.max(d.sonGorulme[kisi] ?? -Infinity, t);
  }

  sonGorulme(kisi) {
    return this.durum.sonGorulme[kisi];
  }

  cevrimici(kisi) {
    const s = this.sonGorulme(kisi);
    return s !== undefined && this.durum.t - s >= 0 && this.durum.t - s < 120;
  }

  okunduMu(mesaj) {
    return mesaj.okundu !== null && mesaj.okundu !== undefined && mesaj.okundu <= this.durum.t;
  }

  oku(kisi) {
    for (const m of this.durum.sohbet[kisi] || []) if (m.k === 'o' && m.okundu === null && m.t <= this.durum.t) m.okundu = this.durum.t;
  }

  okunmamisSayisi(kisi) {
    return (this.durum.sohbet[kisi] || []).filter((m) => m.k === 'o' && m.okundu === null).length;
  }

  toplamOkunmamis() {
    return Object.keys(this.durum.sohbet).reduce((a, k) => a + this.okunmamisSayisi(k), 0);
  }

  sohbetler() {
    return Object.entries(this.durum.sohbet)
      .map(([kisi, mesajlar]) => ({ kisi, son: mesajlar[mesajlar.length - 1], okunmamis: this.okunmamisSayisi(kisi) }))
      .filter((s) => s.son)
      .sort((a, b) => b.son.t - a.son.t || b.son.n - a.son.n);
  }

  _ortakKomut(k) {
    const d = this.durum;
    switch (k.ad) {
      case 'tanış': d.bilinen[k.kisi] = true; return;
      case 'yer': d.yer = k.yer; if (d.sahne) d.sahne.yer = k.yer; return;
      case 'bitir': d.oyunBitti = true; this._gunlukYaz('oyun bitti'); return;
      case 'zaman':
      case 'saat': {
        let hedef = k.zaman;
        if (k.ad === 'saat') {
          hedef = gunNo(d.t) * GUN + k.saat;
          if (hedef <= d.t) hedef += GUN;
        }
        if (hedef > d.t) d.t = hedef;
        return;
      }
    }
  }

  // ---------- Sahne ----------

  get sahne() { return this.durum.sahne; }

  // Sahneyi bir sonraki seçime ya da sona kadar oynatır; yeni blokları döndürür.
  // Yazışma sürerken üretilen bloklar "kanal: kişi" taşır (telefonda gösterilir); kanal değişince bir "kanal" bloğu gelir.
  sahneDevam() {
    const s = this.durum.sahne;
    if (!s || s.akis.secim || s.bitti) return [];
    const d = this.durum;
    const bloklar = [];
    const ekle = (b) => { if (s.kanal) b.kanal = s.kanal; bloklar.push(b); s.kayit.push(b); return b; };
    for (let koruma = 0; koruma < 2000; koruma++) {
      const o = this._sonraki(s.akis);
      const kanal = o.t === 'son' ? null : this._kanal(s.akis);
      if (kanal !== (s.kanal || null)) {
        const onceki = s.kanal || null;
        s.kanal = null;
        ekle({ t: 'kanal', kisi: kanal, onceki, an: d.t });
        s.kanal = kanal;
        s.yz = kanal ? { oyuncuYazdiT: null, ilk: true } : null;
      }
      if (o.t === 'anlatı') { ekle({ t: 'anlatı', metin: o.metin }); continue; }
      if (o.t === 'söz') {
        if (s.kanal) ekle(o.kisi === 'ben' ? this._yzGiden(o.metin) : this._yzGelen(o.metin));
        else if (o.kisi === 'ben') ekle({ t: 'ben', metin: o.metin });
        else ekle({ t: 'söz', kisi: o.kisi, ad: o.ad || this.sahneAdi(o.kisi), metin: o.metin });
        continue;
      }
      if (o.t === 'seçim') { ekle({ t: 'seçim', secenekler: o.secenekler }); return bloklar; }
      if (o.t === 'komut') {
        const k = o.d;
        const gun = gunNo(d.t);
        if (k.ad === 'bekle') {
          d.t += k.sure;
          if (s.kanal) ekle({ t: 'ara', sure: k.sure, an: d.t });
          else if (gunNo(d.t) !== gun) ekle({ t: 'gün', an: d.t });
          continue;
        }
        if (k.ad === 'okudu') {
          if (s.kanal) ekle(this._yzOkudu());
          continue;
        }
        if (k.ad === 'okunmadı') continue;
        if (k.ad === 'rehber') {
          s.akis.secim = { rehber: k.kisi, adlar: k.adlar };
          ekle({ t: 'rehber', kisi: k.kisi, numara: this.kisi(k.kisi).numara, secenekler: k.adlar.map((metin, i) => ({ i, metin, tip: 'rehber' })) });
          return bloklar;
        }
        this._ortakKomut(k);
        if (k.ad === 'yer') ekle({ t: 'yer', yer: k.yer });
        if (!s.kanal && gunNo(d.t) !== gun) ekle({ t: 'gün', an: d.t });
        continue;
      }
      if (o.t === 'son') {
        s.bitti = true;
        d.biten[s.kimlik] = (d.biten[s.kimlik] || 0) + 1;
        this._gunlukYaz(`bölüm bitti ${s.kimlik}`);
        const sonraki = this._sonrakiBolum();
        ekle({ t: 'son', sonraki: sonraki ? { no: sonraki.bolum, baslik: sonraki.baslik['başlık'] || '' } : null, oyunBitti: Boolean(d.oyunBitti) });
        return bloklar;
      }
    }
    throw new Error(`${s.kimlik}: bölüm bitmedi`);
  }

  // ---------- Yazışma (hikâyenin içinde, telefonda) ----------

  // Karşıdakinin mesajı: oyuncu yazdıysa önce okur ("görüldü"), sonra yazar ("yazıyor…").
  // Yazışmanın ilk mesajı telefon açılırken çoktan gelmiştir; beklemesi yoktur.
  _yzGelen(metin) {
    const d = this.durum;
    const s = d.sahne;
    const kisi = s.kanal;
    const yz = s.yz;
    let okunduAn = null;
    let bekleme = 0;
    if (yz.oyuncuYazdiT !== null) {
      const okuma = Math.max(d.t, yz.oyuncuYazdiT + this._okumaGecikmesi(kisi));
      d.t = okuma;
      this._oyuncuMesajlariniOku(kisi, okuma);
      okunduAn = okuma;
      yz.oyuncuYazdiT = null;
      bekleme = 1;
    }
    const yazma = !yz.ilk || bekleme ? this._yazmaSuresi(kisi, metin) : 0;
    yz.ilk = false;
    d.t += yazma;
    const m = this._mesajEkle(kisi, { k: 'o', m: metin, t: d.t, okundu: d.t });
    d.sonGorulme[kisi] = d.t;
    return { t: 'mesaj', k: 'o', metin, an: d.t, n: m.n, yazma, okunduAn };
  }

  // Oyuncunun gönderdiği mesaj (seçimle ya da @ben ile).
  _yzGiden(metin) {
    const d = this.durum;
    const s = d.sahne;
    d.t += Math.round(4 + metin.length * 0.25);
    const m = this._mesajEkle(s.kanal, { k: 'b', m: metin, t: d.t, okundu: null });
    s.yz.oyuncuYazdiT = d.t;
    s.yz.ilk = false;
    return { t: 'mesaj', k: 'b', metin, an: d.t, n: m.n };
  }

  // ">> okudu": karşıdaki, oyuncunun mesajlarını okudu ama (henüz) yazmıyor.
  _yzOkudu() {
    const d = this.durum;
    const s = d.sahne;
    if (s.yz.oyuncuYazdiT !== null) {
      d.t = Math.max(d.t, s.yz.oyuncuYazdiT + this._okumaGecikmesi(s.kanal));
      this._oyuncuMesajlariniOku(s.kanal, d.t);
      s.yz.oyuncuYazdiT = null;
    }
    return { t: 'okundu', an: d.t };
  }

  // ---------- Bölümler ----------

  // Bölüm, durumda "sahne" olarak durur: kayıt (okunmuş bloklar), akış, süren yazışmanın kanalı.
  _bolumBaslat(p) {
    const d = this.durum;
    if (p.zaman !== undefined && p.zaman !== null && p.zaman > d.t) d.t = p.zaman;
    for (const k of Object.keys(d.d)) if (k.startsWith('sahne.')) delete d.d[k];
    if (p.baslik.yer) d.yer = p.baslik.yer;
    d.sahne = {
      kimlik: p.kimlik,
      bolum: p.bolum,
      kisi: p.kisi,
      yer: d.yer,
      ton: p.baslik.ton || null,
      baslangic: d.t,
      akis: this._akisOlustur(p),
      kayit: [],
      bitti: false,
      kanal: null,
      yz: null,
    };
    d.gorulen[p.kimlik] = (d.gorulen[p.kimlik] || 0) + 1;
    this._gunlukYaz(`bölüm başladı ${p.kimlik}`);
  }

  _sonrakiBolum() {
    const s = this.durum.sahne;
    if (!s || this.durum.oyunBitti) return null;
    return this.icerik.bolumler.find((p) => p.bolum > s.bolum) || null;
  }

  // Bölüm perdesi (kilit ekranı) için: bölümün numarası, adı, perde adı, zamanı.
  bolumBilgisi() {
    const s = this.durum.sahne;
    if (!s) return null;
    const p = this.parca(s.kimlik);
    const perdeler = this.icerik.bolumler.filter((b) => b.baslik.perde && b.bolum <= s.bolum);
    return {
      no: s.bolum,
      baslik: p.baslik['başlık'] || '',
      perde: p.baslik.perde ? { no: perdeler.length, ad: p.baslik.perde } : null,
      baslangic: s.baslangic,
      yer: s.yer,
      basladi: s.kayit.length > 0,
    };
  }

  // Bölüm sonundan çıkış: sıradaki bölüm başlar; yoksa roman (ya da yazılmış kısmı) bitmiştir.
  sahneKapat() {
    const d = this.durum;
    if (!d.sahne) return;
    if (!d.sahne.bitti) throw new Error('Bölüm henüz bitmedi');
    const sonraki = this._sonrakiBolum();
    d.sonBolum = d.sahne.bolum;
    d.sahne = null;
    if (sonraki) this._bolumBaslat(sonraki);
  }

  sahneSec(i) {
    const s = this.durum.sahne;
    if (!s || !s.akis.secim) throw new Error('Seçim yok');
    if (s.akis.secim.rehber) {
      const kisi = s.akis.secim.rehber;
      const ad = s.akis.secim.adlar[i];
      this.durum.rehber[kisi] = ad;
      const iz = { t: 'kaydedildi', kisi, ad };
      if (s.kanal) iz.kanal = s.kanal;
      s.kayit.push(iz);
      s.akis.secim = null;
      this._gunlukYaz(`rehbere kaydedildi ${kisi}: ${ad}`);
      return [iz, ...this.sahneDevam()];
    }
    const secenek = this._secenegiUygula(s.akis, i);
    let iz;
    if (s.kanal) {
      iz = secenek.tip === 'eylem' ? { t: 'seçildi', metin: secenek.metin } : this._yzGiden(secenek.metin);
      iz.kanal = s.kanal;
    } else iz = secenek.tip === 'söz' ? { t: 'ben', metin: secenek.metin } : { t: 'seçildi', metin: secenek.metin };
    s.kayit.push(iz);
    return [iz, ...this.sahneDevam()];
  }

  // Bölüm yoksa oyun bitmiştir: ya ">> bitir" ile ya da yazılmış son bölümün sonunda.
  bittiMi() {
    return !this.durum.sahne;
  }

  // ---------- Kayıt ----------

  disaVer() {
    return JSON.stringify(this.durum);
  }

  // Kayıttaki parça ve konumlar içerikte artık yoksa (içerik değişmişse) oyunu bozmadan temizle.
  _onar() {
    const d = this.durum;
    // Romana geçmeden önceki bir kayıt sürdürülemez; arayüz yeni oyun önerir.
    if (!d.roman) { this.uyumsuz = true; return; }
    const gecerli = (akis) => {
      if (!this.parca(akis.kimlik)) return false;
      for (const c of akis.yigin) {
        const p = this.parca(c.p || akis.kimlik);
        if (!p || !p.listeler[c.l] || c.i > p.listeler[c.l].length) return false;
      }
      if (akis.secim && !akis.secim.rehber) {
        const p = this.parca(akis.secim.p || akis.kimlik);
        const n = p && p.listeler[akis.secim.l] && p.listeler[akis.secim.l][akis.secim.i];
        if (!n || n.t !== 'seçim') return false;
      }
      return true;
    };
    // Bölüm değiştiyse o bölüm (ya da yerine gelen) baştan başlar.
    if (d.sahne && !gecerli(d.sahne.akis)) {
      const no = d.sahne.bolum;
      this.onarimlar.push(`Yarım kalan bölüm kaldırıldı: ${d.sahne.kimlik}`);
      d.sahne = null;
      const yerine = this.icerik.bolumler.find((p) => p.bolum >= no);
      if (yerine) { this._bolumBaslat(yerine); this.onarimlar.push(`Bölüm ${yerine.bolum} baştan başlatıldı`); }
    }
    // Romanın yazılmış kısmı bitmişti, sonra yeni bölümler eklendi: kalınan yerden, sıradaki bölümle sürer.
    if (!d.sahne && !d.oyunBitti && d.sonBolum !== undefined) {
      const yeni = this.icerik.bolumler.find((p) => p.bolum > d.sonBolum);
      if (yeni) this._bolumBaslat(yeni);
    }
  }
}
