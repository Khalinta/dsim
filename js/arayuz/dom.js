// Küçük DOM yardımcıları ve simgeler.

export function el(etiket, ozellikler = {}, ...cocuklar) {
  const [ad, ...siniflar] = etiket.split('.');
  const d = document.createElement(ad || 'div');
  if (siniflar.length) d.className = siniflar.join(' ');
  for (const [k, v] of Object.entries(ozellikler || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'sinif') d.className += ` ${v}`;
    else if (k === 'stil') Object.assign(d.style, v);
    else if (k === 'degisken') for (const [a, b] of Object.entries(v)) d.style.setProperty(a, b);
    else if (k.startsWith('on')) d.addEventListener(k.slice(2), v);
    else if (k === 'html') d.innerHTML = v;
    else d.setAttribute(k, v === true ? '' : v);
  }
  for (const c of cocuklar.flat()) {
    if (c === undefined || c === null || c === false) continue;
    d.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return d;
}

const YOLLAR = {
  telefon: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/><path d="M10.5 18.5h3"/>',
  mesaj: '<path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4.5 3.5v-3.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5Z"/>',
  rehber: '<circle cx="12" cy="8.5" r="3.6"/><path d="M4.8 20c.8-3.6 3.7-5.6 7.2-5.6s6.4 2 7.2 5.6"/>',
  ayarlar: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/>',
  kilit: '<rect x="5" y="10.5" width="14" height="10" rx="2.4"/><path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7"/>',
  geri: '<path d="m14.5 5-7 7 7 7"/>',
  ileri: '<path d="m9.5 5 7 7-7 7"/>',
  konum: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
  gunes: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"/>',
  ay: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>',
  bulut: '<path d="M7 18.5h10.5a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 7.3 9.2 4.7 4.7 0 0 0 7 18.5Z"/>',
  yagmur: '<path d="M7 15.5h10.5a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 7.3 6.2 4.7 4.7 0 0 0 7 15.5Z"/><path d="m9 18-1 2.5M13 18l-1 2.5M17 18l-1 2.5"/>',
  ruzgar: '<path d="M3 9h11a2.8 2.8 0 1 0-2.8-2.8M3 13.5h15.5a2.8 2.8 0 1 1-2.8 2.8M3 18h7"/>',
  firtina: '<path d="M7 15h10.5a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 7.3 5.7 4.7 4.7 0 0 0 7 15Z"/><path d="m12.5 15-2 3.5h3l-2 3.5"/>',
  arama: '<path d="M8.6 3.8 6.3 3.5a1.6 1.6 0 0 0-1.7 1.2c-.6 2.7.3 6.2 3.3 9.4s6.7 4.4 9.4 3.8a1.6 1.6 0 0 0 1.2-1.7l-.3-2.3a1.4 1.4 0 0 0-1.2-1.2l-2.3-.3a1.4 1.4 0 0 0-1.3.6l-.8 1.1a10.8 10.8 0 0 1-4.6-4.6l1.1-.8a1.4 1.4 0 0 0 .6-1.3L9.8 5a1.4 1.4 0 0 0-1.2-1.2Z"/>',
  tik: '<path d="m4.5 12.5 4.5 4.5L19.5 6.5"/>',
  ciftTik: '<path d="m2.5 12.5 4.5 4.5L17 7M10.5 16.5l.5.5L21.5 7"/>',
};

export function ikon(ad, sinif = '') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.7');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', `ikon ${sinif}`.trim());
  s.innerHTML = YOLLAR[ad] || '';
  return s;
}

export function havaIkonu(durum, gece) {
  switch (durum) {
    case 'açık': return gece ? 'ay' : 'gunes';
    case 'az bulutlu': return gece ? 'ay' : 'gunes';
    case 'bulutlu': return 'bulut';
    case 'yağmurlu': return 'yagmur';
    case 'rüzgârlı': return 'ruzgar';
    case 'fırtına': return 'firtina';
    default: return 'gunes';
  }
}

export function bekle(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function ilkHarf(metin) {
  const m = String(metin).trim().match(/\p{L}/u);
  return m ? m[0].toLocaleUpperCase('tr') : '';
}
