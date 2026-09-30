from django.contrib import messages
from django.shortcuts import render, redirect
from .forms import MensajeForm


def contacto(request):
    if request.method == 'POST':
        form = MensajeForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, '¡Mensaje enviado a Vinlume con éxito!')
            return redirect('contacto')
    else:
        form = MensajeForm()
    return render(request, 'contactoApp/contacto.html', {'form': form})
