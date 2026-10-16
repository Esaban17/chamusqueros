// Límites de uso de Retos en línea (A04): ventana fija en memoria por clave (dispositivo o IP), con el mismo patrón y los mismos topes de memoria
// que api/futbolista.ts. ponytail: de mejor esfuerzo, cada instancia cuenta por su lado; el tope global es una regla de Rate Limiting del Firewall de Vercel.
const CLAVES_MAX = 20_000;
const ventanas = new Map<string, { n: number; vence: number }>();

export const MIN = 60_000, HORA = 3600_000;
/** Valores del plan (specs/retos-en-linea/plan.md, "Límites"): { máximo por ventana, ventana en ms }. */
export const LIMITES = {
  ipSala: { max: 240, ms: MIN },          // todo /api/sala por IP: frena inundaciones antes de gastar una consulta
  jugar: { max: 30, ms: MIN },            // por dispositivo
  vencer: { max: 60, ms: MIN },
  otras: { max: 60, ms: MIN },            // configurar, empezar, revancha, salir
  leerSala: { max: 120, ms: MIN },
  previaIp: { max: 20, ms: MIN },         // GET de quien no es de la sala: frena la fuerza bruta de códigos
  unirseIp: { max: 20, ms: MIN },
  crearIp: { max: 10, ms: HORA },
  perfilPut: { max: 10, ms: MIN },        // por dispositivo
  perfilPutIp: { max: 30, ms: HORA },
  perfilGet: { max: 60, ms: MIN },
  token: { max: 30, ms: HORA },           // /api/ably-token por dispositivo
  tokenIp: { max: 120, ms: HORA },
  rankingIp: { max: 60, ms: MIN },
  carrerasIp: { max: 60, ms: HORA },      // contador de carreras por IP: 2 avisos por carrera; cabe un aula
  carreraGet: { max: 150, ms: MIN },      // GET /api/ranking (carreras) por IP: un salón de 40 mirando el ranking 3 veces, con margen
  carreraPost: { max: 150, ms: HORA },    // POST /api/ranking por IP: 40 dispositivos x 3 carreras por hora = 120, más 25 % de margen
} as const;
export const SALAS_POR_HORA = 5;           // por dispositivo, contadas en Neon (api/_bd.ts: contarSalas)

/** Cuenta una solicitud de `clave`; devuelve los segundos que faltan si se pasó del límite, o 0. */
export function limitar(clave: string, l: { max: number; ms: number }, ahora = Date.now()): number {
  const e = ventanas.get(clave);
  if (!e || e.vence <= ahora) {
    if (ventanas.size >= CLAVES_MAX) {
      for (const [k, v] of ventanas) if (v.vence <= ahora) ventanas.delete(k);
      if (ventanas.size >= CLAVES_MAX) ventanas.delete(ventanas.keys().next().value!); // sigue lleno: sale la más antigua
    }
    ventanas.set(clave, { n: 1, vence: ahora + l.ms });
    return 0;
  }
  return ++e.n > l.max ? Math.max(1, Math.ceil((e.vence - ahora) / 1000)) : 0;
}

/** Solo para las pruebas. */
export const reiniciarLimites = () => ventanas.clear();
