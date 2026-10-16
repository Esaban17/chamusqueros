# Continuar mi carrera: retomar una carrera guardada en el dispositivo

Fuente: `specs/backlog.md` (ítem 4, `continuar-carrera`). El usuario aprobó implementar todo el backlog el 2026-10-15. Parte de `contador-carreras` ya integrado: `specs/contador-carreras/plan.md` obliga a que retomar no cuente como carrera iniciada.

## Problema y valor
La carrera vive en la memoria de la pestaña. Dura de 17 a 21 minutos (`specs/ritmo-por-temporada`) y se juega sobre todo en el navegador interno de WhatsApp, que se cierra solo. Quien lo pierde a la mitad no recupera nada: vuelve a empezar o se va. De la carrera cuelgan la carta, el ranking, el compartir y el enlace de donación.
Valor: que cerrar el navegador, perder la señal o quedarse sin batería no tire a la basura 20 minutos de juego.
Usuario beneficiado: el jugador que vuelve al mismo dispositivo y navegador. Sin servidor, sin cuenta, sin costo.

## Alcance
- Guardado automático de la carrera en curso en el dispositivo, sin que el jugador haga nada.
- Botón "Continuar mi carrera" en el Home que la retoma donde quedó.
- Retomar con el mismo resultado que si nunca se hubiera cerrado.
- Lectura defensiva de lo guardado (versión, tamaño, forma) y descarte seguro si no sirve.
- Borrado al terminar la carrera y al empezar otra.
- Texto de `privacidad.html` sobre lo que ahora queda en el dispositivo.

## Fuera de alcance
- Más de una carrera guardada, o varias ranuras. Una por dispositivo.
- Pasar la carrera a otro dispositivo o navegador, copias de seguridad, exportar o importar, cuentas, código de recuperación.
- Guardar en el servidor. No se envía nada a ninguna red.
- Retomar un Reto de Retos Fútbol o una sala en línea.
- Sincronizar dos pestañas abiertas a la vez con la misma carrera (gana la última escritura; ver supuesto S-5).
- Retomar a mitad de la jugada de un minijuego (se retoma al inicio del minijuego; ver RF-05).
- Cambiar el ranking, la carta, el puntaje, el contador o el motor de juego (salvo lo necesario para guardar y restaurar su estado).
- Mensajes emergentes (modales), avisos del sistema o notificaciones.

## Definiciones
- **Carrera guardada**: la copia, en el almacenamiento del navegador del dispositivo, de la carrera en curso.
- **Punto de guardado**: instante en que el juego escribe la carrera guardada (RF-01).
- **Retomar**: abrir la carrera guardada desde el Home con "Continuar mi carrera".
- **Misma carrera**: dadas las mismas elecciones del jugador y los mismos puntajes de minijuego, el jugador final (todos sus datos), su puntaje, su carta y su envío al ranking son idénticos, haya o no habido cortes.

## Decisiones y supuestos
- **D-1** Se guarda el estado completo de la carrera, incluida la decisión que está pendiente tal como se le mostró al jugador, y no solo las elecciones hechas. Razón: así retomar no depende de que el repertorio de eventos sea el mismo entre despliegues.
- **D-2** Guardar es silencioso. Si no se puede (almacenamiento lleno, desactivado o bloqueado), el juego sigue como hoy, sin mensajes.
- **D-3** Una carrera guardada solo es válida si pasa toda la validación (RF-11). Basta un campo malo para descartarla entera. Nunca se "arregla" parcialmente.
- **D-4** Empezar otra carrera borra la guardada cuando se crea el jugador nuevo, no al abrir el formulario. Quien toca "Empezar" por error y vuelve no pierde nada.
- **S-1** (supuesto) Retomar en un despliegue nuevo está permitido mientras la versión del formato de lo guardado sea la actual. Un cambio de contenido (eventos, equilibrio) no invalida; solo un cambio de la forma de lo guardado, que sube la versión del formato (RF-11).
- **S-2** (supuesto) Una carrera que llegó a su retiro y cuya pantalla final no se vio sigue siendo retomable: retomar lleva a la pantalla final. La pantalla final borra lo guardado (RF-09), incluso si el envío al ranking falla o el jugador la cierra sin compartir.
- **S-3** (supuesto) La jugada de un minijuego usa azar propio de la pantalla que no es reproducible por diseño (`specs/minijuegos`). La "misma carrera" se mide con el puntaje del minijuego como dato de entrada.
- **S-4** (supuesto) Una carrera iniciada antes de que existiera esta función no tiene copia guardada; no hay migración.
- **S-5** (supuesto) Con dos pestañas abiertas con la misma carrera, gana la última escritura. Una pestaña vieja que sigue jugando después de que otra terminó la carrera puede volver a guardarla. No se protege: es raro y el daño es una carrera repetida, no pérdida de datos.
- **S-6** (supuesto) Quien llega al final de una carrera retomada envía el aviso "terminada" al contador (es la misma carrera, cuyo "iniciada" ya se envió al crearla). Una carrera creada antes del contador y retomada después puede dar una "terminada" sin "iniciada": efecto despreciable en el dato.

## Requisitos funcionales
- **RF-01** El juego guarda la carrera en estos puntos de guardado: (a) al crear el jugador, antes de que arranque; (b) cada vez que se muestra una decisión, un desenlace de decisión o un minijuego; (c) en el instante en que se resuelve un minijuego, antes de mostrar su resultado; (d) tras cada compra, contratación o despido de la tienda. Entre dos puntos no hay nada que se pueda perder que el jugador no pueda repetir sin diferencia (ver RF-05).
- **RF-02** Hay una sola carrera guardada por dispositivo. Guardar reemplaza lo anterior; el juego no usa más de una entrada de almacenamiento para ella.
- **RF-03** Lo guardado contiene todo lo necesario para que retomar sea indistinguible de no haber cerrado: el jugador completo (datos de creación, historial, palmarés, contrato, tienda), la decisión pendiente, el desenlace en pantalla, lo que falta por sacar en la temporada, la memoria de qué eventos ya salieron y cuándo, y el estado del generador de azar de la carrera.
- **RF-04** Misma carrera: retomar desde cualquier punto de guardado y seguir con las mismas elecciones da el mismo resultado que la carrera sin cortes. Esto vale para cualquier modo, posición, país y para carreras con compras en la tienda.
- **RF-05** Si el jugador cierra a mitad de un minijuego, al retomar vuelve a ver el mismo minijuego (misma situación y dificultad) en su pantalla de inicio, sin resultado. La jugada en curso se pierde. Una vez resuelto, el resultado queda guardado de inmediato: cerrar justo después no permite repetir la jugada.
- **RF-06** Si hay una carrera guardada válida, el Home muestra "Continuar mi carrera" como acción principal, con una línea de resumen (nombre del jugador, posición, edad, temporada y club). "Empezar mi carrera" sigue disponible como acción secundaria. Sin modales ni ventanas emergentes. Voseo en todo texto nuevo.
- **RF-07** Retomar lleva a la pantalla donde se quedó: la de arranque si no había empezado; la decisión pendiente (con su "Decisión n de N"); el desenlace con su botón "Seguir"; o la pantalla final si la carrera ya había terminado. No pasa por el formulario de creación.
- **RF-08** Retomar no cuenta como carrera iniciada: no envía ningún aviso al contador (`specs/contador-carreras`, RF-03). Llegar a la pantalla final de una carrera retomada sí envía el aviso "terminada" (S-6).
- **RF-09** La carrera guardada se borra (a) al mostrarse la pantalla final y (b) al crear un jugador nuevo (D-4). Abrir el formulario de creación y volver al Home no la borra.
- **RF-10** Si hay una carrera guardada, el formulario de creación muestra, junto al botón de crear, una línea que avisa que empezar otra borra la guardada. Sin confirmación emergente.
- **RF-11** Lo guardado se trata como dato no confiable. Al leerlo se valida todo o nada: tamaño máximo, versión de formato exactamente igual a la actual, forma, tipos y rangos de cada campo, longitud de cada texto, que los clubes, países, departamentos y artículos de tienda a los que se refiere existan, y que no haya a la vez una decisión pendiente y un desenlace en pantalla (con ambos, "Seguir" lanzaría y el juego quedaría trabado). Si algo falla (incluida una versión vieja o más nueva), la carrera guardada se descarta entera y se borra, nada se rompe, y el Home muestra un aviso de una línea (sin modal) que dice que no se pudo recuperar y deja "Empezar mi carrera" disponible.
- **RF-12** Todo texto que viene de lo guardado se muestra escapado (nunca como HTML): el resumen del Home y todas las pantallas del juego que pintan datos de la carrera (decisión, desenlace, registro de temporadas, resumen de temporada, Selección y grupos, palmarés, tienda y pantalla final). Hoy esas pantallas confían en el motor y alguna cadena se pinta sin escapar (por ejemplo la etiqueta de temporada); al pasar a venir de un dato no confiable, cada una se escapa o su forma queda fijada por el validador (RF-11).
- **RF-13** Lo guardado no pasa de 200 000 caracteres. Si al guardar se supera, o el almacenamiento falla o no existe, no se guarda, el juego sigue sin mensajes, y se borra la copia anterior para no ofrecer una desactualizada.
- **RF-14** Guardar, leer, retomar y descartar no hacen ninguna petición de red, no agregan dependencias y no cambian el ranking, la carta ni el puntaje.
- **RF-15** `privacidad.html` explica la carrera guardada: qué contiene, que vive solo en el dispositivo y nunca se envía, cuándo se borra y cómo borrarla a mano; y su fecha de última actualización es la del cambio.

## Criterios de aceptación
- **CA-1** (RF-01, RF-03, RF-04) Dadas 24 carreras con semilla fija (3 modos de juego × porteros y delanteros × 4 países de confederaciones distintas, con carreras que pasan al extranjero) jugadas hasta el retiro con una política fija de elecciones que además compra y contrata en la tienda cada temporada, cuando en cada una se guarda, se lee, se valida y se restaura el estado en cada punto de guardado (al menos 100 por carrera) y se sigue con la misma política, entonces el jugador final (comparado campo a campo), el puntaje y la carta coinciden con los de la misma carrera sin cortes, en los 24 casos y en todos los cortes. Además, para al menos 5 cortes por carrera (incluidos el primero y el penúltimo), la restauración y la continuación ocurren en un proceso nuevo del intérprete, sin nada en memoria de la carrera original, y el resultado también coincide.
- **CA-2** (RF-05) Dado un minijuego pendiente guardado con dificultad 0,5 y de tipo penal, cuando se retoma, entonces la decisión pendiente es ese mismo minijuego (tipo y dificultad iguales) y el avance dice "Minijuego de la temporada". Dado que se resuelve con puntaje 0,1 (fallo) y se lee lo guardado en ese instante, entonces la carrera guardada ya no tiene decisión pendiente y su desenlace es el de "fallo"; al retomar de ahí no se vuelve a ofrecer ese minijuego.
- **CA-3** (RF-08, RF-14) Dada una carrera guardada y un `fetch` falso que cuenta llamadas, cuando se retoma desde el Home, entonces hay 0 peticiones al contador y 0 a cualquier otra dirección. Cuando se juega esa carrera retomada hasta la pantalla final, entonces hay exactamente 1 petición con cuerpo `{"evento":"terminada"}`. El código de `src/main.ts` conserva exactamente 1 creación de carrera con los datos del formulario, y exactamente 1 aviso "iniciada", justo después de ella; la ruta de retomar no contiene ninguna llamada al contador.
- **CA-4** (RF-09) Dada una carrera guardada, cuando se abre el formulario de creación y se vuelve al Home, entonces sigue guardada. Cuando se envía el formulario con datos válidos, entonces lo guardado es la carrera nueva (otro nombre) y nunca hay dos. Cuando se llega a la pantalla final, entonces lo guardado desaparece (0 entradas de almacenamiento de la carrera) y el Home no muestra "Continuar mi carrera".
- **CA-5** (RF-11) Dado lo guardado con cada una de estas alteraciones, entonces la lectura lo descarta, borra la entrada, no lanza excepción y el Home se dibuja con el aviso: versión de formato anterior, posterior y ausente; JSON truncado; valor que no es objeto (`null`, lista, número, texto); más de 200 000 caracteres; nivel del jugador 99 y `1e999`; edad -5 y 200; club inexistente; país `ZZ`; artículo de tienda inexistente; una clave `__proto__` entre las banderas; decisión pendiente y desenlace a la vez; un texto de 10 001 caracteres; una lista de temporadas de 10 000 elementos; decisión pendiente sin opciones; un paso de agenda de tipo desconocido; estado del generador de azar negativo, fraccionario o texto; un campo desconocido añadido al jugador. Tras todas ellas, un objeto nuevo `{}` no tiene propiedades heredadas nuevas (sin contaminación de prototipo). Dada una carrera válida, entonces la lectura la acepta y devuelve una copia, no el objeto leído.
- **CA-6** (RF-12) Dado lo guardado válido con el texto `"><img src=x onerror=window.__x=1>` en cada uno de estos lugares, uno a la vez y todos juntos: el nombre del jugador, el texto y las opciones de la decisión pendiente, el desenlace, el nombre de un premio, un título, un hito, la nota de una temporada, el rival de un partido de Selección, el equipo de una fila de grupo, un despido de personal y el nombre de un ítem de la tienda comprado; cuando se abre el Home, se retoma y se recorre el registro de temporadas, el resumen de temporada, la Selección, la tienda y la pantalla final, entonces `window.__x` es `undefined`, no existe ningún elemento `img` con `src=x` ni `script` en el documento, y cada texto que el validador admite se ve literal. Los campos cuya forma el validador fija (por ejemplo la etiqueta de temporada, `AAAA-AA`) rechazan ese texto: la carrera se descarta (CA-5).
- **CA-7** (RF-13) Dadas las 24 carreras de CA-1, entonces el mayor tamaño guardado es de 60 000 caracteres o menos (medido hoy: unos 23 000). Dado un almacenamiento cuyo guardado lanza "cuota excedida", otro cuyo acceso lanza, y la ausencia total de almacenamiento, entonces el juego sigue sin excepciones ni mensajes, y la copia anterior queda borrada. Dado un estado de más de 200 000 caracteres, entonces no se guarda.
- **CA-8** (RF-06) Dada una carrera guardada con el nombre más largo que admite el formulario (16 caracteres) y el apellido más largo (18), todos con letras anchas como "W", a 360x640: el borde inferior de "Continuar mi carrera" queda a 480 px o menos del tope; el de "Empezar mi carrera" (el de arriba) a 560 px o menos (sigue valiendo `specs/home-landing` CA-1); el ancho del documento es de 360 px o menos; ambos botones miden 44 px o más de alto y su texto es de 16 px o más; no hay ningún diálogo ni capa emergente en el documento. Sin carrera guardada, el Home no cambia respecto de hoy.
- **CA-9** (RF-07) Dados cuatro estados guardados (recién creado; decisión pendiente número 2 de 3; desenlace mostrado; retirado) cuando se retoma cada uno, entonces se ve respectivamente: la pantalla de arranque con el club del jugador; la decisión con el texto "Decisión 2 de 3"; el desenlace guardado con el botón "Seguir"; y la pantalla final tras "Ver mi carrera". Ninguno muestra el formulario de creación.
- **CA-10** (RF-02, RF-13) Dadas dos carreras guardadas una tras otra, entonces el almacenamiento contiene 1 entrada nueva de carrera (no 2) y es la segunda. El juego no agrega ninguna otra clave de almacenamiento.
- **CA-11** (RF-10) Dada una carrera guardada, cuando se abre el formulario, entonces aparece una línea con el aviso de que empezar otra borra la guardada. Sin carrera guardada, no aparece.
- **CA-12** (RF-11) Dada una carrera guardada inválida, cuando se abre el Home, entonces se ve el aviso "No pudimos recuperar tu carrera guardada" y "Empezar mi carrera" lleva al formulario; al volver a abrir el Home, el aviso ya no está y la entrada no existe.
- **CA-13** (RF-14) `package.json` y `package-lock.json` no cambian; ni guardar ni leer ni descartar hacen una petición de red (0 llamadas al `fetch` falso). El puntaje y la carta de una carrera retomada son iguales a los de la misma carrera sin cortes (cubierto por CA-1).
- **CA-14** (RF-15) `privacidad.html` contiene una sección "Carrera en curso en tu dispositivo" que menciona que no se envía a ningún servidor, qué contiene, cuándo se borra y cómo borrarla; la frase "Qué queda solo en tu navegador" ya no contradice lo guardado; y su "Última actualización" es la fecha del cambio.

## Seguridad (OWASP Top 10, 2021)
Lo guardado vive en el dispositivo del jugador y él mismo (o un script de la misma página) lo puede editar. La amenaza real no es hacer trampa (el puntaje del ranking ya lo calcula el cliente y esa deuda está aceptada en `specs/backlog.md`): es que un valor guardado rompa el juego o inyecte HTML.
- **A01 Control de acceso**: no aplica, no hay servidor. Lo guardado es del origen del sitio; ningún dato de otro usuario entra.
- **A02 Fallos criptográficos / datos sensibles**: se guardan nombre del jugador y su carrera, nada de contraseñas, tokens ni el identificador del ranking. No sale del dispositivo (RF-14, RF-15).
- **A03 Inyección**: todo texto guardado pasa por escapado al pintarse (RF-12, CA-6); los números se fuerzan a números; nada se evalúa ni se inserta como HTML; los nombres de banderas son claves acotadas por patrón y sin claves de prototipo (CA-5).
- **A04 Diseño inseguro**: validación todo o nada con versión de formato (D-3, RF-11); tope de tamaño (RF-13); descarte seguro en vez de reparar.
- **A05 Configuración de seguridad**: no se agregan cabeceras ni endpoints. Hallazgo heredado: sigue sin haber CSP (`vercel-headers` en el backlog).
- **A06 Componentes vulnerables**: cero dependencias nuevas (RF-14, CA-13).
- **A07 Identificación y autenticación**: no aplica.
- **A08 Integridad de software y datos**: lo guardado es un dato no confiable (RF-11): se construye una copia nueva campo a campo a partir de lo leído, nunca se usa el objeto leído tal cual; sin deserialización de tipos ni funciones.
- **A09 Registro y monitoreo**: no se escribe nada en la consola ni se registra contenido guardado; el descarte es silencioso para el jugador, con el aviso de una línea (RF-11).
- **A10 SSRF**: no aplica, no hay peticiones.
- **Hallazgo fuera de alcance**: `privacidad.html` ya decía "los datos de tu jugador y el historial de tus carreras quedan solo en tu navegador"; las mejores carreras locales y el último jugador (`BEST_KEY`, `LAST_SETUP_KEY`) existen hace tiempo. Esta feature solo ajusta el texto de lo que ella agrega.

## Aclaraciones
Ninguna bloqueante. Los supuestos S-1 a S-6 están anotados arriba y el usuario puede refutarlos sin rehacer el spec.

## Esfuerzo
M alto, sin llegar a L (ver `plan.md`, "Esfuerzo y riesgo de L").
