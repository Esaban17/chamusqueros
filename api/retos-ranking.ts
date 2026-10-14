// Ranking de Retos (RF-25): los 50 primeros por puntos de partidas en línea, y la posición propia si quedó fuera. Nunca devuelve identificadores.
// GET /api/retos-ranking → RankingRetos. La identidad es opcional: sin ella, `yo` es null y ninguna fila lleva la marca `yo`.
import type { FilaRankingRetos, RankingRetos } from '../src/retos/online/protocolo.js';
import { credencial, identificar } from './_auth.js';
import { rankingRetos } from './_bd.js';
import { fallo, ipDe, limitado, registrar, responder } from './_http.js';
import { LIMITES, limitar } from './_limite.js';

const TOP = 50;

export async function GET(req: Request) {
  try {
    const espera = limitar(`ranking-ip:${ipDe(req)}`, LIMITES.rankingIp);
    if (espera) return limitado(espera);
    // Una credencial mal formada o ajena no tumba el ranking: se muestra como si fuera un visitante.
    let yo: string | null = null;
    if (credencial(req)) {
      const q = await identificar(req);
      if (q.ok) yo = q.id;
    }
    const filas = await rankingRetos(yo, TOP);
    // Se arma fila por fila con los campos públicos: lo que no se nombra aquí no sale.
    const fila = (f: (typeof filas)[number]): FilaRankingRetos => ({
      pos: Number(f.pos), apodo: String(f.apodo), avatar: Array.isArray(f.avatar) && f.avatar.length === 6 ? (f.avatar.map(Number) as FilaRankingRetos['avatar']) : null,
      puntos: Number(f.puntos), victorias: Number(f.victorias), yo: !!f.yo,
    });
    const todas = filas.map(fila);
    const cuerpo: RankingRetos = { top: todas.filter((f) => f.pos <= TOP), yo: todas.find((f) => f.yo && f.pos > TOP) ?? null };
    return responder(200, cuerpo);
  } catch (e) {
    registrar('retos-ranking', e);
    return fallo('error');
  }
}
