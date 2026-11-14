/* Native GET search and product actions remain native. No external dependencies. */
(() => {
  'use strict';
  window.VinlumeCatalog?.destroy();
  const root = document.querySelector('[data-pn-catalog]');
  const dialog = root?.querySelector('[data-pn-gallery]');
  if (!root || !dialog || typeof dialog.showModal !== 'function') return;
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const image = dialog.querySelector('[data-gallery-image]');
  const error = dialog.querySelector('[data-gallery-error]');
  const previous = dialog.querySelector('[data-gallery-previous]');
  const next = dialog.querySelector('[data-gallery-next]');
  const commerce = dialog.querySelector('[data-gallery-commerce]');
  const favorite = dialog.querySelector('.fav-btn');
  const reduced = () => motion.matches || Boolean(window.VinlumeEffects?.reduced);
  let opener = null, photos = [], index = 0, title = '';
  let action = null, placeholder = null, animation = null, closing = false;
  let backdropDown = false;
  let pointerController = null, active = null, frame = 0, point = null;
  function cancelAnimation() { animation?.cancel(); animation = null; }
  function showPhoto(value) {
    index = (value + photos.length) % photos.length;
    error.hidden = true; image.hidden = false;
    image.alt = `${title} — Foto ${index + 1}`;
    image.src = photos[index];
    dialog.querySelector('[data-gallery-original]').href = photos[index];
    dialog.querySelector('[data-gallery-count]').textContent = `Foto ${index + 1} de ${photos.length}`;
    previous.hidden = next.hidden = photos.length < 2;
  }
  function cleanDialog() {
    cancelAnimation(); closing = false;
    if (placeholder && action) placeholder.replaceWith(action);
    placeholder = action = null;
    commerce.replaceChildren();
    document.documentElement.classList.remove('pn-gallery-open');
    image.removeAttribute('src'); photos = [];
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  }
  function requestClose() {
    if (!dialog.open || closing) return;
    cancelAnimation(); closing = true;
    if (reduced() || !dialog.animate) { dialog.close(); return; }
    animation = dialog.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(12px)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
    animation.finished.then(() => { if (closing && dialog.open) dialog.close(); }).catch(() => {});
  }
  function openGallery(link) {
    const card = link.closest('[data-pn-product]');
    if (!card || dialog.open) return;
    title = card.querySelector('[data-product-title]').textContent.trim(); opener = link;
    photos = [...new Set([link.href, link.dataset.secondPhoto ? new URL(link.dataset.secondPhoto, document.baseURI).href : null].filter(Boolean))];
    dialog.querySelector('#pn-gallery-title').textContent = title;
    dialog.querySelector('#pn-gallery-artist').textContent = card.querySelector('[data-product-artist]').textContent;
    dialog.querySelector('[data-gallery-price]').textContent = card.querySelector('[data-product-price]').textContent;
    dialog.querySelector('[data-gallery-tags]').replaceChildren(...[...card.querySelector('[data-product-tags]').children].map(tag => tag.cloneNode(true)));
    dialog.querySelector('.pn-gallery-help').textContent = photos.length > 1 ? 'Usa ← y → para cambiar de foto. Escape cierra la galería.' : 'Una fotografía disponible. Escape cierra la galería.';
    const cardFavorite = card.querySelector('.fav-btn');
    favorite.dataset.id = cardFavorite.dataset.id; favorite.dataset.productName = cardFavorite.dataset.productName;
    window.VinlumeFavorites?.sync();
    // Move the current original button, preserving its own listeners; no invented checkout.
    action = card.querySelector('.card-footer .buy-btn');
    if (action) {
      placeholder = document.createComment('Product action returns here on gallery close');
      action.before(placeholder); commerce.append(action);
    } else {
      const status = card.querySelector('.agotado');
      if (status) commerce.append(status.cloneNode(true));
    }
    showPhoto(0);
    try { dialog.showModal(); } catch { cleanDialog(); location.href = link.href; return; }
    document.documentElement.classList.add('pn-gallery-open');
    dialog.querySelector('[data-gallery-close]').focus({ preventScroll: true });
    if (!reduced() && dialog.animate) animation = dialog.animate([{ opacity: 0, transform: 'translateY(16px) scale(.98)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }
  root.addEventListener('click', event => {
    const link = event.target.closest('[data-pn-gallery-link]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); openGallery(link);
  }, options);
  image.addEventListener('error', () => { image.hidden = true; error.hidden = false; }, options);
  previous.addEventListener('click', () => { if (!closing && photos.length) showPhoto(index - 1); }, options);
  next.addEventListener('click', () => { if (!closing && photos.length) showPhoto(index + 1); }, options);
  dialog.querySelector('[data-gallery-close]').addEventListener('click', requestClose, options);
  dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose(); }, options);
  dialog.addEventListener('close', cleanDialog, options);
  const outside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  dialog.addEventListener('pointerdown', event => { backdropDown = event.target === dialog && outside(event); }, options);
  dialog.addEventListener('click', event => { if (backdropDown && event.target === dialog && outside(event)) requestClose(); backdropDown = false; }, options);
  dialog.addEventListener('keydown', event => {
    if (closing) return;
    if (['ArrowLeft', 'ArrowRight'].includes(event.key) && photos.length > 1) { event.preventDefault(); showPhoto(index + (event.key === 'ArrowRight' ? 1 : -1)); }
    if (event.key === 'Tab') {
      const targets = [...dialog.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')].filter(element => !element.hidden && element.getClientRects().length);
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }, options);
  function clearPointer() {
    cancelAnimationFrame(frame); frame = 0; point = null;
    if (active) ['--card-x', '--card-y', '--card-rx', '--card-ry'].forEach(name => active.style.removeProperty(name));
    active = null;
  }
  function syncEffects() {
    pointerController?.abort(); pointerController = null; clearPointer();
    if (reduced()) { if (closing && dialog.open) dialog.close(); else cancelAnimation(); return; }
    if (!fine.matches) return;
    pointerController = new AbortController();
    const pointerOptions = { signal: pointerController.signal, passive: true };
    root.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || dialog.open) return;
      const card = event.target.closest('[data-pn-product]');
      if (!card) { clearPointer(); return; }
      if (active !== card) { clearPointer(); active = card; }
      point = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!active || !point) return;
        const rect = active.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (point.x - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (point.y - rect.top) / rect.height));
        active.style.setProperty('--card-x', `${(x * 100).toFixed(1)}%`);
        active.style.setProperty('--card-y', `${(y * 100).toFixed(1)}%`);
        active.style.setProperty('--card-rx', `${((.5 - y) * 2).toFixed(2)}deg`);
        active.style.setProperty('--card-ry', `${((x - .5) * 2).toFixed(2)}deg`);
      });
    }, pointerOptions);
    root.addEventListener('pointerout', event => { if (active && (!event.relatedTarget || !active.contains(event.relatedTarget))) clearPointer(); }, pointerOptions);
  }
  motion.addEventListener('change', syncEffects, options);
  fine.addEventListener('change', syncEffects, options);
  document.addEventListener('pn:effectschange', syncEffects, options);
  window.addEventListener('blur', clearPointer, options);
  document.addEventListener('visibilitychange', clearPointer, options);
  window.addEventListener('pagehide', () => { clearPointer(); if (dialog.open) dialog.close(); }, options);
  window.addEventListener('pageshow', syncEffects, options);
  window.VinlumeCatalog = Object.freeze({ destroy() {
    pointerController?.abort(); clearPointer(); cancelAnimation(); closing = false;
    if (dialog.open) { dialog.close(); cleanDialog(); }
    controller.abort();
  } });
  syncEffects();
})();
