# İçerik biçimi (.dsim)

Oyunun bütün metni `icerik/` altındaki `.dsim` dosyalarındadır. Her dosya `icerik/dizin.txt`'de listelenir (testler eksik olanı yakalar). Bu belge biçimin tam tarifidir.

> **İki yapı.** İçerikte `tür: bölüm` parçası varsa oyun **roman yapısında** çalışır (PROJE.md karar 38–45): bölümler sırayla akar, yazışmalar bölümün içinde yaşanır. Yoksa eski, takvime bağlı yapı çalışır (eylem menüsü, "Bekle", kendiliğinden gelen mesajlar). Eski yapı, I. Perde yazılıp oyuna girince (6. adım) kalkacak. Roman yapısının tarifi aşağıda, "Roman yapısı" başlığında; geri kalan her şey (gövde, seçenekler, koşullar, değişkenler) iki yapıda da aynıdır.

## Parça

Her parça `=== kimlik` satırıyla başlar. Hemen altında başlık satırları gelir, sonra **bir boş satır**, sonra gövde.

```
=== tasinma
tür: eylem
kişi: saniye
başlık: Taş Mahalle'ye taşın
tarih: 16 Eylül
pencere: 09:00-21:00
yer: Taş Mahalle, Saniye Hanım'ın evi
süre: 30dk

Gövde burada başlar.
```

Kimlikler küçük harf, rakam ve `_` ile yazılır (Türkçe harfler olur).

### Türler

| tür | Ne | Nasıl açılır |
|---|---|---|
| `bölüm` | Romanın bir bölümü (roman yapısı) | Sırayla; ilk bölüm oyun başlarken |
| `sahne` | Tam ekran, kitap gibi akan sahne. Romanda bir bölümün alt sahnesi | `zaman` gelince ya da `>> başlat` ile; romanda `>> oyna`/`>> geç` ile |
| `mesaj` | Bir kişiyle yazışma parçası | `zaman`, `tarih`/`pencere` (kendiliğinden), `başlatan: oyuncu` ya da `>> başlat` |
| `eylem` | Kilit ekranındaki "Ne yapacaksın?" seçeneği | `tarih`, `pencere`, `koşul` tutunca listede görünür; anlatı varsa sahne olarak oynar |
| `geçmiş` | Oyun başlamadan önce telefonda duran mesajlar | Oyun başlarken bir kez |

### Başlıklar

| Başlık | Örnek | Anlamı |
|---|---|---|
| `tür` | `sahne` | Zorunlu |
| `bölüm` | `4` | Roman: bölüm numarası |
| `perde` | `Sezon Sonu` | Roman: perdeyi açan bölümde perdenin adı |
| `kişi` | `defne` | Mesajda sohbetin sahibi; sahnede renk ve o an yanında olunan kişi |
| `zaman` | `15 Eylül 08:10` | O an kendiliğinden başlar (koşul tutarsa; tutmazsa hiç başlamaz) |
| `tarih` | `15 Eylül - 21 Eylül` | Geçerli olduğu günler |
| `pencere` | `22:00-03:00` | Günün hangi saatlerinde (gece yarısını aşabilir) |
| `koşul` | `defne.yakınlık >= 2 ve değil gördü(x)` | Açılma koşulu |
| `öncelik` | `10` | Birden çok aday varsa büyük olan önce |
| `tekrar` | `evet` | Birden fazla kez açılabilir (varsayılan: hayır) |
| `başlık` | `Kordona in` | Eylemin adı; `başlatan: oyuncu` mesajında oyuncunun göndereceği ilk mesaj |
| `başlatan` | `oyuncu` | Mesajı oyuncu başlatır (sohbet ekranında seçenek olarak çıkar) |
| `süre` | `45dk`, `2sa` | Sahne/eylem bitince geçen zaman |
| `yer` | `Kordon` | Sahnenin yeri; oyuncunun konumu olur |
| `kesme` | `evet` | Mesaj: o kişiyle süren akışı keser (varsayılan: sıraya girer) |
| `zaman_aşımı` | `3sa` | Mesaj: cevap beklenen seçimler için varsayılan süre |
| `gecikme` | `20dk` | Kendiliğinden mesaj: pencere açıldıktan ne kadar sonra |
| `ton` | `gece`, `gündüz` | Sahnenin kâğıt rengini saatten bağımsız belirler |
| `grup` | `vardiya` | Eylem: aynı gruptan kilit ekranında yalnızca biri görünür (önceliği en yüksek olan). Tekrarlanan işlerin (vardiya, ders) her seferi ayrı yazılır; yazılanlar bitince `tekrar: evet` olan sessiz yedek kalır |
| `not` | serbest | Yazara not, oyunda görünmez |

## Roman yapısı

### Bölüm

```
=== b04_firin
tür: bölüm
bölüm: 4
başlık: Fırın
perde: Sezon Sonu
zaman: 18 Eylül 17:40
yer: Mendirek
kişi: defne

Gövde: bütün bölüm, baştan sona.
```

- `bölüm`: numara. Oyun 1'den başlar, her bölüm bitince numarası bir sonraki olana geçer. Numaralar tek olmalı; zamanları geriye gitmemeli (denetim).
- `başlık`: bölümün adı (perdede ve sayfanın başında).
- `perde`: yalnızca bir perdeyi açan bölümde; perdenin adı. Numarası kendiliğinden sayılır (I, II, III…).
- `zaman`: bölümün başladığı an. Saat ileri alınır (geri alınmaz).
- `yer`, `ton`, `kişi`: sahnedeki gibi (kişi yalnızca sayfanın vurgu rengini verir).
- Bölüm bitince oyuncu "Sonraki bölüm"e dokunur; sıradaki bölüm önce **perdesiyle** açılır (kilit ekranı: perde adı, bölüm numarası ve adı, o günün göğü, tarih, saat, yer).
- Son bölüm bittiğinde ya da bir yerde `>> bitir` geçtiyse roman biter.

### Alt sahneler: `>> oyna`, `>> geç`

Uzun bir bölüm, yol ayrımlarının dalları ayrı parçalara (`tür: sahne`, zamansız) bölünebilir.

| Komut | Anlamı |
|---|---|
| `>> oyna kimlik` | O sahneyi oynar, bitince kalınan yerden sürer (Ink'teki "tünel") |
| `>> geç kimlik` | O anki parçayı bırakır, onun yerine bu sahne oynar; o da bitince çağıran parçaya dönülür |
| `-> son` | O anki parçayı bitirir (bir alt sahnedeyse çağırana döner; bölümdeyse bölüm biter) |

`gördü(kimlik)` ve `bitti(kimlik)` alt sahneler için de çalışır.

### Yazışma: `>> yazışma kişi`

Altındaki satırlar (iki boşluk içeride) telefonda, o kişiyle yaşanır. Akış yazışmaya gelince:
1. Sayfaya okunacak yeni metin geldiyse sayfanın sonunda **"Telefonuna bak"** çıkar; oyuncu dokununca telefon açılır. (Yazışma bir seçimin hemen ardından başlıyorsa, örneğin "(Ona yaz.)", telefon doğrudan açılır.)
2. Mesajlar telefonda tek tek gelir: oyuncu yazdıysa önce "görüldü", sonra "yazıyor…", sonra mesaj.
3. Yazışma bitince **"Telefonu bırak"** çıkar; sayfaya dönülür. Sayfada yazışmanın küçük bir izi kalır (dokununca o sohbet açılır).

```
Odanın ışığını kapatmışsın ki telefon titriyor.
>> yazışma defne
  @defne: sezon bitti, sen gitmedin.
  @defne: bu bir hata mı, tercih mi? fiş istiyorum
  * tercih
    [defne.tercih]
    >> okudu
    >> bekle 4dk
    @defne: hmm
  * (Cevap verme.)
Telefonu yüzüstü bırakıyorsun.
```

Yazışmanın içinde:

| Satır | Anlamı |
|---|---|
| `@kişi: metin` | O kişinin mesajı. Yazışmanın ilk mesajı telefon açılırken çoktan gelmiştir; sonrakiler kişinin yazma hızıyla gelir |
| `@ben: metin` | Oyuncunun kendiliğinden gönderdiği mesaj (seçimsiz) |
| `* metin` | Oyuncunun gönderebileceği mesaj (tırnaksız, yazıldığı gibi gider) |
| `* (Eylem.)` | Gönderilmeyen bir davranış: "(Cevap verme.)", "(Yazıp sil.)" |
| `>> okudu` | Karşıdaki oyuncunun mesajlarını okudu ("görüldü"), ama yazmıyor |
| `>> bekle 20dk` | Zaman geçer; mesaj saatlerinde görünür. Uzun beklemeler sayfadaki izde "20 dakika sonra" diye kalır |
| `>> rehber kişi: Ad 1 \| Ad 2` | Numarayı rehbere kaydetme |
| `[işlem]`, `>> eğer` | Her yerdeki gibi |

Yazışmanın içinde anlatı, başka kişinin sözü, tırnaklı seçenek, `zaman`, `saat`, `yer`, `ev`, `başlat`, `randevu`, `bitir`, `oyna`, `geç` ve iç içe yazışma olmaz (denetim yakalar). Anlatıya dönmek için yazışmayı kapat (girintiyi bitir), anlatıyı yaz, gerekirse yeni bir yazışma aç.

**Oyuncunun başlattığı yazışma** bir sahne seçimidir:

```
Telefon elinde. Kime yazacaksın?
* {tanıdı(ilgin)} (Ilgın'a yaz.)
  >> yazışma ilgin
    * eczane açık mı hâlâ
      ...
* (Kimseye yazma.)
```

**Aynı gece iki kişi:** Bir yazışma bitip hemen başka biriyle başlarsa telefon kapanmadan öbür sohbete geçer.

**Telefonun arşivi:** Sayfada bir seçim beklenirken telefon düğmesi telefonu açar; eski yazışmalar okunur, kimseye yazılmaz, hikâye değişmez. "Hikâyeye dön" ile sayfaya dönülür.

### Zaman

Saati yalnızca hikâye ilerletir: bölümün `zaman`'ı, `>> zaman`, `>> saat`, `>> bekle` ve yazışmadaki mesajların yazılma süreleri. Sayfada gün değişince bir gün ayracı çıkar ("Çarşamba, 17 Eylül").

### Roman yapısında kullanılmayanlar

`tür: eylem`, `tür: mesaj` (yazışmalar bölümün içinde), kendi saatinde başlayan sahne (`zaman` başlıklı `tür: sahne`), randevu kartları, "Bekle" ve "Uyu". Denetim bunları roman yapısında hata sayar. `tür: geçmiş` (oyun başlamadan telefonda duran mesajlar) aynen kullanılır.

## Gövde

Girinti **iki boşluktur** (sekme yok). Her satır bir paragraf ya da bir mesajdır.

| Satır | Anlamı |
|---|---|
| `Düz metin.` | Anlatı (yalnızca sahne/eylemde) |
| `@defne: tamam.` | Konuşma ya da mesaj. `@ben:` oyuncunun kendisi |
| `@yabanci(Komşu kadın): ...` | Ad parantezle değiştirilir |
| `* "Söz."` | Sahnede oyuncunun söyleyeceği seçenek (tırnaklı) |
| `* (Eylem.)` | Sahnede ya da mesajda bir davranış (parantezli; mesajda gönderilmez) |
| `* düz metin` | Mesajda gönderilecek mesaj (tırnaksız, noktalaması aynen gider) |
| `* {koşul} ...` | Koşullu seçenek |
| (seçeneğin altında iki boşluk içeride) | O seçeneğin dalı; bitince akış seçimin altından sürer |
| `[x +1]`, `[x = "metin"]`, `[x]`, `[değil x]` | Değişken işlemleri; `;` ile birden çok |
| `:: etiket` | Etiket (yalnız en dış seviyede) |
| `-> etiket`, `-> son` | Atlama; `-> son` parçayı bitirir |
| `# yorum` | Oyunda görünmez |
| `{ad}` | Oyuncunun adı (yalnızca bu yer tutucu var) |

### Komutlar

| Komut | Anlamı |
|---|---|
| `>> eğer KOŞUL` / `>> yoksa eğer KOŞUL` / `>> yoksa` | Koşullu bloklar (altları iki boşluk içeride) |
| `>> bekle 5dk` | Mesajda: bir sonraki mesajdan önce bekleme. Sahnede: zaman geçer |
| `>> zaman 16 Eylül 10:40` | Sahnede saati ileri alır (geçmişteyse etkisiz) |
| `>> saat 18:00` | Saati o güne ait bu saate alır; geçmişteyse ertesi günün bu saatine |
| `>> yer Kordon` | Oyuncunun konumunu değiştirir |
| `>> ev Taş Mahalle, ev` | Oyuncunun evini değiştirir (uyuyunca oraya döner) |
| `>> başlat kimlik` / `... sonra 2sa` / `... 17 Eylül 09:00` | Başka bir parçayı başlatır ya da zamanlar |
| `>> randevu kimlik 20 Eylül 01:30 \| Yer` | Bir sahneyi o ana kurar ve kilit ekranında kart olarak gösterir. Zaman `sonra 25dk`, `bugün 22:30`, `yarın 19:30`, `öbür gün 11:00` da olabilir. Randevu uykuyu da böler |
| `>> iptal kimlik` | Kurulmuş bir randevuyu ya da zamanlanmış parçayı kaldırır |
| `>> bitir` | Oyunu bitirir ("Son." ekranı) |
| `>> rehber kişi: Ad 1 \| Ad 2 \| Ad 3` | Oyuncu numarayı bu adlardan biriyle rehbere kaydeder |
| `>> tanış kişi` | Oyuncu artık bu kişinin adını biliyor (sahnede adıyla görünür) |
| `>> okudu` | Mesajda: karşı taraf oyuncunun mesajlarını okudu (görüldü). Okuma gecikmesine ve kişinin uykusuna uyar; akış okuduğu ana kadar bekler |
| `>> zaman_aşımı 3sa -> etiket` | Mesajda: hemen ardından gelen seçime süre koyar; cevap gelmezse etikete gider |
| `>> okunmadı` | Geçmişte: bundan sonraki gelen mesajlar okunmamış durur |

### Özel mesajlar

- `[Fotoğraf: Havuz. Suyu yeşil.] manzara` → fotoğraf kartı ve altında yazı.
- `[Cevapsız arama]` → arama satırı.

### Telefona bakmak

Sahnede seçim beklenirken telefon düğmesi telefonu açar; "Sahneye dön" ile kalınan yere dönülür. Telefona bakmak sahneyi değiştirmez, kimse tepki vermez. O an yanında olunan kişiye yazılamaz; başkalarına cevap yazılabilir.

### Koşul dili

`ve`, `veya`, `değil`, `==`, `!=`, `>=`, `<=`, `>`, `<`, `+`, `-`, parantez, `evet`, `hayır`, sayılar, `"metin"`.

Hazır değişkenler: `saat`, `dakika`, `tarih` (gün no; `tarih >= "20 Eylül"` yazılabilir), `an` (saniye; `an < "16 Eylül 10:00"`), `haftagünü` (1 = Pazartesi).

Fonksiyonlar: `gördü(parça)`, `bitti(parça)`, `kaç(parça)`, `tanıdı(kişi)`, `kayıtlı(kişi)`.

Otomatik değişkenler: `<parça>.cevapsız` (mesaj seçimi cevapsız kaldıysa).

Değişkene bugünün gün numarası yazılabilir: `[defne.gitti_gun = bugün]`, sonra `tarih > defne.gitti_gun + 2`. Eşitlikte de tarih gibi okunan metin tarihtir: `tarih != "13 Aralık"`, `tarih == "24 Ekim" ve saat >= 21`.

### Değişken adları (öneri)

- `<kişi>.yakınlık`, `<kişi>.güven`, `<kişi>.gerilim`: ilişkinin gizli ölçüleri.
- `<kişi>.<olay>`: hafıza ("defne.sezonluk_yalani").
- `<parça>.<seçim>`: o sahnede verilen cevap ("acilis.cevap").
- `sahne.` ile başlayanlar her sahne başında silinir.

## Zamanlama nasıl işler (eski yapı)

- Oyun saati yalnızca oyuncu bir şey yaptığında ilerler.
- Bir mesaj parçasının ilk mesajı başladığı anda gelir. Sonrakiler kişinin yazma hızına göre (`kisiler.json`: `yazmaHizi`) gecikir. Oyuncu cevap verdiyse önce okuma gecikmesi (`okumaGecikmesi`, saniye) eklenir.
- Telefon açıkken 5 dakika içindeki mesajlar "yazıyor…" ile kendiliğinden gelir.
- Cevap beklenen seçim, süresi dolunca (varsayılan 24 saat) kapanır.
- Aynı kişiden ikinci bir mesaj parçası gelirse, önceki bitene kadar sıraya girer (`kesme: evet` değilse).
- Kişi uyuyorsa (`kisiler.json`: `"uyku": "05:00-11:00"`) oyuncunun mesajını uyanınca okur ve cevaplar.
- Sahne sürerken de mesaj gelir (sahnenin içindeki saat atlamasına denk gelenler kaybolmaz); yalnızca o an yanında olunan kişinin mesajları sahne bitince gelir.
- Kilit ekranındaki hazır seçenekler: "Bekle" ve gece "Uyu" (sabah 08:00'e, eve). "Bekle" zamanı ilk anlamlı şeye kadar akıtır: yeni mesaj, yeni açılan eylem, sahne ya da randevu, ya da cevap bekleyen bir mesajın süresinin dolmasına 15 dakika kalması. Hiçbir şey olmazsa gündüz 21:00'de, gece iki saat sonra durur. Nereye kadar gideceği önceden yazılmaz.
- `kisiler.json` alanları: `ad`, `tanimsiz` (adı bilinmezken), `rehberde` (rehberde hazır kayıtlı adı), `sahnede` (sahnede hep bu adla: "Baban"), `numara`, `renk`, `yazmaHizi`, `okumaGecikmesi`, `uyku`, `biliniyor`.
- `oyun.json`: `başlangıç`, `içerik_sonu`, `ilk_yer`, `ilk_ev`.
