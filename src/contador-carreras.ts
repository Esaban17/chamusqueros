// Aviso anónimo de carrera iniciada o terminada (specs/contador-carreras). Una petición por llamada, sin esperar, sin reintentos, sin cabeceras del juego,
// sin almacenamiento y sin mensajes: si falla por lo que sea, el juego sigue igual. En `npm run dev` no hay /api y falla en silencio.
export function contarCarrera(evento: 'iniciada' | 'terminada'): void {
  try {
    fetch('/api/carreras', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ evento }),
      keepalive: true, credentials: 'omit', // keepalive: que "terminada" no se pierda si cierran la pestaña justo al llegar al final
    }).catch(() => {});
  } catch { /* fetch lanzó de forma síncrona: ignorar */ }
}
