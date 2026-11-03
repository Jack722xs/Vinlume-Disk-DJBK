import datetime
import io
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
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
    def test_usuario_autenticado_no_necesita_staff(self):
        self.assertEqual(self.client.get(reverse('discos')).status_code, 302)
        User.objects.create_user('a@a.cl', password='Clave-Segura-2026', is_staff=False)
        self.client.login(username='a@a.cl', password='Clave-Segura-2026')
        self.assertEqual(self.client.get(reverse('discos')).status_code, 200)


class DiscoFormTests(TestCase):
    def datos(self, **extra):
        d = {'titulo': 'Uta', 'artista_nombre': 'Ado', 'etiquetas': 'J-Pop, Vocaloid',
             'precio': 4990, 'estado': 'd'}
        d.update(extra)
        return d

    def test_valido_con_opcionales_vacios(self):
        data = io.BytesIO()
        Image.new('RGB', (8, 8)).save(data, format='PNG')
        portada = SimpleUploadedFile('portada.png', data.getvalue(), content_type='image/png')
        self.assertTrue(DiscoForm(self.datos(), {'portada': portada}).is_valid())

    def test_precio_debe_ser_positivo(self):
        self.assertIn('precio', DiscoForm(self.datos(precio=0)).errors)

    def test_fecha_fuera_de_rango(self):
        self.assertIn('fechaLanzamiento', DiscoForm(self.datos(fechaLanzamiento='1850-01-01')).errors)
        futuro = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()
        self.assertIn('fechaLanzamiento', DiscoForm(self.datos(fechaLanzamiento=futuro)).errors)

    def test_etiquetas_admite_generos_musicales(self):
        form = DiscoForm(self.datos(etiquetas='R&B, Hip-Hop/Rap'))
        self.assertNotIn('etiquetas', form.errors)
