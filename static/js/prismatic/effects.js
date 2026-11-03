/* Shared enhancement; never intercepts links, forms or browser history.
   API: VinlumeEffects.reduced, setReduced(boolean), reset(), destroy().
   Future scenes subscribe to pn:effectschange on document. */
(() => {
  'use strict';
  window.VinlumeEffects?.destroy();
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const key = 'vinlume:reduced-effects';
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let preference = false;
  let frame = 0;
  let active = null;
  let pending = null;
  try { preference = localStorage.getItem(key) === 'true'; } catch { /* Optional storage. */ }
  const reduced = () => motion.matches || preference;
  const clear = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    pending = null;
    active?.style.removeProperty('--pn-pointer-x');
    active?.style.removeProperty('--pn-pointer-y');
    active = null;
  };
  const sync = () => {
    clear();
    root.dataset.pnEffects = reduced() ? 'reduced' : 'full';
    document.querySelectorAll('[data-pn-effects-toggle]').forEach(button => {
      button.hidden = false;
      button.setAttribute('aria-pressed', String(reduced()));
      button.disabled = motion.matches;
      button.textContent = motion.matches ? 'Efectos reducidos por el sistema' : 'Reducir efectos';
    });
    document.dispatchEvent(new CustomEvent('pn:effectschange', { detail: { reduced: reduced() } }));
  };
  const setReduced = value => {
    preference = Boolean(value);
    try { localStorage.setItem(key, String(preference)); } catch { /* Memory fallback. */ }
    sync();
  };
  document.addEventListener('click', event => {
    if (event.target.closest('[data-pn-effects-toggle]')) setReduced(!preference);
  }, options);
  document.addEventListener('pointermove', event => {
    if (reduced() || !pointer.matches || event.pointerType !== 'mouse') return;
    const button = event.target.closest('.pn-button, .btn');
    if (!button || button.matches(':disabled, [aria-disabled="true"]')) { clear(); return; }
    if (active !== button) { clear(); active = button; }
    pending = { x: event.clientX, y: event.clientY };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!active || !pending) return;
      const rect = active.getBoundingClientRect();
      active.style.setProperty('--pn-pointer-x', `${((pending.x - rect.left) / (rect.width || 1)) * 100}%`);
      active.style.setProperty('--pn-pointer-y', `${((pending.y - rect.top) / (rect.height || 1)) * 100}%`);
    });
  }, { ...options, passive: true });
  document.addEventListener('pointerout', event => {
    if (active && (!event.relatedTarget || !active.contains(event.relatedTarget))) clear();
  }, options);
  document.addEventListener('visibilitychange', clear, options);
  window.addEventListener('blur', clear, options);
  window.addEventListener('pagehide', clear, options);
  window.addEventListener('pageshow', sync, options);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) { preference = event.newValue === 'true'; sync(); }
  }, options);
  motion.addEventListener('change', sync, options);
  pointer.addEventListener('change', clear, options);
  window.VinlumeEffects = Object.freeze({
    get reduced() { return reduced(); }, setReduced,
    reset() { preference = false; try { localStorage.removeItem(key); } catch { /* Optional. */ } sync(); },
    destroy() { clear(); controller.abort(); }
  });
  sync();
})();
