// Neon falso para las pruebas del servidor de Retos en línea: una base en memoria detrás de `fetch`, como en scripts/ranking.test.ts.
// Reconoce cada consulta de api/_bd.ts por su etiqueta `/* nombre */` y respeta la misma semántica (condición de versión, ON CONFLICT DO NOTHING,
// token_hash en el reclamo del perfil, ventanas de 24 h). El orden de los parámetros es el de aparición de `${...}` en la plantilla de _bd.ts:
// si se cambia una consulta allá, se cambia aquí (y la prueba falla en voz alta). El esquema real se prueba en db/retos-en-linea.test.sql.
// El reloj sale de Date.now() (las pruebas lo reemplazan) y no hay red: `manejar` devuelve null si la URL no es de Neon.

type Tipo = 'int' | 'float' | 'text' | 'json' | 'bool' | 'int[]';
const OID: Record<Tipo, number> = { int: 23, float: 701, text: 25, json: 3802, bool: 16, 'int[]': 1005 };

export interface JugadorFalso {
  id: string; th: string; apodo: string; avatar: number[] | null; club: string | null; seleccion: string | null;
  puntos: number; jugadas: number; victorias: number; empates: number; derrotas: number;
  racha_tipo: 'V' | 'E' | 'D' | null; racha_n: number; mejor_racha_v: number; llegada: number | null;
}
export interface SalaFalsa { codigo: string; creador: string; estado: any; version: number; creado: number; actualizado: number }
export interface PartidaFalsa { sala: string; num: number; a: string; b: string; puntosA: number; puntosB: number; valida: boolean; cerrada: number }

export function neonFalso() {
  const jugadores = new Map<string, JugadorFalso>();
  const salas = new Map<string, SalaFalsa>();
  const partidas: PartidaFalsa[] = [];
  const carreras = new Map<string, { score: number; titles: number; caps: number }>();
  const carrerasDia = new Map<string, { iniciadas: number; terminadas: number }>();
  const consultas: { tag: string; params: unknown[] }[] = [];
  let fallar: string | null = null;
  const bd = {
    jugadores, salas, partidas, carreras, carrerasDia, consultas,
    /** Se llama antes de resolver cada consulta: sirve para que "otra petición" cambie la sala justo antes de un guardado. */
    gancho: null as null | ((tag: string, params: unknown[]) => void),
    /** Las consultas con esa etiqueta responden 500 (para probar errores sin detalles internos). */
    fallarEn(tag: string | null) { fallar = tag; },
    ranking() { return orden().map((j, i) => ({ pos: i + 1, ...j })); },
    manejar,
    limpiar() { jugadores.clear(); salas.clear(); partidas.length = 0; carreras.clear(); carrerasDia.clear(); consultas.length = 0; fallar = null; bd.gancho = null; },
  };

  const orden = () => [...jugadores.values()].filter((j) => j.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos || b.victorias - a.victorias || (a.llegada ?? 0) - (b.llegada ?? 0));

  function texto(v: unknown, t: Tipo): string | null {
    if (v === null || v === undefined) return null;
    if (t === 'bool') return v ? 't' : 'f';
    if (t === 'json') return JSON.stringify(v);
    if (t === 'int[]') return `{${(v as number[]).join(',')}}`;
    return String(v);
  }
  function resultado(columnas: [string, Tipo][], filas: unknown[][]) {
    return {
      command: 'SELECT', rowCount: filas.length, rowAsArray: true,
      fields: columnas.map(([name, t]) => ({ name, dataTypeID: OID[t] })),
      rows: filas.map((f) => f.map((v, i) => texto(v, columnas[i][1]))),
    };
  }
  const vacio = (comando = 'SELECT') => ({ command: comando, rowCount: 0, rowAsArray: true, fields: [], rows: [] });
  /** `{"1","2","3"}` (así manda neon un arreglo) → [1, 2, 3]. */
  const arreglo = (v: unknown): number[] | null => (typeof v === 'string' ? v.replace(/[{}"]/g, '').split(',').filter(Boolean).map(Number) : Array.isArray(v) ? v.map(Number) : null);

  function consulta(tag: string, p: any[]) {
    switch (tag) {
      case 'hashDe': {
        const j = jugadores.get(p[0]);
        return j ? resultado([['th', 'text']], [[j.th]]) : vacio();
      }
      case 'leerPerfil': {
        const j = jugadores.get(p[0]);
        if (!j) return vacio();
        const pos = orden().findIndex((x) => x.id === j.id);
        return resultado(
          [['apodo', 'text'], ['avatar', 'int[]'], ['club', 'text'], ['seleccion', 'text'], ['puntos', 'int'], ['jugadas', 'int'], ['victorias', 'int'], ['empates', 'int'],
            ['derrotas', 'int'], ['racha_tipo', 'text'], ['racha_n', 'int'], ['mejor_racha_v', 'int'], ['posicion', 'int']],
          [[j.apodo, j.avatar, j.club, j.seleccion, j.puntos, j.jugadas, j.victorias, j.empates, j.derrotas, j.racha_tipo, j.racha_n, j.mejor_racha_v, pos >= 0 ? pos + 1 : null]],
        );
      }
      case 'guardarPerfil': {
        const [id, th, apodo, avatar, club, seleccion] = p;
        const j = jugadores.get(id);
        if (j && j.th !== th) return vacio('INSERT'); // el token no es el de la fila: el DO UPDATE ... WHERE no actualiza nada
        if (j) Object.assign(j, { apodo, avatar: arreglo(avatar), club, seleccion });
        else jugadores.set(id, { id, th, apodo, avatar: arreglo(avatar), club, seleccion, puntos: 0, jugadas: 0, victorias: 0, empates: 0, derrotas: 0, racha_tipo: null, racha_n: 0, mejor_racha_v: 0, llegada: null });
        return resultado([['creado', 'bool']], [[!j]]);
      }
      case 'mejorCarrera': {
        const c = carreras.get(p[0]);
        return c ? resultado([['score', 'int'], ['titles', 'int'], ['caps', 'int']], [[c.score, c.titles, c.caps]]) : vacio();
      }
      case 'rankingRetos': {
        const [yo, tope] = p;
        const o = orden();
        const filas = o.map((j, i) => ({ j, pos: i + 1 })).filter((x) => x.pos <= Number(tope) || x.j.id === yo);
        return resultado([['pos', 'int'], ['apodo', 'text'], ['avatar', 'int[]'], ['puntos', 'int'], ['victorias', 'int'], ['yo', 'bool']],
          filas.map(({ j, pos }) => [pos, j.apodo, j.avatar, j.puntos, j.victorias, j.id === yo]));
      }
      case 'leerSala': {
        const s = salas.get(p[0]);
        return s ? resultado([['estado', 'json'], ['version', 'int'], ['actualizado', 'float']], [[s.estado, s.version, s.actualizado]]) : vacio();
      }
      case 'crearSala': {
        const [codigo, creador, estado, ahora] = p;
        if (salas.has(codigo) || partidas.some((x) => x.sala === codigo)) return vacio('INSERT');
        salas.set(codigo, { codigo, creador, estado: JSON.parse(estado), version: 1, creado: Number(ahora), actualizado: Number(ahora) });
        return resultado([['version', 'int']], [[1]]);
      }
      case 'contarSalas': {
        const [creador, desde] = p;
        return resultado([['n', 'int']], [[[...salas.values()].filter((s) => s.creador === creador && s.creado > Number(desde)).length]]);
      }
      case 'guardarSala': {
        const [estado, ahora, codigo, vista] = p;
        const s = salas.get(codigo);
        if (!s || s.version !== Number(vista)) return vacio('UPDATE');
        Object.assign(s, { estado: JSON.parse(estado), version: s.version + 1, actualizado: Number(ahora) });
        return resultado([['version', 'int']], [[s.version]]);
      }
      case 'cerrarPartida': {
        // estado, ahora, codigo, vista | codigo, num, a, b, pa, pb, valida, ahora | ahora, a, ra, pa, cuentaA, b, rb, pb, cuentaB
        const [estado, ahora, codigo, vista, , num, a, b, pa, pb, valida, , , , ra, , cuentaA, , rb, , cuentaB] = p;
        const s = salas.get(codigo);
        if (!s || s.version !== Number(vista)) return resultado([['version', 'int'], ['cerrada', 'int']], [[null, 0]]);
        Object.assign(s, { estado: JSON.parse(estado), version: s.version + 1, actualizado: Number(ahora) });
        const ya = partidas.some((x) => x.sala === codigo && x.num === Number(num));
        if (!ya) {
          partidas.push({ sala: codigo, num: Number(num), a, b, puntosA: Number(pa), puntosB: Number(pb), valida: valida === true || valida === 'true', cerrada: Number(ahora) });
          const aplicarA = (id: string, r: 'V' | 'E' | 'D', pts: number, cuenta: boolean) => {
            const j = jugadores.get(id);
            if (!j || !cuenta) return;
            const sigue = j.racha_tipo === r;
            j.puntos += pts; j.jugadas++;
            if (r === 'V') j.victorias++; else if (r === 'E') j.empates++; else j.derrotas++;
            const nueva = sigue ? j.racha_n + 1 : 1;
            if (r === 'V') j.mejor_racha_v = Math.max(j.mejor_racha_v, nueva);
            j.racha_n = nueva; j.racha_tipo = r;
            if (pts > 0) j.llegada = Number(ahora);
          };
          aplicarA(a, ra, Number(pa), cuentaA === true || cuentaA === 'true');
          aplicarA(b, rb, Number(pb), cuentaB === true || cuentaB === 'true');
        }
        return resultado([['version', 'int'], ['cerrada', 'int']], [[s.version, ya ? 0 : 1]]);
      }
      case 'historial': {
        const [a, b, , , , , , , desde] = p;
        const par = [a, b].sort().join('|');
        const dentro = partidas.filter((x) => x.cerrada > Number(desde) && [a, b].some((i) => x.a === i || x.b === i));
        const suma = (id: string) => dentro.reduce((t, x) => t + (x.a === id ? x.puntosA : x.b === id ? x.puntosB : 0), 0);
        const previas = dentro.filter((x) => [x.a, x.b].sort().join('|') === par && x.valida).length;
        return resultado([['previas', 'int'], ['suma_a', 'int'], ['suma_b', 'int']], [[previas, suma(a), suma(b)]]);
      }
      case 'limpiar': {
        const [salasAntes, partidasAntes] = p;
        for (const [k, s] of salas) if (s.actualizado < Number(salasAntes)) salas.delete(k);
        for (let i = partidas.length - 1; i >= 0; i--) if (partidas[i].cerrada < Number(partidasAntes)) partidas.splice(i, 1);
        return vacio('DELETE');
      }
      case 'contarCarrera': {
        // ahora, evento, evento. Guatemala es UTC-6 fijo.
        const [ahora, evento] = p;
        const dia = new Date(Number(ahora) - 6 * 3600_000).toISOString().slice(0, 10);
        const f = carrerasDia.get(dia) ?? { iniciadas: 0, terminadas: 0 };
        if (evento === 'iniciada') f.iniciadas++; else if (evento === 'terminada') f.terminadas++;
        carrerasDia.set(dia, f);
        return vacio('INSERT');
      }
      case 'rankingTop': case 'rankingAvatarGet': case 'rankingGuardar': case 'rankingAvatarPost': return vacio();
      default:
        throw new Error(`consulta sin etiqueta conocida: ${tag}`);
    }
  }

  /** null si la URL no es de Neon; si lo es, la respuesta HTTP en el formato del driver. */
  async function manejar(url: string, init?: RequestInit): Promise<Response | null> {
    if (!/^https:\/\/[^/]*neon\.tech\/sql$/.test(url)) return null;
    const { query, params } = JSON.parse(String(init?.body)) as { query: string; params: unknown[] };
    const tag = /^\s*\/\*\s*(\w+)\s*\*\//.exec(query)?.[1] ?? '?';
    consultas.push({ tag, params });
    bd.gancho?.(tag, params);
    if (fallar === tag) return new Response(JSON.stringify({ message: 'detalle interno secreto: password=hunter2', code: 'XX000' }), { status: 400, headers: { 'content-type': 'application/json' } });
    // Una consulta sin etiqueta no es de api/_bd.ts: que la prueba falle en vez de inventar una respuesta.
    return new Response(JSON.stringify(consulta(tag, params as any[])), { headers: { 'content-type': 'application/json' } });
  }
  return bd;
}
export type NeonFalso = ReturnType<typeof neonFalso>;
