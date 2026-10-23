# dsim — Çalışma Kuralları

Bu dosya her oturumda geçerli olan kalıcı kurallardır. Planın, kararların ve ilerlemenin kendisi `PROJE.md`'dedir.

## Her oturumun başında

1. `PROJE.md`'yi baştan sona oku. Özellikle en alttaki "Nerede kaldık" bölümünü.
2. O adımda dokunacağın karakterlerin belgelerini (`karakterler/`) ve `yazim/rehber.md`'yi oku.
3. Metin yazacaksan `hikaye/bolumler.md`'de o bölümün planını, `hikaye/omurga.md`'de karakterlerin yayını, `dunya/takvim.md`'de o günün havasını, şehir olaylarını ve nöbetleri kontrol et.

## Kullanıcı

- Kod okumuyor. Bütün teknik kararlar bizde. Ona düşen her adımı madde madde ve çok basit anlat.
- Oyunu tek başına oynayacak; başka kullanıcı yok.
- Sahneleri tek tek okuyup onaylamayacak. Kalite kontrolü tamamen bizde.

## Çalışma temposu

- Adım adım. Her adım bitince: testler → commit → push → `PROJE.md` "Nerede kaldık" güncelle → DUR.
- Kullanıcı "devam" demeden sonraki adıma geçme.
- Dururken sonraki adımın büyüklüğünü (küçük / orta / büyük) söyle.
- Her commit kendi başına çalışır durumda olmalı. Yarım ya da bozuk bir şey bırakma.
- Bir karar değişirse eskisini silme: `PROJE.md`'de ~~üstünü çiz~~, altına yenisini ve neden değiştiğini yaz.
- Zaten yazılmış bir şeyi (kod, metin, karakter, karar) değiştirmek gerekiyorsa önce kullanıcıya söyle.
- Çalışma dalı: `claude/dsim-dating-sim-setup-speeuf`. Push: `git push -u origin <dal>`.

## Kullanıcıya cevap biçimi

- Her zaman Türkçe.
- Bir şeyi düzeltirken önce neyin yanlış olduğunu, sonra doğrusunu söyle.
- Birden fazla seçenek varsa önce önerdiğini söyle; sonra alternatifleri ve hangisinin hangi durumda mantıklı olduğunu.
- "Evet ama" gerektiren cevaplarda önce net evet/hayır, gerekçe sonra.
- Kesin bilmiyorsan "bilmiyorum" de. Uydurma.
- Birden fazla soruyu tek tek cevapla, hiçbirini atlama.
- Önceki söylediğinle çelişen bir şey çıkarsa açıkça belirt; fikrini değiştirmesini gerektirecek kadar önemliyse ayrıca vurgula.
- Teknik olmayan yeni bir terimi kısaca açıkla. Cevap uzunluğunu sorunun kapsamına göre ayarla.

## ESNEMEZ KURAL

18 yaşından küçük hiçbir karakterle romantik, cinsel ya da flört içeren hiçbir şey olmaz: ima, düşünce ya da şaka olarak bile. Altı ana karakterin hepsi 20 yaş ve üstüdür. 18 yaş altı yan karakterler (Ilgın'ın kardeşi Efe, Ela'nın kardeşi Kuzey, Cemal'in kızı, yelken kulübündeki çocuklar vb.) hiçbir romantik ya da cinsel bağlamda yer almaz; böyle bir sahnede anılmazlar bile.

## İçerik kuralları

- Yetişkinler arasında aynı anda birden fazla ilişki, aldatma, gizli ilişki, kavga, kıskançlık, ayrılık, bağımlılık, yas ve aile dramı serbesttir. Gerçekçi ve özenle yazılır; sonuçları karaktere göre değişir.
- **Cinsellik** açık ve nettir. Oyuncu o an ne olduğunu açıkça bilir: hangi eylem, hangi sırayla, hangi pozisyonda, ne kadar sürdüğü, kimin neyi istediği. Duygulu, çıplak, "raw" yazılır. Anatomik yakın plan ayrıntı yoktur.
- Oyuncu sahneyi adım adım yönetir: ne yapacağını, ne kadar ilerleyeceğini, ne söyleyeceğini seçer.
- Karakterin isteği ve sınırı sahnenin içinde, kişiliğine uygun biçimde görünür: istekli olması, utanması, yönlendirmesi, durmak istemesi. "Dur" dendiğinde durulur; bunun dışında bir seçenek sunulmaz.
- Bilinci yerinde olmayan (çok sarhoş, uyku sersemi, ilaçlı) bir karakterle cinsellik yoktur. Sahne bunu doğal biçimde taşır: o an cinsel seçenek çıkmaz, oyuncunun durması sahnenin bir parçası olur.
- Öncesi, sabahı, ertesi günün mesajı ve yaşananın ilişkiye etkisi de yazılır.
- Kendi içerik sınırına takılırsan bunu kullanıcıya açıkça söyle. Sessizce yumuşatma.

## Yazım: oyunun kendisi

Oyun etkileşimli bir romandır: anlatıcı anlatır, oyuncu seçer; zamanı bölümler ilerletir. Metin her şeyden önemlidir. Kararsız kalınca yazının lehine karar ver. Ayrıntılı ilkeler, yasaklı kalıplar ve denetim listesi `yazim/rehber.md`'dedir. Kısaca:

- Her cümle o karaktere ve o ana özeldir. Başka bir karakterin ağzında da çalışan replik yanlış yazılmıştır.
- Doğal, gerçek Türkçe. Çeviri kalıbı yok. Mesajlaşma dili kişiden kişiye değişir (karakter belgeleri).
- Alt metin var; bilgi dökümü yok; tekrar yok.
- Cümleler parçalardan birleştirilmez. Her cümle bütün olarak, o anı düşünerek yazılır.
- Hiçbir şey "ne alaka?" dedirtmez. Bir sahne ancak sohbetin akışı oraya gidiyorsa açılır.
- Her büyük içerik adımından sonra okuma aracıyla dökümü baştan sona oku, bulduklarını düzelt.

## Bilgi kuralı: tanrısal bilgi yok

Oyuncu karakterleri yalnızca tanıdıkça öğrenir. Bilgi kartı, puan, "ilgi +5" yoktur. Rehberde yalnızca oyuncunun kaydettiği isim durur. Karakter belgelerindeki bilgiler oyuncuya doğrudan gösterilmez; sahnelerin içinde, yeri gelince, parça parça açılır (her belgede "Açılma sırası" bölümü var).

## Belgeler

| Dosya | Ne için |
|---|---|
| `PROJE.md` | Plan, kararlar ve gerekçeleri, yol haritası, nerede kaldık |
| `dunya/sehir.md` | Pırnallı: coğrafya, mekânlar, sakinler |
| `dunya/takvim.md` | 14 Eylül – 6 Ocak, hafta hafta hava, şehir ve olaylar |
| `karakterler/00-karsilastirma.md` | Altı karakterin yan yana tablosu, benzerlik denetimi |
| `karakterler/oyuncu.md` | Oyuncu karakteri |
| `karakterler/<isim>.md` | Altı ana karakter |
| `hikaye/omurga.md` | Romanın biçimi, perdeler, yaylar, kesişmeler, sonlar |
| `hikaye/bolumler.md` | 41 bölümün planı |
| `yazim/rehber.md` | Yazım ilkeleri, yasaklı kalıplar, denetim listesi |
| `yazim/ses-testi.md` | Altı karakterin aynı duruma cevapları |

Karakter belgesi karakteri kısıtlamak için değil, her sahnede aynı insan olarak kalması için vardır. Yazarken bir sahne belgeye ters düşüyorsa ya sahne yanlıştır ya da karakter değişmiştir. İkincisiyse bunu belgenin "Değişim" bölümüne işle.

## Teknik

> 5. adımda motor bölüm yapısına geçiyor (PROJE.md karar 38–43); bu bölüm o adımda güncellenecek.

- Sade HTML, CSS ve JavaScript (ES modülleri). Kütüphane yok, build adımı yok.
- **Klasörler:**
  - `index.html`, `manifest.webmanifest`, `sw.js` (internetsiz çalışma), `.nojekyll`
  - `css/stil.css`: bütün görünüm
  - `js/motor/`: oyunun motoru, ekrandan bağımsız (Node'da da çalışır). `tarih`, `ifade` (koşullar), `ayristirici` (.dsim okuyucu), `oyun` (zaman, mesaj, sahne, eylem), `kayit` (kayıt kodu), `yukleme`, `denetim`
  - `js/arayuz/`: ekranlar. `uygulama` (giriş noktası), `giris`, `kilit`, `telefon`, `sahne`, `ayarlar`, `katman`, `hata`, `gok`, `dom`
  - `icerik/`: oyunun metni (`.dsim`), `kisiler.json`, `oyun.json`, `hava.json`, `dizin.txt`. **Biçimin tarifi: `icerik/BICIM.md`**
  - `fontlar/` (Inter, Literata; OFL lisanslı), `ikonlar/`
  - `araclar/`: Node araçları. `oku.mjs` (okuma aracı), `bot.mjs` (oyunu oynayan robot), `ekran.mjs` (ekran görüntüleri), `sunucu.mjs`, `hava-uret.mjs`, `ortak.mjs`
  - `test/`: otomatik testler
- **Komutlar:**
  - `npm test`: bütün testler (motor, içerik denetimi, robotla oynanış, yayın listesi)
  - `node araclar/oku.mjs [N]`: okuma aracı. `okuma/` klasörüne her yolun dökümünü ve `ozet.md`'yi yazar. Her büyük içerik adımında çalıştır ve dökümleri baştan sona oku.
  - `node araclar/ekran.mjs`: iPhone boyutunda ekran görüntüleri `ekran/` klasörüne (Playwright gerekir; yoksa `/opt/node-tools/node_modules/` denenir)
  - `node araclar/sunucu.mjs`: http://localhost:8080
- **Yayın:** GitHub Pages, çalışma dalının kök klasöründen. Her push yayını günceller.
- **Sürüm:** Kod ya da içerik değişip yayınlanacaksa `js/surum.js` ve `sw.js` içindeki `SURUM` birlikte artırılır (test denetler). Artırılmazsa telefondaki eski önbellek kalır.
- Yeni `.dsim` dosyası → `icerik/dizin.txt`. Yeni js/css/font/ikon dosyası → `sw.js` listesi (test denetler).
- **Kayıt:** `localStorage` `pirnalli.kayit` (+ `pirnalli.kayit.yedek`). İçerik değişince yarım kalan akış ya da sahne bulunamazsa motor kaydı onarır (`Oyun._onar`) ve hata raporuna yazar.
