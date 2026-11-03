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
    username = forms.CharField(label='Correo o nombre de usuario', max_length=254)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for campo in self.fields.values():
            campo.widget.attrs['class'] = 'form-control'

    def clean_username(self):
        identifier = self.cleaned_data['username'].strip()
        if '@' in identifier:
            usuario = User.objects.filter(username__iexact=identifier).first()
            if usuario:
                return usuario.username
            matches = list(User.objects.filter(email__iexact=identifier)[:2])
            if len(matches) == 1:
                return matches[0].username
            if len(matches) > 1:
                raise self.get_invalid_login_error()
        return identifier


class PerfilForm(forms.ModelForm):
    first_name = forms.CharField(label='Tu nombre', max_length=50,
        widget=forms.TextInput(attrs={'class': 'form-control', 'autocomplete': 'given-name'}))

    class Meta:
        model = User
        fields = ['first_name']

    def clean_first_name(self):
        nombre = ' '.join(self.cleaned_data['first_name'].split())
        if not nombre.replace(' ', '').replace('-', '').replace("'", '').isalpha():
            raise forms.ValidationError('Escribe un nombre válido.')
        return nombre
