# Fuentes, dependencias y atribución — revisión Diamond

El usuario autorizó expresamente investigar en internet e instalar herramientas el 2026-11-13, y después pidió pulir la nitidez y explorar otros objetos con este material. Todo se limita a `design-lab/optical/` y al registro de progreso.

## Código y técnica

- **Three.js 0.187.0**, MIT: [proyecto oficial](https://github.com/mrdoob/three.js), [licencia instalada](node_modules/three/LICENSE). Motor de geometría, cámara, HDR y postprocesado. Versionado exacto en `package.json` y `package-lock.json`.
- **three-mesh-bvh 0.9.18**, MIT: [repositorio oficial](https://github.com/gkjohnson/three-mesh-bvh), [licencia instalada](node_modules/three-mesh-bvh/LICENSE). BVH en CPU y texturas/funciones GLSL para intersección con los triángulos en GPU. Se importan esas funciones desde el paquete, no se vende un renderer de terceros como desarrollo propio.
- [Ejemplo oficial de refracción de gemas](https://github.com/gkjohnson/three-mesh-bvh/blob/master/example/diamond.js): referencia técnica para el uso de BVH, salida refractada y reflexión interna total. El shader del laboratorio implementa su propio recorrido limitado sobre letras y objetos creados aquí; añade entorno HDR, fondo finito atravesable y mezcla Fresnel. No se utiliza el modelo de diamante del ejemplo.
- [Material de refracción de Drei](https://github.com/pmndrs/drei/blob/master/src/materials/MeshRefractionMaterial.tsx): evaluado como referencia técnica. No se instaló Drei, React o React Three Fiber.
- [MeshPhysicalMaterial, documentación oficial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html): evaluado por transmisión/dispersión y coste. Se eligió trazado interno con BVH para recorrer caras traseras reales; el material físico estándar no es el renderer de esta alternativa.
- [TAARenderPass oficial](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/postprocessing/TAARenderPass.js): empleado a través del paquete Three.js instalado. Acumula 32 muestras desplazadas de cámara al estabilizarse la escena; no se aplica desenfoque para esconder el pixelado. EffectComposer y OutputPass gestionan acumulación HDR y salida.

Instalación ejecutada: `npm install --ignore-scripts --no-audit --no-fund`. Dos paquetes, sin scripts de instalación. No se cambiaron dependencias de Django o del frontend de producción. Para reconstruir la instalación exacta: `npm ci --ignore-scripts --no-audit --no-fund` dentro de esta carpeta.

## Entorno fotográfico

- **Studio Small 09**, **Sergej Majboroda / Poly Haven**, [página original](https://polyhaven.com/a/studio_small_09), [licencia CC0](https://polyhaven.com/license).
- Archivo descargado: `assets/studio_small_09_1k.hdr`, 1 615 248 bytes, [descarga original](https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr).
- Se utiliza como radiancia del estudio para reflejos/refracción; no como imagen de letras terminadas. El fondo de prueba se genera con Canvas y es una superficie de la escena que los rayos pueden atravesar/distorsionar.

Las imágenes de `design-references/` siguen siendo referencias locales ajenas; no se incrustan en el material ni se alteran sus originales. El monograma y el disco son geometrías propias del laboratorio. El disco es una escultura abstracta de identidad, no fotografía ni disponibilidad de un producto.

## Revisión HQ / iluminación y resolución

El entorno de Diamond se actualizó a la versión **4096 × 2048** del mismo Studio Small 09, con la misma autoría y licencia CC0. Archivo nuevo `assets/studio_small_09_4k.hdr`, **24 670 900 bytes**, [descarga original 4K](https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/4k/studio_small_09_4k.hdr). La versión 1K se conserva como recurso histórico y ya no se carga en el renderer actual.

El fondo visible ahora usa `optical-studio.js`, un campo de radiancia procedural propio, calculado en el shader a la resolución efectiva del render. No es otra fotografía descargada ni un SVG rasterizado y ampliado. Incluye relieves analíticos, sombreado y luces de estudio artísticas; no se atribuye conservación física de energía o transporte de fotones. `studio-light.svg` y `fallback-lit.svg` son derivados vectoriales propios para la vista estática. Los originales de referencia permanecen intactos.

No se instalaron paquetes adicionales para esta revisión. La exportación PNG de Diamond procede directamente del canvas después de completar TAA 32; no es una imagen generada o retocada externamente.
