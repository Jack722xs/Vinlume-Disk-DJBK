from django.db import models
from django.utils import timezone


class Mensaje(models.Model):
    nombre = models.CharField(max_length=80)
    correo = models.EmailField()
    mensaje = models.TextField(max_length=1000)
    creado = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'mensaje'
        verbose_name = 'Mensaje'
        verbose_name_plural = 'Mensajes'
        ordering = ['-creado']

    def __str__(self):
        return f'{self.nombre} - {self.correo}'
