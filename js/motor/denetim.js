// İçerik denetimi: yazım biçimi, bağlantılar, erişilebilirlik. Testler ve okuma aracı kullanır.

import { adlariTopla } from './ifade.js';
import { tarihCoz } from './tarih.js';

const TAKVIM_SONU = tarihCoz('6 Ocak 23:59');
const FONKSIYONLAR = new Set(['gördü', 'bitti', 'kaç', 'tanıdı', 'kayıtlı']);
const YER_TUTUCU = /\{([^}]*)\}/g;

export function denetle(icerik, { yasakliKaliplar = [] } = {}) {
  const hatalar = icerik.hatalar.map((h) => `${h.dosya}:${h.satir} ${h.mesaj}`);
  const uyarilar = [];
  const { parcalar, kisiler, ayar } = icerik;
  const baslatilanlar = new Set();

  const metinDenetle = (p, metin, no) => {
    for (const m of metin.matchAll(YER_TUTUCU)) {
      if (m[1] !== 'ad') hatalar.push(`${p.dosya}:${no} Bilinmeyen yer tutucu {${m[1]}}`);
    }
    const kucuk = metin.toLocaleLowerCase('tr');
    for (const k of yasakliKaliplar) {
      const var_ = typeof k === 'string' ? kucuk.includes(k) : k.test(kucuk);
      if (var_) hatalar.push(`${p.dosya}:${no} Yasaklı kalıp "${k}": ${metin}`);
    }
  };

  const kosulDenetle = (p, agac, no) => {
    if (!agac) return;
    for (const c of adlariTopla(agac).cagrilar) {
      if (!FONKSIYONLAR.has(c.ad)) { hatalar.push(`${p.dosya}:${no} Bilinmeyen fonksiyon ${c.ad}()`); continue; }
      const arg = c.argumanlar[0];
      if (['gördü', 'bitti', 'kaç'].includes(c.ad) && !parcalar.has(arg)) hatalar.push(`${p.dosya}:${no} ${c.ad}(${arg}): böyle bir parça yok`);
      if (['tanıdı', 'kayıtlı'].includes(c.ad) && !kisiler[arg]) hatalar.push(`${p.dosya}:${no} ${c.ad}(${arg}): böyle bir kişi yok`);
    }
  };

  // Bölümler: numaralar tek ve sıralı, zaman ilerler.
  const bolumNo = new Map();
  let oncekiBolum = null;
  for (const p of icerik.bolumler || []) {
    const yer = `${p.dosya}:${p.satir} "${p.kimlik}"`;
    if (bolumNo.has(p.bolum)) hatalar.push(`${yer}: bölüm ${p.bolum} iki kez var (öbürü "${bolumNo.get(p.bolum)}")`);
    bolumNo.set(p.bolum, p.kimlik);
    if (!p.baslik['başlık']) hatalar.push(`${yer}: bölümün başlığı olmalı`);
    if (oncekiBolum && p.zaman != null && oncekiBolum.zaman != null && p.zaman < oncekiBolum.zaman) {
      hatalar.push(`${yer}: bölüm ${p.bolum}, bölüm ${oncekiBolum.bolum}'den önceki bir zamanda başlıyor`);
    }
    if (p.zaman != null) oncekiBolum = p;
  }

  for (const p of parcalar.values()) {
    const yer = `${p.dosya}:${p.satir} "${p.kimlik}"`;
    const tur = p.tur;
    const yazisma = yazismaListeleri(p);
    if (icerik.roman) {
      if (tur === 'eylem' || tur === 'mesaj') hatalar.push(`${yer}: roman yapısında ${tur} parçası kullanılmaz (yazışmalar bölümün içinde ">> yazışma" ile yazılır)`);
      if (tur === 'sahne' && p.zaman != null) hatalar.push(`${yer}: roman yapısında sahne kendi saatinde başlamaz; bir bölümden ">> oyna" ile çağrılır`);
    }
    if (['mesaj', 'geçmiş'].includes(tur) && !p.kisi) hatalar.push(`${yer}: ${tur} parçasının kişisi olmalı`);
    if (p.kisi && !kisiler[p.kisi]) hatalar.push(`${yer}: kişi "${p.kisi}" kisiler.json'da yok`);
    if (tur === 'eylem' && !p.baslik['başlık']) hatalar.push(`${yer}: eylemin başlığı olmalı`);
    if (p.baslatan && p.baslatan !== 'oyuncu') hatalar.push(`${yer}: başlatan yalnızca "oyuncu" olabilir`);
    if (p.baslatan && !p.baslik['başlık']) hatalar.push(`${yer}: oyuncunun başlattığı mesajın başlığı (göndereceği ilk mesaj) olmalı`);
    if (p.zaman !== undefined && p.zaman !== null) {
      if (!['sahne', 'mesaj', 'bölüm'].includes(tur)) hatalar.push(`${yer}: "zaman" yalnızca bölüm, sahne ve mesaj parçalarında kullanılır`);
      if (p.zaman < ayar.baslangic) hatalar.push(`${yer}: zaman oyunun başlangıcından önce`);
      if (p.zaman > TAKVIM_SONU) hatalar.push(`${yer}: zaman oyunun bitişinden sonra`);
    }
    kosulDenetle(p, p.kosul, p.satir);

    p.listeler.forEach((liste, listeNo) => {
      const yz = yazisma.get(listeNo) || null; // bu liste bir yazışmanın içindeyse kiminle
      const mesajGibi = tur === 'mesaj' || tur === 'geçmiş' || yz;
      const sohbetKisisi = yz || p.kisi;
      for (const d of liste) {
        const no = d.no;
        if (d.t === 'anlatı') {
          if (yz) hatalar.push(`${p.dosya}:${no} Yazışmanın içinde anlatı olmaz (yazışmayı kapatıp anlatıya dön): ${d.metin}`);
          else if (mesajGibi) hatalar.push(`${p.dosya}:${no} Mesaj parçasında anlatı olmaz: ${d.metin}`);
          metinDenetle(p, d.metin, no);
        }
        if (d.t === 'söz') {
          if (!kisiler[d.kisi]) hatalar.push(`${p.dosya}:${no} Bilinmeyen kişi @${d.kisi}`);
          if (mesajGibi && d.kisi !== 'ben' && d.kisi !== sohbetKisisi) {
            hatalar.push(`${p.dosya}:${no} Bu sohbette yalnızca @${sohbetKisisi} ve @ben yazabilir`);
          }
          metinDenetle(p, d.metin, no);
        }
        if (d.t === 'yazışma') {
          if (!kisiler[d.kisi] || d.kisi === 'ben') hatalar.push(`${p.dosya}:${no} yazışma: böyle bir kişi yok: ${d.kisi}`);
          if (yz) hatalar.push(`${p.dosya}:${no} Yazışmanın içinde başka bir yazışma açılmaz`);
          if (tur !== 'bölüm' && tur !== 'sahne') hatalar.push(`${p.dosya}:${no} yazışma yalnızca bölüm ve sahne parçalarında kullanılır`);
        }
        if (d.t === 'seçim') {
          if (tur === 'geçmiş') hatalar.push(`${p.dosya}:${no} ${tur} parçasında seçim olmaz`);
          if (d.zamanAsimi && d.zamanAsimi.etiket && p.etiketler[d.zamanAsimi.etiket] === undefined) {
            hatalar.push(`${p.dosya}:${no} zaman aşımı etiketi yok: ${d.zamanAsimi.etiket}`);
          }
          if (d.secenekler.length > 5) uyarilar.push(`${p.dosya}:${no} 5'ten fazla seçenek`);
          for (const s of d.secenekler) {
            kosulDenetle(p, s.kosul, s.no);
            metinDenetle(p, s.metin, s.no);
            if (!mesajGibi && (tur === 'sahne' || tur === 'eylem' || tur === 'bölüm') && s.tip === 'düz') {
              hatalar.push(`${p.dosya}:${s.no} Sahne seçeneği ya "tırnak içinde söz" ya da "(parantez içinde eylem)" olmalı: ${s.metin}`);
            }
            if ((tur === 'mesaj' || yz) && s.tip === 'söz') hatalar.push(`${p.dosya}:${s.no} Mesaj seçeneğini tırnaksız yaz; yazıldığı gibi gönderilir.`);
          }
        }
        if (d.t === 'git' && !['son', 'geri'].includes(d.hedef) && p.etiketler[d.hedef] === undefined) {
          hatalar.push(`${p.dosya}:${no} Atlama hedefi yok: ${d.hedef}`);
        }
        if (d.t === 'eğer') for (const dal of d.dallar) kosulDenetle(p, dal.kosul, no);
        if (d.t === 'komut') {
          const k = d;
          if (k.ad === 'randevu' || k.ad === 'iptal') {
            if (k.ad === 'randevu') baslatilanlar.add(k.hedef);
            const h = parcalar.get(k.hedef);
            if (!h) hatalar.push(`${p.dosya}:${no} ${k.ad}: parça yok: ${k.hedef}`);
            else if (k.ad === 'randevu' && h.tur !== 'sahne') hatalar.push(`${p.dosya}:${no} randevu yalnızca sahneye kurulur: ${k.hedef}`);
          }
          if (k.ad === 'oyna' || k.ad === 'geç') {
            baslatilanlar.add(k.hedef);
            const h = parcalar.get(k.hedef);
            if (!h) hatalar.push(`${p.dosya}:${no} ${k.ad}: parça yok: ${k.hedef}`);
            else if (h.tur !== 'sahne') hatalar.push(`${p.dosya}:${no} ${k.ad} yalnızca sahne parçasına gider: ${k.hedef}`);
            if (yz) hatalar.push(`${p.dosya}:${no} Yazışmanın içinden ${k.ad} kullanılmaz`);
          }
          if (k.ad === 'başlat') {
            baslatilanlar.add(k.hedef);
            if (!parcalar.has(k.hedef)) hatalar.push(`${p.dosya}:${no} başlatılacak parça yok: ${k.hedef}`);
          }
          if (k.ad === 'rehber' && !(kisiler[k.kisi] && kisiler[k.kisi].numara)) hatalar.push(`${p.dosya}:${no} rehber: "${k.kisi}" kişisinin numarası yok`);
          if (k.ad === 'tanış' && !kisiler[k.kisi]) hatalar.push(`${p.dosya}:${no} tanış: böyle bir kişi yok: ${k.kisi}`);
          if (k.ad === 'okudu' && tur !== 'mesaj' && !yz) hatalar.push(`${p.dosya}:${no} "okudu" yalnızca yazışmalarda ve mesaj parçalarında kullanılır`);
          if (yz && ['zaman', 'saat', 'yer', 'ev', 'başlat', 'randevu', 'bitir'].includes(k.ad)) hatalar.push(`${p.dosya}:${no} Yazışmanın içinde "${k.ad}" kullanılmaz (zaman için "bekle")`);
          if (k.ad === 'okunmadı' && tur !== 'geçmiş') hatalar.push(`${p.dosya}:${no} "okunmadı" yalnızca geçmiş parçalarında kullanılır`);
          if ((k.ad === 'zaman' || k.ad === 'saat') && tur === 'mesaj') hatalar.push(`${p.dosya}:${no} Mesaj parçalarında zaman atlanmaz; "bekle" kullan`);
          if ((k.ad === 'yer' || k.ad === 'ev') && (tur === 'mesaj' || tur === 'geçmiş')) hatalar.push(`${p.dosya}:${no} Mesaj parçasında yer değişmez`);
        }
      }
      if (listeNo === 0 && tur === 'geçmiş' && !liste.some((d) => d.t === 'komut' && d.ad === 'zaman')) {
        hatalar.push(`${yer}: geçmiş parçası "zaman" ile başlamalı`);
      }
    });
  }

  // Erişilebilirlik: her parça bir yoldan açılabilmeli.
  for (const p of parcalar.values()) {
    const acilir = p.tur === 'geçmiş' || p.tur === 'eylem' || p.tur === 'bölüm'
      || (p.zaman !== undefined && p.zaman !== null)
      || p.baslatan === 'oyuncu'
      || (p.tur === 'mesaj' && (p.tarihBas !== undefined || p.pencere !== undefined))
      || baslatilanlar.has(p.kimlik);
    if (!acilir) hatalar.push(`${p.dosya}:${p.satir} "${p.kimlik}" hiçbir yerden açılmıyor (zaman, eylem, başlatan, >> başlat ya da >> oyna yok)`);
  }

  return { hatalar, uyarilar };
}

// Bir parçada yazışma bloklarının içinde kalan listeler: liste no → kişi.
function yazismaListeleri(p) {
  const harita = new Map();
  const isle = (listeNo, kisi) => {
    if (kisi) harita.set(listeNo, kisi);
    for (const d of p.listeler[listeNo] || []) {
      if (d.t === 'yazışma') isle(d.govde, kisi || d.kisi);
      else if (d.t === 'seçim') for (const s of d.secenekler) isle(s.govde, kisi);
      else if (d.t === 'eğer') {
        for (const dal of d.dallar) isle(dal.govde, kisi);
        if (d.yoksa !== undefined) isle(d.yoksa, kisi);
      }
    }
  };
  isle(0, null);
  return harita;
}
