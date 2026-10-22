// Oyun içi zaman. Birim saniye; 0 = 14 Eylül 00:00 (oyunun ilk günü, Pazar).
// Haftanın günleri 2025–26 takvimine göre hesaplanır; yıl hiçbir yerde gösterilmez.

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz',
  'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const DAKIKA = 60;
const SAAT = 3600;
export const GUN = 86400;

const BASLANGIC = Date.UTC(2025, 8, 14);

function yilBul(ay) {
  // Haziran–Aralık oyunun başladığı yıl, Ocak–Mayıs ertesi yıl.
  return ay >= 6 ? 2025 : 2026;
}

// "15 Eylül", "15 Eylül 08:10" → saniye. Tanınmazsa null.
export function tarihCoz(metin) {
  const m = String(metin).trim().match(/^(\d{1,2})\s+(\p{L}+)(?:\s+(\d{1,2}):(\d{2}))?$/u);
  if (!m) return null;
  const ay = AYLAR.indexOf(m[2]) + 1;
  if (ay === 0) return null;
  const gun = Number(m[1]);
  const fark = (Date.UTC(yilBul(ay), ay - 1, gun) - BASLANGIC) / 1000;
  const saat = m[3] === undefined ? 0 : Number(m[3]);
  const dakika = m[4] === undefined ? 0 : Number(m[4]);
  if (saat > 23 || dakika > 59) return null;
  return fark + saat * SAAT + dakika * DAKIKA;
}

// "08:10" → günün içindeki saniye.
export function saatCoz(metin) {
  const m = String(metin).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const s = Number(m[1]);
  const d = Number(m[2]);
  if (s > 24 || d > 59) return null;
  return s * SAAT + d * DAKIKA;
}

// "30sn", "5dk", "2sa", "1gün", "1sa30dk" → saniye.
export function sureCoz(metin) {
  const temiz = String(metin).replace(/\s+/g, '');
  if (!temiz) return null;
  const birimler = { sn: 1, dk: DAKIKA, sa: SAAT, 'gün': GUN };
  let toplam = 0;
  let kalan = temiz;
  const desen = /^(\d+)(sn|dk|sa|gün)/u;
  while (kalan.length) {
    const m = kalan.match(desen);
    if (!m) return null;
    toplam += Number(m[1]) * birimler[m[2]];
    kalan = kalan.slice(m[0].length);
  }
  return toplam;
}

export function gunNo(t) {
  return Math.floor(t / GUN);
}

export function gunBilgisi(t) {
  const gun = gunNo(t);
  const d = new Date(BASLANGIC + gun * GUN * 1000);
  const gunIci = t - gun * GUN;
  const haftagunu = ((d.getUTCDay() + 6) % 7) + 1; // 1 = Pazartesi
  return {
    gun,
    ay: d.getUTCMonth() + 1,
    ayGunu: d.getUTCDate(),
    tarih: `${d.getUTCDate()} ${AYLAR[d.getUTCMonth()]}`,
    haftagunu,
    gunAdi: GUNLER[haftagunu - 1],
    saat: Math.floor(gunIci / SAAT),
    dakika: Math.floor((gunIci % SAAT) / DAKIKA),
    gunIci,
  };
}

const iki = (n) => String(n).padStart(2, '0');

export function saatYaz(t) {
  const b = gunBilgisi(t);
  return `${iki(b.saat)}:${iki(b.dakika)}`;
}

export function tarihYaz(t, gunAdiyla = true) {
  const b = gunBilgisi(t);
  return gunAdiyla ? `${b.tarih} ${b.gunAdi}` : b.tarih;
}

// Mesajlardaki gün ayracı: "Bugün", "Dün", "14 Eylül Pazar".
export function goreliGun(t, simdi) {
  const fark = gunNo(simdi) - gunNo(t);
  if (fark === 0) return 'Bugün';
  if (fark === 1) return 'Dün';
  return tarihYaz(t);
}

// Bildirimlerdeki zaman: "şimdi", "12 dk önce", "2 sa önce", "dün 21:47".
export function goreliZaman(t, simdi) {
  const fark = simdi - t;
  if (fark < 90) return 'şimdi';
  if (fark < SAAT) return `${Math.round(fark / DAKIKA)} dk önce`;
  if (gunNo(t) === gunNo(simdi)) return `${Math.floor(fark / SAAT)} sa önce`;
  if (gunNo(simdi) - gunNo(t) === 1) return `dün ${saatYaz(t)}`;
  return `${gunBilgisi(t).tarih} ${saatYaz(t)}`;
}

// Gün doğumu ve batımı (yaklaşık, dunya/takvim.md'deki tablodan doğrusal ara değer).
const GUNES = [
  [-30, 6 * 60 + 40, 19 * 60 + 55],
  [1, 6 * 60 + 55, 19 * 60 + 30],
  [17, 7 * 60 + 15, 19 * 60 + 0],
  [48, 7 * 60 + 45, 18 * 60 + 15],
  [78, 8 * 60 + 10, 17 * 60 + 50],
  [109, 8 * 60 + 25, 17 * 60 + 55],
  [140, 8 * 60 + 15, 18 * 60 + 20],
];

export function gunes(gun) {
  if (gun <= GUNES[0][0]) return { dogus: GUNES[0][1] * 60, batis: GUNES[0][2] * 60 };
  for (let i = 1; i < GUNES.length; i++) {
    const [g1, d1, b1] = GUNES[i - 1];
    const [g2, d2, b2] = GUNES[i];
    if (gun <= g2) {
      const o = (gun - g1) / (g2 - g1);
      return { dogus: Math.round(d1 + (d2 - d1) * o) * 60, batis: Math.round(b1 + (b2 - b1) * o) * 60 };
    }
  }
  const son = GUNES[GUNES.length - 1];
  return { dogus: son[1] * 60, batis: son[2] * 60 };
}

// Günün evresi: ekran tonları buna göre seçilir.
export function evre(t) {
  const b = gunBilgisi(t);
  const { dogus, batis } = gunes(b.gun);
  const s = b.gunIci;
  if (s < dogus - 45 * DAKIKA) return 'gece';
  if (s < dogus + 40 * DAKIKA) return 'safak';
  if (s < 11 * SAAT + 30 * DAKIKA) return 'sabah';
  if (s < batis - 100 * DAKIKA) return 'ogle';
  if (s < batis - 25 * DAKIKA) return 'ikindi';
  if (s < batis + 25 * DAKIKA) return 'gunbatimi';
  if (s < 22 * SAAT) return 'aksam';
  return 'gece';
}

export function karanlikMi(t) {
  const e = evre(t);
  return e === 'gece' || e === 'aksam';
}
