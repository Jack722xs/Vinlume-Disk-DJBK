from django.contrib import admin
from .models import Mensaje


class MensajeAdmin(admin.ModelAdmin):
    list_display = ['id', 'nombre', 'correo', 'creado']
    search_fields = ['nombre', 'correo']


admin.site.register(Mensaje, MensajeAdmin)
