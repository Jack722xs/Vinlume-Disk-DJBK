# Vinlume Disk – Django

## Puesta en marcha

Con las dependencias instaladas y la base MySQL existente en XAMPP:

1. Si acabas de clonar, copia `.env.example` a `.env`, completa las credenciales de tu MySQL y reemplaza `DJANGO_SECRET_KEY` por una clave aleatoria privada. Los valores del archivo usan cadenas entre comillas en formato JSON. No publiques `.env`.
2. Si ya tienes `.env`, consérvalo; no lo sobrescribas. Las variables de entorno tienen prioridad sobre ese archivo.
3. Inicia MySQL desde XAMPP y ejecuta:

```powershell
python manage.py check
python manage.py runserver
```

Abre `http://127.0.0.1:8000/`. La preparación de una base nueva y cualquier migración requieren autorización; estos pasos no crean tablas ni cargan datos. Para crear tu cuenta administrativa, utiliza `python manage.py createsuperuser`. El sitio admite correo o nombre de usuario y el nombre personal se completa en `/cuentas/perfil/`.

Verificación aislada, sin crear una base de pruebas:

```powershell
python manage.py test tiendaApp.test_evaluacion tiendaApp.test_gestion
```

Esta suite contiene 28 pruebas sin acceso a MySQL. La suite completa utiliza una base de pruebas y no debe ejecutarse sin autorizar previamente la creación de sus tablas. Consulta `INFORME_EVALUACION.md` para distinguir verificaciones realizadas y pendientes.

## Estructura
| Carpeta | Contenido |
|---|---|
| `VinlumeDjango/` | configuración (settings, urls raíz) |
| `tiendaApp/` | inicio, catálogo, FAQ, gestión de discos. Modelos `Artista` y `Disco` |
| `cuentasApp/` | registro, login, logout (django.contrib.auth) |
| `contactoApp/` | formulario de contacto + modelo `Mensaje` |
| `data/` | catalogo.json (semilla), sitio.json, faq.json |
| `templates/` | base.html y una carpeta por app |
| `static/` | css, js, images |

## Rutas
`/` · `/catalogo/` · `/faq/` · `/contacto/` · `/cuentas/login/` · `/cuentas/registro/` · `/cuentas/perfil/` · `/discos/` · `/discos/agregar/` · `/discos/ID/editar/` · `/discos/ID/eliminar/` (requieren sesión) · `/admin/`

| PDF | Tema | Dónde está |
|---|---|---|
| 0 | proyecto, app, vistas, rutas | `VinlumeDjango/`, `*/views.py`, `*/urls.py` |
| 1 | urls por app + `include` | `VinlumeDjango/urls.py`, `*/urls.py` |
| 2 | templates, estáticos, `name=` | `templates/`, `static/`, `settings.py` |
| 3 | datos al template con `{% for %}` | `inicio.html`, `catalogo.html`, `discos.html` |
| 4 | modelos, choices, migraciones, MySQL | `tiendaApp/models.py`, `choices.py`, bloque DATABASES |
| 5 | admin | `*/admin.py` |
| 6 | ModelForm + vista POST/GET + csrf | `tiendaApp/forms.py`, `crear_disco`, `disco_add.html` |
| 7 | required/blank/null, `clean_*`, `editable=False` | `forms.py`, `models.py` |

## MySQL e imágenes

La configuración conserva MySQL y lee las credenciales desde el entorno o `.env`. No sustituyas la base existente ni ejecutes migraciones o cargas de catálogo sin autorización.

Los discos admiten artistas nuevos y archivos JPG, PNG o WebP de hasta 5 MB. Los archivos se guardan en `media/discos/`, excluido de Git; las imágenes originales de `static/` se conservan. En desarrollo, Django sirve `media/` con DEBUG activo.

La búsqueda opcional de iTunes completa metadatos editables y presenta páginas de hasta 200 resultados por consulta; no garantiza un catálogo completo ni resultados ilimitados. El ingreso manual permanece disponible. No requiere nuevas dependencias.
