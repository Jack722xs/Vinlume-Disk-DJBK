from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db import IntegrityError
from django.http import JsonResponse
from tiendaApp.itunes import buscar_albumes, ErrorItunes
from django.db.models.deletion import ProtectedError, RestrictedError
from django.views.decorators.http import require_http_methods
from django.db.models import Q
from django.shortcuts import get_object_or_404, render, redirect
from tiendaApp import datos
from tiendaApp.forms import DiscoForm
from tiendaApp.models import Disco


def inicio(request):
    sitio = datos.obtener_sitio()
    contexto = {
        'pasos': sitio['pasos'],
        'nfc': sitio['nfc'],
        'carrusel': sitio['carrusel'],
        'destacados': Disco.objects.select_related('artista')[:4],
    }
    return render(request, 'tiendaApp/inicio.html', contexto)


def catalogo(request):
    busqueda = request.GET.get('q', '').strip()
    discos = Disco.objects.select_related('artista')
    if busqueda:
        discos = discos.filter(
            Q(titulo__icontains=busqueda)
            | Q(artista__nombre__icontains=busqueda)
            | Q(etiquetas__icontains=busqueda))
    return render(request, 'tiendaApp/catalogo.html',
                  {'discos': discos, 'busqueda': busqueda})


def faq(request):
    return render(request, 'tiendaApp/faq.html', {'preguntas': datos.obtener_faq()})


@login_required
def lista_discos(request):
    discos = Disco.objects.select_related('artista')
    busqueda = request.GET.get('q', '').strip()
    if busqueda:
        discos = discos.filter(Q(titulo__icontains=busqueda) | Q(artista__nombre__icontains=busqueda))
    pagina = Paginator(discos, 12).get_page(request.GET.get('pagina'))
    return render(request, 'tiendaApp/discos.html', {'discos': pagina, 'pagina': pagina, 'busqueda': busqueda})


@login_required
def crear_disco(request):
    if request.method == 'POST':
        form = DiscoForm(request.POST, request.FILES)
        if form.is_valid():
            try:
                form.save()
            except (OSError, IntegrityError):
                form.add_error(None, 'No se pudo guardar el disco. Revisa los datos y vuelve a seleccionar las imágenes.')
            else:
                messages.success(request, 'Disco guardado correctamente.')
                return redirect('discos')
    else:
        form = DiscoForm()
    return render(request, 'tiendaApp/disco_add.html', {'form': form})


@login_required
@require_http_methods(['GET', 'POST'])
def editar_disco(request, pk):
    disco = get_object_or_404(Disco, pk=pk)
    form = DiscoForm(request.POST if request.method == 'POST' else None, request.FILES or None, instance=disco)
    if request.method == 'POST' and form.is_valid():
        try:
            form.save()
        except (OSError, IntegrityError):
            form.add_error(None, 'No se pudo actualizar el disco. Vuelve a seleccionar las imágenes e inténtalo de nuevo.')
        else:
            messages.success(request, 'Disco actualizado correctamente.')
            return redirect('discos')
    return render(request, 'tiendaApp/disco_add.html', {'form': form, 'disco': disco})


@login_required
@require_http_methods(['GET', 'POST'])
def eliminar_disco(request, pk):
    disco = get_object_or_404(Disco, pk=pk)
    if request.method == 'POST':
        try:
            disco.delete()
        except (ProtectedError, RestrictedError):
            messages.error(request, 'No se puede eliminar este disco porque tiene datos relacionados protegidos.')
        else:
            messages.success(request, 'Disco eliminado correctamente.')
        return redirect('discos')
    return render(request, 'tiendaApp/disco_confirm_delete.html', {'disco': disco})


@login_required
@require_http_methods(['GET'])
def buscar_albumes_itunes(request):
    termino = request.GET.get('q', '').strip()
    pais = request.GET.get('pais', 'CL').upper()
    tipo = request.GET.get('tipo', 'album')
    if not 2 <= len(termino) <= 150 or pais not in {'CL', 'US', 'MX', 'AR', 'ES', 'GB', 'JP'} or tipo not in {'album', 'artista', 'canciones'}:
        return JsonResponse({'error': 'Escribe al menos dos caracteres y selecciona un catálogo y tipo válidos.'}, status=400)
    try:
        resultado = buscar_albumes(termino, pais, tipo)
    except ErrorItunes as error:
        return JsonResponse({'error': str(error)}, status=503)
    pagina = Paginator(resultado['albumes'], 12).get_page(request.GET.get('pagina'))
    return JsonResponse({'albumes': list(pagina), 'total': pagina.paginator.count,
        'pagina': pagina.number, 'paginas': pagina.paginator.num_pages,
        'anterior': pagina.has_previous(), 'siguiente': pagina.has_next(),
        'limite_alcanzado': resultado['limite_alcanzado']})
