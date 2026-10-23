// Node araçlarının (testler, okuma aracı) ortak yardımcıları.

import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { icerigiYukle } from '../js/motor/yukleme.js';

export const KOK = new URL('../', import.meta.url);

// klasor: içeriğin klasörü (kök klasöre göre). Varsayılan oyunun kendi içeriği; testler test/ornek/ kullanır.
export function diskIcerik(klasor = 'icerik') {
  return icerigiYukle((yol) => readFile(new URL(`${klasor.replace(/\/$/, '')}/${yol}`, KOK), 'utf8'));
}

// yazim/yasakli.txt → [{ metin } | { desen }]
export function yasakliKaliplar() {
  return readFileSync(new URL('yazim/yasakli.txt', KOK), 'utf8')
    .split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
    .map((s) => (s.startsWith('re:') ? new RegExp(s.slice(3), 'u') : s));
}
