// Küçük Tablo: Türkçe formüllü küçük bir hesap tablosu motoru.
// Formüller "=" ile başlar, bağımsız değişkenler ";" ile ayrılır, ondalık ayracı virgüldür: =YUVARLA(B2*1,18;2)

// ---------- Hatalar ----------
export class Hata {
  constructor(kod) { this.kod = kod; }
  toString() { return this.kod; }
}
export const H = {
  BOL0: new Hata('#BÖL/0!'), AD: new Hata('#AD?'), DEGER: new Hata('#DEĞER!'),
  BASV: new Hata('#BAŞV!'), DONGU: new Hata('#DÖNGÜ!'), SOZ: new Hata('#SÖZDİZİMİ!'), SAYI: new Hata('#SAYI!'),
};
const hataMi = v => v instanceof Hata;

// ---------- Adresler ----------
export function sutunAdi(c) { let s = ''; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; }
export function sutunNo(ad) { let c = 0; for (const ch of ad) c = c * 26 + (ch.charCodeAt(0) - 64); return c - 1; }
export function adresOku(a) {
  const m = /^([A-Za-z]{1,3})(\d{1,5})$/.exec(a);
  if (!m) return null;
  const r = Number(m[2]) - 1;
  if (r < 0) return null;
  return { c: sutunNo(m[1].toUpperCase()), r };
}
export const adresYaz = (c, r) => `${sutunAdi(c)}${r + 1}`;

// ---------- Belirteçler ----------
const HARF = /[A-Za-zÇĞİÖŞÜçğıöşü_]/;
export function belirtecler(f) {
  const t = [];
  let i = 0;
  while (i < f.length) {
    const ch = f[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/\d/.test(ch)) {
      const m = /^\d+([.,]\d+)?/.exec(f.slice(i));
      t.push({ t: 'sayi', v: parseFloat(m[0].replace(',', '.')) }); i += m[0].length; continue;
    }
    if (ch === '"') {
      let j = i + 1, s = '';
      for (;;) {
        if (j >= f.length) throw H.SOZ;
        if (f[j] === '"') { if (f[j + 1] === '"') { s += '"'; j += 2; continue; } break; }
        s += f[j++];
      }
      t.push({ t: 'metin', v: s }); i = j + 1; continue;
    }
    if (HARF.test(ch)) {
      const m = /^[A-Za-zÇĞİÖŞÜçğıöşü_][A-Za-zÇĞİÖŞÜçğıöşü_0-9.]*/.exec(f.slice(i));
      t.push({ t: 'ad', v: m[0] }); i += m[0].length; continue;
    }
    const iki = f.slice(i, i + 2);
    if (iki === '<=' || iki === '>=' || iki === '<>') { t.push({ t: 'op', v: iki }); i += 2; continue; }
    if ('+-*/^&=<>();:%'.includes(ch)) { t.push({ t: 'op', v: ch }); i++; continue; }
    throw H.SOZ;
  }
  return t;
}

// ---------- Ayrıştırıcı ----------
// Öncelik (düşükten yükseğe): karşılaştırma, &, + -, * /, ^, %, tekli -
export function ayristir(formul) {
  const t = belirtecler(formul);
  let i = 0;
  const bak = () => t[i], al = () => t[i++];
  const opMu = v => t[i] && t[i].t === 'op' && t[i].v === v;
  const bekle = v => { if (!opMu(v)) throw H.SOZ; i++; };

  function karsilastir() {
    let a = birlestir();
    while (t[i] && t[i].t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(t[i].v)) { const op = al().v; a = { t: 'ikili', op, a, b: birlestir() }; }
    return a;
  }
  function birlestir() { let a = topla(); while (opMu('&')) { i++; a = { t: 'ikili', op: '&', a, b: topla() }; } return a; }
  function topla() { let a = carp(); while (opMu('+') || opMu('-')) { const op = al().v; a = { t: 'ikili', op, a, b: carp() }; } return a; }
  function carp() { let a = us(); while (opMu('*') || opMu('/')) { const op = al().v; a = { t: 'ikili', op, a, b: us() }; } return a; }
  function us() { let a = tekli(); while (opMu('^')) { i++; a = { t: 'ikili', op: '^', a, b: tekli() }; } return a; }
  function tekli() {
    if (opMu('-')) { i++; return { t: 'tekli', op: '-', a: tekli() }; }
    if (opMu('+')) { i++; return tekli(); }
    let a = birincil();
    while (opMu('%')) { i++; a = { t: 'yuzde', a }; }
    return a;
  }
  function birincil() {
    const k = al();
    if (!k) throw H.SOZ;
    if (k.t === 'sayi') return { t: 'sayi', v: k.v };
    if (k.t === 'metin') return { t: 'metin', v: k.v };
    if (k.t === 'op' && k.v === '(') { const e = karsilastir(); bekle(')'); return e; }
    if (k.t === 'ad') {
      if (opMu('(')) {
        i++;
        const ad = k.v.toLocaleUpperCase('tr-TR'), args = [];
        if (!opMu(')')) { args.push(karsilastir()); while (opMu(';')) { i++; args.push(karsilastir()); } }
        bekle(')');
        return { t: 'fonk', ad, args };
      }
      const a1 = adresOku(k.v);
      if (a1) {
        if (opMu(':')) {
          i++;
          const k2 = al(), a2 = k2 && k2.t === 'ad' ? adresOku(k2.v) : null;
          if (!a2) throw H.SOZ;
          return { t: 'aralik', c1: Math.min(a1.c, a2.c), r1: Math.min(a1.r, a2.r), c2: Math.max(a1.c, a2.c), r2: Math.max(a1.r, a2.r) };
        }
        return { t: 'hucre', c: a1.c, r: a1.r };
      }
      const ust = k.v.toLocaleUpperCase('tr-TR');
      if (ust === 'DOĞRU') return { t: 'mantik', v: true };
      if (ust === 'YANLIŞ') return { t: 'mantik', v: false };
      return { t: 'bilinmeyen', ad: k.v };
    }
    throw H.SOZ;
  }
  const kok = karsilastir();
  if (i !== t.length) throw H.SOZ;
  return kok;
}

// Formülün hangi hücrelere baktığı
export function referanslar(dugum, cikti = []) {
  if (!dugum) return cikti;
  if (dugum.t === 'hucre') cikti.push([dugum.c, dugum.r]);
  else if (dugum.t === 'aralik') { for (let c = dugum.c1; c <= dugum.c2; c++) for (let r = dugum.r1; r <= dugum.r2; r++) cikti.push([c, r]); }
  else if (dugum.t === 'ikili') { referanslar(dugum.a, cikti); referanslar(dugum.b, cikti); }
  else if (dugum.t === 'tekli' || dugum.t === 'yuzde') referanslar(dugum.a, cikti);
  else if (dugum.t === 'fonk') dugum.args.forEach(a => referanslar(a, cikti));
  return cikti;
}

// ---------- Değer dönüşümleri ----------
// Hücreye yazılan düz içerik: sayı, yüzde, DOĞRU/YANLIŞ ya da metin
export function hamDeger(ham) {
  const s = String(ham ?? '');
  if (s.trim() === '') return null;
  const t = s.trim();
  if (/^[-+]?\d+([.,]\d+)?$/.test(t)) return parseFloat(t.replace(',', '.'));
  if (/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return parseFloat(t.replace(/\./g, '').replace(',', '.'));   // 1.250,50
  let m = /^%\s*([-+]?\d+([.,]\d+)?)$/.exec(t) || /^([-+]?\d+([.,]\d+)?)\s*%$/.exec(t);
  if (m) return parseFloat(m[1].replace(',', '.')) / 100;
  const ust = t.toLocaleUpperCase('tr-TR');
  if (ust === 'DOĞRU') return true;
  if (ust === 'YANLIŞ') return false;
  return s;
}

function sayiya(v) {
  if (hataMi(v)) return v;
  if (v === null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const h = hamDeger(v);
  return typeof h === 'number' ? h : H.DEGER;
}
function metne(v) {
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? 'DOĞRU' : 'YANLIŞ';
  if (typeof v === 'number') return sayiYaz(v);
  return String(v);
}
function mantiga(v) {
  if (hataMi(v)) return v;
  if (typeof v === 'boolean') return v;
  if (v === null) return false;
  if (typeof v === 'number') return v !== 0;
  const u = String(v).toLocaleUpperCase('tr-TR');
  if (u === 'DOĞRU') return true;
  if (u === 'YANLIŞ') return false;
  return H.DEGER;
}

const turSirasi = v => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : 2);
function kiyasla(a, b) {
  if (a === null) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
  if (b === null) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
  const ta = turSirasi(a), tb = turSirasi(b);
  if (ta !== tb) return ta - tb;
  if (ta === 1) return a.localeCompare(b, 'tr-TR', { sensitivity: 'accent' });
  return a === b ? 0 : a < b ? -1 : 1;
}

// Sayıyı kayan nokta gürültüsü olmadan yaz: 0,1 + 0,2 -> 0,3
export function sayiYaz(n) {
  if (!Number.isFinite(n)) return '#SAYI!';
  const temiz = Number(n.toPrecision(12));
  return temiz.toLocaleString('tr-TR', { maximumFractionDigits: 10, useGrouping: false });
}

export function degerYaz(v) {
  if (v === null || v === undefined) return '';
  if (hataMi(v)) return v.kod;
  if (typeof v === 'number') return sayiYaz(v);
  if (typeof v === 'boolean') return v ? 'DOĞRU' : 'YANLIŞ';
  return String(v);
}

// "=5", ">1000", "<>aştı", "aştı" -> eşleşme fonksiyonu
function olcut(o) {
  if (hataMi(o)) return () => false;
  if (typeof o !== 'string') return v => v !== null && kiyasla(v, o) === 0;
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(o);
  const op = m[1] || '=', ham = hamDeger(m[2]);
  const hedef = ham === null ? '' : ham;
  return v => {
    if (hataMi(v)) return false;
    if (typeof hedef === 'number' && typeof v !== 'number' && op !== '<>') return false;
    const k = kiyasla(v === null ? (typeof hedef === 'number' ? null : '') : v, hedef);
    return { '=': k === 0, '<>': k !== 0, '<': k < 0, '>': k > 0, '<=': k <= 0, '>=': k >= 0 }[op];
  };
}

// ---------- Değerlendirme ----------
export function degerlendir(d, oku) {
  switch (d.t) {
    case 'sayi': case 'metin': case 'mantik': return d.v;
    case 'bilinmeyen': return H.AD;
    case 'hucre': return oku(d.c, d.r);
    case 'aralik': return H.DEGER;                           // aralık tek başına değer değildir
    case 'yuzde': { const a = sayiya(degerlendir(d.a, oku)); return hataMi(a) ? a : a / 100; }
    case 'tekli': { const a = sayiya(degerlendir(d.a, oku)); return hataMi(a) ? a : -a; }
    case 'ikili': {
      const va = degerlendir(d.a, oku); if (hataMi(va)) return va;
      const vb = degerlendir(d.b, oku); if (hataMi(vb)) return vb;
      if (d.op === '&') return metne(va) + metne(vb);
      if (['=', '<>', '<', '>', '<=', '>='].includes(d.op)) {
        const k = kiyasla(va, vb);
        return { '=': k === 0, '<>': k !== 0, '<': k < 0, '>': k > 0, '<=': k <= 0, '>=': k >= 0 }[d.op];
      }
      const a = sayiya(va); if (hataMi(a)) return a;
      const b = sayiya(vb); if (hataMi(b)) return b;
      let s;
      if (d.op === '+') s = a + b; else if (d.op === '-') s = a - b; else if (d.op === '*') s = a * b;
      else if (d.op === '/') { if (b === 0) return H.BOL0; s = a / b; }
      else if (d.op === '^') { if (a === 0 && b < 0) return H.BOL0; s = a ** b; }
      return Number.isFinite(s) ? s : H.SAYI;
    }
    case 'fonk': return fonksiyon(d, oku);
  }
  return H.SOZ;
}

// Bağımsız değişkenlerdeki değerleri düzleştir. Aralıklardaki metin ve boşlar sayılmaz (Excel'deki gibi).
function duzlestir(args, oku) {
  const sayilar = [];
  for (const a of args) {
    if (a.t === 'aralik') {
      for (let r = a.r1; r <= a.r2; r++) for (let c = a.c1; c <= a.c2; c++) {
        const v = oku(c, r);
        if (hataMi(v)) return v;
        if (typeof v === 'number') sayilar.push(v);
      }
    } else {
      const v = degerlendir(a, oku);
      if (hataMi(v)) return v;
      if (v === null) continue;
      const n = sayiya(v);
      if (hataMi(n)) return n;
      sayilar.push(n);
    }
  }
  return sayilar;
}
function arallikDegerleri(a, oku) {
  const d = [];
  if (a.t === 'aralik') { for (let r = a.r1; r <= a.r2; r++) for (let c = a.c1; c <= a.c2; c++) d.push(oku(c, r)); }
  else d.push(degerlendir(a, oku));
  return d;
}
function yuvarla(x, n) {
  const k = 10 ** n;
  const y = Math.round(Math.abs(x) * k + 1e-9 * Math.max(1, Math.abs(x) * k)) / k;    // yarımları sıfırdan uzağa
  return Math.sign(x) * y;
}

export const FONKSIYONLAR = ['TOPLA', 'ORTALAMA', 'MİN', 'MAK', 'SAY', 'EĞER', 'EĞERSAY', 'ETOPLA', 'VE', 'YADA', 'DEĞİL', 'YUVARLA', 'MUTLAK', 'KAREKÖK', 'BİRLEŞTİR', 'UZUNLUK'];

function fonksiyon(d, oku) {
  const A = d.args;
  const deg = i => (A[i] ? degerlendir(A[i], oku) : null);
  const say = () => duzlestir(A, oku);
  switch (d.ad) {
    case 'TOPLA': { const s = say(); return hataMi(s) ? s : s.reduce((x, y) => x + y, 0); }
    case 'ORTALAMA': { const s = say(); if (hataMi(s)) return s; return s.length ? s.reduce((x, y) => x + y, 0) / s.length : H.BOL0; }
    case 'MİN': { const s = say(); if (hataMi(s)) return s; return s.length ? Math.min(...s) : 0; }
    case 'MAK': { const s = say(); if (hataMi(s)) return s; return s.length ? Math.max(...s) : 0; }
    case 'SAY': { let n = 0; for (const a of A) for (const v of arallikDegerleri(a, oku)) if (typeof v === 'number') n++; return n; }
    case 'EĞER': {
      if (A.length < 2 || A.length > 3) return H.DEGER;
      const k = mantiga(deg(0)); if (hataMi(k)) return k;
      return k ? deg(1) : A.length === 3 ? deg(2) : false;
    }
    case 'EĞERSAY': {
      if (A.length !== 2) return H.DEGER;
      const o = olcut(deg(1)); let n = 0;
      for (const v of arallikDegerleri(A[0], oku)) if (o(v)) n++;
      return n;
    }
    case 'ETOPLA': {
      if (A.length < 2 || A.length > 3) return H.DEGER;
      const o = olcut(deg(1)), kosul = arallikDegerleri(A[0], oku), top = A[2] ? arallikDegerleri(A[2], oku) : kosul;
      if (top.length !== kosul.length) return H.DEGER;
      let s = 0;
      for (let i = 0; i < kosul.length; i++) if (o(kosul[i])) { if (hataMi(top[i])) return top[i]; if (typeof top[i] === 'number') s += top[i]; }
      return s;
    }
    case 'VE': case 'YADA': {
      if (!A.length) return H.DEGER;
      let sonuc = d.ad === 'VE';
      for (const a of A) for (const v of arallikDegerleri(a, oku)) {
        if (a.t === 'aralik' && (v === null || typeof v === 'string')) continue;
        const m = mantiga(v); if (hataMi(m)) return m;
        sonuc = d.ad === 'VE' ? sonuc && m : sonuc || m;
      }
      return sonuc;
    }
    case 'DEĞİL': { if (A.length !== 1) return H.DEGER; const m = mantiga(deg(0)); return hataMi(m) ? m : !m; }
    case 'YUVARLA': {
      if (A.length < 1 || A.length > 2) return H.DEGER;
      const x = sayiya(deg(0)); if (hataMi(x)) return x;
      const n = A[1] ? sayiya(deg(1)) : 0; if (hataMi(n)) return n;
      return yuvarla(x, Math.trunc(n));
    }
    case 'MUTLAK': { if (A.length !== 1) return H.DEGER; const x = sayiya(deg(0)); return hataMi(x) ? x : Math.abs(x); }
    case 'KAREKÖK': { if (A.length !== 1) return H.DEGER; const x = sayiya(deg(0)); if (hataMi(x)) return x; return x < 0 ? H.SAYI : Math.sqrt(x); }
    case 'BİRLEŞTİR': { let s = ''; for (const a of A) for (const v of arallikDegerleri(a, oku)) { if (hataMi(v)) return v; s += metne(v); } return s; }
    case 'UZUNLUK': { if (A.length !== 1) return H.DEGER; const v = deg(0); return hataMi(v) ? v : [...metne(v)].length; }
  }
  return H.AD;
}

// ---------- Bütün tablo ----------
// hucreler: { "A1": "Gider", "B2": "15000", "D2": "=B2-C2", ... }
// Dönüş: { degerler: Map(adres -> değer), oncul: Map(adres -> Set), ardil: Map(adres -> Set), dongu: Set }
export function tabloHesapla(hucreler) {
  const formuller = new Map(), degerler = new Map(), oncul = new Map(), ardil = new Map();
  for (const [adres, ham] of Object.entries(hucreler)) {
    if (!adresOku(adres)) continue;
    const s = String(ham ?? '');
    if (s.startsWith('=') && s.length > 1) {
      let agac = null, hata = null;
      try { agac = ayristir(s.slice(1)); } catch (e) { hata = e instanceof Hata ? e : H.SOZ; }
      formuller.set(adres, { agac, hata });
      const ref = agac ? referanslar(agac).map(([c, r]) => adresYaz(c, r)) : [];
      oncul.set(adres, new Set(ref));
      for (const r of ref) { if (!ardil.has(r)) ardil.set(r, new Set()); ardil.get(r).add(adres); }
    } else {
      degerler.set(adres, hamDeger(s));
    }
  }

  // Tarjan'ın güçlü bağlı bileşenleri (özyinelemesiz): döngüleri bulur ve
  // bileşenleri "önce bağımlı olunanlar" sırasıyla verir.
  const sira = [], dongu = new Set();
  let sayac = 0;
  const no = new Map(), dusuk = new Map(), yigin = [], yigindami = new Set();
  for (const bas of formuller.keys()) {
    if (no.has(bas)) continue;
    const is = [[bas, [...oncul.get(bas)].filter(x => formuller.has(x)), 0]];
    no.set(bas, sayac); dusuk.set(bas, sayac); sayac++; yigin.push(bas); yigindami.add(bas);
    while (is.length) {
      const ust = is[is.length - 1];
      const [v, komsu] = ust;
      if (ust[2] < komsu.length) {
        const w = komsu[ust[2]++];
        if (!no.has(w)) {
          no.set(w, sayac); dusuk.set(w, sayac); sayac++; yigin.push(w); yigindami.add(w);
          is.push([w, [...oncul.get(w)].filter(x => formuller.has(x)), 0]);
        } else if (yigindami.has(w)) dusuk.set(v, Math.min(dusuk.get(v), no.get(w)));
      } else {
        is.pop();
        if (is.length) { const p = is[is.length - 1][0]; dusuk.set(p, Math.min(dusuk.get(p), dusuk.get(v))); }
        if (dusuk.get(v) === no.get(v)) {
          const bilesen = [];
          let w;
          do { w = yigin.pop(); yigindami.delete(w); bilesen.push(w); } while (w !== v);
          if (bilesen.length > 1 || oncul.get(v).has(v)) bilesen.forEach(x => dongu.add(x));
          sira.push(...bilesen);
        }
      }
    }
  }

  const oku = (c, r) => { const a = adresYaz(c, r); return degerler.has(a) ? degerler.get(a) : null; };
  for (const adres of sira) {
    const f = formuller.get(adres);
    let v;
    if (dongu.has(adres)) v = H.DONGU;
    else if (f.hata) v = f.hata;
    else { try { v = degerlendir(f.agac, oku); } catch (e) { v = e instanceof Hata ? e : H.DEGER; } }
    if (v === null) v = 0;                                  // boş hücreye bakan formül 0 gösterir
    degerler.set(adres, v);
  }
  return { degerler, oncul, ardil, dongu, sira };
}

// ---------- CSV (değerler) ----------
export function csvYaz(hucreler, sonuc, sutun, satir) {
  const satirlar = [];
  for (let r = 0; r < satir; r++) {
    const s = [];
    for (let c = 0; c < sutun; c++) {
      const a = adresYaz(c, r);
      const v = degerYaz(sonuc.degerler.get(a) ?? null);
      s.push(/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    }
    satirlar.push(s.join(';'));
  }
  while (satirlar.length && /^;*$/.test(satirlar[satirlar.length - 1])) satirlar.pop();
  return satirlar.join('\n');
}

// --- Uydurma örnek: bir aylık ev bütçesi ---
export const ORNEK = {
  A1: 'Gider', B1: 'Bütçe', C1: 'Harcanan', D1: 'Kalan', E1: 'Durum',
  A2: 'Kira', B2: '15000', C2: '15000',
  A3: 'Market', B3: '6000', C3: '6840,50',
  A4: 'Faturalar', B4: '2500', C4: '2310',
  A5: 'Ulaşım', B5: '1800', C5: '1650',
  A6: 'Dışarıda yemek', B6: '1500', C6: '2200',
  A7: 'Kitap', B7: '500', C7: '420',
  A9: 'Toplam', B9: '=TOPLA(B2:B7)', C9: '=TOPLA(C2:C7)', D9: '=B9-C9',
  A10: 'Harcanan / bütçe', C10: '=YUVARLA(C9/B9*100;1)&" %"',
  A11: 'Bütçeyi aşan kalem', C11: '=EĞERSAY(E2:E7;"aştı")',
  A12: 'Aşan kısım toplamı', C12: '=-ETOPLA(D2:D7;"<0")',
  A13: 'En büyük harcama', C13: '=MAK(C2:C7)',
};
for (let r = 2; r <= 7; r++) { ORNEK[`D${r}`] = `=B${r}-C${r}`; ORNEK[`E${r}`] = `=EĞER(C${r}>B${r};"aştı";"tamam")`; }

export function yedekAl(v) { return JSON.stringify({ tur: 'kucuk-tablo', surum: 1, hucreler: v }, null, 2); }
export function yedekOku(metin) {
  const d = JSON.parse(metin);
  if (d?.tur !== 'kucuk-tablo' || typeof d.hucreler !== 'object' || !d.hucreler) throw new Error('Bu dosya bir Küçük Tablo yedeği değil.');
  const temiz = {};
  for (const [a, v] of Object.entries(d.hucreler)) {
    const ad = adresOku(a);
    if (!ad || ad.c >= 26 || ad.r >= 200) continue;
    if (typeof v === 'string' && v !== '') temiz[adresYaz(ad.c, ad.r)] = v.slice(0, 1000);
  }
  return temiz;
}
