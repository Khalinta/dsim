import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tarihCoz, sureCoz, gunBilgisi, evre, saatYaz, goreliZaman } from '../js/motor/tarih.js';
import { ifadeCoz, hesapla } from '../js/motor/ifade.js';
import { ayristir } from '../js/motor/ayristirici.js';
import { icerikDerle, Oyun } from '../js/motor/oyun.js';
import { kodaCevir, koddanCoz } from '../js/motor/kayit.js';

// ---------- Tarih ----------

test('tarih: 14 Eylül pazar, oyunun ilk günü', () => {
  assert.equal(tarihCoz('14 Eylül'), 0);
  const b = gunBilgisi(tarihCoz('15 Eylül 08:10'));
  assert.equal(b.gunAdi, 'Pazartesi');
  assert.equal(b.saat, 8);
  assert.equal(b.dakika, 10);
});

test('tarih: takvimdeki sabit günler doğru haftagününe düşüyor', () => {
  assert.equal(gunBilgisi(tarihCoz('29 Ekim')).gunAdi, 'Çarşamba');
  assert.equal(gunBilgisi(tarihCoz('4 Aralık')).gunAdi, 'Perşembe');
  assert.equal(gunBilgisi(tarihCoz('31 Aralık')).gunAdi, 'Çarşamba');
  assert.equal(gunBilgisi(tarihCoz('6 Ocak')).gunAdi, 'Salı');
  assert.equal(gunBilgisi(tarihCoz('6 Ocak')).gun, 114);
});

test('tarih: oyundan önceki tarihler negatif', () => {
  assert.ok(tarihCoz('9 Haziran 18:02') < 0);
});

test('tarih: süreler', () => {
  assert.equal(sureCoz('5dk'), 300);
  assert.equal(sureCoz('2sa'), 7200);
  assert.equal(sureCoz('1sa30dk'), 5400);
  assert.equal(sureCoz('1gün'), 86400);
  assert.equal(sureCoz('saat'), null);
});

test('tarih: evreler ve göreli zaman', () => {
  assert.equal(evre(tarihCoz('15 Eylül 03:00')), 'gece');
  assert.equal(evre(tarihCoz('15 Eylül 09:00')), 'sabah');
  assert.equal(evre(tarihCoz('15 Eylül 19:30')), 'gunbatimi');
  assert.equal(evre(tarihCoz('15 Aralık 18:30')), 'aksam');
  assert.equal(saatYaz(tarihCoz('15 Eylül 08:05')), '08:05');
  const t = tarihCoz('15 Eylül 10:00');
  assert.equal(goreliZaman(t - 30, t), 'şimdi');
  assert.equal(goreliZaman(t - 600, t), '10 dk önce');
});

// ---------- İfade ----------

const baglam = (degiskenler) => ({
  degisken: (ad) => degiskenler[ad] ?? 0,
  cagir: (ad, arg) => (ad === 'gördü' ? arg[0] === 'x' : false),
  tarihCevir: (s) => s.length,
});

test('ifade: ve, veya, değil, kıyas', () => {
  const d = { 'defne.yakınlık': 3, gece: true };
  assert.equal(hesapla(ifadeCoz('defne.yakınlık >= 2 ve gece'), baglam(d)), true);
  assert.equal(hesapla(ifadeCoz('değil gece veya defne.yakınlık == 3'), baglam(d)), true);
  assert.equal(hesapla(ifadeCoz('değil (gece veya yok)'), baglam(d)), false);
  assert.equal(hesapla(ifadeCoz('gördü(x) ve değil gördü(y)'), baglam(d)), true);
  assert.equal(hesapla(ifadeCoz('a.cevap == "haftaya"'), baglam({ 'a.cevap': 'haftaya' })), true);
  assert.equal(hesapla(ifadeCoz('tanımsız + 2 > 1'), baglam({})), true);
});

test('ifade: hatalı ifade hata verir', () => {
  assert.throws(() => ifadeCoz('a >= '));
  assert.throws(() => ifadeCoz('a ve ve b'));
  assert.throws(() => ifadeCoz('"kapanmayan'));
});

// ---------- Ayrıştırıcı ----------

test('ayrıştırıcı: başlık, seçenek, girinti, etiket', () => {
  const { parcalar, hatalar } = ayristir(`
=== deneme
tür: bölüm
bölüm: 1
başlık: Deneme
zaman: 15 Eylül 09:00

Anlatı satırı.
@emre: Merhaba.
* "Merhaba."
  [x +1]
  @emre: İyi.
* {x > 0} (Git.)
  -> son
>> eğer x == 1
  Bir.
>> yoksa
  Başka.
:: telefon
@emre: Telefon.
-> geri
`, 'deneme.dsim');
  assert.deepEqual(hatalar, []);
  const p = parcalar[0];
  assert.equal(p.tur, 'bölüm');
  assert.equal(p.bolum, 1);
  assert.equal(p.zaman, tarihCoz('15 Eylül 09:00'));
  const kok = p.listeler[0];
  assert.equal(kok[0].t, 'anlatı');
  assert.equal(kok[1].t, 'söz');
  assert.equal(kok[2].t, 'seçim');
  assert.equal(kok[2].secenekler.length, 2);
  assert.equal(kok[2].secenekler[0].tip, 'söz');
  assert.equal(kok[2].secenekler[0].metin, 'Merhaba.');
  assert.equal(kok[2].secenekler[1].tip, 'eylem');
  assert.ok(kok[2].secenekler[1].kosul);
  assert.equal(kok[3].t, 'eğer');
  assert.equal(p.etiketler.telefon, 4);
});

test('ayrıştırıcı: hatalar satır numarasıyla bildirilir', () => {
  const { hatalar } = ayristir(`=== kotu
tür: sahne

   Üç boşluk.
>> bilinmeyen
[x ++]
`, 'kotu.dsim');
  assert.ok(hatalar.length >= 3);
  assert.ok(hatalar.every((h) => h.dosya === 'kotu.dsim' && h.satir > 0));
});

// ---------- Oyun ----------

const KISILER = {
  ben: { ad: 'Sen' },
  ali: { ad: 'Ali', tanimsiz: 'Adam', numara: '0500 000 00 00' },
  veli: { ad: 'Veli', numara: '0500 000 00 01', rehberde: 'Veli' },
};
const AYAR = { 'başlangıç': '15 Eylül 08:00', 'ilk_yer': 'Ev' };

function kur(metin) {
  const icerik = icerikDerle([{ ad: 'd.dsim', metin }], { kisiler: KISILER, ayar: AYAR, hava: [] });
  assert.deepEqual(icerik.hatalar, []);
  const oyun = new Oyun(icerik);
  oyun.basla('Kaan');
  return oyun;
}

test('oyun: geçmiş mesajlar oyundan önce telefonda durur; okunmadı işareti kalır', () => {
  const oyun = kur(`
=== g
tür: geçmiş
kişi: veli

>> zaman 10 Eylül 10:00
@veli: eski mesaj
@ben: tamam
>> okunmadı
>> zaman 14 Eylül 22:00
@veli: okunmamış

=== b1
tür: bölüm
bölüm: 1
başlık: Bir

Sabah.
`);
  assert.equal(oyun.durum.sohbet.veli.length, 3);
  assert.equal(oyun.okunmamisSayisi('veli'), 1);
  assert.equal(oyun.gorunenAd('veli'), 'Veli');
  assert.equal(oyun.gorunenAd('ali'), '0500 000 00 00');
  assert.equal(oyun.sahneAdi('ali'), 'Adam');
  oyun.oku('veli');
  assert.equal(oyun.toplamOkunmamis(), 0);
});

test('oyun: içerikte bölüm yoksa hata verir', () => {
  const icerik = icerikDerle([{ ad: 'd.dsim', metin: '=== s\ntür: sahne\n\nMetin.\n' }], { kisiler: KISILER, ayar: AYAR, hava: [] });
  assert.ok(icerik.hatalar.some((h) => /bölüm yok/.test(h.mesaj)));
});

test('ayrıştırıcı: eski takvim yapısının parçaları ve komutları artık tanınmaz', () => {
  const { hatalar } = ayristir(`=== e
tür: eylem
tekrar: evet

>> randevu x 15 Eylül 20:00 | Yer
>> başlat x
>> zaman_aşımı 2sa
`, 'eski.dsim');
  const metin = hatalar.map((h) => h.mesaj).join(' | ');
  assert.match(metin, /tür eksik ya da bilinmiyor/);
  assert.match(metin, /Bilinmeyen başlık "tekrar"/);
  assert.match(metin, /Bilinmeyen komut: >> randevu/);
  assert.match(metin, /Bilinmeyen komut: >> başlat/);
  assert.match(metin, /Bilinmeyen komut: >> zaman_aşımı/);
});

// ---------- Kayıt kodu ----------

test('kayıt kodu: gidip geliyor', async () => {
  const durum = { t: 123, oyuncu: { ad: 'Kaan' }, d: { 'x.y': 'çğış' } };
  const kod = await kodaCevir(JSON.stringify(durum));
  assert.match(kod, /^PIR[01]\./);
  assert.deepEqual(await koddanCoz(kod), durum);
  await assert.rejects(koddanCoz('merhaba'));
});
