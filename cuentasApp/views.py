from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.views import LoginView
from django.shortcuts import render, redirect
from .forms import RegistroForm, LoginForm


class VinlumeLoginView(LoginView):
    template_name = 'cuentasApp/login.html'
    authentication_form = LoginForm
    redirect_authenticated_user = True


def registro(request):
    if request.method == 'POST':
        form = RegistroForm(request.POST)
        if form.is_valid():
            usuario = form.save()
            login(request, usuario)
            messages.success(request, f'¡Cuenta creada! Bienvenido/a {usuario.first_name}.')
            return redirect('inicio')
    else:
        form = RegistroForm()
    return render(request, 'cuentasApp/registro.html', {'form': form})
