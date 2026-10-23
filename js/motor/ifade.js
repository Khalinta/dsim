// İçerik dosyalarındaki koşul ifadeleri.
// Örnek: defne.yakınlık >= 2 ve değil gördü(defne_dogum_gunu) veya saat >= 22

const ANAHTAR = new Set(['ve', 'veya', 'değil', 'evet', 'hayır']);

function parcala(metin) {
  const sonuc = [];
  let i = 0;
  while (i < metin.length) {
    const c = metin[i];
    if (/\s/.test(c)) { i++; continue; }
    const iki = metin.slice(i, i + 2);
    if (['>=', '<=', '==', '!='].includes(iki)) { sonuc.push({ t: 'op', v: iki }); i += 2; continue; }
    if ('<>()+-,'.includes(c)) { sonuc.push({ t: c === '(' || c === ')' || c === ',' ? c : 'op', v: c }); i++; continue; }
    if (c === '"') {
      const j = metin.indexOf('"', i + 1);
      if (j < 0) throw new Error(`Kapanmayan tırnak: ${metin}`);
      sonuc.push({ t: 'metin', v: metin.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    const sayi = metin.slice(i).match(/^\d+(\.\d+)?/);
    if (sayi) { sonuc.push({ t: 'sayı', v: Number(sayi[0]) }); i += sayi[0].length; continue; }
    const ad = metin.slice(i).match(/^[\p{L}_][\p{L}\p{N}_.]*/u);
    if (ad) {
      const v = ad[0];
      sonuc.push(ANAHTAR.has(v) ? { t: v } : { t: 'ad', v });
      i += v.length;
      continue;
    }
    throw new Error(`Tanınmayan karakter "${c}": ${metin}`);
  }
  return sonuc;
}

export function ifadeCoz(metin) {
  const parcalar = parcala(metin);
  let i = 0;
  const bak = () => parcalar[i];
  const al = (t) => {
    const p = parcalar[i];
    if (!p || (t && p.t !== t)) throw new Error(`Beklenmeyen ifade sonu ya da "${p ? p.v ?? p.t : ''}": ${metin}`);
    i++;
    return p;
  };

  function veya() {
    let sol = ve();
    while (bak() && bak().t === 'veya') { al(); sol = { t: 'veya', sol, sag: ve() }; }
    return sol;
  }
  function ve() {
    let sol = degil();
    while (bak() && bak().t === 've') { al(); sol = { t: 've', sol, sag: degil() }; }
    return sol;
  }
  function degil() {
    if (bak() && bak().t === 'değil') { al(); return { t: 'değil', v: degil() }; }
    return karsilastir();
  }
  function karsilastir() {
    const sol = toplam();
    const p = bak();
    if (p && p.t === 'op' && ['==', '!=', '>=', '<=', '>', '<'].includes(p.v)) {
      al();
      return { t: 'kıyas', op: p.v, sol, sag: toplam() };
    }
    return sol;
  }
  function toplam() {
    let sol = tek();
    while (bak() && bak().t === 'op' && (bak().v === '+' || bak().v === '-')) {
      const op = al().v;
      sol = { t: 'aritmetik', op, sol, sag: tek() };
    }
    return sol;
  }
  function tek() {
    const p = al();
    if (p.t === 'sayı') return { t: 'değer', v: p.v };
    if (p.t === 'metin') return { t: 'değer', v: p.v };
    if (p.t === 'evet') return { t: 'değer', v: true };
    if (p.t === 'hayır') return { t: 'değer', v: false };
    if (p.t === 'op' && p.v === '-') return { t: 'aritmetik', op: '-', sol: { t: 'değer', v: 0 }, sag: tek() };
    if (p.t === '(') { const ic = veya(); al(')'); return ic; }
    if (p.t === 'ad') {
      if (bak() && bak().t === '(') {
        al('(');
        const argumanlar = [];
        while (bak() && bak().t !== ')') {
          const a = al();
          argumanlar.push(a.v);
          if (bak() && bak().t === ',') al(',');
        }
        al(')');
        return { t: 'çağrı', ad: p.v, argumanlar };
      }
      return { t: 'değişken', ad: p.v };
    }
    throw new Error(`Beklenmeyen "${p.v ?? p.t}": ${metin}`);
  }

  const agac = veya();
  if (i < parcalar.length) throw new Error(`Fazladan parça "${parcalar[i].v ?? parcalar[i].t}": ${metin}`);
  return agac;
}

// Bir ifadenin kullandığı değişken ve fonksiyon adlarını toplar (içerik denetimi için).
export function adlariTopla(agac, sonuc = { degiskenler: new Set(), cagrilar: [] }) {
  if (!agac) return sonuc;
  if (agac.t === 'değişken') sonuc.degiskenler.add(agac.ad);
  if (agac.t === 'çağrı') sonuc.cagrilar.push(agac);
  for (const k of ['sol', 'sag', 'v']) if (agac[k] && typeof agac[k] === 'object') adlariTopla(agac[k], sonuc);
  return sonuc;
}

// baglam: { degisken(ad), cagir(ad, argumanlar), tarihCevir(metin, sayiMi) }
export function hesapla(agac, baglam) {
  switch (agac.t) {
    case 'değer': return agac.v;
    case 'değişken': return baglam.degisken(agac.ad);
    case 'çağrı': return baglam.cagir(agac.ad, agac.argumanlar);
    case 'değil': return !dogru(hesapla(agac.v, baglam));
    case 've': return dogru(hesapla(agac.sol, baglam)) && dogru(hesapla(agac.sag, baglam));
    case 'veya': return dogru(hesapla(agac.sol, baglam)) || dogru(hesapla(agac.sag, baglam));
    case 'aritmetik': {
      const a = sayiya(hesapla(agac.sol, baglam));
      const b = sayiya(hesapla(agac.sag, baglam));
      return agac.op === '+' ? a + b : a - b;
    }
    case 'kıyas': {
      let a = hesapla(agac.sol, baglam);
      let b = hesapla(agac.sag, baglam);
      // Sayıyla sıralama yapılan metin bir tarihtir: tarih >= "16 Eylül", an < "16 Eylül 10:00".
      // Eşitlikte de tarih gibi okunan metin tarihtir (tarih != "13 Aralık"). Okunmuyorsa
      // (henüz atanmamış değişken ile "gitmiyorum" gibi bir metin) sonuç "eşit değil"dir.
      const karisik = (typeof a === 'string') !== (typeof b === 'string');
      if (karisik && (agac.op === '==' || agac.op === '!=')) {
        let cevrildi = null;
        try { cevrildi = baglam.tarihCevir(typeof a === 'string' ? a : b); } catch { cevrildi = null; }
        if (cevrildi === null) return agac.op === '!=';
        if (typeof a === 'string') a = cevrildi; else b = cevrildi;
        if (typeof a === 'boolean' || typeof b === 'boolean') return agac.op === '!=';
        return agac.op === '==' ? a === b : a !== b;
      }
      if (typeof a === 'string' && typeof b !== 'string') a = baglam.tarihCevir(a);
      if (typeof b === 'string' && typeof a !== 'string') b = baglam.tarihCevir(b);
      if (typeof a === 'boolean' || typeof b === 'boolean') { a = dogru(a); b = dogru(b); }
      switch (agac.op) {
        case '==': return a === b;
        case '!=': return a !== b;
        case '>=': return a >= b;
        case '<=': return a <= b;
        case '>': return a > b;
        case '<': return a < b;
      }
    }
  }
  throw new Error(`Bilinmeyen ifade düğümü: ${agac.t}`);
}

export function dogru(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  return Boolean(v);
}

function sayiya(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === undefined || v === null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}
