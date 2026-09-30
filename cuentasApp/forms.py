from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.models import User


class RegistroForm(UserCreationForm):
    """El correo se usa también como nombre de usuario."""
    first_name = forms.CharField(label='Nombre', max_length=50)
    email = forms.EmailField(label='Correo')

    class Meta:
        model = User
        fields = ['first_name', 'email']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for campo in self.fields.values():
            campo.widget.attrs['class'] = 'form-control'

    def clean_first_name(self):
        nombre = self.cleaned_data['first_name'].strip()
        if not nombre.replace(' ', '').isalpha():
            raise forms.ValidationError('El nombre solo puede contener letras y espacios.')
        return nombre

    def clean_email(self):
        email = self.cleaned_data['email'].strip().lower()
        if User.objects.filter(username=email).exists():
            raise forms.ValidationError('Este correo ya está registrado.')
        return email

    def save(self, commit=True):
        usuario = super().save(commit=False)
        usuario.username = self.cleaned_data['email']
        usuario.email = self.cleaned_data['email']
        if commit:
            usuario.save()
        return usuario


class LoginForm(AuthenticationForm):
    username = forms.EmailField(label='Correo')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for campo in self.fields.values():
            campo.widget.attrs['class'] = 'form-control'

    def clean_username(self):
        return self.cleaned_data['username'].strip().lower()
