from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Q
from django.shortcuts import render, redirect
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


# ----- Mantenedor de discos (Doc 6): solo personal autorizado -----
@staff_member_required
def lista_discos(request):
    discos = Disco.objects.select_related('artista')
    return render(request, 'tiendaApp/discos.html', {'discos': discos})


@staff_member_required
def crear_disco(request):
    if request.method == 'POST':
        form = DiscoForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Disco guardado correctamente.')
            return redirect('discos')
    else:
        form = DiscoForm()
    return render(request, 'tiendaApp/disco_add.html', {'form': form})
