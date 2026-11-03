from django.urls import path
from . import views

urlpatterns = [
    path('', views.inicio, name='inicio'),
    path('catalogo/', views.catalogo, name='catalogo'),
    path('faq/', views.faq, name='faq'),
    path('discos/', views.lista_discos, name='discos'),
    path('discos/buscar-albumes/', views.buscar_albumes_itunes, name='buscarAlbumes'),
    path('discos/agregar/', views.crear_disco, name='crearDisco'),
    path('discos/<int:pk>/editar/', views.editar_disco, name='editarDisco'),
    path('discos/<int:pk>/eliminar/', views.eliminar_disco, name='eliminarDisco'),
]
