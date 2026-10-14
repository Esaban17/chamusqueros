# Mercado con varias ofertas y dinero por contrato

## Problema y valor
Hoy el mercado ofrece un solo club y la decisión es "me voy o me quedo": el jugador no compara ni elige destino. Además el juego no tiene noción de dinero, aunque varios textos hablan de "pisto" y de sueldos.
Pedido del usuario: "que te aparezcan múltiples clubes en el mercado de transferencia y que puedas escoger a cuál irte, además que puedas ver cantidad de dinero que tienes, eso debe de ser acumulable según tus contratos por temporada".
Valor: que cambiar de club sea una elección con comparación (club, liga, país, sueldo, años) y que la carrera deje un resultado tangible: cuánto ganó el jugador.

## Alcance
- Cuando sale la oferta de traspaso, el jugador ve entre 2 y 4 clubes interesados, más la opción de quedarse.
- Todo jugador tiene un contrato: club, salario por temporada y años (1 a 4). Vence y se renueva solo.
- El salario sale del club, la liga, el nivel del jugador y su fama, con una escala creíble por país y división.
- Cada temporada suma el salario al dinero acumulado. Se ve siempre, en cada temporada del historial y en el resumen final.

## Fuera de alcance
Gastos, inversiones, cláusulas de rescisión, primas por títulos o goles, negociar el sueldo, que el dinero afecte el puntaje, el ranking o los eventos, y mostrar el dinero en la carta de carrera compartida. Que los eventos existentes suban o bajen el dinero (ver Decisiones). Cambiar la frecuencia de las ofertas. Tocar la Selección y el cambio de nacionalidad (otra feature en paralelo).

## Requisitos funcionales
- **RF-01** Cuando sale la oferta de traspaso, el jugador ve entre 2 y 4 clubes distintos entre sí y distintos de su club actual, más "Me quedo". Si el mercado no tiene un segundo club coherente, se muestra solo uno, como hoy.
- **RF-02** Las ofertas son coherentes con el jugador: al menos una es de un club de mayor prestigio que el actual; con 3 o más, al menos una es de prestigio parecido (a 8 puntos o menos del actual); ninguna supera el mayor entre (nivel del jugador + 6) y el prestigio del club actual. Un club del extranjero solo aparece si el jugador tiene 30 años o menos, nivel 64 o más (o ya juega afuera) y está en primera división (o afuera).
- **RF-03** Cada oferta muestra club, liga, país, salario por temporada (en la moneda de la nacionalidad del jugador) y años de contrato. El texto de la decisión muestra el contrato actual: salario y años que le quedan.
- **RF-04** La frecuencia con que sale la oferta no cambia: mismas condiciones y misma probabilidad que hoy.
- **RF-05** Elegir un club lo firma con el salario y los años mostrados; "Me quedo" conserva el contrato actual sin cambios. Irse rompe el contrato vigente sin penalización ni compensación.
- **RF-06** El jugador siempre tiene un contrato (club, salario, años de 1 a 4): desde el debut y en todo cambio de club, sea por oferta, por un evento o por falta de minutos. En cambios sin elección, los términos se calculan al momento y el resultado de la decisión los muestra.
- **RF-07** Cuando los años del contrato se acaban, se renueva solo con el club actual: salario recalculado con el nivel y la fama de ese momento, años de 1 a 4. Nunca queda un contrato vencido.
- **RF-08** El salario depende del prestigio del club, de la liga y el país donde juega, de la división, del nivel del jugador y de su fama; sube si cualquiera de ellos sube y los demás se mantienen. No depende de la nacionalidad del jugador: el mismo club paga lo mismo a cualquiera.
- **RF-09** Cada temporada simulada suma al dinero acumulado el salario de su contrato vigente, aun si el jugador estuvo lesionado o sin minutos. El acumulado es la suma de lo ganado en cada temporada.
- **RF-10** El encabezado del jugador muestra siempre el dinero acumulado y el contrato actual (salario por temporada y años restantes): en el debut, en cada decisión y en cada resumen de temporada.
- **RF-11** Cada temporada del historial y del resumen muestra lo ganado esa temporada; el resumen final de carrera muestra el total.
- **RF-12** Los montos se muestran en la moneda y con el símbolo de la nacionalidad del jugador, en forma legible y con el estilo de `money()` (punto decimal, símbolo de la tabla de países sin espacio añadido): "Q850", "Q25.5 mil", "Q150 mil", "Q1.2 M", "Q2.9 mil M". Un decimal si el número es menor que 100. El mismo monto se ve igual en todas las pantallas.
- **RF-13** El dinero solo se muestra: no cambia el puntaje, el veredicto, el ranking ni la elección de eventos, y no se envía al ranking.

## Criterios de aceptación
- **CA-1** Dadas 5.000 carreras, cada oferta tiene entre 1 y 4 clubes, sin repetidos ni el club actual; al menos el 95 % tiene 2 o más. Siempre hay un club de mayor prestigio que el actual y ninguno rompe la cota de RF-02. (RF-01, RF-02)
- **CA-2** Dadas las ofertas con 3 o más clubes, al menos el 80 % incluye uno de prestigio parecido; se reporta el porcentaje de ofertas con un club del extranjero, que solo existe para jugadores elegibles según RF-02 y es mayor que 0 %. (RF-02)
- **CA-3** Dada una oferta, cada opción muestra club, liga, país, salario y años (1 a 4), y el texto muestra el contrato actual. (RF-03)
- **CA-4** Dadas 5.000 carreras antes y después del cambio, las ofertas por carrera difieren menos de 15 % y el puntaje medio menos de 5 %; la distribución de veredictos no se mueve más de 3 puntos porcentuales en ninguno. (RF-04, RF-13)
- **CA-5** Dado un jugador que elige un club ofrecido, su club y su contrato quedan exactamente como los mostrados; dado uno que se queda, el contrato no cambia. (RF-05)
- **CA-6** Dadas 5.000 carreras, en cada decisión el jugador tiene contrato con años restantes de 1 a 4; tras cualquier cambio de club hay un contrato nuevo del club nuevo; ninguna temporada se juega con contrato vencido. (RF-06, RF-07)
- **CA-7** Dados dos fichajes idénticos salvo una variable (prestigio, liga, división, nivel, fama), el de valor mayor paga igual o más; dos jugadores de distinta nacionalidad en el mismo club firman el mismo salario. (RF-08)
- **CA-8** Dados salarios al firmar, las medianas por referencia caen en estas bandas (quetzales por temporada): Segunda División de Guatemala, 12.000 a 45.000 (decenas de miles); Primera División de Guatemala, 30.000 a 120.000; Liga Nacional de Guatemala, 150.000 a 600.000 (la cima nacional: cientos de miles); clubes con prestigio propio de 72 o más en España, Inglaterra, Alemania, Italia o Francia, 20 M a 150 M. Ningún salario individual supera 600 M (unos 72 M de euros) y ninguno de Liga Nacional pasa de 1,5 M (una estrella ronda el millón). (RF-08)
- **CA-9** Dadas 5.000 carreras, el dinero final es igual a la suma de lo ganado en cada temporada, y cada temporada trae un salario mayor que cero igual al del contrato con el que se jugó. (RF-09)
- **CA-10** Dado el debut, una decisión y un resumen de temporada, el encabezado muestra dinero acumulado y contrato; el historial muestra lo ganado por temporada y el resumen final, el total. Los formatos de RF-12 se cumplen con estos casos: 850 quetzales, 25.500, 150.000, 1.234.567, 2.900.000.000 y, para un español, 10.000.000 quetzales como "€1.2 M". Un jugador no guatemalteco nunca ve "Q". (RF-10, RF-11, RF-12)
- **CA-11** Dadas 5.000 carreras, se reporta el dinero final de carrera (p50 y p90) para Guatemala y para España, Argentina y Brasil juntas; el p50 de la potencia es mayor que el de Guatemala. (RF-08, RF-09)
- **CA-12** Dado un club con `<b>x</b>` en el nombre, la pantalla de oferta lo muestra como texto, sin marcado. El envío al ranking no trae ningún campo de dinero. (RF-13)

## Decisiones (defaults razonables)
- **Ofertas** (del orquestador): entre 2 y 4 clubes de niveles distintos (uno mejor, uno parecido, a veces uno del extranjero) más quedarse; la lógica de elegir clubes reutiliza la que ya usa el mercado. El club mejor es el mismo que ya ven los eventos del mercado.
- **Contrato** (del orquestador): club, salario por temporada, 1 a 4 años; renovación automática al vencer; si aparece una oferta antes, el jugador decide.
- **Cambios de club que no vienen de la oferta** (resultados de eventos con traspaso y la baja por falta de minutos): no tienen pantalla de elección, así que firman un contrato automático con salario calculado al momento y años al azar entre 1 y 4.
- **Salario** (del orquestador): depende de prestigio y liga del club, nivel y fama; en quetzales internamente, igual que la convención de montos existente (conversión desde quetzales). Se mide con el prestigio propio del club en su país más el nivel de su liga, no con el prestigio visto por el jugador, para que no dependa de la nacionalidad (RF-08). La escala de las divisiones bajas se alinea con el texto existente del sueldo de "1.500 al mes" en el ascenso.
- **"Segunda" y "primera" división**: se usan los nombres del juego; Segunda División es el escalón más bajo de Guatemala (decenas de miles de quetzales), Primera División el intermedio (paga menos que la cima) y Liga Nacional la cima nacional (cientos de miles, cerca de un millón para una estrella). "Primera división, sueldo modesto" del pedido se leyó como la cima de la liga de origen.
- **Dinero acumulado**: se deriva de las temporadas, sin saldo aparte; así no puede descuadrarse (RF-09).
- **Efecto de dinero en eventos**: queda fuera. Los eventos que hablan de pisto (remesas, agente informal, sueldo atrasado) tienen montos sueltos en sus textos; sumarles un efecto exige calibrar cada uno, manejar saldo negativo y rompería "acumulado = suma de temporadas". Un campo sin evento que lo use sería código muerto.
- **Persistencia**: el juego no guarda carreras en curso, solo las mejores en el navegador y el ranking; no hay datos viejos que migrar.
- **Formato de montos**: un solo estilo, el de `money()` (punto decimal y coma de miles). `moneyShort` agrega las abreviaturas "mil" y "M" ("Q1.2 M", "Q350 mil") con el símbolo de cada país tal como está en la tabla. `money()` no cambia.
- **Cambio de nacionalidad** (feature paralela): los montos se guardan en quetzales y se convierten al mostrarlos con la nacionalidad vigente, así que un cambio de nacionalidad cambia la moneda mostrada sin tocar los datos.

## Aclaraciones resueltas (por el orquestador)
1. **Sueldos**: "primera división, sueldo modesto" es la **cima** de la liga de origen (en Guatemala, Liga Nacional); Primera y Segunda División pagan menos. Referencias en quetzales por temporada: Segunda de Guatemala, decenas de miles; Liga Nacional, de cientos de miles a cerca de un millón para una estrella; élite europea, decenas o cientos de millones. CA-8 se recalibró con esto.
2. **Formato de montos**: un solo estilo, el de `money()` (punto decimal, coma de miles); `moneyShort` da "Q1.2 M" y "Q350 mil" con el símbolo de cada país. No quedan dos estilos.
3. **"Me quedo"**: no renegocia; el contrato sigue igual.
4. **Arabia Saudita y similares**: sin multiplicador especial; una sola escala por nivel de liga.
5. **Dinero en la carta o el ranking**: no. `api/ranking.ts` queda sin cambios.
