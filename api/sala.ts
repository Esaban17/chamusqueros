// Salas de Retos en línea (RF-03 a RF-16): crear, unirse, configurar, empezar, jugar, vencer, revancha y salir. El servidor es el árbitro (A08):
// cada transición es "leer la sala, calcular con el motor puro, guardar si la versión no cambió"; los jugadores solo mandan intenciones.
//   GET  /api/sala                  → InfoEnLinea
//   GET  /api/sala?codigo=C         → RespuestaSala si el dispositivo es de la sala; PreviaSala si no
//   POST /api/sala (PeticionSala)   → RespuestaSala
// Estado en Neon (db/retos-en-linea.sql), tiempo real por Ably (api/_ably.ts). Ver specs/retos-en-linea/plan.md.
import {
  aplicar, configValida, crearSala, unirse, vistaPublica, type CierrePartida, type Efecto, type Entorno, type Miembro, type Peticion, type Resultado, type SalaInterna,
} from '../src/retos/online/motor.js';
import {
  CODIGO_RE, SALA_VIDA_MS, type Accion, type AvatarCodigo, type Indice, type InfoEnLinea, type PeticionSala, type PreviaSala, type RespuestaSala,
} from '../src/retos/online/protocolo.js';
import { VENTANA_MS, cumpleMinimo, puntosRanking } from '../src/retos/online/puntos.js';
import { disponible, publicar } from './_ably.js';
import { credencial, identificar } from './_auth.js';
import { cerrarPartida, contarSalas, crearSala as crearSalaBd, guardarSala, historial, leerPerfil, leerSala, limpiar, type FilaSala } from './_bd.js';
import { BANCOS } from './_bancos.js';
import { codigoNuevo } from './_ids.js';
import { fallo, ipDe, leerJson, limitado, registrar, responder } from './_http.js';
import { HORA, LIMITES, SALAS_POR_HORA, limitar } from './_limite.js';
import { verificarConCache } from './_verificar.js';

const REINTENTOS = 3;
const SITE_URL_POR_DEFECTO = 'https://chamusqueros.vercel.app';

/** El link se arma con un dominio fijo del servidor (variable de entorno), nunca con el encabezado Host de la petición (A05). */
function siteUrl(): string {
  const e = process.env.SITE_URL?.trim().replace(/\/+$/, '');
  return e && /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/.test(e) ? e : SITE_URL_POR_DEFECTO;
}

const azarSeguro = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
const entorno = (ahora: number): Entorno => ({ ahora, azar: azarSeguro, bancos: BANCOS });

// ---------- Validación de la petición (A03): tipos, largos, alfabetos y ningún campo de más ----------

const soloClaves = (o: Record<string, unknown>, ...claves: string[]) => Object.keys(o).length === claves.length && claves.every((k) => k in o);
const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function jugadaValida(j: unknown): Accion | null {
  if (!esObjeto(j)) return null;
  if (j.t === 'texto' && soloClaves(j, 't', 'texto') && typeof j.texto === 'string' && j.texto.length <= 200) return { t: 'texto', texto: j.texto };
  if (j.t === 'apelar' && soloClaves(j, 't', 'apelar') && typeof j.apelar === 'boolean') return { t: 'apelar', apelar: j.apelar };
  if (j.t === 'decidir' && soloClaves(j, 't', 'vale') && typeof j.vale === 'boolean') return { t: 'decidir', vale: j.vale };
  if (j.t === 'responder' && soloClaves(j, 't', 'opcion') && Number.isInteger(j.opcion) && (j.opcion as number) >= 0 && (j.opcion as number) <= 3) return { t: 'responder', opcion: j.opcion as number };
  return null;
}

function peticionValida(b: Record<string, unknown>): PeticionSala | null {
  const codigo = b.codigo;
  const cod = typeof codigo === 'string' && CODIGO_RE.test(codigo) ? codigo : null;
  switch (b.accion) {
    case 'crear': return soloClaves(b, 'accion') ? { accion: 'crear' } : null;
    case 'unirse': case 'empezar': case 'revancha': case 'salir':
      return cod && soloClaves(b, 'accion', 'codigo') ? ({ accion: b.accion, codigo: cod } as PeticionSala) : null;
    case 'configurar': {
      const config = configValida(b.config);
      return cod && config && soloClaves(b, 'accion', 'codigo', 'config') ? { accion: 'configurar', codigo: cod, config } : null;
    }
    case 'jugar': {
      const jugada = jugadaValida(b.jugada);
      return cod && jugada && soloClaves(b, 'accion', 'codigo', 'jugada') ? { accion: 'jugar', codigo: cod, jugada } : null;
    }
    case 'vencer':
      return cod && soloClaves(b, 'accion', 'codigo', 'v') && Number.isInteger(b.v) && (b.v as number) >= 0 && (b.v as number) < 2 ** 31 ? { accion: 'vencer', codigo: cod, v: b.v as number } : null;
    default: return null;
  }
}

// ---------- Guardar una transición ----------

type Salida = { ok: true; sala: SalaInterna; quien: Indice; efectos: Efecto[] } | { ok: false; resp: Response };

const vencida = (f: FilaSala, ahora: number) => ahora - f.actualizado > SALA_VIDA_MS;
const quienEs = (s: SalaInterna, id: string): Indice | -1 => s.miembros.findIndex((m) => m.id === id) as Indice | -1;

/** Lee la sala, deja que `f` decida con el motor y guarda solo si la versión no cambió (reintenta hasta 3 veces). Publica lo que cambió para los jugadores. */
async function mutar(codigo: string, id: string, f: (s: SalaInterna, quien: Indice, ahora: number) => Resultado): Promise<Salida> {
  for (let intento = 0; intento < REINTENTOS; intento++) {
    const ahora = Date.now();
    const fila = await leerSala(codigo);
    if (!fila) return { ok: false, resp: fallo('sala_inexistente') };
    if (vencida(fila, ahora)) return { ok: false, resp: fallo('sala_vencida') };
    const sala = fila.estado as SalaInterna;
    const quien = quienEs(sala, id);
    if (quien < 0) return { ok: false, resp: fallo('no_miembro') };

    const r = f(sala, quien as Indice, ahora);
    if (!r.ok) {
      // La actividad anotada de una petición rechazada se conserva (RF-09); si otro cambió la sala justo ahora, no importa.
      if (r.cambio !== 'nada') await guardarSala(codigo, r.sala, fila.version, ahora);
      return { ok: false, resp: fallo(r.error, { faltanMs: r.faltanMs }) };
    }
    if (r.cambio === 'nada') return { ok: true, sala: r.sala, quien: quien as Indice, efectos: [] };

    const cierre = r.efectos.find((e): e is Extract<Efecto, { t: 'cierre' }> => e.t === 'cierre')?.cierre;
    let guardada: number | null;
    if (cierre) guardada = await cerrar(codigo, r.sala, fila.version, cierre, ahora);
    else guardada = await guardarSala(codigo, r.sala, fila.version, ahora);
    if (guardada === null) continue; // otro cambió la sala: se relee y se vuelve a calcular (la acción puede haber dejado de aplicar)

    if (r.cambio === 'publico') await publicar(codigo, { v: r.sala.v, sala: vistaPublica(r.sala, ahora) });
    return { ok: true, sala: r.sala, quien: quien as Indice, efectos: r.efectos };
  }
  return { ok: false, resp: fallo('conflicto') };
}

/** RF-23, RF-24: los puntos de ranking y las estadísticas las calcula el servidor, aquí, y se guardan junto con la sala en UNA sentencia (A08). */
async function cerrar(codigo: string, sala: SalaInterna, version: number, c: CierrePartida, ahora: number): Promise<number | null> {
  const [a, b] = c.ids;
  const h = await historial(a, b, ahora - VENTANA_MS);
  const res = ([0, 1] as Indice[]).map((i) => (c.abandono === i ? 'A' : c.ganador === null ? 'E' : c.ganador === i ? 'V' : 'D'));
  const cumple = cumpleMinimo(c.jugadas);
  const pr = ([0, 1] as Indice[]).map((i) => puntosRanking({
    resultado: res[i] as 'V' | 'E' | 'D' | 'A', rendimiento: c.rendimiento[i], cumpleMinimo: cumple, previasRival24h: h.previas, sumado24h: i === 0 ? h.sumaA : h.sumaB,
  }));
  const final = sala.partida!.final!;
  final.rankingGanado = [pr[0].puntos, pr[1].puntos];
  final.sinPuntos = [pr[0].sinPuntos, pr[1].sinPuntos];
  // RF-28: la partida cuenta para las estadísticas solo si suma puntos, o si es una derrota por abandono del propio jugador.
  const letra = (i: number) => (res[i] === 'A' ? 'D' : res[i]) as 'V' | 'E' | 'D';
  return cerrarPartida({
    codigo, estado: sala, vista: version, ahora, num: c.num, a, b, puntosA: pr[0].puntos, puntosB: pr[1].puntos, valida: cumple,
    resA: letra(0), resB: letra(1), cuentaA: pr[0].puntos > 0 || res[0] === 'A', cuentaB: pr[1].puntos > 0 || res[1] === 'A',
  });
}

const respuesta = (sala: SalaInterna, quien: Indice, extra: Partial<RespuestaSala> = {}, status = 200) =>
  responder(status, { sala: vistaPublica(sala, Date.now()), yo: quien, ...extra } satisfies RespuestaSala);

// ---------- GET ----------

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ip = limitar(`sala-ip:${ipDe(req)}`, LIMITES.ipSala);
    if (ip) return limitado(ip);
    const codigo = url.searchParams.get('codigo');
    if (codigo === null) return responder(200, { enLinea: disponible() } satisfies InfoEnLinea);
    if (!disponible()) return fallo('en_linea_no_disponible');
    if (!CODIGO_RE.test(codigo)) return fallo('entrada_invalida');

    // Con credencial se busca quién es; sin ella o con una que no cuadra, se trata como alguien que solo mira la puerta.
    const [quien, fila] = await Promise.all([credencial(req) ? identificar(req) : null, leerSala(codigo)]);
    const ahora = Date.now();
    const sala = fila ? (fila.estado as SalaInterna) : null;
    const yo = sala && quien?.ok ? quienEs(sala, quien.id) : -1;
    if (fila && sala && yo >= 0) {
      const e = limitar(`sala-get:${quien!.ok ? quien!.id : ''}`, LIMITES.leerSala);
      if (e) return limitado(e);
      if (vencida(fila, ahora)) return fallo('sala_vencida');
      return respuesta(sala, yo as Indice);
    }
    // Quien no es de la sala (y quien prueba códigos que no existen) cuenta contra un límite por IP: frena la fuerza bruta de códigos (A04).
    const e = limitar(`previa-ip:${ipDe(req)}`, LIMITES.previaIp);
    if (e) return limitado(e);
    if (!fila || !sala) return fallo('sala_inexistente');
    // Solo se ve si está llena y el apodo del anfitrión.
    if (vencida(fila, ahora) || sala.fase === 'cerrada') return fallo('sala_vencida');
    return responder(200, { previa: true, llena: sala.miembros.length >= 2, anfitrion: sala.miembros[0].perfil.apodo } satisfies PreviaSala);
  } catch (e) {
    registrar('sala-get', e);
    return fallo('error');
  }
}

// ---------- POST ----------

export async function POST(req: Request) {
  try {
    if (!disponible()) return fallo('en_linea_no_disponible');
    const ip = limitar(`sala-ip:${ipDe(req)}`, LIMITES.ipSala);
    if (ip) return limitado(ip);
    const b = await leerJson(req);
    const pet = b && peticionValida(b);
    if (!pet) return fallo('entrada_invalida');
    const quien = await identificar(req);
    if (!quien.ok) return fallo(quien.error, { status: quien.status });
    const id = quien.id;

    const lim = (clave: string, l: { max: number; ms: number }) => limitar(`${clave}:${id}`, l);
    switch (pet.accion) {
      case 'crear': return await crear(req, id);
      case 'unirse': return await entrar(req, id, pet.codigo);
      case 'jugar': { const e = lim('jugar', LIMITES.jugar); if (e) return limitado(e); return await jugar(id, pet); }
      case 'vencer': { const e = lim('vencer', LIMITES.vencer); if (e) return limitado(e); break; }
      default: { const e = lim('otras', LIMITES.otras); if (e) return limitado(e); }
    }
    const s = await mutar(pet.codigo, id, (sala, q, ahora) => aplicar(sala, q, pet, entorno(ahora)));
    return s.ok ? respuesta(s.sala, s.quien) : s.resp;
  } catch (e) {
    registrar('sala-post', e);
    return fallo('error');
  }
}

async function miembroDe(id: string): Promise<Miembro | null> {
  const p = await leerPerfil(id);
  if (!p) return null;
  const avatar = Array.isArray(p.avatar) && p.avatar.length === 6 ? (p.avatar.map(Number) as AvatarCodigo) : null;
  return { id, perfil: { apodo: p.apodo, avatar, club: p.club, seleccion: p.seleccion } };
}

async function crear(req: Request, id: string): Promise<Response> {
  const ipE = limitar(`crear-ip:${ipDe(req)}`, LIMITES.crearIp);
  if (ipE) return limitado(ipE);
  const ahora = Date.now();
  // 5 salas por hora por dispositivo, contadas en Neon (sobreviven a las instancias de la función).
  if ((await contarSalas(id, ahora - HORA)) >= SALAS_POR_HORA) return limitado(60);
  const miembro = await miembroDe(id);
  if (!miembro) return fallo('sin_perfil');
  await limpiar(ahora).catch((e) => registrar('sala-limpiar', e)); // retención perezosa: sin tarea programada
  for (let i = 0; i < 5; i++) {
    const codigo = codigoNuevo();
    const sala = crearSala(codigo, miembro, { ahora });
    if (await crearSalaBd(codigo, id, sala, ahora)) return respuesta(sala, 0, { link: `${siteUrl()}/?sala=${codigo}` }, 201);
  }
  throw new Error('sin código libre');
}

async function entrar(req: Request, id: string, codigo: string): Promise<Response> {
  const e = limitar(`unirse-ip:${ipDe(req)}`, LIMITES.unirseIp);
  if (e) return limitado(e);
  const miembro = await miembroDe(id);
  if (!miembro) return fallo('sin_perfil');
  return unirseSala(codigo, miembro);
}

/** Unirse es la única acción de quien todavía no es miembro, así que no usa `mutar`. */
async function unirseSala(codigo: string, miembro: Miembro): Promise<Response> {
  for (let intento = 0; intento < REINTENTOS; intento++) {
    const ahora = Date.now();
    const fila = await leerSala(codigo);
    if (!fila) return fallo('sala_inexistente');
    if (vencida(fila, ahora)) return fallo('sala_vencida');
    const r = unirse(fila.estado as SalaInterna, miembro, { ahora });
    if (!r.ok) return fallo(r.error);
    if (r.cambio === 'nada') return respuesta(r.sala, quienEs(r.sala, miembro.id) as Indice);
    if ((await guardarSala(codigo, r.sala, fila.version, ahora)) === null) continue;
    await publicar(codigo, { v: r.sala.v, sala: vistaPublica(r.sala, ahora) });
    return respuesta(r.sala, quienEs(r.sala, miembro.id) as Indice);
  }
  return fallo('conflicto');
}

/** `jugar`: si la jugada dispara la verificación en Wikidata (ping pong), la sala se guarda y se publica primero (`verificando`), la consulta
 *  va sin retener nada, y el resultado se aplica con la misma regla de versión. */
async function jugar(id: string, pet: Extract<PeticionSala, { accion: 'jugar' }>): Promise<Response> {
  const s = await mutar(pet.codigo, id, (sala, q, ahora) => aplicar(sala, q, pet, entorno(ahora)));
  if (!s.ok) return s.resp;
  const v = s.efectos.find((e): e is Extract<Efecto, { t: 'verificar' }> => e.t === 'verificar');
  if (!v) return respuesta(s.sala, s.quien);
  let resultado: Extract<Peticion, { accion: 'verificado' }>['resultado'];
  try {
    resultado = await verificarConCache(v.texto, v.tipo, v.id);
  } catch (e) {
    registrar('sala-verificar', e instanceof Error ? e.name : 'desconocido');
    resultado = 'fuente_falla';
  }
  const t = await mutar(pet.codigo, id, (sala, _q, ahora) => aplicar(sala, 0, { accion: 'verificado', texto: v.texto, resultado }, entorno(ahora)));
  return t.ok ? respuesta(t.sala, s.quien) : t.resp;
}
