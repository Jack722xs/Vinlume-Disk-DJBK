import io
import json
import tempfile
from contextlib import nullcontext
from pathlib import Path
from unittest.mock import Mock, patch
from urllib.error import URLError

from PIL import Image
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, RequestFactory, override_settings

from cuentasApp.forms import LoginForm, PerfilForm
from tiendaApp.forms import DiscoForm
from tiendaApp.itunes import ErrorItunes, buscar_albumes
from tiendaApp.models import Artista, Disco
from tiendaApp import views


def image_file(name='portada.png'):
    data = io.BytesIO()
    Image.new('RGB', (16, 16), 'purple').save(data, format='PNG')
    return SimpleUploadedFile(name, data.getvalue(), content_type='image/png')


class GestionSinBaseDeDatosTests(SimpleTestCase):
    def setUp(self):
        self.data = {'titulo': 'Disco nuevo', 'artista_nombre': 'Artista nuevo',
                     'precio': '4990', 'estado': 'd', 'etiquetas': 'R&B, Hip-Hop/Rap', 'fechaLanzamiento': '2020-02-03'}
        self.artista = Artista(codigo=77, nombre='Artista existente')
        self.disco = Disco(pk=22, titulo='Original', artista=self.artista, precio=4990, imagen='original/1.jpg', imagen2='original/2.jpg')

    def test_crear_requiere_portada_y_acepta_artista_libre_y_generos(self):
        self.assertIn('portada', DiscoForm(self.data).errors)
        form = DiscoForm(self.data, {'portada': image_file()})
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(form.cleaned_data['etiquetas'], 'R&B, Hip-Hop/Rap')

    def test_archivo_falso_y_formatos_no_admitidos(self):
        fake = SimpleUploadedFile('falso.png', b'<svg onload="alert(1)"></svg>', content_type='image/png')
        self.assertIn('portada', DiscoForm(self.data, {'portada': fake}).errors)
        data = io.BytesIO()
        Image.new('RGB', (8, 8)).save(data, format='GIF')
        gif = SimpleUploadedFile('imagen.gif', data.getvalue(), content_type='image/gif')
        self.assertIn('portada', DiscoForm(self.data, {'portada': gif}).errors)

    def test_limite_de_tamano_se_valida_en_servidor(self):
        upload = image_file()
        upload.size = 5 * 1024 * 1024 + 1
        self.assertIn('portada', DiscoForm(self.data, {'portada': upload}).errors)

    def test_editar_conserva_imagenes_sin_nuevos_archivos(self):
        form = DiscoForm(self.data, instance=self.disco)
        self.assertTrue(form.is_valid(), form.errors)
        with patch('tiendaApp.forms.transaction.atomic', return_value=nullcontext()), patch('tiendaApp.forms.Artista.objects.filter') as artists, patch.object(self.disco, 'save') as save:
            artists.return_value.first.return_value = self.artista
            form.save()
        save.assert_called_once()
        self.assertEqual(self.disco.imagen, 'original/1.jpg')
        self.assertEqual(self.disco.imagen2, 'original/2.jpg')

    def test_artista_nuevo_y_dos_imagenes_sin_rutas_del_cliente(self):
        form = DiscoForm(self.data, {'portada': image_file('../../portada.png'), 'contraportada': image_file('otra.png')})
        self.assertTrue(form.is_valid(), form.errors)
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory), patch('tiendaApp.forms.transaction.atomic', return_value=nullcontext()), patch('tiendaApp.forms.Artista.objects.filter') as artists, patch('tiendaApp.forms.Artista.objects.get_or_create', return_value=(self.artista, True)) as create, patch.object(Disco, 'save'):
            artists.return_value.first.return_value = None
            disco = form.save()
            create.assert_called_once_with(nombre='Artista nuevo')
            self.assertEqual(len(list((Path(directory)/'discos').glob('*.png'))), 2)
            self.assertTrue(disco.imagen.startswith('/media/discos/'))
            self.assertNotIn('..', disco.imagen)
            self.assertNotEqual(disco.imagen, disco.imagen2)

    def test_error_de_guardado_retira_archivos_recien_creados(self):
        form = DiscoForm(self.data, {'portada': image_file()})
        self.assertTrue(form.is_valid(), form.errors)
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory), patch('tiendaApp.forms.transaction.atomic', return_value=nullcontext()), patch('tiendaApp.forms.Artista.objects.filter') as artists, patch.object(Disco, 'save', side_effect=RuntimeError('fallo simulado')):
            artists.return_value.first.return_value = self.artista
            with self.assertRaises(RuntimeError):
                form.save()
            self.assertFalse(list(Path(directory).rglob('*.png')))

    def test_urls_conservan_catalogo_original_y_archivos_nuevos(self):
        self.assertEqual(self.disco.imagen_url, '/static/images/discos/original/1.jpg')
        self.disco.imagen = '/media/discos/nueva.png'
        self.assertEqual(self.disco.imagen_url, '/media/discos/nueva.png')

    def test_perfil_solo_expone_nombre_y_no_permisos(self):
        user = User(username='admin@ejemplo.cl', is_staff=False)
        form = PerfilForm({'first_name': 'Jacson', 'is_staff': 'True', 'is_superuser': 'True'}, instance=user)
        self.assertTrue(form.is_valid())
        updated = form.save(commit=False)
        self.assertEqual(updated.first_name, 'Jacson')
        self.assertFalse(updated.is_staff)
        self.assertFalse(updated.is_superuser)
        self.assertEqual(set(form.fields), {'first_name'})

    def test_login_acepta_nombre_de_usuario_sin_correo(self):
        user = User(pk=7, username='jacson')
        with patch('django.contrib.auth.forms.authenticate', return_value=user):
            form = LoginForm(data={'username': 'jacson', 'password': 'Clave-Prueba-2026'})
            self.assertTrue(form.is_valid(), form.errors)

    def test_login_por_email_resuelve_nombre_de_usuario_real(self):
        user = User(pk=7, username='jacson', email='jacson@example.cl')
        with patch('cuentasApp.forms.User.objects.filter') as query, patch('django.contrib.auth.forms.authenticate', return_value=user) as authenticate:
            query.return_value.first.return_value = None
            query.return_value.__getitem__.return_value = [user]
            form = LoginForm(data={'username': 'jacson@example.cl', 'password': 'Clave-Prueba-2026'})
            self.assertTrue(form.is_valid(), form.errors)
            self.assertEqual(authenticate.call_args.kwargs['username'], 'jacson')

    def test_perfil_y_buscador_exigen_sesion(self):
        for url in ['/cuentas/perfil/', '/discos/buscar-albumes/?q=MTV']:
            self.assertEqual(self.client.get(url).status_code, 302)


class ItunesSinRedTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def request(self, params):
        request = RequestFactory().get('/discos/buscar-albumes/', params)
        request.user = User(pk=1)
        return request

    def test_paginacion_avanza_sin_repetir_resultados(self):
        payload = {'albumes': [{'id': i} for i in range(30)], 'limite_alcanzado': False}
        with patch('tiendaApp.views.buscar_albumes', return_value=payload):
            first = json.loads(views.buscar_albumes_itunes(self.request({'q': 'MTV', 'pagina': 1})).content)
            second = json.loads(views.buscar_albumes_itunes(self.request({'q': 'MTV', 'pagina': 2})).content)
        self.assertEqual(first['paginas'], 3)
        self.assertEqual(first['total'], 30)
        self.assertTrue(first['siguiente'])
        self.assertFalse({a['id'] for a in first['albumes']} & {a['id'] for a in second['albumes']})

    def test_parametros_invalidos_no_consultan_itunes(self):
        with patch('tiendaApp.views.buscar_albumes') as search:
            for params in [{'q': 'a'}, {'q': 'MTV', 'pais': 'XX'}, {'q': 'MTV', 'tipo': 'otro'}]:
                self.assertEqual(views.buscar_albumes_itunes(self.request(params)).status_code, 400)
            search.assert_not_called()

    def test_no_oculta_ediciones_y_deduplica_solo_mismo_id(self):
        rows = [{'collectionId': i, 'collectionName': title, 'artistName': 'Nirvana', 'primaryGenreName': 'Rock', 'releaseDate': '1994-11-01T12:00:00Z'} for i, title in [(1, 'MTV Unplugged'), (2, 'Live'), (3, 'Live'), (4, 'Deluxe'), (4, 'Deluxe')]]
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.read.return_value = json.dumps({'results': rows}).encode()
        with patch('tiendaApp.itunes.urlopen', return_value=response) as remote:
            result = buscar_albumes('Nirvana', 'CL', 'album')
            again = buscar_albumes('Nirvana', 'CL', 'album')
            self.assertEqual(len(result['albumes']), 4)
            self.assertEqual(result, again)
            self.assertEqual(remote.call_count, 1)
            self.assertIn('limit=200', remote.call_args.args[0].full_url)

    def test_busqueda_por_canciones_no_devuelve_solo_las_mismas_diez(self):
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.read.return_value = json.dumps({'results': [{'collectionId': i, 'collectionName': 'Live '+str(i), 'artistName': 'Artista'} for i in range(1, 201)]}).encode()
        with patch('tiendaApp.itunes.urlopen', return_value=response) as remote:
            result = buscar_albumes('Live', 'US', 'canciones')
        self.assertEqual(len(result['albumes']), 200)
        self.assertTrue(result['limite_alcanzado'])
        self.assertIn('entity=song', remote.call_args.args[0].full_url)

    def test_caida_de_itunes_no_impide_formulario_manual(self):
        with patch('tiendaApp.itunes.urlopen', side_effect=URLError('sin conexión')):
            with self.assertRaises(ErrorItunes):
                buscar_albumes('Nirvana', 'CL', 'album')
        with patch('tiendaApp.views.buscar_albumes', side_effect=ErrorItunes('Inténtalo más tarde')):
            self.assertEqual(views.buscar_albumes_itunes(self.request({'q': 'MTV'})).status_code, 503)
