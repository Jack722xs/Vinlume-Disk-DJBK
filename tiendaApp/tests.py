import datetime
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from tiendaApp.forms import DiscoForm
from tiendaApp.models import Artista, Disco


class CatalogoTests(TestCase):
    def setUp(self):
        call_command('cargar_catalogo', verbosity=0)

    def test_carga_json_es_idempotente(self):
        call_command('cargar_catalogo', verbosity=0)
        self.assertEqual(Disco.objects.count(), 8)
        self.assertEqual(Artista.objects.count(), 6)

    def test_paginas_publicas(self):
        for nombre in ['inicio', 'catalogo', 'faq', 'contacto', 'login', 'registro']:
            self.assertEqual(self.client.get(reverse(nombre)).status_code, 200, nombre)

    def test_busqueda(self):
        r = self.client.get(reverse('catalogo'), {'q': 'punk'})
        self.assertEqual(len(r.context['discos']), 2)   # Bikini Kill + Cuarteto (Post-Punk)


class MantenedorTests(TestCase):
    def test_solo_staff(self):
        self.assertEqual(self.client.get(reverse('discos')).status_code, 302)
        User.objects.create_user('a@a.cl', password='Clave-Segura-2026', is_staff=True)
        self.client.login(username='a@a.cl', password='Clave-Segura-2026')
        self.assertEqual(self.client.get(reverse('discos')).status_code, 200)


class DiscoFormTests(TestCase):
    def datos(self, **extra):
        artista, _ = Artista.objects.get_or_create(nombre='Ado')
        d = {'titulo': 'Uta', 'artista': artista.pk, 'etiquetas': 'J-Pop, Vocaloid',
             'precio': 4990, 'estado': 'd', 'imagen': 'x/1.jpg'}
        d.update(extra)
        return d

    def test_valido_con_opcionales_vacios(self):
        self.assertTrue(DiscoForm(self.datos()).is_valid())

    def test_precio_debe_ser_positivo(self):
        self.assertIn('precio', DiscoForm(self.datos(precio=0)).errors)

    def test_fecha_fuera_de_rango(self):
        self.assertIn('fechaLanzamiento', DiscoForm(self.datos(fechaLanzamiento='1850-01-01')).errors)
        futuro = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()
        self.assertIn('fechaLanzamiento', DiscoForm(self.datos(fechaLanzamiento=futuro)).errors)

    def test_etiquetas_solo_letras(self):
        self.assertIn('etiquetas', DiscoForm(self.datos(etiquetas='Rock123')).errors)
