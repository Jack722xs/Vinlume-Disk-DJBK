# PRISMATIC NOIR — Dirección visual de Vinlume Disk

**Estado:** brief creativo base. La fase aprobada por el usuario manda sobre el alcance; este documento mantiene la coherencia artística entre chats de Codex.

## Identidad
Vinlume Disk transforma música en objetos coleccionables: hoy, **llaveros mini CD personalizados con jewel case transparente y NFC**; más adelante, **marcos con diseños de álbumes**. La marca debe sentirse **tech luxury, sensorial, musical, física y creíble**, no una plantilla SaaS ni un escaparate genérico de IA.

### Manifiesto
**Negro profundo. Luz controlada. Cristal que responde. Música convertida en objeto.**

- Base monocromática oscura, contrastes blancos claros y tipografía editorial de gran tamaño.
- Violeta como acento óptico; RGB/holografía como **difracción/reflejo**, no degradado omnipresente.
- Materialidad: vidrio, transparencias, cromados, reflejos localizados, blur selectivo, bordes refractivos y sombras con profundidad.
- Movimiento: fluidez, parallax de imágenes a velocidades distintas, entrada orgánica de títulos y respuesta perceptible al mouse, toque y foco.
- Prioridad de experiencia: primero **composición y legibilidad**, luego materiales, después animación y finalmente efectos experimentales.

## Tokens sugeridos (ajustables tras validación visual)
| Función | Color |
|---|---|
| Obsidiana | `#08090D` |
| Grafito | `#1A1C24` |
| Titanio | `#A9ADB8` |
| Blanco hielo | `#F4F4F6` |
| Violeta óptico | `#9C71EE` |

Define tokens CSS, tipografía fluida (`clamp()`), grillas, espaciados, elevaciones y duración/easing de animaciones. Los tokens son una **base**, no una excusa para uniformar todas las escenas.

## Componentes e interacciones
- **CTA principal:** vidrio óptico bien trabajado, transparencia legible, reflejo/borde sensible al puntero y respuesta al clic. Los secundarios son más sobrios. Nunca todo es glass.
- **Navbar y enlaces:** hover con movimiento tipográfico discreto; foco visible equivalente para teclado.
- **Títulos:** grandes, nítidos, composición editorial; revelados al entrar en pantalla, no efectos constantes que dificulten lectura.
- **Tarjetas de producto:** profundidad y reflejo reactivo sutil, datos comerciales claros y acceso inmediato a acciones.
- **Navegación:** continuidad al cambiar de página mediante una estrategia única y compatible con Django; entrada orgánica de contenidos. Fallback seguro de navegación normal.
- **Modo reducido de efectos:** versión monocromática elegante, menos blur/animación, sin perder contenido ni funcionalidad; respetar también `prefers-reduced-motion`.

## Arquitectura de experiencia
1. **Portada VINLUME:** nombre monumental con respuesta de luz/refacción prismática al cursor, atmósfera abstracta, texto mínimo y gran CTA de vidrio.
2. **Hub de productos:** escaparate de dos universos con división cristalina; mini CD activo, marcos **próximamente**, y acceso directo al catálogo sin obligar a recorrer la historia.
3. **Landing mini CD:** secuencia de producto cerrado → abierto → disco separado; assets reales a escala protagonista, parallax y narrativa editorial. No interpolar artificialmente una bisagra con una foto plana.
4. **Experiencia NFC:** dos manos (teléfono y llavero) se acercan con scroll cuando existan assets adecuados; después, explicación NFC integrada en una escena amplia sin bordes cortados ni afirmaciones técnicas falsas.
5. **Catálogo:** prioridad comercial; galería premium, filtros y compra funcionales, modal accesible para imágenes cerrada/abierta cuando estén disponibles, modo de efectos completo/reducido.
6. **Login, registro, FAQ, contacto y páginas interiores:** mismo sistema visual; formularios vivos, legibles y compatibles con sus funciones existentes.
7. **Transiciones y pulido:** navegación, historial, accesibilidad, dispositivos móviles y rendimiento comprobados en conjunto.

## Assets del producto
Origen esperado (verificar rutas/nombres reales):
- `media/assets/cd-cerrado.png`
- `media/assets/cd-abierto.png`
- `media/assets/cd-abierto-disco-afuera.png`
- `media/assets/Estuche transparente con símbolo NFC.png`

Son material de referencia del producto; conservar originales. Los recursos de manos para la escena NFC **aún no están confirmados**: no fabricar sustitutos engañosos ni presentar la escena como completada si faltan. No inventar fotografías de los futuros marcos. Si una imagen NFC incluye fondo, integrar visualmente sus bordes en vez de deformarla para llenar el viewport.

## Tecnología: decidir por beneficio visual
- CSS moderno/SVG para materiales y microinteracciones.
- GSAP + ScrollTrigger para coreografía y parallax complejo.
- Lenis si mejora objetivamente el scroll y no rompe accesibilidad o navegación.
- View Transitions API **o** Swup (no ambas por inercia) para transiciones entre páginas Django.
- Canvas/shaders/Three.js únicamente si una escena lo merece y existe presupuesto de rendimiento.

**No instalar por moda:** toda nueva dependencia requiere autorización. Mantener Django Templates; no migrar el proyecto a SPA.

## Criterios de aceptación visual
- La portada provoca impacto real **sin sacrificar claridad del CTA**.
- La interacción responde visiblemente a cursor, toque y teclado.
- Los recursos tienen protagonismo, no parecen ilustraciones pegadas en cuadros sueltos.
- Ninguna página pública parece pertenecer a otro sitio.
- El catálogo sigue permitiendo descubrir y comprar con facilidad.
- Móvil se compone de forma específica; no es escritorio reducido ni corta producto/texto.
- Una captura estática se ve premium **antes** de juzgar las animaciones.
- Reducir efectos conserva la estética y mejora la usabilidad.

## Método de aprobación
Trabajar **una fase por chat/encargo**, mostrar resultado verificable, recibir correcciones, aprobar y solo entonces continuar. Actualizar este documento **solo si cambia una decisión artística o técnica permanente**, no como diario de tareas.
