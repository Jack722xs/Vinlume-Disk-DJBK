/* Public interiors: progressive form feedback, native accordions, bounded visual work.
   Never replaces Django submission, validation, CSRF, sessions, or redirects. */
(() => {
  'use strict';
  window.VinlumeInteriors?.destroy();
  const root = document.querySelector('[data-pn-interior]');
  if (!root) return;
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => motion.matches || Boolean(window.VinlumeEffects?.reduced);
  const ambient = new Set(), entrances = new Set(), revealed = new WeakSet();
  const accordions = [];
  let visible = false;
  const navigation = document.querySelector('.navbar');
  const updateNavigationOffset = () => { if (navigation) root.style.setProperty('--pn-interior-nav-offset', `${Math.ceil(navigation.getBoundingClientRect().height) + 16}px`); };
  const navigationObserver = 'ResizeObserver' in window ? new ResizeObserver(updateNavigationOffset) : null;
  if (navigation) navigationObserver?.observe(navigation);
  updateNavigationOffset();
  if (!navigationObserver) window.addEventListener('resize', updateNavigationOffset, { ...options, passive: true });
  function cancelEntrances() { entrances.forEach(animation => animation.cancel()); entrances.clear(); }
  function stopAmbient() { ambient.forEach(animation => animation.cancel()); ambient.clear(); }
  function syncAmbient() {
    stopAmbient();
    if (reduced() || !visible || document.hidden) return;
    root.querySelectorAll('[data-interior-ambient]').forEach((element, index) => {
      if (!element.animate) return;
      ambient.add(element.animate([{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${index ? -14 : 18}px,${index ? 12 : -12}px,0)` }], { duration: index ? 22000 : 18000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
    });
  }
  function reveal(element) {
    if (revealed.has(element)) return;
    revealed.add(element);
    if (reduced() || !element.animate || root.contains(document.activeElement)) return;
    const animation = element.animate([{ opacity: .3, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 700, easing: 'cubic-bezier(.2,.7,.2,1)' });
    entrances.add(animation);
    const clean = () => entrances.delete(animation);
    animation.addEventListener('finish', clean, { once: true });
    animation.addEventListener('cancel', clean, { once: true });
  }
  root.querySelectorAll('[data-pn-accordion]').forEach(details => {
    const summary = details.querySelector('summary');
    const state = { animation: null, target: details.open, finish() {
      state.animation?.cancel(); state.animation = null;
      details.open = state.target; details.style.removeProperty('overflow');
    } };
    accordions.push(state);
    summary.addEventListener('click', event => {
      if (reduced() || !details.animate || event.defaultPrevented) return;
      event.preventDefault();
      const start = details.getBoundingClientRect().height;
      state.target = state.animation ? !state.target : !details.open;
      state.animation?.cancel();
      details.open = true;
      const style = getComputedStyle(details);
      const end = state.target ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
      details.style.overflow = 'hidden';
      const animation = details.animate([{ height: `${start}px` }, { height: `${end}px` }], { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' });
      state.animation = animation;
      animation.addEventListener('finish', () => { if (state.animation === animation) state.finish(); }, { once: true });
    }, options);
    details.addEventListener('toggle', () => { if (!state.animation) state.target = details.open; }, options);
  });
  root.querySelectorAll('[data-interior-form]').forEach(form => {
    const kind = form.dataset.interiorForm;
    const autocomplete = kind === 'login' ? { username: 'username', password: 'current-password' } : kind === 'registro' ? { first_name: 'given-name', email: 'email', password1: 'new-password', password2: 'new-password' } : { nombre: 'name', correo: 'email' };
    Object.entries(autocomplete).forEach(([name, value]) => { const field = form.elements.namedItem(name); if (field && !field.hasAttribute('autocomplete')) field.setAttribute('autocomplete', value); });
    form.querySelectorAll('.pn-field').forEach(group => {
      const field = group.querySelector('input, textarea, select');
      if (!field) return;
      const ids = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
      group.querySelectorAll('.pn-field-help, .pn-field-errors').forEach(note => { if (note.id) ids.add(note.id); });
      if (ids.size) field.setAttribute('aria-describedby', [...ids].join(' '));
    });
    const button = form.querySelector('[type="submit"]');
    const status = form.querySelector('[data-submit-status]');
    const reset = () => { button.disabled = false; form.removeAttribute('aria-busy'); if (status) status.textContent = ''; };
    form.addEventListener('submit', event => {
      if (event.defaultPrevented || !form.checkValidity()) return;
      button.disabled = true; form.setAttribute('aria-busy', 'true');
      if (status) status.textContent = form.dataset.submitLabel;
    }, options);
    window.addEventListener('pageshow', reset, options);
  });
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.target === root) { visible = entry.isIntersecting; syncAmbient(); }
      else if (entry.isIntersecting) { reveal(entry.target); observer.unobserve(entry.target); }
    });
  }, { threshold: .1 }) : null;
  if (observer) { observer.observe(root); root.querySelectorAll('[data-interior-reveal]').forEach(element => observer.observe(element)); }
  // Without IntersectionObserver the static page stays complete, without ambient work.
  function sync() {
    if (reduced() || document.hidden) { cancelEntrances(); accordions.forEach(state => { if (state.animation) state.finish(); }); }
    syncAmbient();
  }
  root.addEventListener('focusin', cancelEntrances, options);
  motion.addEventListener('change', sync, options);
  document.addEventListener('pn:effectschange', sync, options);
  document.addEventListener('visibilitychange', sync, options);
  window.addEventListener('pagehide', () => { cancelEntrances(); stopAmbient(); accordions.forEach(state => { if (state.animation) state.finish(); }); }, options);
  window.addEventListener('pageshow', sync, options);
  document.querySelectorAll('.pn-interior-page .mensaje').forEach(message => message.setAttribute('role', message.classList.contains('mensaje-error') ? 'alert' : 'status'));
  root.querySelector('[data-form-errors]')?.focus({ preventScroll: false });
  window.VinlumeInteriors = Object.freeze({ destroy() { cancelEntrances(); stopAmbient(); accordions.forEach(state => { if (state.animation) state.finish(); }); observer?.disconnect(); navigationObserver?.disconnect(); controller.abort(); } });
})();
