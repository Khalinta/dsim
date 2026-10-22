// Node araçlarının (testler, okuma aracı) ortak yardımcıları.

import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { icerigiYukle } from '../js/motor/yukleme.js';

export const KOK = new URL('../', import.meta.url);

export function diskIcerik() {
  return icerigiYukle((yol) => readFile(new URL(`icerik/${yol}`, KOK), 'utf8'));
}

// yazim/yasakli.txt → [{ metin } | { desen }]
export function yasakliKaliplar() {
  return readFileSync(new URL('yazim/yasakli.txt', KOK), 'utf8')
    .split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
    .map((s) => (s.startsWith('re:') ? new RegExp(s.slice(3), 'u') : s));
}
