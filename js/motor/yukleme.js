// İçeriği yükler. Okuyucu ortamdan gelir: tarayıcıda fetch, Node'da dosya okuma.
// okuyucu(yol) → Promise<string>   (yol icerik/ klasörüne göre)

import { icerikDerle } from './oyun.js';

export function dizinCoz(metin) {
  return metin.split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'));
}

export async function icerigiYukle(okuyucu) {
  const dizin = dizinCoz(await okuyucu('dizin.txt'));
  const [kisiler, ayar, hava, ...metinler] = await Promise.all([
    okuyucu('kisiler.json'),
    okuyucu('oyun.json'),
    okuyucu('hava.json'),
    ...dizin.map((ad) => okuyucu(ad)),
  ]);
  const dosyalar = dizin.map((ad, i) => ({ ad, metin: metinler[i] }));
  return icerikDerle(dosyalar, { kisiler: JSON.parse(kisiler), ayar: JSON.parse(ayar), hava: JSON.parse(hava) });
}
