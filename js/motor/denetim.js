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
  const cagrilanlar = new Set();

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
  for (const p of icerik.bolumler) {
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
    if (tur === 'geçmiş' && !p.kisi) hatalar.push(`${yer}: geçmiş parçasının kişisi olmalı`);
    if (p.kisi && !kisiler[p.kisi]) hatalar.push(`${yer}: kişi "${p.kisi}" kisiler.json'da yok`);
    if (p.zaman !== undefined && p.zaman !== null) {
      if (tur !== 'bölüm') hatalar.push(`${yer}: başlıkta "zaman" yalnızca bölümlerde olur; sahne bir bölümden ">> oyna" ile çağrılır, saati orada ">> zaman" ile verilir`);
      if (p.zaman < ayar.baslangic) hatalar.push(`${yer}: zaman oyunun başlangıcından önce`);
      if (p.zaman > TAKVIM_SONU) hatalar.push(`${yer}: zaman oyunun bitişinden sonra`);
    }

    p.listeler.forEach((liste, listeNo) => {
      const yz = yazisma.get(listeNo) || null; // bu liste bir yazışmanın içindeyse kiminle
      const mesajGibi = tur === 'geçmiş' || yz;
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
          if (tur === 'geçmiş') hatalar.push(`${p.dosya}:${no} geçmiş parçasında yazışma açılmaz`);
        }
        if (d.t === 'seçim') {
          if (tur === 'geçmiş') hatalar.push(`${p.dosya}:${no} geçmiş parçasında seçim olmaz`);
          if (d.secenekler.length > 5) uyarilar.push(`${p.dosya}:${no} 5'ten fazla seçenek`);
          for (const s of d.secenekler) {
            kosulDenetle(p, s.kosul, s.no);
            metinDenetle(p, s.metin, s.no);
            if (!mesajGibi && s.tip === 'düz') {
              hatalar.push(`${p.dosya}:${s.no} Sahne seçeneği ya "tırnak içinde söz" ya da "(parantez içinde eylem)" olmalı: ${s.metin}`);
            }
            if (yz && s.tip === 'söz') hatalar.push(`${p.dosya}:${s.no} Mesaj seçeneğini tırnaksız yaz; yazıldığı gibi gönderilir.`);
          }
        }
        if (d.t === 'git' && !['son', 'geri'].includes(d.hedef) && p.etiketler[d.hedef] === undefined) {
          hatalar.push(`${p.dosya}:${no} Atlama hedefi yok: ${d.hedef}`);
        }
        if (d.t === 'eğer') for (const dal of d.dallar) kosulDenetle(p, dal.kosul, no);
        if (d.t === 'komut') {
          const k = d;
          if (k.ad === 'oyna' || k.ad === 'geç') {
            cagrilanlar.add(k.hedef);
            const h = parcalar.get(k.hedef);
            if (!h) hatalar.push(`${p.dosya}:${no} ${k.ad}: parça yok: ${k.hedef}`);
            else if (h.tur !== 'sahne') hatalar.push(`${p.dosya}:${no} ${k.ad} yalnızca sahne parçasına gider: ${k.hedef}`);
            if (yz) hatalar.push(`${p.dosya}:${no} Yazışmanın içinden ${k.ad} kullanılmaz`);
          }
          if (k.ad === 'rehber' && !(kisiler[k.kisi] && kisiler[k.kisi].numara)) hatalar.push(`${p.dosya}:${no} rehber: "${k.kisi}" kişisinin numarası yok`);
          if (k.ad === 'tanış' && !kisiler[k.kisi]) hatalar.push(`${p.dosya}:${no} tanış: böyle bir kişi yok: ${k.kisi}`);
          if (k.ad === 'okudu' && !yz) hatalar.push(`${p.dosya}:${no} "okudu" yalnızca yazışmalarda kullanılır`);
          if (yz && ['zaman', 'saat', 'yer', 'bitir'].includes(k.ad)) hatalar.push(`${p.dosya}:${no} Yazışmanın içinde "${k.ad}" kullanılmaz (zaman için "bekle")`);
          if (k.ad === 'okunmadı' && tur !== 'geçmiş') hatalar.push(`${p.dosya}:${no} "okunmadı" yalnızca geçmiş parçalarında kullanılır`);
          if (['yer', 'bitir', 'rehber', 'oyna', 'geç'].includes(k.ad) && tur === 'geçmiş') hatalar.push(`${p.dosya}:${no} geçmiş parçasında "${k.ad}" kullanılmaz`);
        }
      }
      // Bir etiketin üstündeki kısım ya bir atlamayla biter ya da hiç bitmez; yoksa akış farkında olmadan
      // bir sonraki etiketin sahnesine düşer (ilk taslakta "iyi geceler" diyen oyuncu Defne'nin yatak odasına düşüyordu).
      if (listeNo === 0 && tur !== 'geçmiş') {
        liste.forEach((d, i) => {
          if (d.t !== 'etiket' || i === 0) return;
          if (!hepAtlar(p, liste[i - 1])) hatalar.push(`${p.dosya}:${d.no} "${d.ad}" etiketinin üstündeki kısım bir atlamayla (-> etiket ya da -> son) bitmiyor; akış bu etikete düşer`);
        });
      }
      if (listeNo === 0 && tur === 'geçmiş' && !liste.some((d) => d.t === 'komut' && d.ad === 'zaman')) {
        hatalar.push(`${yer}: geçmiş parçası "zaman" ile başlamalı`);
      }
    });
  }

  // Her sahne bir bölümden (ya da başka bir sahneden) çağrılmalı.
  for (const p of parcalar.values()) {
    if (p.tur === 'sahne' && !cagrilanlar.has(p.kimlik)) hatalar.push(`${p.dosya}:${p.satir} "${p.kimlik}" hiçbir yerden çağrılmıyor (>> oyna ya da >> geç yok)`);
  }

  return { hatalar, uyarilar };
}

// Bu düğümden sonra akış her durumda başka bir yere atlıyor mu?
function hepAtlar(p, d) {
  if (!d) return false;
  if (d.t === 'git') return true;
  const listeAtlar = (l) => hepAtlar(p, (p.listeler[l] || []).at(-1));
  if (d.t === 'eğer') return d.yoksa !== undefined && listeAtlar(d.yoksa) && d.dallar.every((dal) => listeAtlar(dal.govde));
  if (d.t === 'seçim') return d.secenekler.every((s) => !s.kosul && listeAtlar(s.govde));
  return false;
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
