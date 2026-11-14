# VINLUME / Laboratorio óptico — fase 06

**Revisión actual: HQ / resolución e iluminación.** Liquid y Diamond usan ahora un estudio de luz procedural, calculado por fragmento, resolución **3× por defecto / 4× seleccionable**, y fondos con relieve y luz regulable. Diamond usa un HDR fotográfico **4096 × 2048** y permite preparar un **PNG nativo** después de TAA 32. La revisión responde a la observación del usuario de que faltaban nitidez, refracción y luz en el entorno. Se mantiene aislada de producción. Los apartados siguientes conservan las etapas anteriores; las cifras 2×, HDR 1K y textura SVG corresponden a esas etapas históricas. Véase el apartado HQ al final.

**Antecedente: Diamond / sólidos 3D.** Después de evaluar los primeros prototipos, el usuario autorizó investigación web e instalación de herramientas, aprobó la nueva apariencia de cristal y pidió corregir el pixelado y explorar otros objetos. Abrir **[diamond.html](diamond.html)**: VINLUME, monograma V y disco óptico abstracto, con refracción interna y suavizado progresivo. El índice conserva los dos estudios anteriores y enlaza esta tercera alternativa. La documentación inicial de abajo se conserva como registro de esos estudios; sus afirmaciones de «sin dependencias», espesor supuesto y ausencia de medición GPU no describen la revisión Diamond.

**Estudio complementario: [Liquid / controles táctiles](liquid.html).** Botones, interruptor y deslizadores con lentes refractivas sobre controles HTML nativos. El material de interfaz es suave y continuo, diferente de la talla facetada de Diamond. Se abre con el mismo servidor estático, sin nuevas dependencias y sin aplicar cambios al sitio de producción. Ambos estudios están enlazados entre sí.

Estado: **COMPLETADA como laboratorio técnico independiente; aprobación artística e integración pendientes**. Ningún prototipo se integra a Django.

## Abrir

Desde la raíz del repositorio:

```powershell
python -m http.server 8767 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8767/design-lab/optical/`. Si el servidor de revisión ya está activo, basta abrir la dirección. Detener con Ctrl+C en su terminal. El servidor es estático y de loopback: no ejecuta Django, no importa su configuración y no accede a MySQL.

También se puede abrir `index.html` directamente; el servidor es preferible para una revisión consistente. Las referencias se enlazan desde `../../design-references/`, sin copiarlas ni incluirlas en el shader. No hay recursos remotos.

## Investigación y decisión

Se leyeron AGENTS.md, dirección visual, continuidad y guía; se inspeccionaron visualmente las nueve imágenes locales de diamond glass, dispersión, caústicas y liquid glass. Las referencias de diamante tienen planos especulares claros/oscuros y color selectivo; liquid glass aporta transmisión y espesor, pero su blur por sí solo no sirve para este título.

Se inspeccionó en lectura el renderer provisional del Hero y su silueta para conocer la base; no se importaron ni modificaron sus archivos. Se comprobó por resolución local de módulos que Three.js, Playwright y Puppeteer no están instalados en el entorno Node del repositorio. No se instalaron paquetes ni se consultó internet.

| Método evaluado | Beneficio / decisión |
| --- | --- |
| SVG vectorial por caras | Implementado como alternativa gráfica. Polígonos biselados reales en 2D, normales por cara, transparencia y máscara de recorte del fondo desplazado. Respuesta CPU/DOM, sin contexto WebGL. Permite comprobar cuánto material se consigue con una solución simple. |
| WebGL nativo | Implementado como alternativa óptica. Refracción independiente RGB al entrar/salir de un espesor supuesto, reflexión del entorno, Fresnel, especular y caras independientes. Justifica el shader por la separación espectral ligada a luz y normales y la continuidad del fondo refractado. |
| Three.js / material de transmisión | No incorporado. Haría más razonable un sólido 3D con cámara y entorno HDR, pero necesita una dependencia autorizada, geometría volumétrica y más presupuesto de render. No aporta una ventaja necesaria para comparar dos métodos en este laboratorio. |

## Alternativas

**01 / Cristal refractivo — WebGL 1 / GLSL.** Es la opción recomendada para seguir evaluando el título: lee más como vidrio tallado, con luz que atraviesa las caras y bandas que se separan cromáticamente. Usa un estudio procedural compartido por fondo, transmisión y reflexión; no usa fotografías, HDR descargado o una imagen pegada sobre la palabra. El cursor modifica la dirección de luz y posición aparente de los reflectores; cada canal usa un índice distinto y la separación cambia al desplazar la luz. Valor de dispersión 0 permite aislar la contribución RGB.

**02 / Talla editorial — SVG + JavaScript.** Más nítida y gráfica, también más cercana a metal/cristal ilustrado. Cada triángulo recibe iluminación por producto escalar de su normal con la luz y un término especular; las caras tienen transparencia sobre un testigo de fondo recortado/desplazado. El tinte direccional aproxima dispersión, sin refracción física por canal. Sirve como comparación de complejidad, no es equivalente ópticamente al shader. No se utilizan text-shadow, glow ni CSS gradients para construir el material.

Ambas comparten lettering poligonal independiente, biseles y 283 triángulos. Las pequeñas proyecciones debajo se derivan de las mismas caras, sus normales y la luz; son una **aproximación de caústicas**, no un cálculo de transporte de energía ni trazado de fotones. No son líneas aleatorias o partículas decorativas.

## Controles y accesibilidad

- Puntero sobre el escenario; en táctil, toque sin capturar ni bloquear el scroll.
- Azimut, altura y dispersión mediante rangos nativos; Tab y flechas, Inicio/Fin. Foco visible.
- Cambio de método con botones de estado `aria-pressed` y estado de renderer anunciado.
- Nombre VINLUME semántico independiente del canvas. SVG estático visible antes de JavaScript, sin JavaScript, en modo estático y con movimiento reducido.
- `prefers-reduced-motion` tiene prioridad: no se inicializa WebGL ni se programa la respuesta animada. La casilla estática permite revisar el mismo camino de reducción manualmente.
- Sin animación ambiental continua. Suavizado solo tras una interacción y hasta converger. Pausa mediante IntersectionObserver, visibilidad del documento y pagehide. Limpieza de listeners, observers, buffers y programa al abandonar; se conserva recuperación mediante historial/bfcache.

## Rendimiento y comprobaciones efectivas

Revisión en navegador integrado, 2026-11-13. Estos números son muestras de esta sesión, **no un benchmark comparativo ni una garantía para teléfonos físicos**:

| Muestra | Resultado observado |
| --- | --- |
| WebGL, viewport 1440 × 1000, interacción de puntero | Buffer 1310 × 390; 26 dibujos; CPU de envío medio **0,26 ms**, máximo **4,70 ms**. Al estabilizarse: bucle pendiente «no». Al desplazar fuera de pantalla: mismo contador 26 y estado «pausado». |
| SVG, viewport 1280 × 720 | 3 dibujos; CPU de actualización DOM media **2,37 ms**, máximo **3,00 ms**. Sin buffer WebGL ni draw calls GPU del laboratorio. El navegador puede componer SVG con GPU internamente. |
| WebGL, viewport móvil solicitado 390 × 844 | Buffer observado 375 × 112 (ancho disponible tras scrollbar); 3 dibujos; CPU media **0,80 ms**, máximo **2,20 ms**. Sin desbordamiento horizontal. |
| Reducción manual | SVG estático visible, programa/buffer liberados, canvas reducido a 1 × 1, cero draw calls y ningún bucle pendiente. |
| Revisión visual | WebGL y SVG en escritorio y móvil, palabra completa, controles accesibles, respuesta de puntero, rangos por teclado y cambio de modo. Sin errores/advertencias de consola observados en el recorrido final. Nueve referencias locales enlazadas y sin imágenes rotas observadas. |
| Comprobación de código | `node --check lab.js` y `node --check geometry.js`; generador estándar Python ejecutado correctamente. No se ejecutó Django ni ninguna prueba de BD. |

El coste indicado usa `performance.now()` alrededor de envío GL o actualización SVG. Excluye ejecución GPU asíncrona, rasterización/composición y energía. No mide FPS sostenidos ni temperatura. El contador es visible en «Coste y diagnóstico» para reproducirlo localmente; se reinicia al cambiar de técnica.

Presupuesto implementado: máximo 30 actualizaciones/s durante interacción; DPR limitado a 1,5, ancho del buffer limitado a 1800 px (aprox. 1800 × 536 máximo); reducción de escala hasta 0,6 si un envío supera 8 ms; 3 draw calls por actualización (fondo, proyección, material); 849 vértices del material y un quad de fondo; sin texturas, framebuffer intermedio ni bucle en reposo. Se solicita antialias y preferencia GPU de bajo consumo al navegador. La adaptación por CPU no detecta saturación GPU: antes de integrar hay que medir GPU real y equipos lentos.

## Límites y recomendación

- Es un sólido **2,5D**: silueta y biseles proyectados con normales de cara, espesor óptico supuesto y cara de salida aproximada. No hay malla cerrada, cámara orbital, autoclusiones ni múltiples rebotes exactos. El volumen aparente funciona desde esta vista frontal.
- Índice central 1,52, cristal estilizado; no se afirma que reproduzca físicamente diamante. La separación ±0,22 al máximo está deliberadamente exagerada para evaluar el efecto en pantalla.
- La cara interna y la reflexión total se aproximan; las caústicas no conservan energía. SVG usa recorte/desplazamiento y tintes, no Snell por canal. Ninguna opción iguala la fotografía de un diamante real.
- Pendientes: evaluación artística del usuario, GPU/energía y memoria reales, dispositivos físicos, Safari/Firefox, prueba con preferencia reducida real del sistema, contexto perdido/restaurado y JavaScript desactivado en navegador. El camino estático manual sí se revisó.
- Recomiendo continuar con **WebGL solo para la palabra**, con SVG estático como base esencial, si el usuario aprueba su materialidad. No trasladar estas proyecciones ni el entorno del laboratorio al Hero sin ajustar su composición y medir el presupuesto conjunto. Three.js merece reconsiderarse únicamente si se aprueba volumen 3D/cámara con una mejora visual concreta.

## Archivos

`index.html`, `lab.css`, `lab.js`: interfaz y renderizadores; `build.py`: generador reproducible con biblioteca estándar Python; `geometry.js` y `fallback.svg`: derivados generados. Reconstruir con `python design-lab/optical/build.py`. El generador escribe únicamente esos dos derivados dentro del laboratorio. Este README registra la evaluación. Fuera del laboratorio solo se actualizó `docs/PRISMATIC_PROGRESS.md`.

Sin dependencias nuevas, permisos de descarga, rutas Django, estilos globales, assets originales modificados, backend, MySQL, commits o push. La fase termina aquí para evaluación.

## Revisión Diamond — sólido cerrado y nitidez (2026-11-13)

### Ejecutar y comparar

Abrir `http://127.0.0.1:8767/design-lab/optical/diamond.html` con el mismo servidor estático. Las dependencias ya se instalaron localmente. En otro checkout, ejecutar primero `npm ci --ignore-scripts --no-audit --no-fund` dentro de `design-lab/optical/`. Import maps nativos resuelven los paquetes locales; no hay CDN ni peticiones externas en ejecución. Esta revisión necesita HTTP para los módulos ES y el HDR; abrir el HTML por `file://` no es el método soportado.

Instalados exclusivamente aquí: **Three.js 0.187.0** y **three-mesh-bvh 0.9.18**, versiones exactas con lockfile, sin scripts de instalación. Descargado un HDR CC0: **Studio Small 09 / Sergej Majboroda / Poly Haven**, 1 615 248 bytes. Orígenes, licencias y documentación consultada en [SOURCES.md](SOURCES.md). Los tres módulos principales pesan 2 424 553 bytes sin compresión; con el HDR suman 4 039 801 bytes, antes de loaders/postprocesado y código propio. Es un laboratorio de calidad visual, no un bundle de producción optimizado.

### Qué cambia visual y técnicamente

- Cada letra tiene corona, cintura, pabellón y caras posteriores reales. El BVH permite que un rayo que entra encuentre una superficie de salida y rebote dentro del sólido cuando hay reflexión interna total. La geometría ya no se limita a una normal sobre una silueta 2D.
- Refracción de tres trayectorias RGB, Fresnel en la entrada, absorción casi neutra y entorno HDR fotográfico. No existe relleno metálico ni término difuso opaco en el material. El selector permite comparar cristal IOR 1,52 y diamante IOR 2,42, dentro de la misma técnica.
- Un plano real de fondo es muestreado desde el punto/dirección de salida. «Testigo de transparencia» permite observar cómo se altera una trama y el texto PURE LIGHT al atravesar el volumen. El puntero mueve la orientación aparente del estudio y produce una rotación muy pequeña del objeto.
- **Pixelado:** se retiró la reducción automática que podía bajar excesivamente la resolución. El buffer usa 2× el tamaño CSS, hasta 4096 px de ancho. EffectComposer + TAARenderPass + OutputPass acumulan **32 muestras subpíxel** una vez estable la luz; no se aplica blur a las letras. Durante interacción se reinicia la acumulación para no dejar estelas; cuando termina llega a 32/32 y deja de dibujar. Se evita MSAA en la geometría refractiva por los problemas de interpolación/intersección en aristas documentados en el ejemplo oficial; se suaviza mediante supersampling y muestras de cámara.
- Alta: 6 rebotes máximos por canal; Ultra: 10. Ambos usan 32 muestras finales. El contador muestra tanto resolución como progreso real de TAA.
- Pausa al ocultarse/salir de pantalla, incluida consulta GPU pendiente. Reducir movimiento o marcar Estático evita/libera el renderer, BVH, texturas y buffers de acumulación. Se conserva contenido semántico y fallback estático. El modo de movimiento reducido no se puede sobreescribir con los controles.

### Otros objetos de marca

Un solo renderer permite alternar tres sólidos, sin abrir tres contextos GPU:

| Estudio | Geometría comprobada | Uso visual a evaluar |
| --- | --- | --- |
| VINLUME | 696 triángulos | Firma monumental. |
| Monograma V | 72 triángulos | Sello, apertura editorial o identificador de marca. |
| Disco óptico abstracto | 3072 triángulos | Escultura vinculada al universo musical; no representa un producto disponible ni un nuevo Mini CD. |

Se comprobó por script que todos tienen **0 aristas abiertas/mal orientadas** y volumen orientado positivo. Este control de cierre es necesario para el recorrido de rayos; no sustituye una prueba geométrica exhaustiva de todas las posibles autointersecciones. Los originales de producto no se alteraron. Las tarjetas inferiores permiten seleccionar un objeto y devuelven el foco al control del visor.

### Coste y límites

Se añade consulta opcional **EXT_disjoint_timer_query_webgl2** para medir GPU, con resultados disjuntos descartados. No confundirla con el contador CPU del primer prototipo.

Muestra de escritorio 1440 × 1000, buffer **2620 × 873**, VINLUME, diamante IOR 2,42, Alta, TAA **32/32**: **32 dibujos**, CPU media **1,32 ms**, máximo **33,30 ms**; GPU media **12,74 ms**, último **7,35 ms**, **30 muestras**. Bucle detenido al completar. Inicialización con caché caliente: **69 ms**. Una primera visita fría anterior registró **610,60 ms** de envío máximo al compilar/inicializar los passes de postprocesado: hay un coste de arranque real. Son muestras de esta máquina, no FPS sostenidos ni garantías móviles.

En la revisión final, cristal IOR 1,52 / Alta / TAA 32 a la misma resolución: VINLUME CPU media **1,45 ms**, máximo **37,60 ms**, GPU media **8,99 ms**, último **7,46 ms** (30 consultas); monograma V CPU media **0,34 ms**, máximo **3,10 ms**, GPU media **4,47 ms**, último **6,61 ms** (32 consultas). Ambos alcanzaron 32/32 y detuvieron el bucle. Son muestras separadas, no un benchmark controlado entre objetos.

El disco, con 3072 triángulos y más trayectorias internas, resultó considerablemente más costoso en una muestra equivalente: CPU media **0,43 ms**, máximo **5,00 ms**; GPU media **46,76 ms**, último **60,86 ms** (17 consultas). Llegó a 32/32 y se detuvo. Conviene reservarlo como escena exploratoria destacada y presupuestar su calidad específicamente antes de integrarlo. No se recomienda multiplicar instancias con este coste. El renderer solo inicia/dibuja con al menos un 10 % del escenario visible, y pausa por debajo de ese umbral.

Validación de interfaz: 1440 × 1000 y viewport móvil emulado 390 × 844, sin desbordamiento horizontal; tres objetos y dos materiales inspeccionados, selección de V mediante Enter con foco devuelto al selector, luz por puntero, fondo testigo, Ultra y estático/recuperación comprobados. Consola del recorrido final sin errores/advertencias observados. En el viewport móvil, VINLUME cristal/Alta/TAA 32 utilizó **750 × 300**, CPU media **1,66 ms**, máximo **45,40 ms**, GPU media **4,67 ms**, último **3,71 ms** (31 consultas), deteniéndose después de 32 dibujos. Esta emulación utiliza la GPU del ordenador, **no mide un teléfono**. Quedan pendientes teléfonos físicos, otros motores, preferencia reducida real del sistema, JavaScript desactivado y pérdida/restauración de contexto. El fallback manual sí se revisó.

Supersampling y TAA elevan la memoria y el trabajo inicial respecto al prototipo 2,5D. Se acumulan muestras durante un intervalo finito, no continuamente en reposo. Los render targets de acumulación son HDR/half-float. No se midieron energía, temperatura o memoria GPU total; tampoco se afirma que Ultra sea apropiado para producción. La integración necesita elegir calidad por dispositivo y medir el conjunto de la escena, sin volver a introducir pixelado visible.

El renderer traza reflexión interna total y refracción dentro de una malla cerrada, pero **no es un path tracer completo**: no resuelve todas las ramas Fresnel en cada rebote, iluminación global, interreflejos entre objetos ni caústicas físicas proyectadas. Las proyecciones aproximadas de los estudios antiguos no se presentan como caústicas calculadas de esta revisión. RGB es una aproximación de dispersión, no integración espectral. El presupuesto de rebotes es finito. La transparencia depende de la talla y de lo que existe detrás: un diamante real tampoco se comporta como una lámina invisible.

### Alcance y archivos

Nuevos `diamond.html`, `diamond.css`, `diamond.js`, `diamond-geometry.js`, `v-fallback.svg`, `disc-fallback.svg`, `package.json`, `package-lock.json`, `.gitignore`, `SOURCES.md` y `assets/studio_small_09_1k.hdr`. `node_modules/` queda excluido de Git. Se actualizan el enlace/texto de `index.html`, un estilo aislado en `lab.css`, este README y el progreso. Los renderizadores iniciales siguen disponibles.

Todo permanece dentro del laboratorio, salvo la actualización de continuidad. Hero, hub, catálogo, login, estilos de producción, backend, MySQL y assets originales intactos. Sin commit ni push. La implementación en el sitio público requiere una fase de integración aprobada; estos usos de marca son estudios revisables.

## Liquid — botones, interruptor y deslizadores (iteración inicial)

Abrir `http://127.0.0.1:8767/design-lab/optical/liquid.html`. Este estudio responde a la petición de extender el laboratorio a liquid glass para la interfaz. Se inspeccionaron los controles compartidos de producción en lectura: actualmente usan gradientes, reflejos y backdrop blur; no refracción del fondo. Esos archivos no se modificaron. Las referencias locales de liquid glass se revisaron visualmente, sin reutilizarlas como textura del material.

### Material y comportamiento

Un único canvas **WebGL 2 nativo** dibuja nueve lentes en las posiciones de elementos HTML reales: panel, dos botones, dos pistas, dos tiradores y cuerpo/tirador del interruptor. Un shader evalúa contornos redondeados mediante distancia analítica, altura de una lente abombada y sus normales; usa `refract` con índices RGB distintos para desplazar la muestra de fondo. Los bordes reciben reflejos direccionales y una pequeña respuesta al presionar. El puntero dirige la iluminación con suavizado finito. No hay un bucle ambiental continuo.

La composición de fondo `liquid-backdrop.svg` es vectorial y original de este laboratorio. Sus gradientes pertenecen al fondo de estudio; el material de los controles se construye en el shader por refracción y no mediante text-shadow, glow o una capa CSS de blur. Las etiquetas permanecen en HTML, nítidas y separadas del canvas. Se usa una absorción leve para ayudar a su lectura; no se afirma un contraste numérico auditado de todas las combinaciones.

- **Cambiar luz:** alterna tres paletas del estudio, con estado textual real.
- **Congelar/reanudar:** detiene la respuesta de luz al puntero; los ajustes siguen activos.
- **Espesor óptico:** parámetro gráfico de 4–24 px, no milímetros físicos.
- **Refracción:** ajusta el índice efectivo de 1,10–1,80.
- **Dispersión cromática:** interruptor con `role="switch"` y `aria-checked` que activa/desactiva las tres muestras cromáticas.
- Los rangos son `input[type=range]` nativos, con etiquetas y salidas asociadas. Arrastre, flechas, Inicio/Fin, Espacio/Enter y foco visible conservados. La presión visual también responde a teclado. No se intercepta el scroll ni se reemplazan formularios o funciones de Django.

### Rendimiento y fallback

Una pasada, un quad de dos triángulos, una textura SVG rasterizada por el navegador y hasta nueve superficies analíticas, con un máximo de tres muestras de fondo por lente. Buffer de 2× CSS y máximo 3072 px de ancho; suavizado analítico de contorno con derivadas. Redibujado solo tras interacción/cambio de tamaño, máximo 30 actualizaciones/s durante la convergencia de luz. Pausa al ocultar el documento o con menos del 10 % del escenario visible. La consulta GPU pendiente también se pausa.

`prefers-reduced-motion`, colores forzados y el control estático evitan/liberan WebGL; la versión CSS conserva los controles y sus acciones JavaScript. Sin WebGL, el mismo camino estático conserva la interfaz. Se eliminan programa, VAO, buffer, textura y consultas al reducir/abandonar, con limpieza de observers/listeners. Sin JavaScript se ofrece la apariencia estática y un aviso de que la exploración necesita JavaScript; ese escenario no se comprobó manualmente en navegador.

### Límite de integración

Esta es una **aproximación de lente en pantalla sobre un fondo conocido**. No captura automáticamente HTML arbitrario detrás del botón, no compone refracciones sucesivas de panel y tirador superpuestos, ni calcula múltiples rebotes, caústicas físicas o captura del escritorio. Es diferente del sólido con BVH de Diamond. Una integración real debe suministrar el fondo de forma coherente o elegir un fallback más sencillo por superficie y navegador. No se recomienda presentar el shader como `backdrop-filter` universal.

Archivos nuevos: `liquid.html`, `liquid.css`, `liquid.js`, `liquid-backdrop.svg`. Diamond solo recibe un enlace de ida/vuelta y una regla de navegación responsive en sus archivos aislados. No hay nuevas instalaciones, descargas, cambios en producción, backend, MySQL, commits o push. Mediciones y comprobaciones de la sesión se registran en el progreso.

### Validación efectiva de Liquid

- Escritorio **1440 × 1100 CSS** y móvil emulado **390 × 844 CSS**, con zoom de navegador del usuario conservado. Sin desbordamiento horizontal y recursos locales sin imágenes rotas observadas. Dos columnas en escritorio y una en móvil, con controles nativos accesibles por teclado.
- Arrastre nativo de espesor **14 → 23 px**, salida asociada actualizada y lente en su posición. Inicio/Fin, flechas, Espacio en el switch, congelación/reanudación y cambio de paleta comprobados. En modo estático se comprobó ausencia de renderer y funcionamiento de rangos/paleta; la recuperación también se revisó.
- Enlaces Diamond/Liquid y navegación Atrás/Adelante comprobados. Consola del recorrido final sin errores/advertencias observados. `node --check liquid.js` y verificación local de rutas HTML correctos. No se ejecutaron Django ni pruebas de base de datos.
- Muestra de escritorio: **2625 × 1332**, 9 superficies, **22 dibujos**; CPU de preparación/envío media **0,55 ms**, máximo **8,10 ms**; GPU media **1,82 ms**, último **0,18 ms**, **20 consultas**. Después del suavizado: bucle detenido, escenario visible. El intervalo CPU incluye preparación de posiciones/uniforms y envío de dibujo; excluye compilación inicial del shader y actualización posterior del diagnóstico.
- Muestra de viewport móvil emulado: **677 × 1739**, **20 dibujos**; CPU media **0,37 ms**, máximo **4,00 ms**; GPU media **0,37 ms**, último **0,08 ms**, **20 consultas**. Al desplazar el escenario fuera de pantalla: mismo contador 20 y estado pausado. No representa la GPU de un teléfono físico ni un benchmark comparativo. No se midieron temperatura, energía o memoria GPU total.
- HTML, CSS, JS y fondo SVG del estudio suman **29 993 bytes** sin compresión, sin contar las imágenes locales de referencia. Esta página no carga Three.js/BVH ni el HDR de Diamond.
- Pendientes: evaluación artística, teléfonos y tacto físicos, Firefox/Safari, preferencias reales de movimiento reducido/colores forzados, JS desactivado y pérdida/restauración de contexto. Se probó el modo estático manual, no se atribuyen esas validaciones pendientes como realizadas.

## HQ — resolución e iluminación del entorno

**Estado: revisión técnica implementada en el laboratorio; evaluación visual del usuario pendiente.** Continúan las mismas demos y los mismos límites respecto a producción. No se cambió el Hero, hub, catálogo, login, backend, MySQL ni assets originales.

### Cambios que afectan a la imagen

1. **Se elimina el cuello de botella del fondo de Liquid.** El SVG anterior se cargaba en WebGL a su tamaño intrínseco de 1600 × 900 y se ampliaba con el canvas. El renderer actual no carga ninguna textura de fondo: `optical-studio.js` calcula un campo de radiancia a la resolución efectiva de cada fragmento. El SVG histórico se conserva, pero deja de participar en el material.
2. **El entorno tiene luz y relieve.** Dos pliegues analíticos reciben sombreado/reflejos de estudio; se añaden un baño amplio de luz y una concentración suave sobre el suelo. Los campos siguen la posición de iluminación y emplean violeta, azul y cian. Son iluminación artística y volumen aparente, no geometría de fondo ray traced ni caústicas físicas. El fondo completo está presente detrás del cristal y se vuelve a evaluar en las coordenadas refractadas.
3. **Más refracción en Liquid.** Aumenta la distancia aparente al fondo, se suaviza la corona y se añade magnificación dependiente del espesor/índice. La reflexión blanca se reduce para conservar color/transmisión. Valores iniciales: 18 px e IOR 1,58. El nuevo deslizador **Luz del entorno** controla 70–180 %. Las once superficies siguen alineadas con HTML nativo.
4. **Más muestras espaciales, sin bajar calidad por una lectura lenta.** Alta = 3× CSS; Máxima = 4× CSS. El diagnóstico muestra la escala efectiva. Los contornos de Liquid usan su distancia analítica y el tamaño real del píxel; Diamond conserva TAA 32. Solo limitan las dimensiones de hardware, 8192 px por lado y presupuestos máximos de 24 Mpx en Liquid / 16 Mpx en Diamond, para no crear buffers imposibles. No se usa adaptación que reduzca silenciosamente la resolución por tiempo de dibujo.
5. **Diamond recibe el mismo estudio procedural.** La pared posterior se adapta al campo visible de la cámara, eliminando las franjas negras causadas por un plano menor que el encuadre. El shader del fondo y el de los rayos de salida usan la misma función, tamaño y luz. El testigo de transparencia sigue disponible en una textura de 4096 × 1536.
6. **HDR 4K.** Se sustituye en ejecución el entorno 1K por Studio Small 09 a 4096 × 2048, CC0, **24 670 900 bytes**. Autoría, URL y licencia en `SOURCES.md`. La versión anterior queda intacta. No se instalaron paquetes nuevos.
7. **Tipografía y fallback.** Se aumenta el tamaño de etiquetas/controles y se aclara la atmósfera de ambas páginas del laboratorio. `studio-light.svg` y `fallback-lit.svg` ofrecen una escena estática iluminada. `build.py` regenera el derivado sin cambiar los dos derivados anteriores, comprobado por SHA-256. Movimiento reducido, colores forzados, controles nativos y foco siguen disponibles.

### PNG nativo de Diamond

**Preparar PNG nativo** encuadra el objeto, espera a TAA 32 y copia la salida directa del canvas a PNG, sin pasar por JPEG o redimensionado de la vista previa. Aparece un enlace de descarga con sus dimensiones. El archivo incluye cristal y entorno, no los ajustes HTML externos. Cambiar la escena invalida la exportación preparada. El modo estático no inicia GL para exportar.

Se generó y leyó una muestra **5249 × 1750**, RGBA, alfa 255, a 4×. La vista inline puede escalarla; para juzgar detalle hay que abrir el PNG a tamaño original. No se ha retocado ni aumentado artificialmente una captura. La codificación PNG es una acción puntual adicional y no se incluye en el contador de envío CPU del render.

### Rendimiento comprobado en esta revisión

Muestras independientes, no un benchmark ni una garantía de FPS sostenidos:

| Revisión / modo | Observación |
| --- | --- |
| Diamond, viewport escritorio 1440 × 1100 CSS, 4× | Buffer **5249 × 1750**, HDR 4096 × 2048, TAA 32/32, 32 dibujos. CPU media **3,81 ms**, máximo **111,80 ms**. GPU media **145,26 ms**, último **186,50 ms**, 32 consultas. Inicialización caliente **529 ms**. Bucle detenido al terminar. |
| Primer arranque observado de Diamond, viewport nativo estrecho, 3× | Inicialización **1403 ms**; primer envío/postprocesado llegó a **1000,20 ms**. Ese arranque frío no representa el tiempo estable y no se oculta. |
| Liquid, escritorio 1440 × 1100 CSS, 4×, luz 180 % | Buffer **5249 × 3123**, once superficies, 22 dibujos. CPU media **3,94 ms**, máximo **53,00 ms**. GPU media **19,34 ms**, último **13,20 ms**, 22 consultas. Bucle detenido después del suavizado. |
| Liquid, revisión final en viewport móvil emulado 390 × 844 CSS, 3×, luz 131 % | Buffer **1016 × 3041**, **21 dibujos**, CPU media **0,91 ms**, máximo **14,90 ms**. GPU media **0,82 ms**, último **1,87 ms**, 21 consultas. Bucle detenido tras converger; no es una prueba sostenida. Modo estático liberó el renderer y la recuperación se comprobó. |

La calidad Máxima de Diamond es deliberadamente costosa y sirve para inspección estática/exportación; no se propone como presupuesto automático para toda la web. Cuando la consulta GPU está pendiente, no se encolan nuevos dibujos, conservando la resolución elegida. Los límites de visibilidad y las paradas en reposo se mantienen. Los números no incluyen memoria GPU total, energía, temperatura ni GPU de un teléfono físico.

Se comprobaron controles de luz y resolución, lectura HDR 4K real, PNG nativo y ausencia de desbordamiento en los viewports revisados. Sintaxis JS, rutas locales, generación vectorial y consola del recorrido revisado comprobadas. Pendientes: aprobación artística, teléfonos físicos, otros motores y preferencias reales del sistema. Las aproximaciones de material/transporte descritas antes siguen vigentes.

### Archivos de HQ

Nuevos `optical-studio.js`, `studio-light.svg`, `fallback-lit.svg` y `assets/studio_small_09_4k.hdr`. Modificados `liquid.{html,css,js}`, `diamond.{html,css,js}`, `build.py`, este README, `SOURCES.md` y `docs/PRISMATIC_PROGRESS.md`. Los renderizadores iniciales y los originales de referencia/producto se conservan. Sin nuevas dependencias, commits o push.
