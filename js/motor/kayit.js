// Kayıt kodu: oyunun durumu sıkıştırılıp kopyalanabilir bir metne çevrilir.
// Biçim: "PIR1." + base64url(deflate(json))  ya da sıkıştırma yoksa "PIR0." + base64url(json)

const ON_EK_SIKISTIRILMIS = 'PIR1.';
const ON_EK_DUZ = 'PIR0.';

function base64urlYaz(baytlar) {
  let ikili = '';
  for (let i = 0; i < baytlar.length; i += 0x8000) ikili += String.fromCharCode(...baytlar.subarray(i, i + 0x8000));
  return btoa(ikili).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlOku(metin) {
  const b64 = metin.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((metin.length + 3) % 4);
  const ikili = atob(b64);
  const baytlar = new Uint8Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) baytlar[i] = ikili.charCodeAt(i);
  return baytlar;
}

async function akistanOku(akis) {
  const parcalar = [];
  const okuyucu = akis.getReader();
  for (;;) {
    const { done, value } = await okuyucu.read();
    if (done) break;
    parcalar.push(value);
  }
  const toplam = parcalar.reduce((a, p) => a + p.length, 0);
  const sonuc = new Uint8Array(toplam);
  let o = 0;
  for (const p of parcalar) { sonuc.set(p, o); o += p.length; }
  return sonuc;
}

const sikistirmaVar = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

export async function kodaCevir(json) {
  const baytlar = new TextEncoder().encode(json);
  if (!sikistirmaVar()) return ON_EK_DUZ + base64urlYaz(baytlar);
  const akis = new Blob([baytlar]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return ON_EK_SIKISTIRILMIS + base64urlYaz(await akistanOku(akis));
}

export async function koddanCoz(kod) {
  const temiz = String(kod).replace(/\s+/g, '');
  let baytlar;
  if (temiz.startsWith(ON_EK_SIKISTIRILMIS)) {
    if (!sikistirmaVar()) throw new Error('Bu tarayıcı sıkıştırılmış kayıt kodunu açamıyor.');
    const ham = base64urlOku(temiz.slice(ON_EK_SIKISTIRILMIS.length));
    const akis = new Blob([ham]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    baytlar = await akistanOku(akis);
  } else if (temiz.startsWith(ON_EK_DUZ)) {
    baytlar = base64urlOku(temiz.slice(ON_EK_DUZ.length));
  } else {
    throw new Error('Bu bir kayıt kodu değil.');
  }
  const json = new TextDecoder().decode(baytlar);
  const durum = JSON.parse(json);
  if (!durum || typeof durum !== 'object' || typeof durum.t !== 'number' || !durum.oyuncu) throw new Error('Kayıt kodu bozuk.');
  return durum;
}
