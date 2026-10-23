// Roman yapısı: bölüm akışı, yol ayrımı, alt sahneler, hikâyenin içinde yaşanan yazışmalar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ayristir } from '../js/motor/ayristirici.js';
import { icerikDerle, Oyun } from '../js/motor/oyun.js';
import { denetle } from '../js/motor/denetim.js';
import { tarihCoz, saatYaz } from '../js/motor/tarih.js';
import { diskIcerik } from '../araclar/ortak.mjs';
import { oyna } from '../araclar/bot.mjs';

const KISILER = {
  ben: { ad: 'Sen' },
  ada: { ad: 'Ada', tanimsiz: 'Kadın', numara: '0500 000 00 00', yazmaHizi: 1, okumaGecikmesi: 30 },
  nil: { ad: 'Nil', numara: '0500 000 00 01', rehberde: 'Nil', biliniyor: true, yazmaHizi: 1, okumaGecikmesi: 60 },
};
const AYAR = { 'başlangıç': '14 Eylül 20:00', 'ilk_yer': 'Ev' };
const derle = (metin) => icerikDerle([{ ad: 'r.dsim', metin }], { kisiler: KISILER, ayar: AYAR, hava: [] });

function kur(metin) {
  const icerik = derle(metin);
  assert.deepEqual(icerik.hatalar, []);
  const oyun = new Oyun(icerik);
  oyun.basla('Kaan');
  return oyun;
}

const IKI_BOLUM = `
=== b1
tür: bölüm
bölüm: 1
başlık: Bir
perde: Sezon sonu
zaman: 14 Eylül 22:00
yer: İskele

İskelede rüzgâr var.
@ada: Geç kaldın.
* "Biliyorum."
  [ada.yakin +1]
* (Sus.)
>> yazışma ada
  @ada: vardın mı
  @ada: söyle
  * vardım
    @ada: iyi
  * (Cevap verme.)
Telefonu bırakıyorsun.

=== b2
tür: bölüm
bölüm: 2
başlık: İki
zaman: 16 Eylül 19:00

İkinci bölüm.
`;

test('roman: ayrıştırıcı bölüm, yazışma, oyna ve geç okur', () => {
  const { parcalar, hatalar } = ayristir(`
=== b
tür: bölüm
bölüm: 3
başlık: Üç
perde: Kış

>> yazışma ada
  @ada: selam
  * selam
>> oyna alt
>> geç alt
`, 'r.dsim');
  assert.deepEqual(hatalar, []);
  const p = parcalar[0];
  assert.equal(p.tur, 'bölüm');
  assert.equal(p.bolum, 3);
  const [yz, oyna, gec] = p.listeler[0];
  assert.equal(yz.t, 'yazışma');
  assert.equal(yz.kisi, 'ada');
  assert.equal(p.listeler[yz.govde].length, 2);
  assert.equal(oyna.ad, 'oyna');
  assert.equal(gec.hedef, 'alt');
  assert.ok(ayristir('=== x\ntür: bölüm\n\nMetin.\n', 'r.dsim').hatalar.length, 'numarasız bölüm hata');
  assert.ok(ayristir('=== x\ntür: bölüm\nbölüm: 1\n\n>> yazışma ada\nboş\n', 'r.dsim').hatalar.length, 'boş yazışma hata');
});

test('roman: oyun ilk bölümle başlar', () => {
  const oyun = kur(IKI_BOLUM);
  assert.equal(oyun.sahne.kimlik, 'b1');
  assert.equal(saatYaz(oyun.t), '22:00');
  const b = oyun.bolumBilgisi();
  assert.equal(b.no, 1);
  assert.equal(b.baslik, 'Bir');
  assert.deepEqual(b.perde, { no: 1, ad: 'Sezon sonu' });
  assert.equal(b.basladi, false);
});

test('roman: yazışma telefonda oynar; mesajlar zamanla gelir, kanal blokları sınırı çizer', () => {
  const oyun = kur(IKI_BOLUM);
  const b1 = oyun.sahneDevam();
  assert.deepEqual(b1.map((b) => b.t), ['anlatı', 'söz', 'seçim']);
  const b2 = oyun.sahneSec(0);
  assert.deepEqual(b2.map((b) => b.t), ['ben', 'kanal', 'mesaj', 'mesaj', 'seçim']);
  const [, giris, ilk, ikinci, secim] = b2;
  assert.equal(giris.kisi, 'ada');
  assert.equal(giris.kanal, undefined, 'kanal bloğu kitap düzeyinde');
  assert.equal(ilk.kanal, 'ada');
  assert.equal(ilk.yazma, 0, 'yazışmanın ilk mesajı telefon açılırken gelmiştir');
  assert.ok(ikinci.yazma > 0, 'sonrakiler yazılır');
  assert.equal(ikinci.an - ilk.an, ikinci.yazma);
  assert.equal(secim.kanal, 'ada');
  assert.equal(oyun.durum.sohbet.ada.length, 2);

  const b3 = oyun.sahneSec(0);
  assert.deepEqual(b3.map((b) => b.t), ['mesaj', 'mesaj', 'kanal', 'anlatı', 'son']);
  const [giden, cevap, cikis] = b3;
  assert.equal(giden.k, 'b');
  assert.ok(cevap.okunduAn >= giden.an + 30, 'önce okur');
  assert.equal(cevap.an, cevap.okunduAn + cevap.yazma, 'sonra yazar');
  assert.ok(oyun.okunduMu(oyun.durum.sohbet.ada.find((m) => m.k === 'b')));
  assert.equal(cikis.kisi, null);
  assert.equal(cikis.onceki, 'ada');
  assert.deepEqual(b3.at(-1).sonraki, { no: 2, baslik: 'İki' });
  assert.equal(oyun.durum.d['ada.yakin'], 1);
});

test('roman: bölüm bitince sıradaki başlar; sonuncusu bitince oyun biter', () => {
  const oyun = kur(IKI_BOLUM);
  oyun.sahneDevam();
  oyun.sahneSec(1);
  oyun.sahneSec(1);
  assert.ok(oyun.sahne.bitti);
  assert.ok(!oyun.bittiMi());
  oyun.sahneKapat();
  assert.equal(oyun.sahne.kimlik, 'b2');
  assert.equal(oyun.t, tarihCoz('16 Eylül 19:00'));
  const son = oyun.sahneDevam().at(-1);
  assert.equal(son.sonraki, null);
  oyun.sahneKapat();
  assert.equal(oyun.sahne, null);
  assert.ok(oyun.bittiMi());
});

test('roman: oyna kalınan yere döner, geç parçanın yerine geçer, -> son çağırana döner', () => {
  const oyun = kur(`
=== b1
tür: bölüm
bölüm: 1
başlık: Bir

Önce.
>> oyna a
Arada.
>> oyna b
Sonra.

=== a
tür: sahne

A bir.
-> son
A iki.

=== b
tür: sahne

B bir.
>> geç c
B iki.

=== c
tür: sahne

>> eğer gördü(a) ve bitti(a)
  C bir.
`);
  const metin = oyun.sahneDevam().filter((b) => b.t === 'anlatı').map((b) => b.metin);
  assert.deepEqual(metin, ['Önce.', 'A bir.', 'Arada.', 'B bir.', 'C bir.', 'Sonra.']);
});

test('roman: yol ayrımı seçenekleri hikâyedeki koşula göre görünür; gün değişince ayraç gelir', () => {
  const oyun = kur(`
=== b1
tür: bölüm
bölüm: 1
başlık: Bir
zaman: 14 Eylül 21:00

* {ada.yakin >= 1} (Ada'ya git.)
  Ada.
* (Eve git.)
  Ev.
>> zaman 15 Eylül 09:00
Sabah.
`);
  const secim = oyun.sahneDevam().at(-1);
  assert.deepEqual(secim.secenekler.map((s) => s.metin), ['(Eve git.)']);
  const sonra = oyun.sahneSec(secim.secenekler[0].i);
  assert.deepEqual(sonra.map((b) => b.t), ['seçildi', 'anlatı', 'gün', 'anlatı', 'son']);
});

test('roman: yazışmanın ortasında kayıt alınıp açılınca telefonda, aynı seçimde sürer', () => {
  const oyun = kur(IKI_BOLUM);
  oyun.sahneDevam();
  oyun.sahneSec(0);
  const ikinci = new Oyun(derle(IKI_BOLUM), JSON.parse(oyun.disaVer()));
  assert.equal(ikinci.sahne.kanal, 'ada');
  assert.equal(ikinci.sahne.kayit.at(-1).t, 'seçim');
  const b = ikinci.sahneSec(0);
  assert.equal(b[0].t, 'mesaj');
  assert.equal(b.at(-1).t, 'son');
});

test('roman: bölüm değişince bozuk kayıt o bölümü baştan başlatır; eski yapının kaydı uyumsuz sayılır', () => {
  const oyun = kur(IKI_BOLUM);
  oyun.sahneDevam();
  oyun.sahneSec(0);
  const degisti = IKI_BOLUM.replace(/>> yazışma ada[\s\S]*?\(Cevap verme\.\)\n/, 'Telefon susuyor.\n');
  assert.notEqual(degisti, IKI_BOLUM);
  const ikinci = new Oyun(derle(degisti), JSON.parse(oyun.disaVer()));
  assert.equal(ikinci.sahne.kimlik, 'b1');
  assert.equal(ikinci.sahne.kayit.length, 0);
  assert.equal(ikinci.onarimlar.length, 2);

  const eski = JSON.parse(oyun.disaVer());
  delete eski.roman;
  assert.ok(new Oyun(derle(IKI_BOLUM), eski).uyumsuz);
});

test('roman: oyuncunun başlattığı yazışma ve okudu', () => {
  const oyun = kur(`
=== b1
tür: bölüm
bölüm: 1
başlık: Bir
zaman: 14 Eylül 23:00

Kime yazacaksın?
* (Nil'e yaz.)
  >> yazışma nil
    * uyudun mu
      >> okudu
      >> bekle 1sa
      @nil: şimdi gördüm
* (Kimseye.)
`);
  oyun.sahneDevam();
  const b = oyun.sahneSec(0);
  assert.deepEqual(b.map((x) => x.t), ['seçildi', 'kanal', 'seçim']);
  const c = oyun.sahneSec(0);
  assert.deepEqual(c.map((x) => x.t), ['mesaj', 'okundu', 'ara', 'mesaj', 'kanal', 'son']);
  assert.equal(c[1].an - c[0].an, 60);
  assert.ok(c[3].yazma > 0);
});

test('roman: denetim yazışma ve bölüm kurallarını yakalar', () => {
  const hatalar = (metin) => denetle(derle(metin)).hatalar;
  assert.deepEqual(hatalar(IKI_BOLUM), []);
  const kotu = hatalar(`
=== b1
tür: bölüm
bölüm: 1
başlık: Bir

>> yazışma ada
  Anlatı olmaz.
  @nil: Başkası yazamaz.
  * "tırnaklı"
  >> zaman 15 Eylül 10:00
>> oyna b2
* düz seçenek
  Bir.

=== b2
tür: bölüm
bölüm: 1

Aynı numara, başlık yok.

=== e
tür: eylem
başlık: Eski usul

Olmaz.
`);
  for (const parca of ['anlatı olmaz', 'yalnızca @ada', 'tırnaksız', '"zaman" kullanılmaz', 'yalnızca sahne parçasına', 'Sahne seçeneği', 'iki kez', 'başlığı olmalı', 'tür eksik ya da bilinmiyor']) {
    assert.ok(kotu.some((h) => h.includes(parca)), `beklenen hata yok: ${parca}\n${kotu.join('\n')}`);
  }
});

test('roman: deneme romanı her yoldan sonuna kadar oynanır; özenli oyuncu Ada\'ya yakın kalır', async () => {
  const icerik = await diskIcerik('test/ornek');
  assert.deepEqual(denetle(icerik).hatalar, []);
  for (const k of [{ strateji: 'ilk' }, { strateji: 'son' }, ...[1, 2, 3, 4, 5].map((tohum) => ({ strateji: 'rastgele', tohum }))]) {
    const { oyun } = oyna(icerik, k);
    assert.ok(oyun.bittiMi(), JSON.stringify(k));
    assert.ok(oyun.durum.oyunBitti);
  }
  const { oyun } = oyna(icerik, { strateji: 'özenli', ilgi: 'ada' });
  assert.equal(oyun.durum.d['ada.yakin'], 2);
  assert.equal(oyun.durum.d.gece, 'ada');
});

test('roman: yazılmış son bölüm bitince yeni bölüm eklenirse oyun oradan sürer', () => {
  const ilk = IKI_BOLUM.slice(0, IKI_BOLUM.indexOf('=== b2'));
  const oyun = kur(ilk);
  oyun.sahneDevam();
  oyun.sahneSec(1);
  oyun.sahneSec(1);
  oyun.sahneKapat();
  assert.ok(oyun.bittiMi());
  const devam = new Oyun(derle(IKI_BOLUM), JSON.parse(oyun.disaVer()));
  assert.equal(devam.sahne.kimlik, 'b2');
  assert.ok(!devam.bittiMi());
});
