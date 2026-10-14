// Perfil de Retos en línea (RF-26, RF-27, RF-28, RF-32): apodo, avatar, club y selección favoritos, y las estadísticas que calcula el servidor.
// GET /api/perfil → PerfilCompleto (404 sin_perfil) · PUT /api/perfil (cuerpo PerfilEdicion) → PerfilCompleto (201 al crear, 200 al editar; 403 si el id es de otro token).
// Atado al dispositivo: `x-jugador-id` + `authorization: Bearer <token>`; el servidor solo guarda el hash del token. No modifica nunca las estadísticas.
import type { AvatarCodigo, PerfilCompleto } from '../src/retos/online/protocolo.js';
import { credencial, identificar } from './_auth.js';
import { guardarPerfil, leerPerfil, mejorCarrera, type FilaPerfil } from './_bd.js';
import { fallo, ipDe, leerJson, limitado, registrar, responder } from './_http.js';
import { CLUB_IDS, COUNTRY_CODES } from './_ids.js';
import { LIMITES, limitar } from './_limite.js';
import { validarApodo } from './_nombres.js';

// Avatar: [piel, pelo, color de pelo, barba, extra, dorsal]; los mismos máximos que api/ranking.ts (listas de src/ui/avatar.ts).
const AVATAR_MIN = [0, 0, 0, 0, 0, 1];
const AVATAR_MAX = [5, 7, 5, 4, 3, 99];
const esAvatar = (v: unknown): v is AvatarCodigo =>
  Array.isArray(v) && v.length === AVATAR_MAX.length && v.every((x, i) => Number.isInteger(x) && x >= AVATAR_MIN[i] && x <= AVATAR_MAX[i]);

function completo(f: FilaPerfil, carrera: { score: number; titles: number; caps: number } | null): PerfilCompleto {
  return {
    apodo: f.apodo, avatar: esAvatar(f.avatar) ? f.avatar : null, club: f.club, seleccion: f.seleccion,
    estadisticas: {
      jugadas: f.jugadas, victorias: f.victorias, empates: f.empates, derrotas: f.derrotas,
      rachaTipo: f.racha_tipo, rachaN: f.racha_n, mejorRachaV: f.mejor_racha_v, puntos: f.puntos, posicion: f.posicion,
    },
    mejorCarrera: carrera ? { score: carrera.score, titles: carrera.titles, caps: carrera.caps } : null,
  };
}

/** La mejor carrera es solo lectura y accesoria: si el ranking de carreras falla, el perfil se muestra igual. */
const carreraDe = (id: string) => mejorCarrera(id).catch(() => null);

export async function GET(req: Request) {
  try {
    const espera = limitar(`perfil-ip:${ipDe(req)}`, LIMITES.ipSala);
    if (espera) return limitado(espera);
    const quien = await identificar(req);
    if (!quien.ok) return fallo(quien.error, { status: quien.status });
    const e2 = limitar(`perfil-get:${quien.id}`, LIMITES.perfilGet);
    if (e2) return limitado(e2);
    const [fila, carrera] = await Promise.all([leerPerfil(quien.id), carreraDe(quien.id)]);
    return fila ? responder(200, completo(fila, carrera)) : fallo('sin_perfil');
  } catch (e) {
    registrar('perfil-get', e);
    return fallo('error');
  }
}

export async function PUT(req: Request) {
  try {
    const ip = limitar(`perfil-put-ip:${ipDe(req)}`, LIMITES.perfilPutIp);
    if (ip) return limitado(ip);
    const cred = credencial(req);
    if (!cred) return fallo('sin_credencial');
    const dev = limitar(`perfil-put:${cred.id}`, LIMITES.perfilPut);
    if (dev) return limitado(dev);

    // Todo se valida antes de tocar la base: tipos, largos, alfabetos y listas cerradas; ningún campo de más (A03).
    const b = await leerJson(req);
    if (!b || Object.keys(b).some((k) => !['apodo', 'avatar', 'club', 'seleccion'].includes(k)) || Object.keys(b).length !== 4) return fallo('entrada_invalida');
    const apodo = validarApodo(b.apodo);
    if (!apodo.ok) return fallo('apodo_rechazado', { mensaje: apodo.motivo });
    if (!esAvatar(b.avatar)) return fallo('entrada_invalida', { mensaje: 'Avatar inválido.' });
    const club = b.club === null ? null : typeof b.club === 'string' && CLUB_IDS.has(b.club) ? b.club : undefined;
    const seleccion = b.seleccion === null ? null : typeof b.seleccion === 'string' && COUNTRY_CODES.has(b.seleccion) ? b.seleccion : undefined;
    if (club === undefined) return fallo('entrada_invalida', { mensaje: 'Club inválido.' });
    if (seleccion === undefined) return fallo('entrada_invalida', { mensaje: 'Selección inválida.' });

    const r = await guardarPerfil(cred.id, cred.hash, { apodo: apodo.apodo, avatar: b.avatar, club, seleccion });
    if (!r) return fallo('sin_credencial', { status: 403 }); // el id ya pertenece a otro token
    const [fila, carrera] = await Promise.all([leerPerfil(cred.id), carreraDe(cred.id)]);
    return fila ? responder(r.creado ? 201 : 200, completo(fila, carrera)) : fallo('error');
  } catch (e) {
    registrar('perfil-put', e);
    return fallo('error');
  }
}
