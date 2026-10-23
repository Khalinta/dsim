# İçerik biçimi (.dsim)

Oyunun bütün metni `icerik/` altındaki `.dsim` dosyalarındadır. Her dosya `icerik/dizin.txt`'de listelenir (testler eksik olanı yakalar). Bu belge biçimin tam tarifidir.

Oyun bir romandır (PROJE.md karar 38–47): bölümler sırayla akar, yazışmalar bölümün içinde yaşanır. Zamanı yalnızca hikâye ilerletir; oyuncunun önünde eylem menüsü, "Bekle" ya da takvimden kendiliğinden gelen mesaj yoktur.

## Parça

Her parça `=== kimlik` satırıyla başlar. Hemen altında başlık satırları gelir, sonra **bir boş satır**, sonra gövde.

```
=== b04_firin
tür: bölüm
bölüm: 4
başlık: Fırın
zaman: 18 Eylül 17:40
yer: Liman, Mendirek

Gövde burada başlar.
```

Kimlikler küçük harf, rakam ve `_` ile yazılır (Türkçe harfler olur).

### Türler

| tür | Ne | Nasıl açılır |
|---|---|---|
| `bölüm` | Romanın bir bölümü | Sırayla; ilk bölüm oyun başlarken |
| `sahne` | Bir bölümün alt sahnesi (genellikle bir yol ayrımının dalı) | Bir bölümden ya da başka bir sahneden `>> oyna` / `>> geç` ile |
| `geçmiş` | Oyun başlamadan önce telefonda duran mesajlar | Oyun başlarken bir kez |

### Başlıklar

| Başlık | Örnek | Anlamı |
|---|---|---|
| `tür` | `bölüm` | Zorunlu |
| `bölüm` | `4` | Bölüm numarası |
| `başlık` | `Fırın` | Bölümün adı (perdede ve sayfanın başında) |
| `perde` | `Sezon Sonu` | Perdeyi açan bölümde perdenin adı |
| `zaman` | `18 Eylül 17:40` | Bölümün başladığı an (yalnızca bölümde) |
| `yer` | `Kordon` | Bölümün yeri; oyuncunun konumu olur |
| `kişi` | `defne` | Bölümde/sahnede sayfanın vurgu rengi; geçmişte sohbetin sahibi |
| `ton` | `gece`, `gündüz` | Sayfanın rengini saatten bağımsız belirler |
| `not` | serbest | Yazara not, oyunda görünmez |

## Bölüm

- `bölüm`: numara. Oyun 1'den başlar, her bölüm bitince numarası bir sonraki olana geçer. Numaralar tek olmalı; zamanları geriye gitmemeli (denetim).
- `perde`: yalnızca bir perdeyi açan bölümde. Numarası kendiliğinden sayılır (I, II, III…).
- `zaman`: saat ileri alınır (geri alınmaz).
- Bölüm bitince oyuncu "Sonraki bölüm"e dokunur; sıradaki bölüm önce **perdesiyle** açılır (kilit ekranı: perde adı, bölüm numarası ve adı, o günün göğü, tarih, saat, yer).
- Son bölüm bittiğinde ya da bir yerde `>> bitir` geçtiyse roman biter. Yazılmış son bölüm bitip sonra yeni bölümler eklenirse kayıt oradan sürer.

## Alt sahneler: `>> oyna`, `>> geç`

Uzun bir bölüm, yol ayrımlarının dalları ayrı parçalara (`tür: sahne`) bölünebilir. Sahnenin başlığında `zaman` olmaz; saati gövdede `>> zaman` ile verilir.

| Komut | Anlamı |
|---|---|
| `>> oyna kimlik` | O sahneyi oynar, bitince kalınan yerden sürer (Ink'teki "tünel") |
| `>> geç kimlik` | O anki parçayı bırakır, onun yerine bu sahne oynar; o da bitince çağıran parçaya dönülür |
| `-> son` | O anki parçayı bitirir (bir alt sahnedeyse çağırana döner; bölümdeyse bölüm biter) |

`gördü(kimlik)` ve `bitti(kimlik)` alt sahneler için de çalışır. Her sahne bir yerden çağrılmalı (denetim).

## Yazışma: `>> yazışma kişi`

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

Yazışmanın içinde anlatı, başka kişinin sözü, tırnaklı seçenek, `zaman`, `saat`, `yer`, `bitir`, `oyna`, `geç` ve iç içe yazışma olmaz (denetim yakalar). Anlatıya dönmek için yazışmayı kapat (girintiyi bitir), anlatıyı yaz, gerekirse yeni bir yazışma aç.

İlk kez yazan biri (rehberde kayıtlı değil) yazışmanın içinde `>> rehber` ile kaydedilmeli; okuma aracı kayıtsız biten yazışmayı uyarır.

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

## Zaman

Saati yalnızca hikâye ilerletir: bölümün `zaman`'ı, `>> zaman`, `>> saat`, `>> bekle` ve yazışmadaki mesajların yazılma süreleri. Sayfada gün değişince bir gün ayracı çıkar ("Çarşamba, 17 Eylül").

## Gövde

Girinti **iki boşluktur** (sekme yok). Her satır bir paragraf ya da bir mesajdır.

| Satır | Anlamı |
|---|---|
| `Düz metin.` | Anlatı (yazışmanın ve geçmişin dışında) |
| `@defne: tamam.` | Konuşma ya da mesaj. `@ben:` oyuncunun kendisi |
| `@yabanci(Komşu kadın): ...` | Ad parantezle değiştirilir |
| `* "Söz."` | Sayfada oyuncunun söyleyeceği seçenek (tırnaklı) |
| `* (Eylem.)` | Bir davranış (parantezli; yazışmada gönderilmez) |
| `* düz metin` | Yazışmada gönderilecek mesaj (tırnaksız, noktalaması aynen gider) |
| `* {koşul} ...` | Koşullu seçenek |
| (seçeneğin altında iki boşluk içeride) | O seçeneğin dalı; bitince akış seçimin altından sürer |
| `[x +1]`, `[x = "metin"]`, `[x]`, `[değil x]` | Değişken işlemleri; `;` ile birden çok |
| `:: etiket` | Etiket (yalnız en dış seviyede). Üstündeki kısım bir atlamayla (`-> etiket`, `-> son`) bitmeli; yoksa akış etikete düşer (denetim) |
| `-> etiket`, `-> son` | Atlama; `-> son` parçayı bitirir |
| `# yorum` | Oyunda görünmez |
| `{ad}` | Oyuncunun adı (yalnızca bu yer tutucu var) |

### Komutlar

| Komut | Anlamı |
|---|---|
| `>> eğer KOŞUL` / `>> yoksa eğer KOŞUL` / `>> yoksa` | Koşullu bloklar (altları iki boşluk içeride) |
| `>> bekle 5dk` | Zaman geçer (yazışmada: bir sonraki mesajdan önce) |
| `>> zaman 16 Eylül 10:40` | Saati ileri alır (geçmişteyse etkisiz) |
| `>> saat 18:00` | Saati o güne ait bu saate alır; geçmişteyse ertesi günün bu saatine |
| `>> yer Kordon` | Oyuncunun konumunu değiştirir |
| `>> yazışma kişi` | Telefonda o kişiyle yazışma (yukarıda) |
| `>> oyna kimlik`, `>> geç kimlik` | Alt sahne (yukarıda) |
| `>> bitir` | Romanı bitirir ("Son." ekranı) |
| `>> rehber kişi: Ad 1 \| Ad 2 \| Ad 3` | Oyuncu numarayı bu adlardan biriyle rehbere kaydeder |
| `>> tanış kişi` | Oyuncu artık bu kişinin adını biliyor (sayfada adıyla görünür) |
| `>> okudu` | Yazışmada: karşı taraf oyuncunun mesajlarını okudu (görüldü) |
| `>> okunmadı` | Geçmişte: bundan sonraki gelen mesajlar okunmamış durur |

### Geçmiş

Oyun başlamadan telefonda duran sohbetler. `>> zaman` ile başlar; yalnızca o kişinin ve `@ben`'in mesajları, `>> zaman`, `>> bekle`, `>> okunmadı`, `>> tanış` olur. Seçim, anlatı, yazışma olmaz.

### Özel mesajlar

- `[Fotoğraf: Havuz. Suyu yeşil.] manzara` → fotoğraf kartı ve altında yazı.
- `[Cevapsız arama]` → arama satırı.

### Koşul dili

`ve`, `veya`, `değil`, `==`, `!=`, `>=`, `<=`, `>`, `<`, `+`, `-`, parantez, `evet`, `hayır`, sayılar, `"metin"`.

Hazır değişkenler: `saat`, `dakika`, `tarih` (gün no; `tarih >= "20 Eylül"` yazılabilir), `an` (saniye; `an < "16 Eylül 10:00"`), `haftagünü` (1 = Pazartesi), `hava`.

Fonksiyonlar: `gördü(parça)`, `bitti(parça)`, `kaç(parça)`, `tanıdı(kişi)`, `kayıtlı(kişi)`.

Değişkene bugünün gün numarası yazılabilir: `[defne.gitti_gun = bugün]`, sonra `tarih > defne.gitti_gun + 2`. Eşitlikte de tarih gibi okunan metin tarihtir: `tarih != "13 Aralık"`, `tarih == "24 Ekim" ve saat >= 21`.

### Değişken adları

- `<kadın>.yakin`: ilişkinin gizli ölçüsü (sayı). Okuma aracının özenli oyuncusu buna bakar.
- `<kadın>.<olay>`: hafıza ("defne.ilk_gece", "sude.durust").
- Kapılar ve yol ayrımları: `davet.defne`, `gece6`, `sabah7`, `tekne9`, `gece11`, `kirik.*`, `bom.kafa`.
- `sahne.` ile başlayanlar her bölümün başında silinir.

## Veri dosyaları

- `kisiler.json`: `ad`, `tanimsiz` (adı bilinmezken), `rehberde` (rehberde hazır kayıtlı adı), `sahnede` (sayfada hep bu adla: "Baban"), `numara`, `renk`, `yazmaHizi`, `okumaGecikmesi` (saniye), `biliniyor`.
- `oyun.json`: `başlangıç`, `ilk_yer`.
- `hava.json`: 14 Eylül – 6 Ocak, günlük hava (`araclar/hava-uret.mjs` üretir).
