// Same browser-local favorites, shared by cards and gallery. No database writes.
(() => {
  'use strict';
  window.VinlumeFavorites?.destroy();
  const key = 'vinlume_favoritos';
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let favorites = [];
  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      favorites = Array.isArray(value) ? [...new Set(value.filter(id => ['string', 'number'].includes(typeof id)).map(String))] : [];
    } catch { /* Keep in-memory state if browser storage is unavailable. */ }
  }
  function sync() {
    document.querySelectorAll('.fav-btn').forEach(button => {
      const selected = favorites.includes(button.dataset.id);
      const title = button.dataset.productName || 'este producto';
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', selected ? `Quitar ${title} de favoritos` : `Guardar ${title} en favoritos`);
      const label = button.querySelector('[data-favorite-label]');
      if (label) label.textContent = selected ? 'Quitar favorito' : 'Guardar favorito';
    });
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('.fav-btn');
    if (!button?.dataset.id) return;
    const id = button.dataset.id;
    favorites = favorites.includes(id) ? favorites.filter(value => value !== id) : [...favorites, id];
    try { localStorage.setItem(key, JSON.stringify(favorites)); } catch { /* Usable in-memory fallback. */ }
    sync();
  }, options);
  window.addEventListener('storage', event => { if (event.key === key || event.key === null) { read(); sync(); } }, options);
  window.addEventListener('pageshow', () => { read(); sync(); }, options);
  document.addEventListener('DOMContentLoaded', sync, { ...options, once: true });
  window.VinlumeFavorites = Object.freeze({ sync, destroy() { controller.abort(); } });
  read(); sync();
})();
