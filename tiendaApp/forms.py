import datetime
from django import forms
from tiendaApp.choices import estados
from tiendaApp.models import Artista, Disco


class DiscoForm(forms.ModelForm):
    titulo = forms.CharField(
        label='Título',
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ej. Blurryface'}))
    artista = forms.ModelChoiceField(
        label='Artista',
        queryset=Artista.objects.all(),
        empty_label='Selecciona un artista',
        widget=forms.Select(attrs={'class': 'form-select'}))
    etiquetas = forms.CharField(
        label='Etiquetas', required=False,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ej. Rock, Indie'}))
    precio = forms.IntegerField(
        label='Precio (CLP)',
        widget=forms.NumberInput(attrs={'class': 'form-control', 'placeholder': '4990'}))
    estado = forms.CharField(
        label='Estado',
        widget=forms.Select(choices=estados, attrs={'class': 'form-select'}))
    imagen = forms.CharField(
        label='Imagen portada',
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'carpeta/1.jpg'}))
    imagen2 = forms.CharField(
        label='Imagen contraportada', required=False,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'carpeta/2.jpg'}))
    fechaLanzamiento = forms.DateField(
        label='Fecha de lanzamiento', required=False,
        widget=forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}))

    class Meta:
        model = Disco
        fields = '__all__'

    # ----- Validaciones personalizadas (Doc 7) -----
    def clean_precio(self):
        precio = self.cleaned_data['precio']
        try:
            precio = int(precio)
        except (TypeError, ValueError):
            raise forms.ValidationError('El precio debe ser un número entero.')
        if precio <= 0:
            raise forms.ValidationError('El precio debe ser mayor que cero.')
        return precio

    def clean_fechaLanzamiento(self):
        fecha = self.cleaned_data.get('fechaLanzamiento')
        if fecha is None:            # campo opcional
            return fecha
        fecha_minima = datetime.date(1900, 1, 1)
        fecha_maxima = datetime.date.today()
        if fecha < fecha_minima or fecha > fecha_maxima:
            raise forms.ValidationError(
                'La fecha debe estar entre el 01-01-1900 y hoy.')
        return fecha

    def clean_etiquetas(self):
        etiquetas = self.cleaned_data.get('etiquetas')
        if not etiquetas:
            return etiquetas
        # Solo letras, espacios, comas y guiones (Post-Punk, J-Pop)
        if not etiquetas.replace(',', '').replace(' ', '').replace('-', '').isalpha():
            raise forms.ValidationError(
                'Las etiquetas solo pueden tener letras, espacios, comas y guiones.')
        return ', '.join(e.strip() for e in etiquetas.split(',') if e.strip())
