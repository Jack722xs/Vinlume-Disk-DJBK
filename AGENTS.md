# AGENTS.md — Vinlume Disk

## Propósito
Este repositorio es la aplicación Django **Vinlume Disk**. El trabajo actual es la evolución visual **Prismatic Noir**. Antes de tocar el frontend, lee `docs/PRISMATIC_NOIR.md` y sigue el alcance de la **fase solicitada en el chat**. No hay instrucciones académicas ni una «prueba 4» vigentes para esta tarea.

## Alcance y forma de trabajo
- Implementa **solo la fase solicitada**. No adelantes otras fases ni transformes otras páginas por iniciativa propia.
- Prioriza cambios visuales y de interacción en Django Templates, CSS, JavaScript y recursos estáticos. Reutiliza convenciones y componentes existentes cuando tenga sentido.
- Inspecciona primero los archivos estrictamente relevantes y sus dependencias directas. Evita recorridos globales, lecturas repetidas, refactorizaciones ajenas y documentación adicional innecesaria.
- No sustituyas una funcionalidad real por una demostración visual. Conserva URLs, formularios, autenticación, favoritos, navegación, filtros, compra y datos dinámicos.
- Mantén los assets originales de `media/assets/` intactos. Puedes crear **copias derivadas** optimizadas en `static/`, verificando canal alfa, dimensiones y rutas de Django.
- Los marcos de álbumes son una **línea futura**: no inventes su disponibilidad, fotografías, precios o rutas funcionales.

## Seguridad: requieren autorización previa y específica
- Modificar modelos, vistas de negocio, autenticación, permisos, endpoints, configuración sensible o esquema de base de datos.
- Ejecutar `makemigrations`, `migrate`, `flush`, SQL de escritura, cargas de datos, seeds o pruebas que creen/alteren tablas o registros de MySQL.
- Instalar o actualizar paquetes, acceder a internet, descargar librerías, imágenes, videos o fuentes.
- Ejecutar comandos Git destructivos (`reset --hard`, `clean`, `rebase`, `push --force`), cambiar de rama, hacer commits, push o merge.
- Borrar, sobrescribir o mover recursos originales; generar ZIP sin solicitud.

**Nunca modifiques ni reveles `.env`, claves o credenciales.** No uses la base MySQL real para pruebas destructivas. Si una tarea exige autorización, pide permiso **solo para esa acción** y continúa con lo independiente.

## Calidad obligatoria
- Prioriza el diseño **responsive** real y la accesibilidad: teclado, foco visible, contraste, semántica y `prefers-reduced-motion`.
- Las animaciones deben tener propósito y limpieza de eventos/timelines. Evita scroll hijacking, efectos duplicados, recursos innecesarios y regresiones entre páginas.
- Cuando el trabajo incluya navegación, verifica historial, Atrás/Adelante, CSRF, enlaces y formularios. Si una ruta no admite transición avanzada, conserva navegación normal.
- Valida con comprobaciones **seguras**. `python manage.py check` es preferible a suites que puedan crear una BD de pruebas; verifica sus efectos antes de ejecutarlas.
- Si hay navegador disponible, comprueba escritorio y móvil y revisa la consola. Si no, declara explícitamente la validación visual pendiente. **Nunca inventes pruebas ni métricas.**

## Entrega por fase
Al terminar, informa brevemente: cambios visibles, archivos modificados, dependencias/pedidos de autorización, validaciones efectivas, pendientes y estado **COMPLETADA / PARCIAL / BLOQUEADA**. No declares completada una fase por haber escrito código: deben cumplirse sus criterios. **No avances a la fase siguiente hasta la aprobación del usuario.**
