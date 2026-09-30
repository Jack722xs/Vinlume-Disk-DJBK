from django.db import models
from django.utils import timezone
from tiendaApp.choices import estados


class Artista(models.Model):
    codigo = models.BigAutoField(primary_key=True)
    nombre = models.CharField(max_length=100, unique=True)
    creado = models.DateTimeField(default=timezone.now, editable=False)

    def __str__(self):
        return self.nombre

    class Meta:
        db_table = 'artista'
        verbose_name = 'Artista'
        verbose_name_plural = 'Artistas'
        ordering = ['nombre']


class Disco(models.Model):
    titulo = models.CharField(max_length=120)
    artista = models.ForeignKey(Artista, null=False, on_delete=models.RESTRICT)
    # Etiquetas separadas por coma: "Rap Metal, Rock"
    etiquetas = models.CharField(max_length=100, blank=True, null=True)
    precio = models.PositiveIntegerField(default=4990)
    estado = models.CharField(max_length=1, choices=estados, default='d')
    # Rutas relativas a static/images/discos/
    imagen = models.CharField(max_length=200)
    imagen2 = models.CharField(max_length=200, blank=True, null=True)
    fechaLanzamiento = models.DateField(blank=True, null=True)
    creado = models.DateTimeField(default=timezone.now, editable=False)

    def __str__(self):
        return f'{self.titulo} - {self.artista}'

    @property
    def lista_etiquetas(self):
        """Devuelve las etiquetas como lista para recorrerlas con {% for %}."""
        if not self.etiquetas:
            return []
        return [e.strip() for e in self.etiquetas.split(',') if e.strip()]

    class Meta:
        db_table = 'disco'
        verbose_name = 'Disco'
        verbose_name_plural = 'Discos'
        ordering = ['id']
