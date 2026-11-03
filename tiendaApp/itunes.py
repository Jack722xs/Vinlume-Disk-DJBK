import hashlib
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.core.cache import cache


class ErrorItunes(Exception):
    pass


def buscar_albumes(termino, pais, tipo):
    key = 'itunes:' + hashlib.sha256(f'{termino.lower()}|{pais}|{tipo}'.encode()).hexdigest()
    cached = cache.get(key)
    if cached is not None:
        return cached
    params = {'term': termino, 'country': pais, 'media': 'music', 'limit': 200, 'explicit': 'Yes',
              'entity': 'song' if tipo == 'canciones' else 'album'}
    if tipo == 'artista':
        params['attribute'] = 'artistTerm'
    request = Request('https://itunes.apple.com/search?' + urlencode(params),
                      headers={'User-Agent': 'VinlumeDisk/1.0', 'Accept': 'application/json'})
    try:
        with urlopen(request, timeout=10) as response:
            content = response.read(2_000_001)
            if len(content) > 2_000_000:
                raise ErrorItunes('La respuesta es demasiado grande. Prueba una búsqueda más precisa.')
            data = json.loads(content)
        raw = data['results']
        if not isinstance(raw, list):
            raise ValueError('Respuesta no válida')
    except HTTPError as error:
        message = 'iTunes ha limitado las búsquedas. Espera un momento e inténtalo de nuevo.' if error.code == 429 else 'iTunes no está disponible en este momento.'
        raise ErrorItunes(message) from error
    except (URLError, TimeoutError, OSError, ValueError, KeyError) as error:
        raise ErrorItunes('No se pudo consultar iTunes. Puedes completar el disco manualmente.') from error
    albums = {}
    for result in raw:
        if not isinstance(result, dict):
            continue
        album_id = result.get('collectionId')
        title = result.get('collectionName')
        artist = result.get('artistName')
        if not album_id or not title or not artist or album_id in albums:
            continue
        # El ID distingue ediciones Live, MTV, Deluxe y reediciones con el mismo título.
        albums[album_id] = {'id': album_id, 'titulo': str(title), 'artista': str(artist),
            'etiquetas': str(result.get('primaryGenreName') or ''),
            'fecha': str(result.get('releaseDate') or '')[:10],
            'canciones': result.get('trackCount'),
            'url': f'https://music.apple.com/{pais.lower()}/album/{album_id}'}
    payload = {'albumes': list(albums.values()), 'limite_alcanzado': len(raw) >= 200}
    cache.set(key, payload, 300)
    return payload
