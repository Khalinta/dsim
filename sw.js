// Servis çalışanı: oyunu internetsiz çalıştırmak için bütün dosyaları önbelleğe alır.
// SURUM, js/surum.js ile aynı olmalı; değişince yeni önbellek kurulur.

const SURUM = '0.3.1';
const ONBELLEK = `pirnalli-${SURUM}`;

const DOSYALAR = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/stil.css',
  'js/surum.js',
  'js/motor/tarih.js',
  'js/motor/ifade.js',
  'js/motor/ayristirici.js',
  'js/motor/oyun.js',
  'js/motor/kayit.js',
  'js/motor/yukleme.js',
  'js/arayuz/uygulama.js',
  'js/arayuz/dom.js',
  'js/arayuz/gok.js',
  'js/arayuz/katman.js',
  'js/arayuz/hata.js',
  'js/arayuz/ayarlar.js',
  'js/arayuz/giris.js',
  'js/arayuz/kilit.js',
  'js/arayuz/telefon.js',
  'js/arayuz/sahne.js',
  'fontlar/inter-latin-wght-normal.woff2',
  'fontlar/inter-latin-ext-wght-normal.woff2',
  'fontlar/literata-latin-opsz-normal.woff2',
  'fontlar/literata-latin-opsz-italic.woff2',
  'fontlar/literata-latin-ext-opsz-normal.woff2',
  'fontlar/literata-latin-ext-opsz-italic.woff2',
  'ikonlar/ikon.svg',
  'ikonlar/ikon-180.png',
  'ikonlar/ikon-192.png',
  'ikonlar/ikon-512.png',
  'icerik/dizin.txt',
  'icerik/kisiler.json',
  'icerik/oyun.json',
  'icerik/hava.json',
];

self.addEventListener('install', (olay) => {
  olay.waitUntil((async () => {
    const onbellek = await caches.open(ONBELLEK);
    await onbellek.addAll(DOSYALAR.map((d) => new Request(d, { cache: 'reload' })));
    // İçerik dosyaları dizin.txt'den okunur; yeni bir dosya eklenince burayı değiştirmek gerekmez.
    const dizin = await (await onbellek.match('icerik/dizin.txt')).text();
    const icerik = dizin.split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#')).map((s) => `icerik/${s}`);
    await onbellek.addAll(icerik.map((d) => new Request(d, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (olay) => {
  olay.waitUntil((async () => {
    for (const ad of await caches.keys()) if (ad !== ONBELLEK) await caches.delete(ad);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (olay) => {
  if (olay.request.method !== 'GET') return;
  olay.respondWith((async () => {
    const onbellek = await caches.open(ONBELLEK);
    const eslesen = await onbellek.match(olay.request, { ignoreSearch: true });
    if (eslesen) return eslesen;
    try {
      return await fetch(olay.request);
    } catch {
      if (olay.request.mode === 'navigate') return onbellek.match('index.html');
      throw new Error('internet yok');
    }
  })());
});
