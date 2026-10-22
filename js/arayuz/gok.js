// Kilit ve giriş ekranlarının gökyüzü: saate ve havaya göre ton.

import { el } from './dom.js';
import { evre } from '../motor/tarih.js';

const ACIK_EVRELER = new Set(['sabah', 'ogle', 'ikindi']);

export function gokKur(kok, t, hava) {
  kok.classList.add('gok');
  let zemin = kok.querySelector(':scope > .gok-zemin');
  if (!zemin) {
    zemin = el('div.gok-zemin', {}, el('div.yildizlar'), el('div.yagmur'), el('div.ufuk'));
    kok.prepend(zemin);
  }
  const e = t === null ? 'gunbatimi' : evre(t);
  const durum = hava ? hava.durum : 'açık';
  kok.dataset.evre = e;
  kok.dataset.hava = durum;
  kok.classList.toggle('acik', ACIK_EVRELER.has(e) && durum !== 'fırtına');
  const tema = document.querySelector('meta[name="theme-color"]');
  if (tema) tema.setAttribute('content', ACIK_EVRELER.has(e) ? '#8fbde3' : '#14182a');
}
