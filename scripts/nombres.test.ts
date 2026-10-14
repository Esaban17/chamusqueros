// Prueba de api/_nombres.ts (RF-27, CA-13, A03): largo, alfabeto, datos personales y el filtro de ofensivos. Sin red:
//   npx tsx scripts/nombres.test.ts
import assert from 'node:assert/strict';
import { EXACTAS, PREFIJOS, esOfensivo, validarApodo } from '../api/_nombres';

const ok = (s: string) => { const r = validarApodo(s); assert.ok(r.ok, `${JSON.stringify(s)} debía aceptarse: ${r.ok ? '' : r.motivo}`); return r.ok ? r.apodo : ''; };
const no = (s: unknown) => { const r = validarApodo(s); assert.ok(!r.ok, `${JSON.stringify(s)} debía rechazarse`); assert.ok(!r.ok && r.motivo.length > 10, 'el motivo es una frase'); };

// Válidos, con recorte y colapso de espacios.
assert.equal(ok('Chamusquero'), 'Chamusquero');
assert.equal(ok('  Ana   Lucía  '), 'Ana Lucía');
assert.equal(ok("J. O'Brien-Pérez"), "J. O'Brien-Pérez");
assert.equal(ok('Ñoño 10'), 'Ñoño 10');
assert.equal(ok('ab'), 'ab');
assert.equal(ok('x'.repeat(20)), 'x'.repeat(20));

// Rechazados de CA-13.
no('a');
no('');
no('   ');
no('<img src=x onerror=alert(1)>');
no('juan@correo.com');
no('5551234567');
no('Jugador1234567');           // 7 dígitos en total
no('x'.repeat(21));
no('!!!???');
no('12 34');                    // sin 2 letras
no('a 1');
no('http://sitio.xyz');
no('www.sitio.gt');
no('mi.correo.com');
no("Robert'); DROP TABLE retos_jugadores;--");
no('Juan​Pérez');          // carácter invisible
no('Hola\nMundo'.replace('\n', '\u0001'));
for (const raro of [null, undefined, 12, {}, ['ab'], true]) no(raro);

// Ofensivos: con tildes, mayúsculas, dígitos por letras, repeticiones, separadores y letras sueltas.
for (const o of ['pendejo', 'PENDEJO', 'Pendéjo', 'p3nd3j0', 'pendeeejo', 'p.e.n.d.e.j.o', 'p e n d e j o', 'hijueputa', 'Hijo de Puta', 'hij0 d3 put4', 'HIJODEPUTA',
  'cabrón', 'C4BR0N', 'mierda', 'Mi3rd4', 'cuuulero', 'chingadera', 'malparido', 'Gonorrea', 'idiota', 'imbécil', 'estúpido', 'gilipollas',
  'puñeta', 'cagón', 'fuck', 'FUCK', 'sh1t', 'bitch', 'asshole', 'a$$hole', 'cunt', 'verga', 'Vergas', 'pij4', 'Marica', 'maricón', 'zorra',
  'joto', 'culo', 'Culos', 'hdp', 'PTM', 'dick', 'faggot', 'nigger', 'n1gga', 'Juan Pendejo', 'el putas', 'xX_puto_Xx']) {
  assert.ok(esOfensivo(o), `${o} debía ser ofensivo`);
  if (/^[\p{L}\p{N} '.\-]+$/u.test(o) && [...o].length <= 20) no(o);
}
// Falso positivo conocido y aceptado: "Niger" cae junto con "nigger" porque las letras repetidas se colapsan (se revisa con la lista).
assert.ok(esOfensivo('Niger'));
// Falsos positivos que NO deben ocurrir: nombres y palabras comunes que contienen una raíz en medio o la empiezan sin serlo.
for (const bueno of ['Computadora', 'Disputa', 'Oculto', 'Vergara', 'Maricarmen', 'Pijama', 'Culotte', 'Dickens', 'Nigel', 'Zorro', 'Chinchilla',
  'Mercedes', 'Puerto', 'Putin', 'Cagliari', 'Idioma', 'Estupa', 'Messi', 'Chicharito', 'Ronaldo 7', 'Lionel Messi', 'Carlos Ruiz']) {
  assert.ok(!esOfensivo(bueno), `${bueno} no debía ser ofensivo`);
  assert.ok(validarApodo(bueno).ok || bueno.length > 20, `${bueno} debía aceptarse`);
}

// La lista es corta y está normalizada: cada raíz es minúscula, sin tildes ni dígitos.
assert.ok(PREFIJOS.length + EXACTAS.length <= 40, 'lista mínima');
for (const r of [...PREFIJOS, ...EXACTAS]) assert.match(r, /^[a-z]{3,}$/, `raíz mal formada: ${r}`);

// El ranking de carreras llama a esOfensivo con cualquier texto (hasta 40 caracteres, sin el alfabeto de apodos).
assert.ok(!esOfensivo('Anónimo'));
assert.ok(!esOfensivo('日本語の名前'));
assert.ok(esOfensivo('Eres un pendejo, de verdad'));
console.log(`nombres: ${PREFIJOS.length + EXACTAS.length} raíces; rechazos de CA-13 (largo, alfabeto, datos personales, ofensivos con tildes, mayúsculas y dígitos) y falsos positivos comunes aceptados.`);
