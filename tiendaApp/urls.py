from django.urls import path
from . import views

urlpatterns = [
    path('', views.inicio, name='inicio'),
    path('catalogo/', views.catalogo, name='catalogo'),
    path('faq/', views.faq, name='faq'),
    path('discos/', views.lista_discos, name='discos'),
    path('discos/agregar/', views.crear_disco, name='crearDisco'),
]
