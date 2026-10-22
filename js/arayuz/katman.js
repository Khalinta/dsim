// Alt pencereler ve kısa uyarılar.

import { el, bekle } from './dom.js';

const katman = () => document.getElementById('katman');

// icerik: DOM düğümleri; dugmeler: [{ yazi, tur: 'birincil'|'ikincil'|'tehlike', tikla }]
export function altPencere(baslik, icerik, dugmeler = []) {
  const zemin = el('div.alt-pencere-zemin');
  const pencere = el('div.alt-pencere', { role: 'dialog', 'aria-label': baslik });
  const kapat = async () => {
    zemin.classList.remove('acik');
    pencere.classList.remove('acik');
    await bekle(420);
    zemin.remove();
    pencere.remove();
  };
  zemin.addEventListener('click', kapat);
  pencere.append(
    el('h2', {}, baslik),
    ...[].concat(icerik),
    el('div.dugmeler', {}, ...dugmeler.map((d) => el(`button.dugme.${d.tur || 'ikincil'}`, {
      onclick: async () => { const sonuc = d.tikla ? await d.tikla() : undefined; if (sonuc !== false) kapat(); },
    }, d.yazi))),
  );
  katman().append(zemin, pencere);
  requestAnimationFrame(() => requestAnimationFrame(() => { zemin.classList.add('acik'); pencere.classList.add('acik'); }));
  return { kapat, pencere };
}

let balonZamanlayici = null;
export function uyari(metin, eylem = null, sure = 4200) {
  document.querySelectorAll('.uyari-balonu').forEach((b) => b.remove());
  const balon = el('div.uyari-balonu', { role: 'status' }, el('span', {}, metin),
    eylem ? el('button', { onclick: () => { eylem.tikla(); kapat(); } }, eylem.yazi) : null);
  const kapat = async () => { balon.classList.remove('acik'); await bekle(450); balon.remove(); };
  katman().append(balon);
  requestAnimationFrame(() => requestAnimationFrame(() => balon.classList.add('acik')));
  clearTimeout(balonZamanlayici);
  balonZamanlayici = setTimeout(kapat, sure);
}

export async function panoyaKopyala(metin, yedekAlan) {
  try {
    await navigator.clipboard.writeText(metin);
    return true;
  } catch {
    if (yedekAlan) {
      yedekAlan.focus();
      yedekAlan.select();
      yedekAlan.setSelectionRange(0, metin.length);
      try { return document.execCommand('copy'); } catch { return false; }
    }
    return false;
  }
}
