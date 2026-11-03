(() => {
  const search = document.getElementById('itunes-search');
  if (!search) return;
  const results = document.getElementById('itunes-results');
  const message = document.getElementById('itunes-message');
  const pagination = document.getElementById('itunes-pagination');
  const previous = document.getElementById('itunes-prev');
  const next = document.getElementById('itunes-next');
  let query = null;
  let page = 1;
  let controller = null;

  function selectAlbum(album) {
    if (document.getElementById('id_titulo').value.trim() && !window.confirm('¿Reemplazar título, artista, etiquetas y fecha por los datos de este álbum?')) return;
    const fields = {titulo: album.titulo, artista_nombre: album.artista, etiquetas: album.etiquetas, fechaLanzamiento: album.fecha};
    Object.entries(fields).forEach(([name, value]) => {
      const input = document.getElementById('id_' + name);
      input.value = value || '';
      input.dispatchEvent(new Event('input', {bubbles: true}));
    });
    document.getElementById('itunes-selected').textContent = 'Datos de «' + album.titulo + '» completados. Revisa la edición y la fecha, indica tu precio y sube la portada.';
    document.getElementById('id_titulo').focus();
  }

  async function loadPage(number) {
    if (controller) controller.abort();
    controller = new AbortController();
    const active = controller;
    message.textContent = 'Buscando álbumes…';
    message.classList.remove('error');
    results.replaceChildren();
    pagination.hidden = true;
    search.querySelector('button').disabled = true;
    const params = new URLSearchParams(query);
    params.set('pagina', number);
    try {
      const response = await fetch(search.action + '?' + params.toString(), {signal: active.signal, headers: {'Accept': 'application/json'}});
      if (response.redirected) throw new Error('Tu sesión terminó. Vuelve a iniciar sesión para buscar.');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo consultar iTunes. Puedes ingresar los datos manualmente.');
      page = data.pagina;
      data.albumes.forEach(album => {
        const card = document.createElement('article');
        card.className = 'itunes-result';
        const title = document.createElement('strong');
        title.textContent = album.titulo;
        const details = document.createElement('p');
        details.textContent = [album.artista, album.fecha, album.etiquetas].filter(Boolean).join(' · ');
        const link = document.createElement('a');
        link.textContent = 'Ver edición en Apple Music / iTunes';
        link.href = album.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        const select = document.createElement('button');
        select.type = 'button';
        select.className = 'btn btn-secondary';
        select.textContent = 'Usar estos datos';
        select.addEventListener('click', () => selectAlbum(album));
        card.append(title, details, link, select);
        results.append(card);
      });
      message.textContent = data.total ? data.total + ' álbumes encontrados.' + (data.limite_alcanzado ? ' Se alcanzó el límite de esta consulta; afina la búsqueda para encontrar otras ediciones.' : '') : 'No encontramos álbumes. Prueba el título exacto, otro país o buscar por canciones. También puedes completar los datos manualmente.';
      document.getElementById('itunes-page').textContent = 'Página ' + page + ' de ' + data.paginas;
      previous.disabled = !data.anterior;
      next.disabled = !data.siguiente;
      pagination.hidden = data.paginas < 2;
    } catch (error) {
      if (error.name !== 'AbortError') {
        message.textContent = error.message;
        message.classList.add('error');
      }
    } finally {
      if (controller === active) search.querySelector('button').disabled = false;
    }
  }
  search.addEventListener('submit', event => { event.preventDefault(); query = new URLSearchParams(new FormData(search)); loadPage(1); });
  previous.addEventListener('click', () => loadPage(page - 1));
  next.addEventListener('click', () => loadPage(page + 1));
  ['portada', 'contraportada'].forEach(name => {
    const input = document.getElementById('id_' + name);
    const preview = document.getElementById('preview-' + name);
    const original = preview.getAttribute('src');
    let objectUrl;
    input.addEventListener('change', () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      const file = input.files[0];
      if (file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 5 * 1024 * 1024) {
        objectUrl = URL.createObjectURL(file);
        preview.src = objectUrl;
        preview.hidden = false;
      } else {
        if (original) preview.src = original; else preview.removeAttribute('src');
        preview.hidden = !original;
      }
    });
  });
})();
