// Hataları toplar ve kopyalanabilir bir hata raporu üretir.

import { SURUM } from '../surum.js';
import { saatYaz, tarihYaz } from '../motor/tarih.js';
import { kodaCevir } from '../motor/kayit.js';
import { uyari } from './katman.js';

const hatalar = [];
let uygulamaGetir = () => null;
let raporAc = () => {};

export function kur(getir, raporuAcan) {
  uygulamaGetir = getir;
  raporAc = raporuAcan;
  window.addEventListener('error', (e) => kaydet(e.error || new Error(e.message), 'pencere'));
  window.addEventListener('unhandledrejection', (e) => kaydet(e.reason instanceof Error ? e.reason : new Error(String(e.reason)), 'söz'));
}

export function kaydet(hata, kaynak = 'oyun', sessiz = false) {
  const kayit = {
    zaman: new Date().toISOString(),
    kaynak,
    mesaj: hata && hata.message ? hata.message : String(hata),
    yigin: hata && hata.stack ? String(hata.stack).split('\n').slice(0, 8).join('\n') : '',
  };
  hatalar.push(kayit);
  if (hatalar.length > 20) hatalar.shift();
  try { localStorage.setItem('pirnalli.hatalar', JSON.stringify(hatalar)); } catch { /* yer yok */ }
  console.error(hata);
  if (!sessiz) uyari('Bir şey ters gitti. Hata raporunu bana gönderebilirsin.', { yazi: 'Rapor', tikla: () => raporAc() }, 7000);
}

export function hataSayisi() {
  return hatalar.length;
}

export async function raporOlustur() {
  const app = uygulamaGetir();
  const oyun = app && app.oyun;
  const satirlar = [
    'PIRNALLI HATA RAPORU',
    `Sürüm: ${SURUM}`,
    `Gerçek zaman: ${new Date().toISOString()}`,
    `Tarayıcı: ${navigator.userAgent}`,
    `Ekran: ${window.innerWidth}×${window.innerHeight}, ${window.matchMedia('(display-mode: standalone)').matches ? 'uygulama' : 'tarayıcı'}`,
  ];
  if (app && app.icerik) {
    satirlar.push(`İçerik: ${app.icerik.parcalar.size} parça, ${app.icerik.hatalar.length} içerik hatası`);
    for (const h of app.icerik.hatalar.slice(0, 10)) satirlar.push(`  - ${h.dosya}:${h.satir} ${h.mesaj}`);
  }
  if (oyun && oyun.durum) {
    const d = oyun.durum;
    satirlar.push(
      `Oyun zamanı: ${tarihYaz(d.t)} ${saatYaz(d.t)} · ${d.yer}`,
      `Ekran: ${app.ekran || '?'}`,
      `Sahne: ${d.sahne ? `${d.sahne.kimlik} (${d.sahne.bitti ? 'bitti' : d.sahne.akis.secim ? 'seçimde' : 'akıyor'})` : 'yok'}`,
      `Mesaj akışları: ${Object.values(d.akislar).map((a) => `${a.kisi}:${a.kimlik}${a.secim ? '(cevap bekliyor)' : ''}`).join(', ') || 'yok'}`,
      `Onarımlar: ${oyun.onarimlar.join(' | ') || 'yok'}`,
      '',
      'Son olaylar:',
      ...d.gunluk.slice(-25).map((g) => `  ${g}`),
    );
  }
  satirlar.push('', `Hatalar (${hatalar.length}):`);
  for (const h of hatalar) satirlar.push(`  [${h.zaman}] (${h.kaynak}) ${h.mesaj}`, ...h.yigin.split('\n').filter(Boolean).map((s) => `      ${s.trim()}`));
  if (oyun && oyun.durum) {
    try { satirlar.push('', 'Kayıt kodu:', await kodaCevir(oyun.disaVer())); } catch (e) { satirlar.push('', `Kayıt kodu üretilemedi: ${e.message}`); }
  }
  return satirlar.join('\n');
}

// Önceki oturumdan kalan hataları da rapora kat.
try {
  const eski = JSON.parse(localStorage.getItem('pirnalli.hatalar') || '[]');
  if (Array.isArray(eski)) hatalar.push(...eski.slice(-10).map((h) => ({ ...h, kaynak: `${h.kaynak}, önceki oturum` })));
} catch { /* yok say */ }
