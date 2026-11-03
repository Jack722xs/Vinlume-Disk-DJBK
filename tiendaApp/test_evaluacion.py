import datetime
from unittest.mock import Mock, patch

from django.contrib.auth.models import User
from django.contrib.messages.storage.fallback import FallbackStorage
from django.db.models.deletion import ProtectedError, RestrictedError
from django.test import Client, RequestFactory, SimpleTestCase, override_settings
from django.urls import reverse

from tiendaApp import views
from tiendaApp.forms import DiscoForm
from tiendaApp.models import Artista, Disco


@override_settings(SESSION_ENGINE='django.contrib.sessions.backends.signed_cookies')
class EvaluacionSinBaseDeDatosTests(SimpleTestCase):
    """Verifica rutas y lógica sin permitir consultas ni crear una base de prueba."""

    def setUp(self):
        self.user = User(pk=999, username='prueba@example.cl', is_staff=False)
        self.disco = Disco(pk=12, titulo='Prueba', artista=Artista(codigo=1, nombre='Artista'),
                           precio=4990, imagen='x/1.jpg', fechaLanzamiento=datetime.date(2020, 2, 3))

    def request(self, method, path):
        request = getattr(RequestFactory(), method)(path)
        request.user = self.user
        request.session = {}
        request._messages = FallbackStorage(request)
        return request

    def test_visitante_no_puede_entrar_ni_enviar_al_crud(self):
        routes = [('discos', []), ('crearDisco', []), ('editarDisco', [12]), ('eliminarDisco', [12])]
        for name, args in routes:
            url = reverse(name, args=args)
            for method in ['get', 'post']:
                with self.subTest(route=url, method=method):
                    response = getattr(self.client, method)(url)
                    self.assertRedirects(response, reverse('login')+'?next='+url, fetch_redirect_response=False)

    def test_catalogo_publico_renderiza_y_conserva_busqueda(self):
        with patch('tiendaApp.views.Disco.objects.select_related') as query:
            query.return_value = [self.disco]
            response = self.client.get(reverse('catalogo'))
            self.assertContains(response, 'Prueba')
            query.return_value = Mock()
            query.return_value.filter.return_value = [self.disco]
            response = self.client.get(reverse('catalogo'), {'q': 'Prueba'})
            self.assertEqual(response.status_code, 200)
            query.return_value.filter.assert_called_once()

    def test_usuario_normal_ve_mantenedor_y_acciones(self):
        with patch('tiendaApp.views.Disco.objects.select_related', return_value=[self.disco]):
            response = views.lista_discos(self.request('get', '/discos/'))
        self.assertContains(response, reverse('editarDisco', args=[12]))
        self.assertContains(response, reverse('eliminarDisco', args=[12]))
        self.assertContains(response, 'Gestión de discos')

    def test_crear_guarda_solo_formulario_valido(self):
        for valid in [True, False]:
            form = Mock()
            form.is_valid.return_value = valid
            with patch('tiendaApp.views.DiscoForm', return_value=form), patch('tiendaApp.views.render'):
                response = views.crear_disco(self.request('post', '/discos/agregar/'))
            self.assertEqual(form.save.call_count, int(valid))
            if valid:
                self.assertEqual(response.status_code, 302)

    def test_editar_precarga_instancia_y_fecha_iso(self):
        with patch('tiendaApp.views.get_object_or_404', return_value=self.disco):
            response = views.editar_disco(self.request('get', '/discos/12/editar/'), 12)
        self.assertContains(response, 'value="Prueba"')
        self.assertContains(response, 'value="2020-02-03"')
        self.assertContains(response, 'Editar')

    def test_editar_guarda_solo_formulario_valido_y_misma_instancia(self):
        for valid in [True, False]:
            form = Mock()
            form.is_valid.return_value = valid
            with patch('tiendaApp.views.get_object_or_404', return_value=self.disco), patch('tiendaApp.views.DiscoForm', return_value=form) as constructor, patch('tiendaApp.views.render'):
                views.editar_disco(self.request('post', '/discos/12/editar/'), 12)
            self.assertIs(constructor.call_args.kwargs['instance'], self.disco)
            self.assertEqual(form.save.call_count, int(valid))

    def test_eliminar_get_solo_confirma_post_elimina(self):
        with patch('tiendaApp.views.get_object_or_404', return_value=self.disco), patch.object(self.disco, 'delete') as delete:
            response = views.eliminar_disco(self.request('get', '/discos/12/eliminar/'), 12)
            self.assertContains(response, 'Confirmar eliminación')
            self.assertContains(response, 'csrfmiddlewaretoken')
            delete.assert_not_called()
            response = views.eliminar_disco(self.request('post', '/discos/12/eliminar/'), 12)
            delete.assert_called_once()
            self.assertEqual(response.status_code, 302)

    def test_integridad_protegida_muestra_error(self):
        for error in [ProtectedError, RestrictedError]:
            request = self.request('post', '/discos/12/eliminar/')
            with patch('tiendaApp.views.get_object_or_404', return_value=self.disco), patch.object(self.disco, 'delete', side_effect=error('protegido', [self.disco])):
                response = views.eliminar_disco(request, 12)
            self.assertEqual(response.status_code, 302)
            self.assertTrue(any('protegidos' in str(message) for message in request._messages))

    def test_csrf_rechaza_post_sin_token(self):
        client = Client(enforce_csrf_checks=True)
        for url in ['/discos/agregar/', '/discos/12/editar/', '/discos/12/eliminar/', '/cuentas/login/', '/cuentas/logout/']:
            self.assertEqual(client.post(url).status_code, 403, url)

    def test_login_sesion_y_logout_con_autenticacion_simulada(self):
        with patch('cuentasApp.forms.User.objects.filter') as users, patch('django.contrib.auth.forms.authenticate', return_value=self.user), patch.object(User, 'save'), patch('django.contrib.auth.backends.ModelBackend.get_user', return_value=self.user):
            users.return_value.first.return_value = self.user
            response = self.client.post(reverse('login'), {'username': 'prueba@example.cl', 'password': 'Solo-Prueba-2026', 'next': '/discos/'})
            self.assertRedirects(response, '/discos/', fetch_redirect_response=False)
            self.assertEqual(str(self.client.session['_auth_user_id']), str(self.user.pk))
            self.assertEqual(self.client.get(reverse('logout')).status_code, 405)
            response = self.client.get('/admin/')
            self.assertEqual(response.status_code, 302)
            self.assertIn('/admin/login/', response.url)
            response = self.client.post(reverse('logout'))
            self.assertEqual(response.status_code, 302)
            self.assertNotIn('_auth_user_id', self.client.session)

    def test_admin_solo_administradores(self):
        from django.contrib.admin import site
        request = self.request('get', '/admin/')
        self.assertFalse(site.has_permission(request))
        self.user.is_staff = True
        self.assertTrue(site.has_permission(request))
        self.user.is_active = False
        self.assertFalse(site.has_permission(request))

    def test_validaciones_precio_fecha_etiquetas_y_estado(self):
        for field, bad_value in [('precio', '0'), ('precio', '-1'), ('precio', 'abc'), ('fechaLanzamiento', '1850-01-01'), ('estado', 'x')]:
            data = {'titulo': 'Prueba', 'precio': '4990', 'imagen': 'x/1.jpg', 'estado': 'd'}
            data[field] = bad_value
            form = DiscoForm(data)
            self.assertIn(field, form.errors)
