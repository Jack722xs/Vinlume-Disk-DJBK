import datetime
from uuid import uuid4

from django import forms
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction

from tiendaApp.models import Artista, Disco


class DiscoForm(forms.ModelForm):
    artista_nombre = forms.CharField(label='Artista', max_length=100,
        help_text='Escribe el nombre. Si todavía no existe, se creará al guardar el disco.')
    portada = forms.ImageField(label='Portada', required=False,
        widget=forms.FileInput(attrs={'accept': 'image/jpeg,image/png,image/webp'}))
    contraportada = forms.ImageField(label='Contraportada', required=False,
        widget=forms.FileInput(attrs={'accept': 'image/jpeg,image/png,image/webp'}))

    class Meta:
        model = Disco
        fields = ['titulo', 'artista_nombre', 'etiquetas', 'precio', 'estado',
                  'fechaLanzamiento', 'portada', 'contraportada']
        labels = {'titulo': 'Título', 'precio': 'Precio (CLP)', 'fechaLanzamiento': 'Fecha de lanzamiento'}
        widgets = {'fechaLanzamiento': forms.DateInput(format='%Y-%m-%d', attrs={'type': 'date'})}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            field.widget.attrs['class'] = 'form-control'
        self.fields['artista_nombre'].widget.attrs.update({'placeholder': 'Ej. Ado', 'autocomplete': 'off'})
        self.fields['etiquetas'].widget.attrs['placeholder'] = 'Ej. Rock, R&B, Hip-Hop/Rap'
        self.fields['portada'].required = not bool(self.instance.imagen)
        if self.instance.pk:
            self.initial['artista_nombre'] = self.instance.artista.nombre

    def clean_artista_nombre(self):
        return ' '.join(self.cleaned_data['artista_nombre'].split())

    def clean_precio(self):
        precio = self.cleaned_data['precio']
        if precio <= 0:
            raise forms.ValidationError('El precio debe ser mayor que cero.')
        return precio

    def clean_fechaLanzamiento(self):
        fecha = self.cleaned_data.get('fechaLanzamiento')
        if fecha and not datetime.date(1900, 1, 1) <= fecha <= datetime.date.today():
            raise forms.ValidationError('La fecha debe estar entre el 01-01-1900 y hoy.')
        return fecha

    def clean_etiquetas(self):
        return ', '.join(tag.strip() for tag in (self.cleaned_data.get('etiquetas') or '').split(',') if tag.strip())

    def clean(self):
        cleaned = super().clean()
        for name in ['portada', 'contraportada']:
            image = cleaned.get(name)
            if image:
                if image.size > 5 * 1024 * 1024:
                    self.add_error(name, 'La imagen no debe superar los 5 MB.')
                elif image.image.format not in {'JPEG', 'PNG', 'WEBP'}:
                    self.add_error(name, 'Selecciona una imagen JPG, PNG o WebP.')
        return cleaned

    def save(self, commit=True):
        disco = super().save(commit=False)
        if not commit:
            return disco
        saved_files = []
        try:
            with transaction.atomic():
                name = self.cleaned_data['artista_nombre']
                artista = Artista.objects.filter(nombre__iexact=name).first()
                disco.artista = artista or Artista.objects.get_or_create(nombre=name)[0]
                for field, column in [('portada', 'imagen'), ('contraportada', 'imagen2')]:
                    image = self.cleaned_data.get(field)
                    if image:
                        extension = {'JPEG': '.jpg', 'PNG': '.png', 'WEBP': '.webp'}[image.image.format]
                        path = default_storage.save('discos/' + uuid4().hex + extension, image)
                        saved_files.append(path)
                        setattr(disco, column, settings.MEDIA_URL + path)
                disco.save()
        except Exception:
            # El rollback de MySQL no retira archivos del disco.
            for path in saved_files:
                default_storage.delete(path)
            raise
        return disco
