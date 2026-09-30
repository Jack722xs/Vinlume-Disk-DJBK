"""Lectura de contenido estático del sitio desde JSON (pasos, NFC, carrusel, FAQ).

El catálogo de discos vive en la base de datos (modelos Artista y Disco);
data/catalogo.json solo sirve para cargarlo con: python manage.py cargar_catalogo
"""
import json
import os
from django.conf import settings


def _leer(nombre):
    ruta = os.path.join(settings.DATA_DIR, nombre)
    with open(ruta, encoding='utf-8') as archivo:
        return json.load(archivo)


def obtener_sitio():
    return _leer('sitio.json')


def obtener_faq():
    return _leer('faq.json')['preguntas']
