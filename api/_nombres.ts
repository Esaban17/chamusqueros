// Apodos de Retos en línea y filtro básico de ofensivos (RF-27, A03). Sin red ni DOM; el prefijo "_" hace que Vercel no lo publique como ruta.
// Lo usan api/perfil.ts (apodos) y api/ranking.ts (nombre de la carrera, solo `esOfensivo`).

export type ResultadoApodo = { ok: true; apodo: string } | { ok: false; motivo: string };

// ponytail: lista mínima, la revisa el usuario (Aclaración 5 de specs/retos-en-linea/spec.md). Son raíces ya normalizadas (minúsculas, sin tildes,
// sin letras repetidas). `PREFIJOS` bloquea cualquier palabra que EMPIECE así; `EXACTAS` solo la palabra completa (con "s" o "es" al final),
// para no tumbar nombres legítimos (Vergara, Maricarmen, Pijamas, Culotte). Se compara palabra por palabra: "Computadora" y "Disputa" pasan.
// Falsos negativos a propósito: la ofensa en medio de una palabra pegada ("elputo") y las variantes raras. Ampliarla no toca la lógica.
export const PREFIJOS = [
  'puta', 'puto', 'hijueput', 'hijoput', 'hijodeput', 'pendej', 'cabron', 'mierd', 'culer', 'chinga', 'malparid', 'gonorre', 'idiot',
  'imbecil', 'estupid', 'gilipoll', 'punet', 'cagon', 'fuck', 'shit', 'bitch', 'asshole', 'cunt',
];
export const EXACTAS = ['verga', 'vergon', 'pija', 'marica', 'maricon', 'zorra', 'joto', 'culo', 'hdp', 'ptm', 'dick', 'faggot', 'nigger', 'nigga'];

/** Letras repetidas colapsadas: "puuuta" y "asshole" quedan "puta" y "asole". Se aplica igual a la entrada y a la lista. */
const colapsar = (s: string) => s.replace(/(\p{L})\1+/gu, '$1');
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's' };
const PRE = PREFIJOS.map(colapsar);
const EXA = new Set(EXACTAS.map(colapsar));

/** true si alguna palabra del texto empieza con una raíz de PREFIJOS o es una de EXACTAS. La comparación pasa el texto a minúsculas, sin tildes,
 *  con dígitos y símbolos por letras (0→o 1→i 3→e 4→a 5→s 7→t @→a $→s), sin ' . - dentro de la palabra, letras repetidas colapsadas y las
 *  letras sueltas seguidas ("p u t a") unidas en una palabra. */
export function esOfensivo(texto: string): boolean {
  const s = texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c]).replace(/['’.\-]/g, '').replace(/[^\p{L}]+/gu, ' ');
  const palabras: string[] = [];
  let sueltas = '';
  const cierra = () => { if (sueltas.length > 1) palabras.push(sueltas); sueltas = ''; };
  for (const w of s.split(' ')) {
    if ([...w].length === 1) { sueltas += w; continue; }
    cierra();
    if (w) palabras.push(w);
  }
  cierra();
  return palabras.map(colapsar).some((w) => PRE.some((r) => w.startsWith(r)) || EXA.has(w) || EXA.has(w.replace(/e?s$/, '')));
}

const DATOS_PERSONALES = /@|https?|www|\.(com|net|org|gt|mx|es)\b/i;

export function validarApodo(entrada: unknown): ResultadoApodo {
  if (typeof entrada !== 'string') return { ok: false, motivo: 'El apodo debe ser un texto.' };
  const apodo = entrada.normalize('NFC').replace(/\s+/g, ' ').trim();
  const largo = [...apodo].length;
  if (largo < 2 || largo > 20) return { ok: false, motivo: 'El apodo debe tener entre 2 y 20 caracteres.' };
  if (DATOS_PERSONALES.test(apodo) || (apodo.match(/\p{N}/gu)?.length ?? 0) >= 7) {
    return { ok: false, motivo: 'No pongas correos, enlaces ni números de teléfono en el apodo.' };
  }
  if (!/^[\p{L}\p{N} '.\-]+$/u.test(apodo)) return { ok: false, motivo: 'Usá solo letras, números, espacios, apóstrofo, guion y punto.' };
  if ((apodo.match(/\p{L}/gu)?.length ?? 0) < 2) return { ok: false, motivo: 'El apodo necesita al menos 2 letras.' };
  if (esOfensivo(apodo)) return { ok: false, motivo: 'Elegí otro apodo: ese no está permitido.' };
  return { ok: true, apodo };
}
