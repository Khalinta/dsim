# dsim — Çalışma Kuralları

Bu dosya her oturumda geçerli olan kalıcı kurallardır. Planın, kararların ve ilerlemenin kendisi `PROJE.md`'dedir.

## Her oturumun başında

1. `PROJE.md`'yi baştan sona oku. Özellikle en alttaki "Nerede kaldık" bölümünü.
2. O adımda dokunacağın karakterlerin belgelerini (`karakterler/`) ve `yazim/rehber.md`'yi oku.
3. Metin yazacaksan `hikaye/omurga.md`'de o karakterin yayını, `dunya/takvim.md`'de o günün havasını ve şehir olaylarını kontrol et.

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

Metin her şeyden önemlidir. Kararsız kalınca yazının lehine karar ver. Ayrıntılı ilkeler, yasaklı kalıplar ve denetim listesi `yazim/rehber.md`'dedir. Kısaca:

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
| `hikaye/omurga.md` | Yaylar, büyük anlar, kesişmeler, sonlar |
| `yazim/rehber.md` | Yazım ilkeleri, yasaklı kalıplar, denetim listesi |
| `yazim/ses-testi.md` | Altı karakterin aynı duruma cevapları |

Karakter belgesi karakteri kısıtlamak için değil, her sahnede aynı insan olarak kalması için vardır. Yazarken bir sahne belgeye ters düşüyorsa ya sahne yanlıştır ya da karakter değişmiştir. İkincisiyse bunu belgenin "Değişim" bölümüne işle.

## Teknik

2\. adımda doldurulacak: klasör yapısı, içerik biçimi, testleri ve okuma aracını çalıştırma komutları.
