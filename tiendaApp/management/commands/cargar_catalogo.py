from django.core.management.base import BaseCommand
from tiendaApp.datos import _leer
from tiendaApp.models import Artista, Disco


class Command(BaseCommand):
    help = 'Carga data/catalogo.json en la base de datos (se puede ejecutar varias veces).'

    def handle(self, *args, **options):
        nuevos = 0
        for d in _leer('catalogo.json')['discos']:
            artista, _ = Artista.objects.get_or_create(nombre=d['artista'])
            imagenes = d['imagenes']
            _, creado = Disco.objects.get_or_create(
                titulo=d['titulo'], artista=artista,
                defaults={
                    'etiquetas': ', '.join(d['tags']),
                    'precio': d['precio'],
                    'imagen': imagenes[0],
                    'imagen2': imagenes[1] if len(imagenes) > 1 else None,
                })
            nuevos += creado
        self.stdout.write(self.style.SUCCESS(
            f'Catálogo cargado: {nuevos} discos nuevos, {Disco.objects.count()} en total.'))
