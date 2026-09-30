# Vinlume Disk – Django

## Puesta en marcha
```
python -m venv venv && venv\Scripts\activate      # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py cargar_catalogo      # carga data/catalogo.json en la BD
python manage.py createsuperuser
python manage.py runserver
python manage.py test                 # 8 pruebas
```

## Estructura
| Carpeta | Contenido |
|---|---|
| `VinlumeDjango/` | configuración (settings, urls raíz) |
| `tiendaApp/` | inicio, catálogo, FAQ, mantenedor de discos. Modelos `Artista` y `Disco` |
| `cuentasApp/` | registro, login, logout (django.contrib.auth) |
| `contactoApp/` | formulario de contacto + modelo `Mensaje` |
| `data/` | catalogo.json (semilla), sitio.json, faq.json |
| `templates/` | base.html y una carpeta por app |
| `static/` | css, js, images |

## Rutas
`/` · `/catalogo/` · `/faq/` · `/contacto/` · `/cuentas/login/` · `/cuentas/registro/` · `/discos/` y `/discos/agregar/` (solo staff) · `/admin/`

## Correspondencia con el material del profesor
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

## MySQL
Crear la BD `vinlume` (utf8mb4_spanish_ci) y el usuario en phpMyAdmin, `pip install mysqlclient`,
descomentar el bloque `DATABASES` de `settings.py`, copiar `.env.example` a `.env` con la clave real,
y ejecutar `migrate` + `cargar_catalogo`.

## Pendiente
- React (fuera del material del profesor; ver conversación)
- Página "ultimate" (GSAP)
