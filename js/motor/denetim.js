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

  for (const p of parcalar.values()) {
    const yer = `${p.dosya}:${p.satir} "${p.kimlik}"`;
    const tur = p.tur;
    if (['mesaj', 'geçmiş', 'tepki'].includes(tur) && !p.kisi) hatalar.push(`${yer}: ${tur} parçasının kişisi olmalı`);
    if (p.kisi && !kisiler[p.kisi]) hatalar.push(`${yer}: kişi "${p.kisi}" kisiler.json'da yok`);
    if (tur === 'eylem' && !p.baslik['başlık']) hatalar.push(`${yer}: eylemin başlığı olmalı`);
    if (tur === 'tepki' && !p.baslik.olay) hatalar.push(`${yer}: tepkinin olayı olmalı`);
    if (p.baslatan && p.baslatan !== 'oyuncu') hatalar.push(`${yer}: başlatan yalnızca "oyuncu" olabilir`);
    if (p.baslatan && !p.baslik['başlık']) hatalar.push(`${yer}: oyuncunun başlattığı mesajın başlığı (göndereceği ilk mesaj) olmalı`);
    if (p.zaman !== undefined && p.zaman !== null) {
      if (!['sahne', 'mesaj'].includes(tur)) hatalar.push(`${yer}: "zaman" yalnızca sahne ve mesaj parçalarında kullanılır`);
      if (p.zaman < ayar.baslangic) hatalar.push(`${yer}: zaman oyunun başlangıcından önce`);
      if (p.zaman > TAKVIM_SONU) hatalar.push(`${yer}: zaman oyunun bitişinden sonra`);
    }
    kosulDenetle(p, p.kosul, p.satir);
    for (const etiket of ['telefon', 'telefon_tekrar']) {
      if (p.etiketler[etiket] === undefined) continue;
      const onceki = p.listeler[0][p.etiketler[etiket] - 1];
      if (!onceki || !((onceki.t === 'git') || (onceki.t === 'komut' && onceki.ad === 'son'))) {
        hatalar.push(`${yer}: ":: ${etiket}" etiketinden önce akış "->" ile bitmeli, yoksa sahne oraya düşer`);
      }
    }

    p.listeler.forEach((liste, listeNo) => {
      for (const d of liste) {
        const no = d.no;
        if (d.t === 'anlatı') {
          if (tur === 'mesaj' || tur === 'geçmiş') hatalar.push(`${p.dosya}:${no} Mesaj parçasında anlatı olmaz: ${d.metin}`);
          metinDenetle(p, d.metin, no);
        }
        if (d.t === 'söz') {
          if (!kisiler[d.kisi]) hatalar.push(`${p.dosya}:${no} Bilinmeyen kişi @${d.kisi}`);
          if ((tur === 'mesaj' || tur === 'geçmiş') && d.kisi !== 'ben' && d.kisi !== p.kisi) {
            hatalar.push(`${p.dosya}:${no} Bu sohbette yalnızca @${p.kisi} ve @ben yazabilir`);
          }
          metinDenetle(p, d.metin, no);
        }
        if (d.t === 'seçim') {
          if (tur === 'tepki' || tur === 'geçmiş') hatalar.push(`${p.dosya}:${no} ${tur} parçasında seçim olmaz`);
          if (d.zamanAsimi && d.zamanAsimi.etiket && p.etiketler[d.zamanAsimi.etiket] === undefined) {
            hatalar.push(`${p.dosya}:${no} zaman aşımı etiketi yok: ${d.zamanAsimi.etiket}`);
          }
          if (d.secenekler.length > 5) uyarilar.push(`${p.dosya}:${no} 5'ten fazla seçenek`);
          for (const s of d.secenekler) {
            kosulDenetle(p, s.kosul, s.no);
            metinDenetle(p, s.metin, s.no);
            if ((tur === 'sahne' || tur === 'eylem') && s.tip === 'düz') {
              hatalar.push(`${p.dosya}:${s.no} Sahne seçeneği ya "tırnak içinde söz" ya da "(parantez içinde eylem)" olmalı: ${s.metin}`);
            }
            if (tur === 'mesaj' && s.tip === 'söz') hatalar.push(`${p.dosya}:${s.no} Mesaj seçeneğini tırnaksız yaz; yazıldığı gibi gönderilir.`);
          }
        }
        if (d.t === 'git' && !['son', 'geri'].includes(d.hedef) && p.etiketler[d.hedef] === undefined) {
          hatalar.push(`${p.dosya}:${no} Atlama hedefi yok: ${d.hedef}`);
        }
        if (d.t === 'eğer') for (const dal of d.dallar) kosulDenetle(p, dal.kosul, no);
        if (d.t === 'komut') {
          const k = d;
          if (k.ad === 'başlat') {
            baslatilanlar.add(k.hedef);
            if (!parcalar.has(k.hedef)) hatalar.push(`${p.dosya}:${no} başlatılacak parça yok: ${k.hedef}`);
          }
          if (k.ad === 'rehber' && !(kisiler[k.kisi] && kisiler[k.kisi].numara)) hatalar.push(`${p.dosya}:${no} rehber: "${k.kisi}" kişisinin numarası yok`);
          if (k.ad === 'tanış' && !kisiler[k.kisi]) hatalar.push(`${p.dosya}:${no} tanış: böyle bir kişi yok: ${k.kisi}`);
          if (['okudu'].includes(k.ad) && tur !== 'mesaj') hatalar.push(`${p.dosya}:${no} "okudu" yalnızca mesaj parçalarında kullanılır`);
          if (k.ad === 'okunmadı' && tur !== 'geçmiş') hatalar.push(`${p.dosya}:${no} "okunmadı" yalnızca geçmiş parçalarında kullanılır`);
          if (k.ad === 'zaman' && tur === 'mesaj') hatalar.push(`${p.dosya}:${no} Mesaj parçalarında zaman atlanmaz; "bekle" kullan`);
          if ((k.ad === 'yer' || k.ad === 'ev') && (tur === 'mesaj' || tur === 'geçmiş')) hatalar.push(`${p.dosya}:${no} Mesaj parçasında yer değişmez`);
          if (k.ad === 'rehber' && tur === 'tepki') hatalar.push(`${p.dosya}:${no} Tepkide rehber kaydı olmaz`);
        }
      }
      if (listeNo === 0 && tur === 'geçmiş' && !liste.some((d) => d.t === 'komut' && d.ad === 'zaman')) {
        hatalar.push(`${yer}: geçmiş parçası "zaman" ile başlamalı`);
      }
    });
  }

  // Erişilebilirlik: her parça bir yoldan açılabilmeli.
  for (const p of parcalar.values()) {
    const acilir = p.tur === 'geçmiş' || p.tur === 'tepki' || p.tur === 'eylem'
      || (p.zaman !== undefined && p.zaman !== null)
      || p.baslatan === 'oyuncu'
      || (p.tur === 'mesaj' && (p.tarihBas !== undefined || p.pencere !== undefined))
      || baslatilanlar.has(p.kimlik);
    if (!acilir) hatalar.push(`${p.dosya}:${p.satir} "${p.kimlik}" hiçbir yerden açılmıyor (zaman, eylem, başlatan ya da >> başlat yok)`);
  }

  return { hatalar, uyarilar };
}
