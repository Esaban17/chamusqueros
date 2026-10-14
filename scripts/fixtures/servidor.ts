// Arnés de las pruebas del servidor de Retos en línea: Neon, Ably y Wikidata falsos detrás de `fetch`, reloj controlado y dispositivos con perfil.
// Sin red ni base de datos: ningún `fetch` sale de aquí (cualquier URL desconocida lanza). Lo usan sala.test.ts, ably.test.ts, perfil.test.ts y retos-ranking.test.ts.
import { createHash, randomBytes } from 'node:crypto';
import { reiniciarLimites } from '../../api/_limite';
import { neonFalso } from './neon-falso';

export const LLAVE_FALSA = 'abc123.def456:secreto-de-prueba_1';
export const T0 = 1_800_000_000_000;

export interface Dispositivo { id: string; token: string; apodo: string }
export interface LlamadaAbly { url: string; metodo: string; cuerpo: any; autorizacion: string | null; redirect: RequestRedirect | undefined }

let dispositivos = 0; // contador global: dos arneses en el mismo proceso no repiten identificadores

export function servidor(opciones: { ably?: boolean } = {}) {
  reiniciarLimites();
  process.env.DATABASE_URL = 'postgres://u:p@ep-prueba.neon.tech/db';
  if (opciones.ably === false) delete process.env.ABLY_API_KEY; else process.env.ABLY_API_KEY = LLAVE_FALSA;
  delete process.env.EN_LINEA_DEV;
  delete process.env.SITE_URL;

  const bd = neonFalso();
  const ably = { llamadas: [] as LlamadaAbly[], publicar: 'ok' as 'ok' | 'cae' | 'error500', token: 'ok' as 'ok' | 'error' | 'forma' };
  const wikidata = { llamadas: [] as string[], modo: 'normal' as 'normal' | 'cae', conocidos: new Map<string, { q: string; nombre: string }>() };
  /** Todo lo que sale a la red y no es Neon (A10). */
  const salientes: { url: string; init: RequestInit | undefined }[] = [];

  let ahora = T0;
  const dateNow = Date.now;
  Date.now = () => ahora;
  const reloj = {
    get ahora() { return ahora; },
    set(ms: number) { ahora = ms; },
    avanzar(ms: number) { ahora += ms; },
  };

  const json = (o: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json' }, ...init });
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    const n = await bd.manejar(url, init);
    if (n) return n;
    salientes.push({ url, init });
    if (url.startsWith('https://main.realtime.ably.net/')) {
      const cuerpo = init?.body ? JSON.parse(String(init.body)) : null;
      const h = new Headers(init?.headers);
      ably.llamadas.push({ url, metodo: init?.method ?? 'GET', cuerpo, autorizacion: h.get('authorization'), redirect: init?.redirect });
      if (url.includes('/channels/')) {
        if (ably.publicar === 'cae') throw new TypeError('fetch failed');
        if (ably.publicar === 'error500') return json({ error: { message: `detalle interno ${String(h.get('authorization'))}` } }, { status: 500 });
        return json({ channel: 'x', messageId: 'm1' }, { status: 201 });
      }
      if (url.includes('/requestToken')) {
        if (ably.token === 'error') return json({ error: { message: 'key invalid: secreto-de-prueba_1' } }, { status: 401 });
        if (ably.token === 'forma') return json({ otra: 'cosa' });
        return json({ token: 'TOKEN-ABLY-DE-PRUEBA', issued: ahora, expires: ahora + 900_000, capability: cuerpo.capability, keyName: cuerpo.keyName, clientId: 'filtrado' });
      }
    }
    if (url.startsWith('https://www.wikidata.org/w/api.php?')) {
      wikidata.llamadas.push(url);
      if (wikidata.modo === 'cae') throw new TypeError('fetch failed');
      const p = new URL(url).searchParams;
      if (p.get('list') === 'search') {
        const t = /^"([^"]*)" /.exec(p.get('srsearch') ?? '')?.[1] ?? '';
        const c = wikidata.conocidos.get(t);
        return json({ query: { search: c ? [{ ns: 0, title: c.q }] : [] } });
      }
      const entities: Record<string, unknown> = {};
      for (const q of (p.get('ids') ?? '').split('|')) {
        const c = [...wikidata.conocidos.values()].find((x) => x.q === q);
        if (c) entities[q] = { labels: { es: { language: 'es', value: c.nombre } }, aliases: {} };
      }
      return json({ entities });
    }
    throw new Error(`salida de red no permitida en las pruebas: ${url}`);
  }) as typeof fetch;

  const errores: string[] = [];
  const consoleError = console.error;
  console.error = (...a: unknown[]) => { errores.push(a.map(String).join(' ')); };

  const nuevoDispositivo = (apodo: string): Dispositivo => {
    const n = ++dispositivos;
    return { id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, token: randomBytes(32).toString('base64url'), apodo };
  };
  const hash = (token: string) => createHash('sha256').update(token).digest('hex');

  /** Una petición como la manda el navegador: identidad en cabeceras, cuerpo JSON. `ip` evita que los límites por IP se crucen entre pruebas. */
  let ipN = 0;
  function peticion(metodo: string, ruta: string, o: { d?: Dispositivo | null; token?: string; cuerpo?: unknown; ip?: string; texto?: string; cabeceras?: Record<string, string> } = {}): Request {
    const h: Record<string, string> = { 'x-forwarded-for': `${o.ip ?? `10.${Math.floor(++ipN / 250)}.${ipN % 250}.9`}, 76.76.21.21` };
    if (o.d) { h['x-jugador-id'] = o.d.id; h.authorization = `Bearer ${o.token ?? o.d.token}`; }
    Object.assign(h, o.cabeceras);
    const cuerpo = o.texto ?? (o.cuerpo === undefined ? undefined : JSON.stringify(o.cuerpo));
    if (cuerpo !== undefined) h['content-type'] = 'application/json';
    return new Request(`https://chamusqueros.vercel.app${ruta}`, { method: metodo, headers: h, body: cuerpo });
  }

  return {
    bd, ably, wikidata, salientes, reloj, errores, nuevoDispositivo, hash, peticion,
    restaurar() { Date.now = dateNow; globalThis.fetch = original; console.error = consoleError; },
  };
}
export type Servidor = ReturnType<typeof servidor>;
