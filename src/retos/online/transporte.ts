// Transporte en tiempo real del modo en línea (contrato: `Transporte` de protocolo.ts). Solo se suscribe: toda jugada va por HTTP.
//  - transporteAbly: WebSocket de Ably con un token de solo lectura de un canal. `ably` se baja con import() solo aquí.
//  - transporteSondeo: GET del estado cada pocos segundos; sirve sin llave (modo de desarrollo del servidor) y de respaldo si Ably no conecta.
//  - transporteFalso: para las pruebas con tsx.
// Una publicación perdida no se arrastra: cada evento trae el estado completo y el cliente se queda con la versión más alta.
import { canal as nombreCanal, EVENTO, type EstadoConexion, type EventoCanal, type RespuestaToken, type TokenAbly, type Transporte } from './protocolo';
import { esEvento } from './cliente';

const PREFIJO = nombreCanal('');
const codigoDe = (canal: string) => (canal.startsWith(PREFIJO) ? canal.slice(PREFIJO.length) : canal);
export const SONDEO_MS = 3000;
export const ESPERA_ABLY_MS = 8000; // B8: sin conexión de tiempo real en este plazo, se pasa al sondeo

/** Deja pasar solo los eventos con versión mayor que la última vista: los repetidos y los viejos se ignoran. */
export function soloNuevos(alEvento: (e: EventoCanal) => void, desde = 0): (e: EventoCanal) => void {
  let ultima = desde;
  return (e) => {
    if (e.v <= ultima) return;
    ultima = e.v;
    alEvento(e);
  };
}

// ---------- Falso (pruebas) ----------
export function transporteFalso() {
  const subs = new Set<{ canal: string; alEvento: (e: EventoCanal) => void; alConexion?: (c: EstadoConexion) => void }>();
  const t: Transporte & { emitir(e: EventoCanal): void; conexion(c: EstadoConexion): void; suscritos(): number } = {
    async suscribir(canal, alEvento, alConexion) {
      const s = { canal, alEvento: soloNuevos(alEvento), alConexion };
      subs.add(s);
      alConexion?.('conectado');
      return () => { subs.delete(s); };
    },
    emitir(e) { for (const s of [...subs]) if (s.canal === nombreCanal(e.sala.codigo)) s.alEvento(e); },
    conexion(c) { for (const s of [...subs]) s.alConexion?.(c); },
    suscritos: () => subs.size,
  };
  return t;
}

// ---------- Sondeo ----------
/** `obtener` trae el estado actual de la sala (o null); una falla cuenta como conexión caída. */
export function transporteSondeo(obtener: (codigo: string) => Promise<EventoCanal | null>, intervaloMs = SONDEO_MS): Transporte {
  return {
    async suscribir(canal, alEvento, alConexion) {
      const codigo = codigoDe(canal);
      const filtrar = soloNuevos(alEvento);
      let activo = true;
      let fallos = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const una = async () => {
        try {
          const e = await obtener(codigo);
          if (!activo) return;
          fallos = 0;
          alConexion?.('conectado');
          if (e) filtrar(e);
        } catch {
          if (!activo) return;
          fallos++;
          alConexion?.(fallos >= 3 ? 'caido' : 'reconectando');
        }
        if (activo) timer = setTimeout(una, fallos >= 3 ? intervaloMs * 3 : intervaloMs); // ponytail: sin retroceso exponencial; 3 s, y 9 s tras 3 fallas
      };
      alConexion?.('conectado');
      timer = setTimeout(una, intervaloMs);
      return () => { activo = false; clearTimeout(timer); };
    },
  };
}

// ---------- Ably ----------
const ESTADO: Record<string, EstadoConexion> = { connected: 'conectado', suspended: 'caido', failed: 'caido', closed: 'caido' };
const traducir = (estado: string): EstadoConexion => ESTADO[estado] ?? 'reconectando'; // initialized, connecting, disconnected, closing

/**
 * `primero` es el token que ya se pidió para decidir el transporte: se usa en la primera autenticación y los siguientes
 * (al vencer) se piden de nuevo con `pedirToken`, que repite la comprobación de membresía en el servidor.
 */
export function transporteAbly(pedirToken: (codigo: string) => Promise<RespuestaToken>, primero?: TokenAbly): Transporte {
  return {
    async suscribir(canal, alEvento, alConexion) {
      const codigo = codigoDe(canal);
      const { BaseRealtime, WebSocketTransport, FetchRequest } = await import('ably/modular');
      let inicial = primero;
      const cliente = new BaseRealtime({
        authCallback: (_params, devolver) => {
          const t = inicial ? Promise.resolve(inicial) : pedirToken(codigo);
          inicial = undefined;
          t.then((r) => ('token' in r ? devolver(null, r) : devolver('sin token', null)), () => devolver('sin token', null));
        },
        plugins: { WebSocketTransport, FetchRequest },
      });
      const filtrar = soloNuevos(alEvento);
      cliente.connection.on((c) => alConexion?.(traducir(c.current)));
      alConexion?.(traducir(cliente.connection.state));
      const sala = cliente.channels.get(canal);
      sala.subscribe(EVENTO, (m) => {
        let d: unknown = m.data;
        if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
        if (esEvento(d)) filtrar(d); // forma mínima antes de pintar
      }).catch(() => alConexion?.('caido'));
      return () => {
        sala.unsubscribe();
        cliente.close();
      };
    },
  };
}

// ---------- Fábrica ----------
export interface OpcionesAuto { esperaMs?: number; ably?: (primero: TokenAbly) => Transporte; sondeoMs?: number }

/**
 * El transporte que usa el juego: pide el primer token; con `{ dev: true }` o si falla, sondeo; si no, Ably, y si Ably no
 * conecta en 8 s (o no se puede cargar), sondeo (B8). Los eventos de los dos pasan por el mismo filtro de versión.
 */
export function transporteAuto(pedirToken: (codigo: string) => Promise<RespuestaToken>, obtener: (codigo: string) => Promise<EventoCanal | null>, o: OpcionesAuto = {}): Transporte {
  const sondeo = transporteSondeo(obtener, o.sondeoMs);
  return {
    async suscribir(canal, alEvento, alConexion) {
      const filtrar = soloNuevos(alEvento);
      let tok: RespuestaToken;
      try { tok = await pedirToken(codigoDe(canal)); } catch { return sondeo.suscribir(canal, filtrar, alConexion); }
      if (!('token' in tok)) return sondeo.suscribir(canal, filtrar, alConexion);

      let cancelar: () => void = () => {};
      let cancelado = false;
      let enSondeo = false;
      let cancelarAbly: (() => void) | null = null;
      let espera: ReturnType<typeof setTimeout> | undefined;
      const aSondeo = async () => {
        if (enSondeo || cancelado) return;
        enSondeo = true;
        clearTimeout(espera);
        cancelarAbly?.();
        const c = await sondeo.suscribir(canal, filtrar, alConexion);
        if (cancelado) c(); else cancelar = c;
      };
      espera = setTimeout(() => void aSondeo(), o.esperaMs ?? ESPERA_ABLY_MS);
      const ably = (o.ably ?? ((p) => transporteAbly(pedirToken, p)))(tok);
      ably.suscribir(canal, filtrar, (c) => {
        if (enSondeo) return;
        if (c === 'conectado') clearTimeout(espera);
        alConexion?.(c);
      }).then((c) => {
        if (enSondeo || cancelado) c(); else cancelarAbly = c;
      }, () => void aSondeo());
      return () => {
        cancelado = true;
        clearTimeout(espera);
        cancelarAbly?.();
        cancelar();
      };
    },
  };
}
