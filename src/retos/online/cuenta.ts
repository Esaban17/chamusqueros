// Cuenta regresiva de un plazo del servidor, para los pintores en línea. El reloj de pantalla es una COPIA: `ctx.ahora()` es el reloj
// del servidor estimado y, al llegar a 0, se avisa con `ctx.vencer()` (una vez por plazo) AUNQUE ya se haya respondido: es la señal
// de que este celular sigue conectado (RF-09). Los anuncios a lectores de pantalla son al inicio, a los 10 s, a los 5 s y al terminar (RF-33).
import { anunciosPendientes } from '../trivia-puro';   // lógica pura: nunca trivia.ts, que arrastra el banco
import type { CtxJuego } from './protocolo';

export interface OpcionesCuenta {
  /** Actualiza lo que se ve: segundos restantes (entero, 0 al terminar) y la fracción que queda del plazo (0 a 1). */
  mostrar?: (seg: number, fraccion: number) => void;
  /** Escribe en la región aria-live. */
  anunciar?: (msg: string) => void;
  /** Sin anuncios (por ejemplo, mientras el servidor verifica o en el revelado de 3 s). */
  mudo?: boolean;
}

export function crearCuenta(ctx: Pick<CtxJuego, 'ahora' | 'vencer'>, o: OpcionesCuenta = {}) {
  let deadline = 0;
  let total = 1;
  let hechos = new Set<number>();
  let vencido = true;
  let intervalo: ReturnType<typeof setInterval> | undefined;

  const tick = () => {
    const resto = deadline - ctx.ahora();
    const seg = Math.max(0, Math.ceil(resto / 1000));
    o.mostrar?.(seg, Math.max(0, Math.min(1, resto / total)));
    if (!o.mudo) {
      const nuevos = anunciosPendientes(resto, hechos);
      if (nuevos.length) {
        nuevos.forEach((t) => hechos.add(t));
        o.anunciar?.(Math.min(...nuevos) === 0 ? 'Se acabó el tiempo' : `${seg} segundos`);
      }
    }
    if (resto <= 0 && !vencido) { vencido = true; ctx.vencer(); }
  };
  const parar = () => { if (intervalo !== undefined) { clearInterval(intervalo); intervalo = undefined; } };

  return {
    /** Empieza a contar hacia un plazo nuevo; si es el mismo que ya se cuenta, no hace nada (así `actualizar` no reinicia los anuncios). */
    fijar(nuevo: number, duracionMs?: number) {
      if (nuevo === deadline && intervalo !== undefined) return;
      deadline = nuevo;
      total = Math.max(1, duracionMs ?? nuevo - ctx.ahora());
      hechos = new Set();
      vencido = false;
      if (!o.mudo) o.anunciar?.(`${Math.max(0, Math.ceil((nuevo - ctx.ahora()) / 1000))} segundos`);
      parar();
      tick();
      intervalo = setInterval(tick, 250);
    },
    detener: parar,
  };
}
