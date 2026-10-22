# İçerik biçimi (.dsim)

Oyunun bütün metni `icerik/` altındaki `.dsim` dosyalarındadır. Her dosya `icerik/dizin.txt`'de listelenir (testler eksik olanı yakalar). Bu belge biçimin tam tarifidir.

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
| `sahne` | Tam ekran, kitap gibi akan sahne | `zaman` gelince ya da `>> başlat` ile |
| `mesaj` | Bir kişiyle yazışma parçası | `zaman`, `tarih`/`pencere` (kendiliğinden), `başlatan: oyuncu` ya da `>> başlat` |
| `eylem` | Kilit ekranındaki "Ne yapacaksın?" seçeneği | `tarih`, `pencere`, `koşul` tutunca listede görünür; anlatı varsa sahne olarak oynar |
| `geçmiş` | Oyun başlamadan önce telefonda duran mesajlar | Oyun başlarken bir kez |
| `tepki` | Sahnede telefona bakınca karakterin genel tepkisi | `kişi` + `olay: telefona_bakma` + `koşul` |

### Başlıklar

| Başlık | Örnek | Anlamı |
|---|---|---|
| `tür` | `sahne` | Zorunlu |
| `kişi` | `defne` | Mesajda sohbetin sahibi; sahnede renk ve telefon tepkisi |
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
| `olay` | `telefona_bakma` | Tepki parçasının olayı |
| `not` | serbest | Yazara not, oyunda görünmez |

## Gövde

Girinti **iki boşluktur** (sekme yok). Her satır bir paragraf ya da bir mesajdır.

| Satır | Anlamı |
|---|---|
| `Düz metin.` | Anlatı (yalnızca sahne/eylem/tepkide) |
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
| `>> yer Kordon` | Oyuncunun konumunu değiştirir |
| `>> ev Taş Mahalle, ev` | Oyuncunun evini değiştirir (uyuyunca oraya döner) |
| `>> başlat kimlik` / `... sonra 2sa` / `... 17 Eylül 09:00` | Başka bir parçayı başlatır ya da zamanlar |
| `>> rehber kişi: Ad 1 \| Ad 2 \| Ad 3` | Oyuncu numarayı bu adlardan biriyle rehbere kaydeder |
| `>> tanış kişi` | Oyuncu artık bu kişinin adını biliyor (sahnede adıyla görünür) |
| `>> okudu` | Mesajda: karşı taraf oyuncunun mesajlarını okudu (görüldü) |
| `>> zaman_aşımı 3sa -> etiket` | Mesajda: hemen ardından gelen seçime süre koyar; cevap gelmezse etikete gider |
| `>> okunmadı` | Geçmişte: bundan sonraki gelen mesajlar okunmamış durur |

### Özel mesajlar

- `[Fotoğraf: Havuz. Suyu yeşil.] manzara` → fotoğraf kartı ve altında yazı.
- `[Cevapsız arama]` → arama satırı.

### Telefona bakmak

Sahnede bir seçimin önünde okunmamış mesaj varsa oyuncu telefonuna bakabilir. O zaman:
1. Parçada `:: telefon` etiketi varsa ilk bakışta orası oynar (`-> geri` ile biter); ikinci bakışta `:: telefon_tekrar` varsa o.
2. Yoksa sahnenin kişisinin `tepki` parçalarından koşulu tutan, önceliği en yüksek olanı.
3. Sayaçlar: `sahne.telefon` (bu sahnede kaçıncı bakış), `telefon.<kişi>` (o kişinin yanındayken toplam).
`:: telefon` etiketinden önceki satır `-> son` olmalı; yoksa sahne oraya düşer (denetim yakalar).

### Koşul dili

`ve`, `veya`, `değil`, `==`, `!=`, `>=`, `<=`, `>`, `<`, `+`, `-`, parantez, `evet`, `hayır`, sayılar, `"metin"`.

Hazır değişkenler: `saat`, `dakika`, `tarih` (gün no; `tarih >= "20 Eylül"` yazılabilir), `an` (saniye; `an < "16 Eylül 10:00"`), `haftagünü` (1 = Pazartesi).

Fonksiyonlar: `gördü(parça)`, `bitti(parça)`, `kaç(parça)`, `tanıdı(kişi)`, `kayıtlı(kişi)`.

Otomatik değişkenler: `<parça>.cevapsız` (mesaj seçimi cevapsız kaldıysa).

### Değişken adları (öneri)

- `<kişi>.yakınlık`, `<kişi>.güven`, `<kişi>.gerilim`: ilişkinin gizli ölçüleri.
- `<kişi>.<olay>`: hafıza ("defne.sezonluk_yalani").
- `<parça>.<seçim>`: o sahnede verilen cevap ("acilis.cevap").
- `sahne.` ile başlayanlar her sahne başında silinir.

## Zamanlama nasıl işler

- Oyun saati yalnızca oyuncu bir şey yaptığında ilerler.
- Bir mesaj parçasının ilk mesajı başladığı anda gelir. Sonrakiler kişinin yazma hızına göre (`kisiler.json`: `yazmaHizi`) gecikir. Oyuncu cevap verdiyse önce okuma gecikmesi (`okumaGecikmesi`, saniye) eklenir.
- Telefon açıkken 5 dakika içindeki mesajlar "yazıyor…" ile kendiliğinden gelir.
- Cevap beklenen seçim, süresi dolunca (varsayılan 24 saat) kapanır.
- Aynı kişiden ikinci bir mesaj parçası gelirse, önceki bitene kadar sıraya girer (`kesme: evet` değilse).
