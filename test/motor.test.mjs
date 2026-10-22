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
tür: sahne
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
  assert.equal(p.tur, 'sahne');
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
  ali: { ad: 'Ali', tanimsiz: 'Adam', numara: '0500 000 00 00', yazmaHizi: 1, okumaGecikmesi: 30 },
  veli: { ad: 'Veli', numara: '0500 000 00 01', rehberde: 'Veli' },
};
const AYAR = { 'başlangıç': '15 Eylül 08:00', 'içerik_sonu': '17 Eylül 08:00', 'ilk_yer': 'Ev' };

function kur(metin) {
  const icerik = icerikDerle([{ ad: 'd.dsim', metin }], { kisiler: KISILER, ayar: AYAR, hava: [] });
  assert.deepEqual(icerik.hatalar, []);
  const oyun = new Oyun(icerik);
  oyun.basla('Kaan');
  return oyun;
}

test('oyun: sabit zamanlı sahne başlar, seçim ve dal işler, süre eklenir', () => {
  const oyun = kur(`
=== s1
tür: sahne
kişi: ali
zaman: 15 Eylül 09:00
süre: 30dk

Merhaba {ad}.
@ali: Nasılsın?
* "İyiyim."
  [ali.iyi]
  @ali: Güzel.
* (Sus.)
  @ali: Peki.
Son satır.
`);
  assert.equal(oyun.sahne, null);
  oyun.eylemSec('_oyalan');
  oyun.eylemSec('_oyalan');
  assert.ok(oyun.sahne, 'sahne başlamalı');
  assert.equal(saatYaz(oyun.t), '09:00');
  const b1 = oyun.sahneDevam();
  assert.equal(b1[0].metin, 'Merhaba Kaan.');
  assert.equal(b1[1].ad, 'Adam', 'tanışılmadan tarifle görünür');
  assert.equal(b1[2].t, 'seçim');
  const b2 = oyun.sahneSec(0);
  assert.deepEqual(b2.map((b) => b.t), ['ben', 'söz', 'anlatı', 'son']);
  assert.equal(oyun.durum.d['ali.iyi'], true);
  oyun.sahneKapat();
  assert.equal(oyun.sahne, null);
  assert.equal(saatYaz(oyun.t), '09:30');
});

test('oyun: mesaj gecikmeli gelir, cevap okundu bilgisi bırakır, zaman aşımı etikete gider', () => {
  const oyun = kur(`
=== m1
tür: mesaj
kişi: ali
zaman: 15 Eylül 08:30

@ali: selam
@ali: orada mısın
>> zaman_aşımı 1sa -> sessiz
* buradayım
  @ali: tamam
-> son
:: sessiz
@ali: neyse
`);
  oyun.ilerle(tarihCoz('15 Eylül 08:30'));
  assert.equal(oyun.okunmamisSayisi('ali'), 1, 'ilk mesaj hemen');
  assert.equal(oyun.yaziyor('ali'), true);
  oyun.bekle(120);
  assert.equal(oyun.okunmamisSayisi('ali'), 2);
  assert.equal(oyun.secenekler('ali').tur, 'cevap');
  oyun.cevapla('ali', 0);
  const sohbet = oyun.durum.sohbet.ali;
  assert.equal(sohbet[sohbet.length - 1].k, 'b');
  const giden = sohbet[sohbet.length - 1];
  assert.equal(oyun.okunduMu(giden), false, 'gönderilir gönderilmez okunmaz');
  oyun.bekle(600);
  assert.equal(oyun.okunduMu(giden), true);
  assert.equal(sohbet[sohbet.length - 1].m, 'tamam');
  assert.ok(sohbet[2].okundu !== null, 'oyuncunun mesajı okundu');
  assert.equal(oyun.okunmamisSayisi('ali'), 1);
});

test('oyun: cevap verilmezse zaman aşımı', () => {
  const oyun = kur(`
=== m1
tür: mesaj
kişi: ali
zaman: 15 Eylül 08:30

@ali: orada mısın
>> zaman_aşımı 1sa -> sessiz
* buradayım
  @ali: tamam
-> son
:: sessiz
@ali: neyse
`);
  oyun.ilerle(tarihCoz('15 Eylül 11:00'));
  const s = oyun.durum.sohbet.ali;
  assert.equal(s[s.length - 1].m, 'neyse');
  assert.equal(oyun.durum.d['m1.cevapsız'], true);
  assert.equal(oyun.secenekler('ali').tur, 'yok');
});

test('oyun: oyuncunun açtığı konu, rehber kaydı, geçmiş mesajlar', () => {
  const oyun = kur(`
=== g
tür: geçmiş
kişi: veli

>> zaman 10 Eylül 10:00
@veli: eski mesaj
>> okunmadı
>> zaman 14 Eylül 22:00
@veli: okunmamış

=== ac
tür: mesaj
kişi: ali
başlatan: oyuncu
başlık: selam ali

@ali: selam
>> rehber ali: Ali | Komşu Ali
@ali: kaydettin mi
`);
  assert.equal(oyun.okunmamisSayisi('veli'), 1);
  assert.equal(oyun.gorunenAd('ali'), '0500 000 00 00');
  assert.equal(oyun.secenekler('ali').tur, 'açılış');
  oyun.cevapla('ali', 'ac');
  oyun.bekle(300);
  const s = oyun.secenekler('ali');
  assert.equal(s.tur, 'rehber');
  oyun.cevapla('ali', 1);
  assert.equal(oyun.gorunenAd('ali'), 'Komşu Ali');
  oyun.bekle(300);
  assert.equal(oyun.durum.sohbet.ali.at(-1).m, 'kaydettin mi');
  assert.equal(oyun.secenekler('ali').tur, 'yok', 'açılış bir kez kullanılır');
});

test('oyun: sahnede telefona bakmak tepkiyi oynatır ve seçimi yeniden sunar', () => {
  const oyun = kur(`
=== m
tür: mesaj
kişi: veli
zaman: 15 Eylül 08:05

@veli: neredesin

=== s
tür: sahne
kişi: ali
zaman: 15 Eylül 08:10

@ali: Bir şey soracağım.
* "Sor."
  @ali: Boşver.
-> son
:: telefon
@ali: Telefona mı bakıyorsun?
-> geri
`);
  oyun.ilerle(tarihCoz('15 Eylül 08:10'));
  oyun.sahneDevam();
  const b = oyun.telefonaBak();
  assert.equal(b[0].t, 'telefon');
  assert.equal(b[0].bildirimler[0].m, 'neredesin');
  assert.equal(b[1].metin, 'Telefona mı bakıyorsun?');
  assert.equal(b.at(-1).t, 'seçim');
  assert.equal(oyun.durum.d['sahne.telefon'], 1);
  const son = oyun.sahneSec(0);
  assert.equal(son.at(-1).t, 'son');
});

test('oyun: eylemler pencere ve tarihe göre görünür; uyumak sabaha götürür', () => {
  const oyun = kur(`
=== e
tür: eylem
başlık: Yürü
tarih: 15 Eylül
pencere: 09:00-10:00
süre: 1sa

Yürüyorsun.
`);
  assert.deepEqual(oyun.eylemler().map((e) => e.kimlik), ['_oyalan']);
  oyun.ilerle(tarihCoz('15 Eylül 09:15'));
  assert.deepEqual(oyun.eylemler().map((e) => e.kimlik), ['e', '_oyalan']);
  oyun.eylemSec('e');
  assert.deepEqual(oyun.sahneDevam().map((b) => b.t), ['anlatı', 'son']);
  oyun.sahneKapat();
  assert.equal(saatYaz(oyun.t), '10:15');
  assert.deepEqual(oyun.eylemler().map((e) => e.kimlik), ['_oyalan']);
  oyun.ilerle(tarihCoz('15 Eylül 23:00'));
  oyun.eylemSec('_uyu');
  assert.equal(gunBilgisi(oyun.t).tarih, '16 Eylül');
  assert.equal(saatYaz(oyun.t), '08:00');
});

test('oyun: kayıt dışa verilip geri yüklenince aynı yerden sürer', () => {
  const metin = `
=== s
tür: sahne
kişi: ali
zaman: 15 Eylül 08:10

@ali: Bir.
* "İki."
  @ali: Üç.
`;
  const oyun = kur(metin);
  oyun.ilerle(tarihCoz('15 Eylül 08:10'));
  oyun.sahneDevam();
  const json = oyun.disaVer();
  const icerik = icerikDerle([{ ad: 'd.dsim', metin }], { kisiler: KISILER, ayar: AYAR, hava: [] });
  const ikinci = new Oyun(icerik, JSON.parse(json));
  assert.equal(ikinci.sahneSec(0).at(-1).t, 'son');
});

test('oyun: içerik değişince bozuk kayıt onarılır', () => {
  const oyun = kur(`
=== s
tür: sahne
zaman: 15 Eylül 08:10

Bir.
* "İki."
  Üç.
`);
  oyun.ilerle(tarihCoz('15 Eylül 08:10'));
  oyun.sahneDevam();
  const yeni = icerikDerle([{ ad: 'd.dsim', metin: '=== baska\ntür: sahne\nzaman: 16 Eylül 08:00\n\nYeni.\n' }], { kisiler: KISILER, ayar: AYAR, hava: [] });
  const ikinci = new Oyun(yeni, JSON.parse(oyun.disaVer()));
  assert.equal(ikinci.sahne, null);
  assert.equal(ikinci.onarimlar.length, 1);
});

test('oyun: uyuyunca eve dönülür; ikinci bakışta aynı tepki tekrarlanmaz', () => {
  const oyun = kur(`
=== m
tür: mesaj
kişi: veli
zaman: 15 Eylül 08:05

@veli: neredesin

=== s
tür: sahne
kişi: ali
zaman: 15 Eylül 08:10
yer: Kordon

@ali: Bir şey soracağım.
* "Sor."
  >> ev Yeni ev
-> son
:: telefon
@ali: Telefona mı bakıyorsun?
-> geri
`);
  oyun.ilerle(tarihCoz('15 Eylül 08:10'));
  oyun.sahneDevam();
  assert.equal(oyun.telefonaBak().filter((b) => b.t === 'söz').length, 1);
  assert.equal(oyun.telefonaBak().filter((b) => b.t === 'söz').length, 0, 'tekrar etiketi yoksa tepki yok');
  oyun.sahneSec(0);
  oyun.sahneKapat();
  assert.equal(oyun.durum.yer, 'Kordon');
  oyun.ilerle(tarihCoz('15 Eylül 23:00'));
  oyun.eylemSec('_uyu');
  assert.equal(oyun.durum.yer, 'Yeni ev');
});

// ---------- Kayıt kodu ----------

test('kayıt kodu: gidip geliyor', async () => {
  const durum = { t: 123, oyuncu: { ad: 'Kaan' }, d: { 'x.y': 'çğış' } };
  const kod = await kodaCevir(JSON.stringify(durum));
  assert.match(kod, /^PIR[01]\./);
  assert.deepEqual(await koddanCoz(kod), durum);
  await assert.rejects(koddanCoz('merhaba'));
});
