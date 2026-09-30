from django.contrib import admin
from tiendaApp.models import Artista, Disco


class ArtistaAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'nombre']
    search_fields = ['nombre']


class DiscoAdmin(admin.ModelAdmin):
    list_display = ['id', 'titulo', 'artista', 'etiquetas', 'precio', 'estado', 'fechaLanzamiento']
    list_filter = ['estado', 'artista']
    search_fields = ['titulo', 'artista__nombre']


admin.site.register(Artista, ArtistaAdmin)
admin.site.register(Disco, DiscoAdmin)
