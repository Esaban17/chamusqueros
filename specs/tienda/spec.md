# Tienda de estilo de vida: gastar el dinero de la carrera

## Problema y valor
Hoy el dinero es solo un marcador: la suma de los salarios de cada temporada (`specs/mercado-contratos`). El jugador acumula millones que no puede usar, y un retiro con Q500 M o con Q2 M se siente igual.
Pedido del usuario: "una tienda donde gastar el dinero de tu carrera en cosas que mejoran tu calidad de vida: casas, carros normales y de lujo, aviones, helicópteros, yates, contratar personal, entrenadores personales, chefs", con categorías por estrellas según la calidad.
Valor: que el dinero tenga destino y decisión (¿casa o entrenador?, ¿cuánto personal puedo sostener?), que una carrera rica se note en el resumen final ("Mansión ★★★★★ · Yate ★★★") y que todo esto sea un adorno con efecto chico: gastar no puede volver estrella a un jugador mediocre ni mover el ranking.

## Alcance
- El dinero pasa a ser **saldo** = ganado − gastado; el saldo nunca baja de 0.
- Un catálogo de 42 ítems en cinco categorías, cada ítem de 1 a 5 estrellas (sección "Catálogo"): vivienda, carros, transporte de élite, personal y vida social.
- Compras únicas (vivienda, carros, transporte), personal con costo por temporada y vida social de gasto puntual.
- Efectos acotados: ánimo, fama, progreso del nivel (entrenador), físico y riesgo de lesión (chef y fisioterapeuta).
- Una pantalla "Tienda" accesible desde la pantalla de decisiones y desde el resumen de cada temporada, y el resumen final con lo ganado, lo gastado, el saldo y lo más importante que compró.

## Fuera de alcance
- Inversiones, préstamos, deudas, impuestos, mantenimiento de los bienes y cualquier interés o rendimiento del saldo.
- **Vender o devolver lo comprado** (ver D-06). Reemplazar una vivienda o un carro no reembolsa nada.
- Que el saldo o las compras entren al ranking, a la carta compartida, a `shareText` o a la imagen de la carrera.
- Regalos, donaciones, familia como personajes, nombres propios del personal.
- Eventos nuevos de decisión por la tienda (las compras no abren ni cierran eventos).
- Un riesgo base de lesión por temporada (ver Aclaraciones resueltas, punto 5).
- **Exclusión de contenido, no negociable:** nada que pague por sexo, compañía o "mujeres", ni nada que trate a personas como mercancía (ver "Contenido sensible").

## Contenido sensible
El juego es apto para todo público. Se alinea con RS-01 a RS-07 de `specs/vida-sentimental` y se verifica leyendo todos los textos de la tienda (nombres, descripciones, avisos, resultados) y, donde se puede, con búsqueda automática.
- **RC-01 Sin servicios sexuales ni compañía pagada.** Ningún ítem, texto o aviso ofrece, insinúa o menciona pagar por compañía, citas, sexo, "mujeres", escoltas ni nada parecido. La vida social es fiestas, cenas, un palco y una gala, nada más.
- **RC-02 Las personas no son mercancía.** El personal son profesionales con una función laboral clara (cocina, entrenamiento, fisioterapia, gestión). Se "contrata" y "deja de trabajar contigo"; nunca se "compra" ni se "posee" a alguien, y ningún texto lo trata como un objeto o un lujo.
- **RC-03 Sin alcohol, drogas ni apuestas como gracia.** Ninguna fiesta, cena o palco los menciona como atractivo.
- **RC-04 Sin marcas ni personas reales.** Los carros, aviones y yates son genéricos ("deportivo de lujo", "jet privado"), sin marcas, modelos ni nombres de personas reales.
- **RC-05 Revisión.** La búsqueda automática de términos no basta: una persona lee cada texto contra RC-01 a RC-04 antes de cerrar la feature.

## Catálogo
Los precios están en quetzales (la convención de los montos del juego) y se muestran en la moneda de la nacionalidad con `moneyShort` ("Q50 mil", "€6 mil"). La escala es la de los salarios del juego (de Q26.000 por temporada en Segunda División de Guatemala a decenas o cientos de millones en la élite europea): cada estrella multiplica el precio por 10, salvo la última, que multiplica por 5. Medido con `npm run simulate` (decisiones al azar, 4.000 carreras, quetzales): carrera completa en Guatemala p50 Q2,5 M y p90 Q8,4 M; en España, Argentina y Brasil p50 Q146 M y p90 Q526 M; todos los países p50 Q29 M, p90 Q341 M y p99 Q953 M.

**Vivienda** (compra única; un solo espacio, la de más estrellas reemplaza; efecto: ánimo por temporada)
| ★ | Ítem | Precio | Ánimo |
|---|---|---|---|
| 1 | Apartamento | Q50.000 | +1 |
| 2 | Casa en residencial | Q500.000 | +2 |
| 3 | Casa con jardín y piscina | Q5 M | +3 |
| 4 | Residencia de lujo | Q50 M | +4 |
| 5 | Mansión | Q250 M | +5 |

**Carros** (compra única; el garaje es una **colección**: se pueden tener varios, hasta 6, y el mismo modelo no se compra dos veces; el ánimo por temporada cuenta solo el mejor carro; la fama se da una vez por cada compra y entra en el tope global de fama de la tienda)
| ★ | Ítem | Precio | Ánimo | Fama |
|---|---|---|---|---|
| 1 | Carro normal | Q25.000 | 0 | 0 |
| 2 | Carro nuevo | Q300.000 | +1 | 0 |
| 3 | Camioneta premium | Q3 M | +1 | +1 |
| 4 | Deportivo | Q30 M | +2 | +2 |
| 5 | Deportivo de lujo | Q120 M | +2 | +3 |

**Transporte de élite** (compra única; tres espacios, uno por tipo, el de más estrellas reemplaza dentro de su tipo; solo se compra con un saldo de al menos 1,5 veces el precio; efecto: fama una sola vez y ánimo por temporada)
| ★ | Ítem | Precio | Saldo mínimo | Ánimo | Fama |
|---|---|---|---|---|---|
| 3 | Helicóptero ligero | Q45 M | Q67,5 M | +1 | +2 |
| 4 | Helicóptero ejecutivo | Q150 M | Q225 M | +2 | +3 |
| 3 | Yate de 12 metros | Q60 M | Q90 M | +1 | +2 |
| 4 | Yate de 25 metros | Q200 M | Q300 M | +2 | +3 |
| 5 | Superyate | Q700 M | Q1.050 M | +3 | +4 |
| 4 | Avión turbohélice | Q250 M | Q375 M | +2 | +3 |
| 5 | Jet privado | Q600 M | Q900 M | +3 | +4 |

**Personal** (cuatro roles; un nivel por rol a la vez; la tarifa se cobra al cierre de cada temporada mientras esté contratado)
| ★ | Tarifa por temporada | Descriptor de cada rol |
|---|---|---|
| 1 | Q6.000 | ayudante, de barrio, de medio tiempo |
| 2 | Q60.000 | con experiencia |
| 3 | Q600.000 | profesional certificado |
| 4 | Q6 M | de primer nivel |
| 5 | Q30 M | de élite mundial |

| Rol | Efecto por estrella (1 a 5) |
|---|---|
| Entrenador personal | El avance de nivel por la brecha con el potencial sube +1 % por estrella (+1, +2, +3, +4, +5 %), solo hasta los 29 años |
| Chef | Físico +0,4 por estrella al cierre de cada temporada; evita una lesión de evento con 3 % por estrella |
| Fisioterapeuta | Físico +0,3 por estrella al cierre de cada temporada; evita una lesión de evento con 8 % por estrella |
| Asistente o mánager | Ánimo +1, +1, +2, +2, +3 por temporada |

**Vida social** (gasto puntual; no se posee, se puede repetir; efecto inmediato de ánimo y fama; ver RF-17 sobre el abuso)
| ★ | Ítem | Precio | Ánimo | Fama |
|---|---|---|---|---|
| 1 | Parrillada con amigos | Q5.000 | +1 | 0 |
| 2 | Cena de lujo | Q300.000 | +1 | 0 |
| 3 | Fiesta VIP | Q3 M | +2 | +1 |
| 4 | Palco propio | Q30 M | +2 | +2 |
| 5 | Gala benéfica | Q100 M | +3 | +4 |

Conteo: 5 + 5 + 7 + 20 + 5 = 42 ítems.

Los efectos de esta tabla son los **calibrados en T7** (ver "Calibración"): la primera versión del spec traía ánimo social de +2 a +8, fama de +1 a +14, entrenador de +4 % por estrella y ánimo base con tope 8, y con la política que más gasta movía el puntaje medio +13 % y el Mundial +3,2 puntos (el criterio de CA-10 es 5 % y 1,0 punto). Cada efecto por separado movía entre 1 y 6 puntos de puntaje, así que se bajaron todos.

## Requisitos funcionales

### Saldo
- **RF-01** El saldo es lo ganado menos lo gastado. Lo ganado es la suma de los salarios de las temporadas jugadas (como hoy, sin cambios). Lo gastado es la suma de lo pagado en compras y de las tarifas de personal cobradas. No existe un saldo guardado aparte: se deriva siempre, así que no puede descuadrarse.
- **RF-02** El saldo nunca es negativo. Una compra o contratación que el saldo no alcanza a pagar se rechaza sin cambiar nada: ni saldo, ni historial, ni estado del jugador.
- **RF-03** El encabezado del jugador muestra "Saldo" (en lugar de "Ganado") junto con el contrato actual, en el debut, en cada decisión y en cada resumen de temporada, en la moneda de la nacionalidad y con el formato de `moneyShort`. El mismo monto se ve igual en todas las pantallas.
- **RF-04** El resumen final muestra tres cifras: ganado, gastado y saldo. Ganado es la suma de lo ganado por temporada y saldo es ganado menos gastado.
- **RF-05** El saldo, lo gastado y las compras no se envían al ranking ni aparecen en la carta compartida. `api/ranking.ts` queda sin cambios.

### Catálogo
- **RF-06** El catálogo es el de la sección "Catálogo": cinco categorías y 42 ítems, cada uno con nombre, estrellas de 1 a 5, precio en quetzales y efecto.
- **RF-07** Dentro de un mismo espacio (vivienda, carro, helicóptero, avión, yate, y cada rol de personal), más estrellas implica un precio estrictamente mayor y un efecto mayor o igual.
- **RF-08** Los precios guardan la escala del juego. Todo ítem de compra única de 2 o más estrellas cuesta al menos Q300.000 (más de 5 temporadas del salario p90 de Segunda División de Guatemala, Q45.000). Toda tarifa de personal de 2 o más estrellas supera ese mismo salario de Q45.000 por temporada. El transporte de élite cuesta Q45 M o más.

### Compras
- **RF-09** La vivienda es un solo espacio; el transporte tiene tres (helicóptero, avión, yate). En un espacio no se puede comprar un ítem de igual o menos estrellas que el que ya se tiene (no se duplica ni se baja). Comprar uno de más estrellas lo reemplaza, sin reembolso. Los carros son una colección: se puede tener varios (hasta 6, un tope que con los 5 modelos del catálogo no se alcanza y protege si se agregan modelos) y se rechaza solo repetir el mismo modelo.
- **RF-10** El transporte de élite solo se puede comprar con un saldo de al menos 1,5 veces su precio. Si no se cumple, el ítem se muestra con el saldo que pide.
- **RF-11** La validación vive en el motor. Rechaza, con un motivo en texto, estos casos: ítem inexistente, jugador retirado, ítem de otro tipo (comprar personal o contratar un bien), saldo insuficiente, ya se tiene ese ítem o uno mejor en el espacio (o ese carro, o el garaje está lleno), y saldo bajo la reserva del transporte de élite. La interfaz no calcula nada: pregunta al motor.
- **RF-12** Cada compra queda en el historial del jugador con año, ítem, precio pagado y, si dio fama, cuánta. Comprar y contratar no consumen azar, salvo el riesgo del abuso social (RF-17).

### Personal
- **RF-13** Cada rol (entrenador personal, chef, fisioterapeuta, asistente) admite un solo contratado a la vez, de 1 a 5 estrellas. Su tarifa se cobra al cierre de cada temporada simulada, después de abonar el salario de esa temporada, mientras esté contratado.
- **RF-14** Contratar exige un saldo de al menos la tarifa de una **temporada** (no del bloque completo; ver D-09). Contratar un nivel distinto en el mismo rol reemplaza al anterior (subir o bajar); contratar el mismo nivel se rechaza. Despedir es libre, sin costo ni reembolso, y deja de cobrar y de aplicar efectos desde la siguiente temporada.
- **RF-15** Si al cobrar la tarifa el saldo no alcanza, el personal se despide solo: no se cobra, no aplica sus efectos esa temporada y la temporada muestra un aviso con el rol y las estrellas. En ritmo exprés pueden pasar tres cobros seguidos sin que el jugador actúe; el despido automático cubre ese caso y el saldo nunca baja de 0.

### Vida social
- **RF-16** Los cinco ítems de vida social se pagan una vez y dan su ánimo y su fama de inmediato. No se poseen y se pueden repetir.
- **RF-17** Abuso. Se cuentan las compras sociales de las últimas 3 temporadas (la actual y las dos anteriores). La primera y la segunda no tienen riesgo. La tercera da la mitad del ánimo y de la fama, y trae un riesgo de 35 %: 20 % de escándalo y 15 % de distracción. Desde la cuarta no da nada y el riesgo es de 70 %: 45 % escándalo y 25 % distracción. El escándalo resta 5 de fama, 4 de ánimo y 3 de relación con el técnico. La distracción resta 1 de nivel y 2 de ánimo.

### Efectos y topes
- **RF-18** Ánimo base. Vivienda, carro (solo el mejor), transporte y asistente suman puntos de ánimo por temporada que se combinan con rendimientos decrecientes y un tope de +4: una suma nominal de 5 aporta entre 2,7 y 3,0; una de 18 (todo lo anterior en su nivel más alto) aporta entre 3,8 y 4,0; nunca más de 4. El ánimo base se aplica como un corrimiento del punto al que el ánimo vuelve cada temporada.
- **RF-19** La fama de los carros y del transporte se da una sola vez al comprar: cada carro da la suya completa (es una colección) y en el transporte reemplazar suma solo la diferencia con lo que ya había dado ese espacio. La fama total que da la tienda en una carrera (carros, transporte y vida social, sin contar lo que resta un escándalo) no pasa de +40; lo que sobra se pierde.
- **RF-20** El entrenador personal solo multiplica el avance de nivel que viene de la brecha con el potencial, y solo hasta los 29 años. Nunca cambia el potencial, nunca toca el declive de los 30 años en adelante y nunca sube el nivel más de lo que esa brecha deja.
- **RF-21** Chef y fisioterapeuta suman físico al cierre de cada temporada con un tope combinado de +2 (nunca por encima de 100) y evitan una lesión de evento con probabilidad combinada de a lo sumo 40 %. Antes de los 30 años el físico ya vuelve solo a 100, así que el efecto práctico se nota después.
- **RF-22** Determinismo. Un jugador que no compra ni contrata nada vive una carrera idéntica, con la misma semilla, a la que vive hoy. Los sorteos nuevos (lesión evitada, riesgo de abuso social) solo se hacen si hay un ítem que los activa.
- **RF-23** La tienda mueve poco el balance. Con una política que gasta casi todo el saldo, frente a la misma carrera sin tienda, los criterios de CA-10 se cumplen: puntaje, nivel pico, duración de la carrera, Mundiales y veredictos casi no cambian.

### Pantalla
- **RF-24** Hay un botón "Tienda" en la pantalla de decisiones (con una decisión pendiente o con el resultado de la anterior) y en el resumen de cada temporada. Abre la pantalla de tienda y "Volver al juego" regresa exactamente al mismo punto, con la decisión, el resultado o el resumen intactos (el resumen no vuelve a celebrar un título). No hay botón en el debut, cuando el jugador se retiró ni con un minijuego pendiente sin resolver en la pantalla de decisiones (abrir la tienda lo reiniciaría a mitad de la jugada); desde el resumen de temporada sí, porque la decisión que sigue todavía no se mostró.
- **RF-25** La pantalla muestra, de arriba hacia abajo: el saldo; el panel "Lo que tenés" (vivienda, carros y transporte comprados, y el personal contratado con su tarifa total por temporada y un botón para dejar de trabajar con cada uno, sin costo ni confirmación); y las cinco categorías en acordeones que conservan lo abierto. Cada ítem muestra su nombre, sus estrellas como "★★★☆☆", su precio en la moneda de la nacionalidad, su efecto resumido y su estado: disponible, "lo tenés", "contratado", "no alcanza" (con lo que falta) o el saldo que pide el transporte de élite. Los textos usan el voseo del resto del juego.
- **RF-26** Toda compra se confirma antes de pagar, dentro de la propia pantalla (sin diálogos del navegador). La confirmación muestra ítem, precio y saldo resultante; si ese saldo no cubre la tarifa del personal contratado (calculado por el motor), lo advierte. Al confirmar, el saldo se actualiza y la pantalla sigue en la tienda con un aviso de lo comprado (sin volver al juego solos, para poder hacer varias compras seguidas); "Volver al juego" aparece arriba y abajo.
- **RF-27** La pantalla funciona a 360 px de ancho sin scroll horizontal y con objetivos táctiles de al menos 44 px. No usa imágenes externas: los íconos son SVG de trazo, en el estilo de `ICON` de `src/ui/palmares.ts`. Las estrellas llevan texto accesible ("3 de 5 estrellas"). Todo texto dinámico pasa por `esc()`.
- **RF-28** El resumen final muestra lo más importante que el jugador compró: hasta 4 bienes (vivienda, carro, transporte) de mayor precio, de la forma "Mansión ★★★★★ · Yate de 12 metros ★★★" (con el nombre completo del ítem). Los carros cuentan uno por uno. Si no compró nada, la línea no aparece.
- **RF-29** El resumen de cada temporada muestra el gasto de personal de esa temporada, si lo hubo, y los avisos de despido automático.

## Criterios de aceptación
- **CA-1** Dadas 5.000 carreras con la política que más gasta, en cada decisión y al terminar, el saldo es igual a ganado menos gastado y nunca es negativo; el ganado final es la suma de lo ganado en cada temporada. (RF-01, RF-02)
- **CA-2** Dado un rechazo de cada tipo (ítem inexistente, jugador retirado, saldo insuficiente, ya lo tiene o uno mejor, reserva del transporte de élite), el motor devuelve un motivo en texto y deja idénticos el saldo, el historial y el estado del jugador. (RF-02, RF-09, RF-10, RF-11)
- **CA-3** Dado el catálogo, tiene 42 ítems, todos con 1 a 5 estrellas y precio mayor que 0, y en cada espacio el precio sube estrictamente y el efecto no baja al subir las estrellas. (RF-06, RF-07)
- **CA-4** Dado un jugador de Segunda División de Guatemala que gana Q45.000 por temporada durante 5 temporadas sin gastar (Q225.000), no alcanza para ningún ítem de compra única de 2 o más estrellas, ni para el transporte, y ninguna tarifa de personal de 2 o más estrellas cabe en un solo salario suyo. Dadas 5.000 carreras con la política que más gasta, ninguna que nunca salió de la Segunda División de Guatemala compra un ítem de 2 o más estrellas (una carrera entera de 21 temporadas a Q45.000 suma unos Q945.000, así que este caso de borde se mide en simulación y no se da por hecho), ninguna con ganado final menor que Q67,5 M (el saldo mínimo del transporte más barato) compra transporte de élite, y se reporta el porcentaje de carreras que alcanza cada nivel de cada categoría para Guatemala, España/Argentina/Brasil y el resto. (RF-08, RF-10)
- **CA-5** Dado un personal contratado con saldo justo, se cobra su tarifa al cierre de la temporada; con saldo insuficiente, se despide sin cobrar, la temporada trae el aviso y el saldo no baja de 0. En 5.000 carreras, lo gastado es siempre la suma de las compras más las tarifas cobradas. (RF-12, RF-13, RF-14, RF-15, RF-29)
- **CA-6** Dados dos jugadores idénticos, en el mismo estado y con el mismo estado del azar, uno sin personal y otro con entrenador de 5 estrellas, al cerrar una temporada con 29 años o menos la diferencia de nivel entre los dos es exactamente 0,05 veces el avance por brecha del primero (o 0 si el avance topa con el máximo de 6 por temporada), y nunca supera la brecha que le quedaba al segundo; el potencial de ambos es el mismo; y con 30 años o más la diferencia de nivel es 0. (RF-20)
- **CA-7** Dada cualquier combinación de ítems, el bono de ánimo no pasa de 4, una suma nominal de 5 da entre 2,7 y 3,0 y una de 18 da entre 3,8 y 4,0; en ninguna carrera la fama que dio la tienda pasa de +40. (RF-18, RF-19)
- **CA-8** Dados el chef y el fisioterapeuta de 5 estrellas, la probabilidad combinada de evitar una lesión es 40 % (con solo uno, la suya) y sin personal es 0; en 20.000 sorteos queda entre 38 % y 42 %; el físico que suman juntos es +2 y nunca pasa de 100. (RF-21)
- **CA-9** Dadas 10.000 ventanas de 4 compras de una misma gala en 3 temporadas: la primera y la segunda no traen escándalo ni distracción; la tercera trae 20 % de escándalo y 15 % de distracción (cada uno con margen de 3 puntos) y da la mitad del ánimo y la fama; la cuarta trae 45 % y 25 % (margen de 3 puntos) y no da nada. (RF-16, RF-17)
- **CA-10** Dadas 5.000 carreras con y sin tienda, con la política prudente y con la que más gasta, y contra la corrida base en `adc673f` (puntaje medio 107,1; p90 204; máximo 705; 21,0 temporadas; Mundial 10,8 %): el puntaje medio sube 5 % o menos; el nivel pico medio sube 1,5 o menos, y 1,0 o menos en jugadores de potencial 70 o menos; las temporadas por carrera suben 0,5 o menos; el porcentaje con Mundial sube 1,0 punto o menos; ningún veredicto se mueve más de 3 puntos; el puntaje máximo sigue por debajo de 1.000; y el percentil 99 de (nivel pico − potencial) sube 1 o menos. Se reportan Mundial, puntaje medio y nivel pico con y sin tienda, la distribución del saldo final (p10, p50 y p90) para Guatemala, España/Argentina/Brasil y el resto, y las 10 compras más comunes. (RF-18 a RF-23)
- **CA-11** Dadas 300 carreras sin ninguna compra, con las mismas semillas y decisiones, sus temporadas (nivel, partidos, goles, salario y clubes) son idénticas a las del commit `adc673f`. Se comprueba una sola vez al implementar, porque otras features moverán esa base. (RF-22)
- **CA-12** Dados todos los textos de la tienda (nombres, descripciones, avisos y resultados), la búsqueda automática de términos de RC-01 a RC-04 no encuentra nada y la lectura completa del revisor marca RC-01 a RC-05 como cumplidos. (RC-01 a RC-05)
- **CA-13** Dado un ítem con `<b>x</b>` en el nombre (inyectado en la prueba), la pantalla de tienda lo muestra como texto, sin marcado; un jugador español ve euros y nunca "Q"; las estrellas de un ítem de 3 se leen "★★★☆☆" y "3 de 5 estrellas"; a 360 px de ancho no hay scroll horizontal y los botones miden 44 px o más. (RF-25, RF-26, RF-27)
- **CA-14** Dada una carrera con Mansión de 5 estrellas y Yate de 3, el resumen final muestra ganado, gastado y saldo (con saldo = ganado − gastado) y la línea "Mansión ★★★★★ · Yate de 12 metros ★★★"; sin compras, la línea no aparece. (RF-04, RF-28)
- **CA-15** Dado el envío al ranking de una carrera con compras, no trae ningún campo de saldo, gasto o compras, y `api/ranking.ts` no tiene diferencias. El puntaje máximo de las corridas queda por debajo de 1.000. (RF-05, RF-23)

## Decisiones (defaults razonables)
- **D-01 Saldo derivado** (del orquestador): lo ganado sigue saliendo de las temporadas; lo gastado se guarda como historial de compras y de cobros en el jugador. El saldo se calcula, no se guarda, así que ganado, gastado y saldo no pueden descuadrarse. El saldo nunca baja de 0.
- **D-02 Estrellas** (del orquestador): cada categoría tiene ítems de 1 a 5 estrellas; más estrellas, más precio y más efecto. El transporte de élite solo trae ítems de 3 a 5 estrellas, porque un helicóptero o un yate de 1 estrella no existe en la escala del juego.
- **D-03 Precios** (del orquestador): en quetzales internamente, convertidos con `moneyShort`. La escala multiplica por 10 por estrella (por 5 en la última) porque los salarios del juego abarcan cuatro órdenes de magnitud; una escala de 3 o 4 por estrella dejaría la mansión al alcance de cualquier carrera media y quitaría el sentido de "ahorrar para". Un jugador de Segunda de Guatemala solo llega a 1 estrella (RF-08, CA-4); yates, aviones y helicópteros son para quien gana como la élite europea.
- **D-04 Rendimientos decrecientes y topes** (del orquestador): el dinero no vuelve estrella a un mediocre. El entrenador solo acelera el camino al potencial que el jugador ya tiene y nunca lo cambia (RF-20); el ánimo total tiene tope +4 (RF-18); la fama de la tienda tiene tope +40 (RF-19), unos 6 puntos de puntaje como máximo (en la práctica, con los valores calibrados, la política que más gasta llega a +31 y casi nadie al tope).
- **D-05 Motor puro** (del orquestador): el motor expone el catálogo, `buy`, `hire`, `fire`, el saldo y la validación; los efectos del personal se aplican dentro de la simulación de temporadas. La interfaz no calcula nada.
- **D-06 Vender queda fuera.** Con un historial de compras, vender sería un asiento negativo, trivial en el motor, pero exige una regla de depreciación, una confirmación y un botón más en cada ítem poseído, y abre la puerta a comprar y revender para sacar fama. No lo pidió nadie. Reemplazar una vivienda o un carro por uno mejor no reembolsa el anterior (RF-09), y el juego lo evita impidiendo comprar uno igual o peor.
- **D-07 El garaje es una colección** (resolución del orquestador): varios carros, hasta 6, sin repetir modelo. El ánimo cuenta solo el mejor carro, así que acumular no apila ánimo; la fama puntual se da por cada compra, pero entra en el tope global de +40.
- **D-08 Cuándo se cobra el personal.** Al cierre de cada temporada, después de abonar su salario y antes de aplicar sus efectos, de modo que se puede pagar con el salario de esa misma temporada y un personal que no se pagó no hace nada. Los efectos sobre nivel, ánimo y físico entran en esa misma cuenta de cierre, así que se notan en la temporada siguiente.
- **D-09 Contratar exige una temporada de reserva** (resolución del orquestador), no el bloque completo. En ritmo exprés un bloque son 3 temporadas, y el despido automático cubre el resto.
- **D-10 Vida social puntual.** Todo gasto social es puntual, incluido el palco ("palco de la temporada"), para no sumar un segundo tipo de gasto recurrente. Lo recurrente es solo el personal.
- **D-11 La fama de la tienda es puntual, no por temporada.** Así la fama (que vale 0,15 de puntaje por punto y se acumula) queda acotada y fácil de verificar; el ánimo, que se normaliza solo cada temporada, sí es por temporada.
- **D-12 Lesiones.** El riesgo de lesión del juego vive en los resultados de las decisiones, no en la simulación de temporadas (que solo cuenta las temporadas lesionado). Por eso chef y fisioterapeuta evitan una lesión cuando una decisión la trae; el efecto es chico por construcción y el beneficio grande es el físico (ver Aclaraciones resueltas, punto 5).
- **D-13 Dónde se ve el saldo.** En el encabezado del jugador, el resumen de temporada y el final; las barras de estado no cambian (son de 0 a 100 y el dinero no es un porcentaje).
- **D-14 Persistencia.** El juego no guarda carreras en curso, solo las mejores y el ranking: no hay datos viejos que migrar.

## Cambios a specs anteriores
- `specs/mercado-contratos` **RF-10**: el encabezado pasa de mostrar "Ganado" a mostrar "Saldo" (RF-03 de esta spec). RF-09, RF-11 y los criterios CA-9 y CA-11 siguen valiendo para lo **ganado**, que no cambia.
- `specs/mercado-contratos` **RF-13** ("el dinero solo se muestra") se relaja: el saldo ahora se puede gastar en la tienda, y la tienda sí mueve nivel, ánimo, físico y fama, dentro de los topes de CA-10. Sigue sin entrar al ranking (RF-05) y sin cambiar eventos ni probabilidades.

## Seguridad (resumen; el detalle está en el plan)
Todo es cliente: el saldo y las compras se pueden manipular desde el navegador y es un riesgo aceptado, porque no van al ranking (RF-05). La validación de compras vive en el motor (RF-11). Los textos pasan por `esc()` (RF-27). Sin dependencias nuevas.

## Aclaraciones resueltas
Las seis aclaraciones que traía el spec se resolvieron así (el orquestador del proyecto):
1. **Garaje:** es una colección (hasta 6 carros, sin repetir modelo). El ánimo por temporada cuenta solo el mejor carro; la fama puntual se da por cada compra y entra en el tope de +40 (RF-09, RF-18, RF-19, D-07). Con 5 modelos el tope de 6 no se alcanza; se dejó como constante.
2. **Contratar:** alcanza con saldo para una temporada (RF-14, D-09).
3. **Acceso:** desde la pantalla de decisiones y desde el resumen de cada temporada, nunca con un minijuego a medio jugar (RF-24).
4. **Después de comprar:** se queda en la tienda, con "Volver al juego" (RF-26).
5. **Chef y fisioterapeuta:** solo reducen las lesiones de los eventos y dan físico; no hay riesgo base de lesión (D-12).
6. **Escala de precios:** se acepta. La élite (mansión, yate y avión) es para pocos. Revisado en T7: con la política prudente, 97 % de las carreras de Guatemala alcanza al menos el apartamento, 100 % el carro normal y todas contratan algún personal de 1 estrella (ver "Calibración").

## Calibración (T7, `npm run simulate -- 5000`)
Valores iniciales del spec (entrenador +4 % por estrella, ánimo social +2 a +8, fama de carros, transporte y vida social de +1 a +14, ánimo base con tope 8, físico +3) contra la línea base de `adc673f` (puntaje medio 107,1; Mundial 10,8 %): con la política prudente el puntaje medio subía +11,6 % y el Mundial +2,9 puntos; con la que más gasta, +13,3 % y +3,2 puntos. Cada efecto aislado movía entre 0,5 y 6 puntos de puntaje medio y los efectos se suman; el entrenador era el mayor (+6) y el ánimo social el segundo (+3). Se bajó todo hasta cumplir CA-10 con las dos políticas (valores de las tablas de arriba). Resultado (sin tienda / prudente / máximo): puntaje medio 107,1 / 111,5 / 112,1 (+4,1 % y +4,7 %); Mundial 10,8 / 11,5 / 11,6 %; temporadas por carrera 20,96 / 20,95 / 20,96; nivel pico 71,79 / 72,03 / 72,06. Las constantes están en `src/engine/tienda.ts` y la medición vive en la sección "Tienda" de `scripts/simulate.ts`.

Cambios de redacción: el spec usaba "tú" ("Lo que tienes", "lo tienes"); la interfaz usa el voseo del resto del juego ("Lo que tenés", "lo tenés").
