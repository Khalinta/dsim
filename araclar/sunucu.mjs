// Geliştirme için basit bir dosya sunucusu. Oyunu bilgisayarda denemek için:
//   node araclar/sunucu.mjs        → http://localhost:8080

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = fileURLToPath(new URL('../', import.meta.url));
const TURLER = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.dsim': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

export function sunucuAc(port = 8080) {
  const sunucu = createServer(async (istek, yanit) => {
    try {
      let yol = decodeURIComponent(new URL(istek.url, 'http://x').pathname);
      if (yol.endsWith('/')) yol += 'index.html';
      const dosya = normalize(join(KOK, yol));
      if (!dosya.startsWith(KOK)) throw new Error('yasak');
      await stat(dosya);
      yanit.writeHead(200, { 'Content-Type': TURLER[extname(dosya)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      yanit.end(await readFile(dosya));
    } catch {
      yanit.writeHead(404);
      yanit.end('yok');
    }
  });
  return new Promise((coz) => sunucu.listen(port, () => coz(sunucu)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] || 8080);
  await sunucuAc(port);
  console.log(`http://localhost:${port}`);
}
