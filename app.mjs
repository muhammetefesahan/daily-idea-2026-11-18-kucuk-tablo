import { tabloHesapla, degerYaz, adresYaz, adresOku, sutunAdi, csvYaz, Hata, ORNEK, yedekAl, yedekOku } from './core.mjs';

const $ = id => document.getElementById(id);
const SUTUN = 12, SATIR = 40;
const ANAHTAR = 'kucuk-tablo-v1';
let hucreler = { ...ORNEK };
let sonuc = tabloHesapla(hucreler);
let secili = { c: 0, r: 0 };
let duzenlenen = null;          // { c, r, input }

function kaydet() { try { localStorage.setItem(ANAHTAR, yedekAl(hucreler)); } catch { /* özel pencere */ } }
function yukle() { try { const m = localStorage.getItem(ANAHTAR); if (m) hucreler = yedekOku(m); } catch { /* bozuk */ } }
const kacama = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Tabloyu kur ----------
function iskelet() {
  const t = $('tablo');
  let html = '<thead><tr><th class="satirno"></th>';
  for (let c = 0; c < SUTUN; c++) html += `<th data-c="${c}">${sutunAdi(c)}</th>`;
  html += '</tr></thead><tbody>';
  for (let r = 0; r < SATIR; r++) {
    html += `<tr><td class="satirno">${r + 1}</td>`;
    for (let c = 0; c < SUTUN; c++) html += `<td data-c="${c}" data-r="${r}"></td>`;
    html += '</tr>';
  }
  t.innerHTML = html + '</tbody>';
}
const hucreEl = (c, r) => $('tablo').tBodies[0].rows[r].cells[c + 1];

function ciz() {
  for (let r = 0; r < SATIR; r++) for (let c = 0; c < SUTUN; c++) {
    const td = hucreEl(c, r), a = adresYaz(c, r);
    if (duzenlenen && duzenlenen.c === c && duzenlenen.r === r) continue;
    const v = sonuc.degerler.has(a) ? sonuc.degerler.get(a) : null;
    td.textContent = degerYaz(v);
    td.className = (v instanceof Hata ? 'hata' : typeof v === 'number' ? 'sayi' : typeof v === 'boolean' ? 'mantik' : '') + (String(hucreler[a] ?? '').startsWith('=') ? ' formul' : '');
    td.title = v instanceof Hata ? hataAciklama(v) : '';
  }
  vurgula();
}

function hataAciklama(h) {
  return {
    '#BÖL/0!': 'Sıfıra bölme var.', '#AD?': 'Bilmediğim bir fonksiyon ya da ad var.', '#DEĞER!': 'Yanlış türde bir değer var (örneğin metinle çarpma).',
    '#SAYI!': 'Sayı tanımsız ya da çok büyük (örneğin eksi sayının karekökü).', '#SÖZDİZİMİ!': 'Formül yazımında hata var (parantez, tırnak ya da işaret).',
    '#DÖNGÜ!': 'Hücreler birbirine döngüyle bağlı; hiçbiri hesaplanamıyor.', '#BAŞV!': 'Geçersiz hücre adresi.',
  }[h.kod] || '';
}

function vurgula() {
  const a = adresYaz(secili.c, secili.r);
  const once = sonuc.oncul.get(a) || new Set(), sonra = sonuc.ardil.get(a) || new Set();
  for (let r = 0; r < SATIR; r++) for (let c = 0; c < SUTUN; c++) {
    const td = hucreEl(c, r), b = adresYaz(c, r);
    td.classList.toggle('secili', c === secili.c && r === secili.r);
    td.classList.toggle('oncul', once.has(b));
    td.classList.toggle('ardil', sonra.has(b));
  }
  document.querySelectorAll('.tablo th[data-c]').forEach(th => th.classList.toggle('vurgu', +th.dataset.c === secili.c));
  $('seciliAdres').textContent = a;
  if (document.activeElement !== $('formulGiris')) $('formulGiris').value = hucreler[a] ?? '';
  bilgi(a, once, sonra);
}

function bilgi(a, once, sonra) {
  const ham = hucreler[a] ?? '';
  const v = sonuc.degerler.has(a) ? sonuc.degerler.get(a) : null;
  const tur = v === null ? 'boş' : v instanceof Hata ? 'hata' : typeof v === 'number' ? 'sayı' : typeof v === 'boolean' ? 'mantık' : 'metin';
  const etiketler = (kume, sinif) => kume.size
    ? `<div class="etiketler">${[...kume].slice(0, 40).map(x => `<button type="button" class="etiket ${sinif}" data-git="${x}">${x}</button>`).join('')}${kume.size > 40 ? `<span class="bos">+${kume.size - 40}</span>` : ''}</div>`
    : '<div class="bos">yok</div>';
  $('bilgi').innerHTML = `<h2>${a} hücresi</h2>
    <div class="bilgi-satir"><span>İçerik</span><b>${ham ? `<code>${kacama(ham)}</code>` : '–'}</b></div>
    <div class="bilgi-satir"><span>Değer</span><b>${kacama(degerYaz(v)) || '–'}</b></div>
    <div class="bilgi-satir"><span>Tür</span><b>${tur}${v instanceof Hata ? ` · ${hataAciklama(v)}` : ''}</b></div>
    <p class="not">🔵 Bu hücrenin baktığı hücreler</p>${etiketler(once, 'oncul')}
    <p class="not">🟡 Bu hücreye bakan hücreler</p>${etiketler(sonra, 'ardil')}
    ${sonuc.dongu.size ? `<p class="not" style="color:#ff8f86">⚠️ Döngü var: ${[...sonuc.dongu].slice(0, 12).join(', ')}</p>` : ''}`;
  $('bilgi').querySelectorAll('[data-git]').forEach(b => { b.onclick = () => { const p = adresOku(b.dataset.git); if (p && p.c < SUTUN && p.r < SATIR) sec(p.c, p.r); }; });
}

// ---------- Seçme ve düzenleme ----------
function sec(c, r) {
  secili = { c: Math.max(0, Math.min(SUTUN - 1, c)), r: Math.max(0, Math.min(SATIR - 1, r)) };
  vurgula();
  hucreEl(secili.c, secili.r).scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function yaz(c, r, deger) {
  const a = adresYaz(c, r);
  const d = String(deger);
  if (d === '') delete hucreler[a]; else hucreler[a] = d.slice(0, 1000);
  sonuc = tabloHesapla(hucreler);
  kaydet(); ciz();
}

function duzenlemeyiBaslat(ilkHarf) {
  bitir(true);
  const { c, r } = secili, td = hucreEl(c, r), a = adresYaz(c, r);
  const input = document.createElement('input');
  input.value = ilkHarf ?? (hucreler[a] ?? '');
  input.setAttribute('aria-label', `${a} hücresini düzenle`);
  input.spellcheck = false;
  td.textContent = ''; td.classList.add('duzenle'); td.append(input);
  duzenlenen = { c, r, input };
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  input.oninput = () => { $('formulGiris').value = input.value; };
  input.onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); bitir(true); sec(c, r + (e.shiftKey ? -1 : 1)); }
    else if (e.key === 'Tab') { e.preventDefault(); bitir(true); sec(c + (e.shiftKey ? -1 : 1), r); }
    else if (e.key === 'Escape') { e.preventDefault(); bitir(false); }
  };
  input.onblur = () => { if (duzenlenen && duzenlenen.input === input) bitir(true); };
}

function bitir(kaydedilsin) {
  if (!duzenlenen) return;
  const { c, r, input } = duzenlenen;
  duzenlenen = null;
  hucreEl(c, r).classList.remove('duzenle');
  if (kaydedilsin) yaz(c, r, input.value); else ciz();
  $('tabloKap').focus({ preventScroll: true });
}

$('tablo').addEventListener('mousedown', e => {
  const td = e.target.closest('td[data-c]');
  if (!td || td.classList.contains('duzenle')) return;
  bitir(true);
  sec(+td.dataset.c, +td.dataset.r);
});
$('tablo').addEventListener('dblclick', e => { if (e.target.closest('td[data-c]')) duzenlemeyiBaslat(); });

$('tabloKap').tabIndex = 0;
$('tabloKap').addEventListener('keydown', e => {
  if (duzenlenen) return;
  const { c, r } = secili;
  const yon = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
  if (yon) { e.preventDefault(); sec(c + yon[0], r + yon[1]); return; }
  if (e.key === 'Tab') { e.preventDefault(); sec(c + (e.shiftKey ? -1 : 1), r); return; }
  if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); duzenlemeyiBaslat(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); yaz(c, r, ''); return; }
  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); duzenlemeyiBaslat(e.key); }
});

// Formül çubuğu
$('formulGiris').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); yaz(secili.c, secili.r, $('formulGiris').value); $('formulGiris').blur(); sec(secili.c, secili.r + 1); $('tabloKap').focus({ preventScroll: true }); }
  else if (e.key === 'Escape') { $('formulGiris').value = hucreler[adresYaz(secili.c, secili.r)] ?? ''; $('formulGiris').blur(); $('tabloKap').focus({ preventScroll: true }); }
});
$('formulGiris').addEventListener('focus', () => bitir(true));

// ---------- İşlemler ----------
function indir(ad, icerik, tur) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([icerik], { type: tur }));
  a.download = ad; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('ornek').onclick = () => { hucreler = { ...ORNEK }; sonuc = tabloHesapla(hucreler); kaydet(); ciz(); $('islemYazi').textContent = 'Örnek yüklendi: uydurma bir aylık ev bütçesi.'; };
$('csvAl').onclick = () => indir('kucuk-tablo.csv', '﻿' + csvYaz(hucreler, sonuc, SUTUN, SATIR), 'text/csv');
$('yedekAl').onclick = () => indir('kucuk-tablo-yedek.json', yedekAl(hucreler), 'application/json');
$('yedekYukle').onchange = async ev => {
  const f = ev.target.files[0];
  if (!f) return;
  try { hucreler = yedekOku(await f.text()); sonuc = tabloHesapla(hucreler); kaydet(); ciz(); $('islemYazi').textContent = `Yedek yüklendi: ${Object.keys(hucreler).length} dolu hücre.`; }
  catch (err) { $('islemYazi').textContent = err instanceof SyntaxError ? 'Bu dosyayı okuyamadım.' : err.message; }
  ev.target.value = '';
};
$('temizle').onclick = () => {
  if (!confirm('Bütün hücreler silinsin mi?')) return;
  hucreler = {}; sonuc = tabloHesapla(hucreler); kaydet(); ciz();
  $('islemYazi').textContent = 'Tablo boşaltıldı.';
};

// ---------- Başlangıç ----------
if (!new URLSearchParams(location.search).has('ornek')) yukle();
sonuc = tabloHesapla(hucreler);
iskelet();
ciz();
const baslangic = new URLSearchParams(location.search).get('sec');
if (baslangic && adresOku(baslangic)) { const p = adresOku(baslangic); sec(p.c, p.r); } else sec(0, 0);
