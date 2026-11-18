import assert from 'node:assert/strict';
import { Hata, H, sutunAdi, sutunNo, adresOku, adresYaz, belirtecler, ayristir, degerlendir, hamDeger, degerYaz, sayiYaz, tabloHesapla, csvYaz, ORNEK, yedekAl, yedekOku } from './core.mjs';

let checks = 0;
const ok = fn => { fn(); checks++; };
// Tek hücrelik hesap: hucreler + bakılan adres
const h = (hucreler, adres = 'Z1') => tabloHesapla(hucreler).degerler.get(adres);
const f = (formul, hucreler = {}) => h({ ...hucreler, Z1: '=' + formul });
const yaz = (formul, hucreler) => degerYaz(f(formul, hucreler));

// 1. Adresler
ok(() => assert.equal(sutunAdi(0), 'A')); ok(() => assert.equal(sutunAdi(25), 'Z')); ok(() => assert.equal(sutunAdi(26), 'AA')); ok(() => assert.equal(sutunAdi(701), 'ZZ'));
ok(() => { for (let c = 0; c < 2000; c++) assert.equal(sutunNo(sutunAdi(c)), c); });
ok(() => assert.deepEqual(adresOku('b12'), { c: 1, r: 11 }));
ok(() => assert.equal(adresOku('A0'), null)); ok(() => assert.equal(adresOku('12'), null));
ok(() => assert.equal(adresYaz(8, 2), 'I3'));
// Küçük "i" sütun harfi Türkçe büyük harfe çevrilip "İ" olmamalı
ok(() => assert.equal(f('i3*2', { I3: '4' }), 8));

// 2. Aritmetik ve öncelik (Excel kuralları)
ok(() => assert.equal(f('1+2*3'), 7));
ok(() => assert.equal(f('(1+2)*3'), 9));
ok(() => assert.equal(f('-2^2'), 4));          // tekli eksi üsten önce
ok(() => assert.equal(f('2^3^2'), 64));        // ^ soldan sağa
ok(() => assert.equal(f('10-4-3'), 3));
ok(() => assert.equal(f('50%'), 0.5));
ok(() => assert.equal(f('1,5+1.5'), 3));       // virgül de nokta da ondalık
ok(() => assert.equal(yaz('0,1+0,2'), '0,3'));
ok(() => assert.equal(f('"a"&1&DOĞRU'), 'a1DOĞRU'));
ok(() => assert.equal(f('1<2'), true)); ok(() => assert.equal(f('"elma"="ELMA"'), true)); ok(() => assert.equal(f('2<>2'), false));
ok(() => assert.equal(f('1<"a"'), true));      // sayı metinden küçük sayılır
ok(() => assert.equal(f('"5"+1'), 6));         // sayı gibi görünen metin sayıya döner

// Rastgele ifadeler: JavaScript'in hesabıyla aynı mı?
let tohum = 9; const rnd = () => (tohum = (tohum * 48271) % 2147483647) / 2147483647;
function ifade(derinlik) {
  if (derinlik <= 0 || rnd() < 0.3) { const n = Math.floor(rnd() * 20) + 1; return [String(n), String(n)]; }
  const op = ['+', '-', '*', '/'][Math.floor(rnd() * 4)];
  const [a1, a2] = ifade(derinlik - 1), [b1, b2] = ifade(derinlik - 1);
  if (rnd() < 0.4) return [`(${a1}${op}${b1})`, `(${a2}${op}${b2})`];
  return [`${a1}${op}${b1}`, `${a2}${op}${b2}`];
}
let hepAyni = true;
for (let t = 0; t < 1000; t++) {
  const [biz, js] = ifade(4);
  const beklenen = Function(`return ${js}`)();
  const sonuc = f(biz);
  if (Number.isFinite(beklenen) ? Math.abs(sonuc - beklenen) > 1e-9 * Math.max(1, Math.abs(beklenen)) : !(sonuc instanceof Hata)) { hepAyni = false; console.log(biz, sonuc, beklenen); break; }
}
ok(() => assert.ok(hepAyni));

// 3. Fonksiyonlar
const v = { A1: '3', A2: '4', A3: 'metin', A4: '', A5: '5', B1: 'DOĞRU' };
ok(() => assert.equal(f('TOPLA(A1:A5)', v), 12));        // aralıktaki metin sayılmaz
ok(() => assert.equal(f('topla(A1;A2;10)', v), 17));     // küçük harf de olur
ok(() => assert.equal(f('ORTALAMA(A1:A5)', v), 4));
ok(() => assert.equal(f('ORTALAMA(A3:A4)', v), H.BOL0));
ok(() => assert.equal(f('MİN(A1:A5)', v), 3)); ok(() => assert.equal(f('mak(A1:A5)', v), 5));
ok(() => assert.equal(f('SAY(A1:A5)', v), 3));
ok(() => assert.equal(f('EĞER(A1>2;"büyük";"küçük")', v), 'büyük'));
ok(() => assert.equal(f('EĞER(A1>9;"büyük")', v), false));
ok(() => assert.equal(f('EĞER(DOĞRU;1;1/0)'), 1));       // seçilmeyen dal hesaplanmaz
ok(() => assert.equal(f('EĞERSAY(A1:A5;">3")', v), 2));
ok(() => assert.equal(f('EĞERSAY(A1:A5;"metin")', v), 1));
ok(() => assert.equal(f('EĞERSAY(A1:A5;"<>3")', v), 4));
ok(() => assert.equal(f('ETOPLA(A1:A5;">=4")', v), 9));
ok(() => assert.equal(f('VE(A1>1;A2>1)', v), true)); ok(() => assert.equal(f('YADA(A1>5;B1)', v), true)); ok(() => assert.equal(f('DEĞİL(B1)', v), false));
ok(() => assert.equal(f('YUVARLA(2,5)'), 3)); ok(() => assert.equal(f('YUVARLA(-2,5)'), -3)); ok(() => assert.equal(f('YUVARLA(1,005;2)'), 1.01));
ok(() => assert.equal(f('YUVARLA(1234;-2)'), 1200));
ok(() => assert.equal(f('MUTLAK(-7)'), 7)); ok(() => assert.equal(f('KAREKÖK(16)'), 4)); ok(() => assert.equal(f('KAREKÖK(-1)'), H.SAYI));
ok(() => assert.equal(f('BİRLEŞTİR(A1:A2;"-";B1)', v), '34-DOĞRU'));
ok(() => assert.equal(f('UZUNLUK("ğüşİ")'), 4));

// 4. Hatalar
ok(() => assert.equal(f('1/0'), H.BOL0));
ok(() => assert.equal(f('YOKBÖYLE(1)'), H.AD));
ok(() => assert.equal(f('kelime+1'), H.AD));
ok(() => assert.equal(f('"a"*2'), H.DEGER));
ok(() => assert.equal(f('A1:A3+1', v), H.DEGER));
ok(() => assert.equal(f('(1+2'), H.SOZ)); ok(() => assert.equal(f('1+'), H.SOZ)); ok(() => assert.equal(f('"kapanmayan'), H.SOZ)); ok(() => assert.equal(f('1 # 2'), H.SOZ));
ok(() => assert.equal(f('A1+1', { A1: '=1/0' }), H.BOL0));           // hata yayılır
ok(() => assert.equal(f('TOPLA(A1:A2)', { A1: '=1/0', A2: '3' }), H.BOL0));
ok(() => assert.equal(f('EĞERSAY(A1:A2;">0")', { A1: '=1/0', A2: '3' }), 1));   // EĞERSAY hatalı hücreyi saymaz

// 5. Tablo: sıra, döngü, bağımlılık
ok(() => assert.equal(h({ A1: '=A2+1', A2: '=A3*2', A3: '5' }, 'A1'), 11));     // yazılış sırasından bağımsız
const d = tabloHesapla({ A1: '=B1', B1: '=C1', C1: '=A1', D1: '=A1+1', E1: '=E1', F1: '7' });
ok(() => assert.deepEqual([...d.dongu].sort(), ['A1', 'B1', 'C1', 'E1']));
ok(() => assert.equal(d.degerler.get('A1'), H.DONGU));
ok(() => assert.equal(d.degerler.get('D1'), H.DONGU));        // döngüye bakan da hatalı
ok(() => assert.equal(d.degerler.get('F1'), 7));
ok(() => assert.deepEqual([...d.ardil.get('A1')].sort(), ['C1', 'D1']));
ok(() => assert.deepEqual([...d.oncul.get('D1')], ['A1']));
// Uzun zincir: 2000 hücre birbirine bağlı, yığın taşmadan hesaplanıyor
const zincir = { A1: '1' };
for (let r = 2; r <= 2000; r++) zincir[`A${r}`] = `=A${r - 1}+1`;
ok(() => assert.equal(h(zincir, 'A2000'), 2000));
// Boş hücreye bakan formül 0
ok(() => assert.equal(h({ A1: '=B7' }, 'A1'), 0));
ok(() => assert.equal(h({ A1: '=B7&"x"' }, 'A1'), 'x'));

// 6. Düz içerik
ok(() => assert.equal(hamDeger('12,5'), 12.5)); ok(() => assert.equal(hamDeger('1.250,50'), 1250.5));
ok(() => assert.equal(hamDeger('%15'), 0.15)); ok(() => assert.equal(hamDeger('15%'), 0.15));
ok(() => assert.equal(hamDeger('doğru'), true)); ok(() => assert.equal(hamDeger('Kira'), 'Kira')); ok(() => assert.equal(hamDeger(''), null));
ok(() => assert.equal(sayiYaz(1 / 3), '0,3333333333')); ok(() => assert.equal(sayiYaz(-1120.5), '-1120,5'));

// 7. Örnek bütçe
const o = tabloHesapla(ORNEK);
ok(() => assert.equal(o.degerler.get('B9'), 27300));
ok(() => assert.ok(Math.abs(o.degerler.get('C9') - 28420.5) < 1e-9));
ok(() => assert.equal(o.degerler.get('E3'), 'aştı')); ok(() => assert.equal(o.degerler.get('E4'), 'tamam'));
ok(() => assert.equal(o.degerler.get('C11'), 2));
ok(() => assert.ok(Math.abs(o.degerler.get('C12') - 1540.5) < 1e-9));
ok(() => assert.equal(o.degerler.get('C10'), '104,1 %'));
ok(() => assert.equal(o.dongu.size, 0));

// 8. CSV ve yedek
ok(() => assert.equal(csvYaz({}, tabloHesapla({ A1: 'a;b', B1: '1,5', A2: 'x"y' }), 3, 3), '"a;b";1,5;\n"x""y";;'));
ok(() => assert.deepEqual(yedekOku(yedekAl(ORNEK)), ORNEK));
ok(() => assert.throws(() => yedekOku('{"tur":"x"}')));
ok(() => assert.deepEqual(yedekOku(JSON.stringify({ tur: 'kucuk-tablo', hucreler: { a1: 'x', ZZ9: 'y', B2: 5, C3: '' } })), { A1: 'x' }));
ok(() => assert.ok(belirtecler('A1+1').length === 3));
ok(() => assert.equal(degerlendir(ayristir('2*3'), () => null), 6));

console.log(`${checks} kontrol geçti.`);
