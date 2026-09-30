from django import forms
from .models import Mensaje


class MensajeForm(forms.ModelForm):
    nombre = forms.CharField(
        label='Nombre', max_length=80,
        widget=forms.TextInput(attrs={'class': 'form-control'}))
    correo = forms.EmailField(
        label='Correo',
        widget=forms.EmailInput(attrs={'class': 'form-control'}))
    mensaje = forms.CharField(
        label='Mensaje', max_length=1000,
        widget=forms.Textarea(attrs={'class': 'form-control', 'rows': 5}))

    class Meta:
        model = Mensaje
        fields = ['nombre', 'correo', 'mensaje']

    def clean_nombre(self):
        nombre = self.cleaned_data['nombre'].strip()
        # Solo letras y espacios (permite "Ana María")
        if not nombre.replace(' ', '').isalpha():
            raise forms.ValidationError('El nombre solo puede contener letras y espacios.')
        return nombre

    def clean_mensaje(self):
        mensaje = self.cleaned_data['mensaje'].strip()
        if len(mensaje) < 10:
            raise forms.ValidationError('El mensaje debe tener al menos 10 caracteres.')
        return mensaje
