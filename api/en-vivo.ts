// Resultados de fútbol en vivo (Vercel Function + Neon); esquema en db/en-vivo.sql.
// Única fuente: los endpoints públicos NO oficiales de ESPN (sin llave). El navegador nunca los consulta: este servidor
// los pide bajo demanda como máximo cada 3 minutos, guarda los partidos ya saneados y los sirve.
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

type Estado = 'jugando' | 'descanso' | 'penales';
type Partido = { liga: string; local: string; visita: string; gl: number | null; gv: number | null; estado: Estado; minuto: number | null };

// Ligas de la barra, en su orden. `liga` del partido es siempre la etiqueta de aquí, nunca el nombre que mande ESPN.
// Los códigos son candidatos: se confirman en la vista previa (specs/resultados-en-vivo/plan.md); la que dé 404 se quita.
const LIGAS = [
  ['Liga Nacional GT', 'gua.1'], ['Costa Rica', 'crc.1'], ['Honduras', 'hon.1'], ['El Salvador', 'slv.1'], ['Panamá', 'pan.1'],
  ['Concacaf Champions Cup', 'concacaf.champions'], ['Liga MX', 'mex.1'], ['MLS', 'usa.1'],
  ['Champions League', 'uefa.champions'], ['Premier League', 'eng.1'], ['LaLiga', 'esp.1'], ['Serie A', 'ita.1'],
  ['Bundesliga', 'ger.1'], ['Ligue 1', 'fra.1'], ['Libertadores', 'conmebol.libertadores'],
  ['Mundial', 'fifa.world'], ['Eurocopa', 'uefa.euro'], ['Copa Oro', 'concacaf.gold'], ['Liga de Naciones Concacaf', 'concacaf.nations.league'],
  ['Eliminatorias Concacaf', 'fifa.worldq.concacaf'], ['Copa América', 'conmebol.america'], ['Liga de Naciones UEFA', 'uefa.nations'],
] as const;
const ORDEN = new Map<string, number>(LIGAS.map(([etiqueta], i) => [etiqueta, i]));

const RITMO_SEG = 180; // mínimo entre rondas a ESPN, pase lo que pase con los visitantes
const MAX_EDAD_MIN = 30; // un dato más viejo no se muestra
const TOPE = 30;
const CONCURRENCIA = 5; // ligas pedidas a la vez
const PLAZO_LIGA_MS = 4000;
const PLAZO_RONDA_MS = 8000; // ponytail: tope de toda la ronda para no pasar el límite de la función; las ligas que no alcanzan se omiten
const MAX_BYTES = 1_500_000;

/** Motivo corto y sin datos sensibles de por qué falló una consulta (es lo único que se registra). */
class Fallo extends Error {}

const limpio = (t: unknown, max = 28) =>
  typeof t === 'string' ? [...t.replace(/[\p{Cc}\p{Cf}\s]+/gu, ' ').trim()].slice(0, max).join('').trim() : '';
const marcador = (v: unknown) => {
  const n = typeof v === 'string' && /^\d{1,2}$/.test(v) ? Number(v) : v;
  return Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 99 ? (n as number) : null;
};
/** "67'", "45'+2'", "90+5" → 67, 45, 90; todo lo demás → null. */
const minutoDe = (v: unknown) => {
  const m = typeof v === 'string' ? /^(\d{1,3})'?(?:\+\d{1,2}'?)?$/.exec(v) : null;
  return m && Number(m[1]) <= 130 ? Number(m[1]) : null;
};

async function pedir(url: string, signal: AbortSignal): Promise<unknown> {
  try {
    // redirect: 'error' y host fijo: nada de la solicitud del usuario entra en la URL.
    const res = await fetch(url, { headers: { 'user-agent': 'chamusqueros/1.0 (+https://chamusqueros.vercel.app)', accept: 'application/json' }, redirect: 'error', signal });
    if (res.status !== 200) throw new Fallo(`HTTP ${res.status}`);
    // ponytail: se lee el cuerpo entero antes de medirlo; el plazo de la consulta ya acota el tiempo.
    const texto = await res.text();
    if (texto.length > MAX_BYTES) throw new Fallo('cuerpo demasiado grande');
    return JSON.parse(texto);
  } catch (e) {
    if (e instanceof Fallo) throw e;
    throw new Fallo(e instanceof SyntaxError ? 'json inválido' : ['TimeoutError', 'AbortError'].includes((e as Error)?.name) ? 'tiempo agotado' : 'red');
  }
}

/** Partidos en juego de un scoreboard. Lanza si la forma no es la esperada: esa liga se omite entera. */
function partidosDe(j: any, etiqueta: string): Partido[] {
  if (!Array.isArray(j?.events)) throw new Fallo('forma inesperada');
  const out: Partido[] = [];
  for (const e of j.events) {
    const comp = e?.competitions?.[0];
    // El estado puede venir en el evento o en la competencia: se acepta el primero que exista.
    const st = [e?.status, comp?.status].find((s) => typeof s?.type?.state === 'string');
    if (!['pre', 'in', 'post'].includes(st?.type?.state)) throw new Fallo('estado desconocido');
    if (st.type.state !== 'in') continue;
    const equipos = Array.isArray(comp?.competitors) ? comp.competitors : [];
    const casa = equipos.find((c: any) => c?.homeAway === 'home');
    const fuera = equipos.find((c: any) => c?.homeAway === 'away');
    const local = limpio(casa?.team?.displayName);
    const visita = limpio(fuera?.team?.displayName);
    if (!local || !visita) continue;
    const estado: Estado = st.type.name === 'STATUS_HALFTIME' || st.type.shortDetail === 'HT' ? 'descanso' : st.type.name === 'STATUS_SHOOTOUT' ? 'penales' : 'jugando';
    out.push({ liga: etiqueta, local, visita, gl: marcador(casa.score), gv: marcador(fuera.score), estado, minuto: minutoDe(st.displayClock) });
  }
  return out;
}

/** Una ronda: todas las ligas, de a CONCURRENCIA; la que falla se omite. Lanza solo si fallaron todas. */
async function leerEspn(): Promise<Partido[]> {
  const ronda = AbortSignal.timeout(PLAZO_RONDA_MS);
  const buenas: Partido[][] = [];
  let sig = 0;
  await Promise.all(Array.from({ length: CONCURRENCIA }, async () => {
    while (sig < LIGAS.length && !ronda.aborted) {
      const [etiqueta, codigo] = LIGAS[sig++];
      try {
        const j = await pedir(`https://site.api.espn.com/apis/site/v2/sports/soccer/${codigo}/scoreboard`, AbortSignal.any([AbortSignal.timeout(PLAZO_LIGA_MS), ronda]));
        buenas.push(partidosDe(j, etiqueta));
      } catch (e) {
        console.warn(`en-vivo: espn ${codigo} ${e instanceof Fallo ? e.message : 'error'}`);
      }
    }
  }));
  if (!buenas.length) throw new Fallo('todas las ligas fallaron');
  return buenas.flat();
}

/** Reclamo atómico: gana quien recibe la fila. Copia en db/en-vivo.test.sql: si cambia aquí, cambiarlo allá. */
async function reclamar() {
  const r = await sql`UPDATE en_vivo_cache SET intento_at = now() WHERE id = 1 AND intento_at <= now() - make_interval(secs => ${RITMO_SEG}::int) RETURNING id`;
  return r.length > 0;
}

const CABECERAS = { 'x-content-type-options': 'nosniff' };
const VACIO = { actualizado: null, partidos: [] };

export async function GET() {
  // Apaga toda la feature sin tocar la base (Vercel exige redesplegar para que una variable nueva rija).
  // Apagada por defecto: ESPN responde 403 a los servidores de Vercel (verificado 2026-10-14). Solo "on" la enciende.
  if (process.env.ESPN_EN_VIVO !== 'on') return Response.json(VACIO, { headers: { ...CABECERAS, 'cache-control': 'public, max-age=0, s-maxage=60' } });
  try {
    // Con el ritmo vencido, una sola solicitud consulta a ESPN; el resto sirve lo guardado. intento_at se marca antes de consultar:
    // si falla o la función muere, nadie reintenta hasta que venza el ritmo, y lo guardado no se toca.
    if (await reclamar()) {
      try {
        const partidos = await leerEspn();
        await sql`UPDATE en_vivo_cache SET payload = ${JSON.stringify(partidos)}::jsonb, actualizado_at = now() WHERE id = 1`;
      } catch (e) {
        console.warn(`en-vivo: espn ${e instanceof Fallo ? e.message : 'error'}`);
      }
    }
    const [fila] = await sql`SELECT payload, (extract(epoch FROM actualizado_at) * 1000)::float8 AS actualizado, extract(epoch FROM now() - actualizado_at)::float8 AS edad FROM en_vivo_cache WHERE id = 1`;
    const vigente = fila && fila.edad != null && fila.edad < MAX_EDAD_MIN * 60 && Array.isArray(fila.payload);
    const partidos = (vigente ? (fila.payload as Partido[]) : [])
      .sort((a, b) => (ORDEN.get(a.liga) ?? 99) - (ORDEN.get(b.liga) ?? 99) || (b.minuto ?? -1) - (a.minuto ?? -1))
      .slice(0, TOPE);
    return Response.json(partidos.length ? { actualizado: Number(fila.actualizado), partidos } : VACIO, { headers: { ...CABECERAS, 'cache-control': 'public, max-age=0, s-maxage=60' } });
  } catch (e) {
    // Por ejemplo, migración sin aplicar: la barra es decoración y nunca debe romper nada.
    console.error(`en-vivo: base ${String((e as Error)?.message).slice(0, 120)}`);
    return Response.json(VACIO, { headers: { ...CABECERAS, 'cache-control': 'no-store' } });
  }
}
