// Oyunun motoru. Ekrandan bağımsızdır: hem tarayıcıda hem Node'da (testler, okuma aracı) çalışır.

import { ayristir } from './ayristirici.js';
import { hesapla, dogru } from './ifade.js';
import { tarihCoz, saatCoz, gunBilgisi, gunNo, saatYaz, tarihYaz, GUN } from './tarih.js';

export const DURUM_SURUMU = 1;
const VARSAYILAN_ZAMAN_ASIMI = 24 * 3600;
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
    icerikSonu: tarihCoz(veri.ayar.içerik_sonu),
    ilkYer: veri.ayar.ilk_yer,
    ilkEv: veri.ayar.ilk_ev || veri.ayar.ilk_yer,
  };
  if (ayar.baslangic === null) hatalar.push({ dosya: 'oyun.json', satir: 0, mesaj: 'başlangıç zamanı anlaşılmadı' });
  if (ayar.icerikSonu === null) hatalar.push({ dosya: 'oyun.json', satir: 0, mesaj: 'içerik_sonu anlaşılmadı' });

  const sabitZamanlilar = [...parcalar.values()]
    .filter((p) => p.zaman !== undefined && p.zaman !== null && p.tur !== 'geçmiş' && p.tur !== 'bölüm')
    .sort((a, b) => a.zaman - b.zaman || b.oncelik - a.oncelik);
  const kendiliginden = [...parcalar.values()].filter((p) => p.tur === 'mesaj' && p.zaman === undefined
    && p.baslatan !== 'oyuncu' && (p.tarihBas !== undefined || p.pencere !== undefined));

  // Roman yapısı: içerikte bölüm varsa oyun bölümden bölüme akar (eylem menüsü, bekleme, takvimden gelen mesaj yok).
  const bolumler = [...parcalar.values()].filter((p) => p.tur === 'bölüm').sort((a, b) => a.bolum - b.bolum);

  return { parcalar, hatalar, kisiler: veri.kisiler, ayar, hava: veri.hava || [], sabitZamanlilar, kendiliginden, bolumler, roman: bolumler.length > 0 };
}

// Günlük pencere: 07:00-21:00 ya da gece yarısını aşan 22:00-03:00.
function pencereAcik(ici, bas, son) {
  return bas <= son ? (ici >= bas && ici < son) : (ici >= bas || ici < son);
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
      oyuncu: { ad: oyuncuAdi },
      t: ayar.baslangic,
      yer: ayar.ilkYer,
      ev: ayar.ilkEv,
      d: {},
      gorulen: {},
      biten: {},
      atlanan: {},
      kuyruk: [],
      akislar: {},
      bekleyen: {},
      sohbet: {},
      rehber: {},
      bilinen: {},
      sonGorulme: {},
      sahne: null,
      sahneKuyrugu: [],
      randevular: [],
      oyunBitti: false,
      sayac: 0,
      gunluk: [],
    };
    if (this.icerik.roman) this.durum.roman = true;
    for (const [kisi, k] of Object.entries(this.icerik.kisiler)) {
      if (k.rehberde) this.durum.rehber[kisi] = k.rehberde;
      if (k.biliniyor) this.durum.bilinen[kisi] = true;
    }
    for (const p of this.icerik.parcalar.values()) if (p.tur === 'geçmiş') this._gecmisOynat(p);
    // Başlangıçtan önceye düşen sabit zamanlı parçalar hiç çalışmaz.
    for (const p of this.icerik.sabitZamanlilar) if (p.zaman < ayar.baslangic) this.durum.atlanan[p.kimlik] = true;
    this._gunlukYaz(`oyun başladı (${oyuncuAdi})`);
    if (this.icerik.roman) { this._bolumBaslat(this.icerik.bolumler[0]); return; }
    this.ilerle(this.durum.t);
  }

  _gecmisOynat(parca) {
    const kisi = parca.kisi;
    const akis = this._akisOlustur(parca, this.durum.t, 'geçmiş');
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

  _akisOlustur(parca, t, mod, baslangicListesi = 0, baslangicI = 0) {
    return { kimlik: parca.kimlik, kisi: parca.kisi, mod, yigin: [{ l: baslangicListesi, i: baslangicI }], uyanma: t, secim: null, ilk: true };
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
        case 'etiket':
          if (akis.etiketteDur) return { t: 'son' };
          continue;
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
          return { t: 'seçim', secenekler, zamanAsimi: d.zamanAsimi || null };
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
    akis.zamanAsimi = null;
    akis.yigin.push({ p: akis.secim.p, l: secenek.govde, i: 0 });
    akis.secim = null;
    return { ...secenek, metin: this._yerlestir(secenek.metin) };
  }

  // ---------- Zaman ----------

  // Zamanı hedefe kadar ilerletir. Bir sahne başlarsa orada durur.
  ilerle(hedef) {
    if (this.durum.sahne) return;
    this._zamaniIslet(hedef, false);
  }

  bekle(sure) {
    this.ilerle(this.durum.t + sure);
  }

  _zamaniIslet(hedef, sahneIcinde) {
    for (let koruma = 0; koruma < 5000; koruma++) {
      const olay = this._siradakiOlay(hedef);
      if (!olay) break;
      if (olay.t > this.durum.t) this.durum.t = olay.t;
      if (olay.tur === 'akış') {
        this._mesajAdimi(olay.kisi);
        continue;
      }
      if (olay.tur === 'kuyruk') {
        this.durum.kuyruk = this.durum.kuyruk.filter((k) => k !== olay.kayit);
        this.durum.randevular = (this.durum.randevular || []).filter((r) => r.kimlik !== olay.kimlik);
      }
      if (olay.tur === 'sabit') {
        if (!this.kosulDogru(olay.parca.kosul)) { this.durum.atlanan[olay.parca.kimlik] = true; continue; }
        this.durum.atlanan[olay.parca.kimlik] = true;
      }
      const parca = this.parca(olay.kimlik);
      if (!parca) continue;
      if (parca.tur === 'sahne' || parca.tur === 'eylem') {
        if (sahneIcinde || this.durum.sahne) { this.durum.sahneKuyrugu.push(parca.kimlik); continue; }
        this._sahneBaslat(parca);
        return;
      }
      this._mesajBaslat(parca);
    }
    if (hedef > this.durum.t) this.durum.t = hedef;
  }

  _siradakiOlay(hedef) {
    const d = this.durum;
    let en = null;
    const aday = (o) => { if (o.t <= hedef && (!en || o.t < en.t)) en = o; };
    for (const [kisi, akis] of Object.entries(d.akislar)) {
      if (akis.uyanma !== null && akis.uyanma !== undefined) aday({ t: Math.max(akis.uyanma, d.t), tur: 'akış', kisi });
    }
    for (const kayit of d.kuyruk) aday({ t: Math.max(kayit.t, d.t), tur: 'kuyruk', kimlik: kayit.kimlik, kayit });
    for (const p of this.icerik.sabitZamanlilar) {
      if (d.atlanan[p.kimlik] || d.gorulen[p.kimlik]) continue;
      if (p.zaman > hedef) break;
      aday({ t: Math.max(p.zaman, d.t), tur: 'sabit', kimlik: p.kimlik, parca: p });
      break;
    }
    // Sahne sürerken de mesaj gelir (telefon cepte titrer); yalnızca o an yanında olunan kişininki sahne bitince gelir.
    // Yoksa bir sahnenin içindeki saat atlamasına (vardiya 18:00 → 01:10) denk gelen mesajlar hiç gelmezdi.
    const sahneKisisi = d.sahne ? (this.parca(d.sahne.kimlik) || {}).kisi : null;
    {
      for (const p of this.icerik.kendiliginden) {
        if (sahneKisisi && p.kisi === sahneKisisi) continue;
        if (!p.tekrar && d.gorulen[p.kimlik]) continue;
        if (d.akislar[p.kisi] || (d.bekleyen[p.kisi] || []).includes(p.kimlik)) continue;
        const t = this._acilmaZamani(p, d.t, hedef);
        if (t === null) continue;
        if (!this.kosulDogru(p.kosul)) continue;
        aday({ t, tur: 'kendiliğinden', kimlik: p.kimlik });
      }
    }
    return en;
  }

  // Tarih aralığı ve günlük pencere birlikte açık olduğu ilk an (gecikmeyle).
  _acilmaZamani(p, bas, son) {
    let t = Math.max(bas, p.tarihBas ?? -Infinity);
    const bitis = Math.min(son, p.tarihSon ?? Infinity);
    if (t > bitis) return null;
    if (p.pencere) {
      const [pb, ps] = p.pencere;
      const gun = gunNo(t) * GUN;
      const ici = t - gun;
      if (!pencereAcik(ici, pb, ps)) t = ici < pb ? gun + pb : gun + GUN + pb;
    }
    t += p.gecikme || 0;
    return t <= bitis ? t : null;
  }

  sonrakiOlayZamani() {
    const o = this._siradakiOlay(Infinity);
    return o ? o.t : null;
  }

  // ---------- Mesajlaşma ----------

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

  // Kişi uyuyorsa (kisiler.json "uyku": "05:00-11:00") mesajı uyanınca okur.
  _uyanikZaman(kisi, t) {
    const u = this.kisi(kisi).uyku;
    if (!u) return t;
    const [bas, son] = u.split('-').map((x) => saatCoz(x));
    const gun = gunNo(t);
    const sn = t - gun * GUN;
    const uyuyor = bas < son ? sn >= bas && sn < son : sn >= bas || sn < son;
    if (!uyuyor) return t;
    let uyanis = gun * GUN + son;
    if (uyanis <= t) uyanis += GUN;
    return uyanis;
  }

  _mesajBaslat(parca, oyuncuYazdiT = null) {
    const d = this.durum;
    const kisi = parca.kisi;
    if (d.akislar[kisi]) {
      if (!parca.kesme) {
        (d.bekleyen[kisi] || (d.bekleyen[kisi] = [])).push(parca.kimlik);
        return;
      }
      this._akisiBitir(kisi, true);
    }
    const akis = this._akisOlustur(parca, d.t, 'mesaj');
    akis.oyuncuYazdiT = oyuncuYazdiT;
    d.akislar[kisi] = akis;
    d.gorulen[parca.kimlik] = (d.gorulen[parca.kimlik] || 0) + 1;
    this._gunlukYaz(`mesaj başladı ${parca.kimlik}`);
  }

  _akisiBitir(kisi, kesildi = false) {
    const d = this.durum;
    const akis = d.akislar[kisi];
    if (!akis) return;
    if (akis.secim) d.d[`${akis.kimlik}.cevapsız`] = true;
    delete d.akislar[kisi];
    if (!kesildi) d.biten[akis.kimlik] = (d.biten[akis.kimlik] || 0) + 1;
    const sira = d.bekleyen[kisi];
    if (sira && sira.length) {
      const sonraki = this.parca(sira.shift());
      if (!sira.length) delete d.bekleyen[kisi];
      if (sonraki) this._mesajBaslat(sonraki);
    }
  }

  _mesajAdimi(kisi) {
    const d = this.durum;
    const akis = d.akislar[kisi];
    if (!akis) return;
    akis.uyanma = null;

    // Cevap gelmedi: zaman aşımı.
    if (akis.secim) {
      if (akis.zamanAsimi && d.t >= akis.zamanAsimi.t) {
        const etiket = akis.zamanAsimi.etiket;
        d.d[`${akis.kimlik}.cevapsız`] = true;
        akis.secim = null;
        akis.zamanAsimi = null;
        if (!etiket) { this._akisiBitir(kisi); return; }
        akis.yigin = [{ l: 0, i: this.parca(akis.kimlik).etiketler[etiket] + 1 }];
      } else {
        akis.uyanma = akis.zamanAsimi ? akis.zamanAsimi.t : null;
        return;
      }
    }

    // Yazılmakta olan mesaj vakti geldi: teslim et.
    if (akis.siradaki) {
      const m = akis.siradaki;
      akis.siradaki = null;
      this._mesajEkle(kisi, { k: 'o', m: m.metin, t: d.t, okundu: null });
      d.sonGorulme[kisi] = d.t;
    }

    for (let koruma = 0; koruma < 1000; koruma++) {
      const o = this._sonraki(akis);
      if (o.t === 'son') { this._akisiBitir(kisi); return; }
      if (o.t === 'anlatı') continue; // mesaj parçalarında anlatı olmaz (denetim bunu yakalar)
      if (o.t === 'söz') {
        if (o.kisi === 'ben') {
          this._mesajEkle(kisi, { k: 'b', m: o.metin, t: d.t, okundu: null });
          akis.oyuncuYazdiT = d.t;
          continue;
        }
        let bekleme = 0;
        if (akis.oyuncuYazdiT !== null && akis.oyuncuYazdiT !== undefined) {
          const okuma = this._uyanikZaman(kisi, Math.max(d.t, akis.oyuncuYazdiT + this._okumaGecikmesi(kisi)));
          this._oyuncuMesajlariniOku(kisi, okuma);
          bekleme = okuma - d.t;
          akis.oyuncuYazdiT = null;
        }
        if (!akis.ilk || bekleme > 0) bekleme += this._yazmaSuresi(kisi, o.metin);
        akis.ilk = false;
        if (bekleme <= 0) {
          this._mesajEkle(kisi, { k: 'o', m: o.metin, t: d.t, okundu: null });
          d.sonGorulme[kisi] = d.t;
          continue;
        }
        akis.siradaki = { metin: o.metin };
        akis.uyanma = d.t + bekleme;
        return;
      }
      if (o.t === 'seçim') {
        const sure = o.zamanAsimi ? o.zamanAsimi.sure
          : (this.parca(akis.kimlik).zamanAsimi ?? this.kisi(kisi).zamanAsimi ?? VARSAYILAN_ZAMAN_ASIMI);
        akis.zamanAsimi = { t: d.t + sure, etiket: o.zamanAsimi ? o.zamanAsimi.etiket : null };
        akis.uyanma = akis.zamanAsimi.t;
        akis.ilk = false;
        return;
      }
      if (o.t === 'komut') {
        const k = o.d;
        if (k.ad === 'bekle') { akis.uyanma = d.t + k.sure; akis.ilk = false; return; }
        if (k.ad === 'okudu') {
          // "Görüldü" de kişinin okuma gecikmesine ve uykusuna uyar; akış okuduğu ana kadar bekler.
          const okuma = akis.oyuncuYazdiT !== null && akis.oyuncuYazdiT !== undefined
            ? this._uyanikZaman(kisi, Math.max(d.t, akis.oyuncuYazdiT + this._okumaGecikmesi(kisi)))
            : d.t;
          this._oyuncuMesajlariniOku(kisi, okuma);
          akis.oyuncuYazdiT = null;
          if (okuma > d.t) { akis.uyanma = okuma; akis.ilk = false; return; }
          continue;
        }
        if (k.ad === 'rehber') {
          akis.secim = { rehber: k.kisi, adlar: k.adlar };
          akis.zamanAsimi = null;
          akis.uyanma = null;
          return;
        }
        this._ortakKomut(k);
      }
    }
  }

  _oyuncuMesajlariniOku(kisi, t) {
    const d = this.durum;
    for (const m of d.sohbet[kisi] || []) if (m.k === 'b' && m.okundu === null) m.okundu = t;
    // Okuma ileride olacaksa (kişi uyuyor) "son görülme" o ana kadar değişmez.
    if (t <= d.t) d.sonGorulme[kisi] = Math.max(d.sonGorulme[kisi] || -Infinity, t);
    else (d.gorulmeSirada || (d.gorulmeSirada = {}))[kisi] = t;
  }

  sonGorulme(kisi) {
    const d = this.durum;
    let s = d.sonGorulme[kisi];
    const sirada = (d.gorulmeSirada || {})[kisi];
    if (sirada !== undefined && sirada <= d.t) s = Math.max(s ?? -Infinity, sirada);
    return s;
  }

  _ortakKomut(k) {
    const d = this.durum;
    switch (k.ad) {
      case 'tanış': d.bilinen[k.kisi] = true; return;
      case 'yer': d.yer = k.yer; if (d.sahne) d.sahne.yer = k.yer; return;
      case 'ev': d.ev = k.yer; return;
      case 'başlat': {
        const t = this._komutZamani(k);
        const p = this.parca(k.hedef);
        if (p && t <= d.t) {
          if (p.tur === 'mesaj') { this._mesajBaslat(p); return; }
          if (d.sahne) { d.sahneKuyrugu.push(p.kimlik); return; }
        }
        d.kuyruk.push({ t, kimlik: k.hedef });
        return;
      }
      case 'randevu': {
        const t = this._komutZamani(k);
        this._iptal(k.hedef);
        const p = this.parca(k.hedef);
        d.randevular.push({ kimlik: k.hedef, t, yer: k.yer, kisi: p ? p.kisi : null });
        d.kuyruk.push({ t, kimlik: k.hedef });
        return;
      }
      case 'iptal': this._iptal(k.hedef); return;
      case 'bitir': d.oyunBitti = true; this._gunlukYaz('oyun bitti'); return;
      case 'zaman':
      case 'saat': {
        let hedef = k.zaman;
        if (k.ad === 'saat') {
          hedef = gunNo(d.t) * GUN + k.saat;
          if (hedef <= d.t) hedef += GUN;
        }
        if (hedef > d.t) { if (d.sahne) this._zamaniIslet(hedef, true); else this.ilerle(hedef); }
        return;
      }
    }
  }

  // >> başlat / randevu: kesin tarih, "sonra 2sa" ya da "yarın 20:30".
  _komutZamani(k) {
    const d = this.durum;
    if (k.zaman != null) return k.zaman;
    if (k.gun != null) return (gunNo(d.t) + k.gun) * GUN + k.saat;
    return d.t + (k.sonra || 0);
  }

  _iptal(kimlik) {
    const d = this.durum;
    d.kuyruk = d.kuyruk.filter((k) => k.kimlik !== kimlik);
    d.sahneKuyrugu = d.sahneKuyrugu.filter((k) => k !== kimlik);
    d.randevular = (d.randevular || []).filter((r) => r.kimlik !== kimlik);
  }

  // Kilit ekranındaki yaklaşan buluşmalar.
  randevular(ufuk = 36 * 3600) {
    const d = this.durum;
    return (d.randevular || []).filter((r) => r.t >= d.t && r.t - d.t <= ufuk).sort((a, b) => a.t - b.t);
  }

  // Bir kişiyle olan sohbetin şu anki seçenekleri (cevaplar ya da oyuncunun açabileceği konular).
  // Sahne sürerken telefon açılabilir; yalnızca o an yanında olunan kişiye yazılmaz.
  _sahneKisisi() {
    const s = this.durum.sahne;
    return s ? (this.parca(s.kimlik) || {}).kisi || null : null;
  }

  secenekler(kisi) {
    if (kisi === this._sahneKisisi()) return { tur: 'yok' };
    const akis = this.durum.akislar[kisi];
    if (akis && akis.secim) {
      if (akis.secim.rehber) return { tur: 'rehber', kisi: akis.secim.rehber, secenekler: akis.secim.adlar.map((metin, i) => ({ i, metin, tip: 'rehber' })) };
      const dugum = this.parca(akis.secim.p || akis.kimlik).listeler[akis.secim.l][akis.secim.i];
      const secenekler = dugum.secenekler
        .map((s, i) => ({ i, metin: this._yerlestir(s.metin), tip: s.tip }))
        .filter((s) => this.kosulDogru(dugum.secenekler[s.i].kosul));
      return { tur: 'cevap', secenekler };
    }
    if (akis || this.durum.sahne) return { tur: 'yok', secenekler: [] };
    const acilislar = this._acilislar(kisi).map((p) => ({ i: p.kimlik, metin: this._yerlestir(p.baslik['başlık'] || ''), tip: 'düz' }));
    return { tur: acilislar.length ? 'açılış' : 'yok', secenekler: acilislar };
  }

  _acilislar(kisi) {
    const d = this.durum;
    return [...this.icerik.parcalar.values()].filter((p) => p.tur === 'mesaj' && p.baslatan === 'oyuncu' && p.kisi === kisi
      && (p.tekrar || !d.gorulen[p.kimlik])
      && this._zamanUygun(p)
      && this.kosulDogru(p.kosul))
      .sort((a, b) => b.oncelik - a.oncelik);
  }

  _zamanUygun(p) {
    const t = this.durum.t;
    if (p.tarihBas !== undefined && (t < p.tarihBas || t > p.tarihSon)) return false;
    if (p.pencere && !pencereAcik(t - gunNo(t) * GUN, p.pencere[0], p.pencere[1])) return false;
    return true;
  }

  // Oyuncu bir mesaj seçeneğine dokundu.
  cevapla(kisi, i) {
    const d = this.durum;
    if (d.sahne && kisi === this._sahneKisisi()) throw new Error('Yanındaki kişiye mesaj gönderilemez');
    const akis = d.akislar[kisi];
    if (akis && akis.secim) {
      if (akis.secim.rehber) {
        const ad = akis.secim.adlar[i];
        d.rehber[akis.secim.rehber] = ad;
        this._gunlukYaz(`rehbere kaydedildi ${akis.secim.rehber}: ${ad}`);
        akis.secim = null;
        akis.uyanma = d.t;
      } else {
        const secenek = this._secenegiUygula(akis, i);
        if (secenek.tip !== 'eylem') {
          this._mesajEkle(kisi, { k: 'b', m: secenek.metin, t: d.t, okundu: null });
          akis.oyuncuYazdiT = d.t;
        }
        akis.uyanma = d.t;
      }
      this.oku(kisi);
      this._zamaniIslet(d.t, false);
      return;
    }
    const parca = this.parca(i);
    if (!parca || !this._acilislar(kisi).includes(parca)) throw new Error(`Geçersiz açılış: ${i}`);
    this._mesajEkle(kisi, { k: 'b', m: this._yerlestir(parca.baslik['başlık']), t: d.t, okundu: null });
    this.oku(kisi);
    this._mesajBaslat(parca, d.t);
    this._zamaniIslet(d.t, false);
  }

  // Okunma zamanı ileride olabilir (karşı taraf birazdan okuyacak); ekran şimdiye göre bakar.
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

  // Kilit ekranındaki bildirimler: okunmamış mesajlar, yeniden eskiye.
  bildirimler(sinir = 4) {
    const liste = [];
    for (const [kisi, mesajlar] of Object.entries(this.durum.sohbet)) {
      for (const m of mesajlar) if (m.k === 'o' && m.okundu === null) liste.push({ kisi, ...m });
    }
    return liste.sort((a, b) => b.t - a.t || b.n - a.n).slice(0, sinir);
  }

  sohbetler() {
    return Object.entries(this.durum.sohbet)
      .map(([kisi, mesajlar]) => ({ kisi, son: mesajlar[mesajlar.length - 1], okunmamis: this.okunmamisSayisi(kisi), yaziyor: this.yaziyor(kisi) }))
      .filter((s) => s.son)
      .sort((a, b) => b.son.t - a.son.t || b.son.n - a.son.n);
  }

  yaziyor(kisi) {
    const akis = this.durum.akislar[kisi];
    if (!akis || !akis.siradaki || akis.uyanma === null) return false;
    return akis.uyanma - this.durum.t <= this._yazmaSuresi(kisi, akis.siradaki.metin);
  }

  // Ekran açıkken kendiliğinden oynatılacak yakın olay (canlı sohbet hissi için).
  // Yalnızca mesaj akışlarına bakar; sahneler ekran açıkken kendiliğinden başlamaz.
  yakinOlay(sinir = 300) {
    if (this.durum.sahne) return null;
    let en = null;
    for (const [kisi, akis] of Object.entries(this.durum.akislar)) {
      // Oyuncunun cevabını bekleyen akış, oyuncu ekrana bakarken zaman aşımına uğratılmaz.
      if (akis.secim || akis.uyanma === null || akis.uyanma === undefined) continue;
      if (akis.uyanma - this.durum.t > sinir) continue;
      if (!en || akis.uyanma < en.t) en = { t: Math.max(akis.uyanma, this.durum.t), kisi, yaziyor: Boolean(akis.siradaki), metin: akis.siradaki ? akis.siradaki.metin : null };
    }
    return en;
  }

  cevrimici(kisi) {
    if (this.yaziyor(kisi)) return true;
    const s = this.sonGorulme(kisi);
    return s !== undefined && this.durum.t - s >= 0 && this.durum.t - s < 120;
  }

  // ---------- Sahne ----------

  get sahne() { return this.durum.sahne; }

  _sahneBaslat(parca) {
    const d = this.durum;
    for (const k of Object.keys(d.d)) if (k.startsWith('sahne.')) delete d.d[k];
    if (parca.baslik.yer) d.yer = parca.baslik.yer;
    d.sahne = {
      kimlik: parca.kimlik,
      kisi: parca.kisi,
      yer: d.yer,
      ton: parca.baslik.ton || null,
      baslangic: d.t,
      akis: this._akisOlustur(parca, d.t, 'sahne'),
      kayit: [],
      bitti: false,
    };
    d.gorulen[parca.kimlik] = (d.gorulen[parca.kimlik] || 0) + 1;
    this._gunlukYaz(`sahne başladı ${parca.kimlik}`);
  }

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
          if (s.kanal) { d.t += k.sure; ekle({ t: 'ara', sure: k.sure, an: d.t }); continue; }
          this._zamaniIslet(d.t + k.sure, true);
          if (s.bolum !== undefined && gunNo(d.t) !== gun) ekle({ t: 'gün', an: d.t });
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
        if (s.bolum !== undefined && !s.kanal && gunNo(d.t) !== gun) ekle({ t: 'gün', an: d.t });
        continue;
      }
      if (o.t === 'son') {
        this._sahneyiBitir();
        if (s.bolum !== undefined) {
          const sonraki = this._sonrakiBolum();
          ekle({ t: 'son', bolumSonu: true, sonraki: sonraki ? { no: sonraki.bolum, baslik: sonraki.baslik['başlık'] || '' } : null, oyunBitti: Boolean(d.oyunBitti) });
        } else ekle({ t: 'son' });
        return bloklar;
      }
    }
    throw new Error(`${s.kimlik}: sahne bitmedi`);
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

  _bolumBaslat(p) {
    const d = this.durum;
    if (p.zaman !== undefined && p.zaman !== null && p.zaman > d.t) d.t = p.zaman;
    this._sahneBaslat(p);
    const s = d.sahne;
    s.bolum = p.bolum;
    s.kanal = null;
    s.yz = null;
  }

  _sonrakiBolum() {
    const s = this.durum.sahne;
    if (!s || s.bolum === undefined || this.durum.oyunBitti) return null;
    return this.icerik.bolumler.find((p) => p.bolum > s.bolum) || null;
  }

  // Bölüm perdesi (kilit ekranı) için: bölümün numarası, adı, perde adı, zamanı.
  bolumBilgisi() {
    const s = this.durum.sahne;
    if (!s || s.bolum === undefined) return null;
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

  _sahneyiBitir() {
    const d = this.durum;
    const s = d.sahne;
    const parca = this.parca(s.kimlik);
    s.bitti = true;
    d.biten[s.kimlik] = (d.biten[s.kimlik] || 0) + 1;
    if (parca && parca.sure) this._zamaniIslet(d.t + parca.sure, true);
    this._gunlukYaz(`sahne bitti ${s.kimlik}`);
  }

  // Sahne bitti ekranından çıkış: sıradaki sahneye geç ya da kilit ekranına dön.
  sahneKapat() {
    const d = this.durum;
    if (d.sahne && !d.sahne.bitti) throw new Error('Sahne henüz bitmedi');
    if (d.sahne && d.sahne.bolum !== undefined) {
      const sonraki = this._sonrakiBolum();
      d.sahne = null;
      if (sonraki) this._bolumBaslat(sonraki);
      return;
    }
    d.sahne = null;
    while (d.sahneKuyrugu.length) {
      const p = this.parca(d.sahneKuyrugu.shift());
      if (p) { this._sahneBaslat(p); return; }
    }
    this.ilerle(d.t);
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

  // ---------- Eylemler (kilit ekranındaki "ne yapacaksın?") ----------

  // Aynı gruptaki eylemlerden yalnızca biri görünür: önceliği en yüksek olan (eşitse dosyada önce gelen).
  // Böylece tekrarlanan işlerin (vardiya, ders) her seferi ayrı yazılabilir; yazılanlar bitince sessiz yedek kalır.
  eylemler() {
    const d = this.durum;
    if (d.sahne || this.bittiMi() || this.icerik.roman) return [];
    const adaylar = [...this.icerik.parcalar.values()]
      .filter((p) => p.tur === 'eylem' && p.zaman === undefined && (p.tekrar || !d.gorulen[p.kimlik]) && this._zamanUygun(p) && this.kosulDogru(p.kosul))
      .sort((a, b) => b.oncelik - a.oncelik);
    const gruplar = new Set();
    const liste = [];
    for (const p of adaylar) {
      if (p.grup) {
        if (gruplar.has(p.grup)) continue;
        gruplar.add(p.grup);
      }
      liste.push({ kimlik: p.kimlik, baslik: this._yerlestir(p.baslik['başlık'] || p.kimlik) });
    }
    const b = gunBilgisi(d.t);
    liste.push({ kimlik: '_bekle', baslik: 'Bekle', yerlesik: true });
    if (b.saat >= 21 || b.saat < 5) liste.push({ kimlik: '_uyu', baslik: 'Uyu', yerlesik: true });
    return liste;
  }

  // "Bekle": zaman, ilk anlamlı şey olana kadar akar. Yeni mesaj gelince, yeni bir eylem açılınca,
  // sahne ya da randevu başlayınca, cevap bekleyen bir mesajın süresinin dolmasına 15 dakika kala durur.
  // Hiçbir şey olmazsa gündüz 21:00'de, gece iki saat sonra durur. Nereye kadar gideceği önceden söylenmez.
  bekleOlanaKadar() {
    const d = this.durum;
    const t0 = d.t;
    const b = gunBilgisi(t0);
    let hedef = b.saat >= 5 && b.saat < 21 ? gunNo(t0) * GUN + 21 * 3600 : t0 + 2 * 3600;
    for (const akis of Object.values(d.akislar)) {
      const z = akis.secim && !akis.secim.rehber && akis.zamanAsimi ? akis.zamanAsimi.t : null;
      if (z !== null && z - 15 * 60 > t0) hedef = Math.min(hedef, z - 15 * 60);
    }
    const gelenSayisi = () => Object.values(d.sohbet).reduce((n, l) => n + l.filter((m) => m.k === 'o').length, 0);
    const baslangicta = gelenSayisi();
    const onceki = new Set(this.eylemler().filter((e) => !e.yerlesik).map((e) => e.kimlik));
    while (d.t < hedef && !d.sahne && !this.bittiMi()) {
      const ceyrek = (Math.floor(d.t / 900) + 1) * 900;
      const olay = this.sonrakiOlayZamani();
      const adim = Math.min(hedef, ceyrek, olay !== null && olay > d.t ? olay : Infinity);
      const once = d.t;
      this.ilerle(adim);
      if (d.t === once) break;
      if (gelenSayisi() > baslangicta) break;
      if (this.eylemler().some((e) => !e.yerlesik && !onceki.has(e.kimlik))) break;
    }
  }

  eylemSec(kimlik) {
    const d = this.durum;
    if (kimlik === '_bekle') { this.bekleOlanaKadar(); return; }
    if (kimlik === '_oyalan') { this.bekle(30 * 60); return; }
    const kadar = kimlik.match(/^_kadar_(\d+)$/);
    if (kadar) {
      // Oyalanırken yeni bir şey yapılabilir hâle gelirse (bir eylemin saati gelirse) orada durulur;
      // yoksa vardiya gibi işler büyük atlamaların arasında kaybolur.
      const hedef = gunNo(d.t) * GUN + Number(kadar[1]) * 3600;
      const onceki = new Set(this.eylemler().filter((e) => !e.yerlesik).map((e) => e.kimlik));
      while (d.t < hedef && !d.sahne && !this.bittiMi()) {
        const t0 = d.t;
        this.ilerle(Math.min(hedef, (Math.floor(d.t / 900) + 1) * 900));
        if (d.t === t0) break;
        if (this.eylemler().some((e) => !e.yerlesik && !onceki.has(e.kimlik))) break;
      }
      return;
    }
    if (kimlik === '_uyu') {
      const b = gunBilgisi(d.t);
      const sabah = (b.saat < 5 ? b.gun : b.gun + 1) * GUN + 8 * 3600;
      this._gunlukYaz('uyudu');
      if (d.ev) d.yer = d.ev;
      this.ilerle(sabah);
      return;
    }
    const p = this.parca(kimlik);
    if (!p || !this.eylemler().some((e) => e.kimlik === kimlik)) throw new Error(`Geçersiz eylem: ${kimlik}`);
    if (p.listeler[0].some((n) => n.t === 'anlatı' || n.t === 'söz' || n.t === 'seçim' || n.t === 'eğer')) {
      this._sahneBaslat(p);
      return;
    }
    d.gorulen[p.kimlik] = (d.gorulen[p.kimlik] || 0) + 1;
    const akis = this._akisOlustur(p, d.t, 'eylem');
    for (let koruma = 0; koruma < 500; koruma++) {
      const o = this._sonraki(akis);
      if (o.t === 'son') break;
      if (o.t === 'komut') {
        if (o.d.ad === 'bekle') this.bekle(o.d.sure);
        else this._ortakKomut(o.d);
      }
    }
    d.biten[p.kimlik] = (d.biten[p.kimlik] || 0) + 1;
    if (p.sure) this.bekle(p.sure);
  }

  // Romanda sahne (bölüm) yoksa oyun bitmiştir: ya ">> bitir" ile ya da yazılmış son bölümün sonunda.
  bittiMi() {
    if (this.icerik.roman) return !this.durum.sahne;
    return !this.durum.sahne && (Boolean(this.durum.oyunBitti) || this.durum.t >= this.icerik.ayar.icerikSonu);
  }

  // ---------- Kayıt ----------

  disaVer() {
    return JSON.stringify(this.durum);
  }

  // Kayıttaki parça ve konumlar içerikte artık yoksa (içerik değişmişse) oyunu bozmadan temizle.
  _onar() {
    const d = this.durum;
    // Romana geçmeden önceki bir kayıt yeni yapıda sürdürülemez; arayüz yeni oyun önerir.
    if (this.icerik.roman && !d.roman) { this.uyumsuz = true; return; }
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
    for (const [kisi, akis] of Object.entries(d.akislar)) {
      if (!gecerli(akis)) { delete d.akislar[kisi]; this.onarimlar.push(`Yarım kalan mesaj akışı kaldırıldı: ${akis.kimlik}`); }
    }
    if (d.sahne && !gecerli(d.sahne.akis)) {
      const no = d.sahne.bolum;
      this.onarimlar.push(`Yarım kalan sahne kaldırıldı: ${d.sahne.kimlik}`);
      d.sahne = null;
      // Romanda bölüm değiştiyse o bölüm (ya da yerine gelen) baştan başlar.
      const yerine = no !== undefined ? this.icerik.bolumler.find((p) => p.bolum >= no) : null;
      if (yerine) { this._bolumBaslat(yerine); this.onarimlar.push(`Bölüm ${yerine.bolum} baştan başlatıldı`); }
    }
    d.kuyruk = d.kuyruk.filter((k) => this.parca(k.kimlik));
    d.randevular = (d.randevular || []).filter((r) => this.parca(r.kimlik));
    d.sahneKuyrugu = d.sahneKuyrugu.filter((k) => this.parca(k));
    for (const [kisi, sira] of Object.entries(d.bekleyen)) {
      d.bekleyen[kisi] = sira.filter((k) => this.parca(k));
      if (!d.bekleyen[kisi].length) delete d.bekleyen[kisi];
    }
  }
}
