// Kayıt kodu ve hata raporu pencereleri.

import { el } from './dom.js';
import { altPencere, uyari, panoyaKopyala } from './katman.js';
import { kodaCevir, koddanCoz } from '../motor/kayit.js';
import { raporOlustur } from './hata.js';

export async function kayitKoduGoster(app) {
  const kod = await kodaCevir(app.oyun.disaVer());
  const alan = el('textarea', { readonly: true, rows: '6' });
  alan.value = kod;
  altPencere('Kayıt kodu', [
    el('p', {}, 'Bu kod oyunun şu anki hâlidir. Kopyalayıp Notlar\'a ya da kendine bir mesaja yapıştır. Telefon değişse de, oyun silinse de bu kodla kaldığın yerden devam edersin.'),
    alan,
  ], [
    { yazi: 'Kopyala', tur: 'birincil', tikla: async () => { const ok = await panoyaKopyala(kod, alan); uyari(ok ? 'Kayıt kodu kopyalandı.' : 'Kopyalanamadı; metni basılı tutup kendin kopyala.'); return ok ? undefined : false; } },
    { yazi: 'Kapat', tur: 'ikincil' },
  ]);
}

export function kayitKoduYukle(app, sonra) {
  const alan = el('textarea', { rows: '6', placeholder: 'PIR1.…' });
  altPencere('Kayıt kodunu yükle', [
    el('p', {}, 'Daha önce aldığın kayıt kodunu buraya yapıştır. Şimdiki oyunun yerine o geçecek.'),
    alan,
  ], [
    { yazi: 'Yükle', tur: 'birincil', tikla: async () => {
      try {
        const durum = await koddanCoz(alan.value);
        app.kayitYukle(durum);
        uyari('Kayıt yüklendi.');
        if (sonra) sonra();
        return undefined;
      } catch (e) {
        uyari(e.message || 'Kayıt kodu okunamadı.');
        return false;
      }
    } },
    { yazi: 'Vazgeç', tur: 'ikincil' },
  ]);
}

export async function hataRaporuAc(app) {
  const rapor = await raporOlustur();
  const alan = el('textarea', { readonly: true, rows: '9' });
  alan.value = rapor;
  altPencere('Hata raporu', [
    el('p', {}, 'Bir şey ters gittiyse bu raporu kopyalayıp bana gönder. İçinde oyunun o anki hâli ve kayıt kodun da var.'),
    alan,
  ], [
    { yazi: 'Raporu kopyala', tur: 'birincil', tikla: async () => { const ok = await panoyaKopyala(rapor, alan); uyari(ok ? 'Rapor kopyalandı.' : 'Kopyalanamadı; metni basılı tutup kendin kopyala.'); return ok ? undefined : false; } },
    { yazi: 'Kapat', tur: 'ikincil' },
  ]);
  void app;
}
