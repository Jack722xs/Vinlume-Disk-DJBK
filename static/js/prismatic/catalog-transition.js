/* GSAP presentation around real document navigation. No fetch router or form interception. */
(() => {
  'use strict';
  window.VinlumeCatalogTransition?.destroy();
  const overlay = document.querySelector('[data-pn-catalog-loading]');
  const gsap = window.gsap;
  if (!overlay || !gsap) return; // Missing library preserves normal links and visible content.
  const abort = new AbortController(), events = { signal: abort.signal };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const catalog = document.querySelector('[data-pn-catalog]');
  const content = document.querySelector('#contenido');
  const marker = 'vinlume:catalog-transition';
  const reduced = () => motion.matches || forced.matches || Boolean(window.VinlumeEffects?.reduced);
  let loaderContext = null, entryContext = null, leaveTween = null;
  let pendingUrl = null, watchdog = 0;

  function clearMarker() { try { sessionStorage.removeItem(marker); } catch {} }
  function remember(url) {
    try { sessionStorage.setItem(marker, JSON.stringify({ path: url.pathname, at: Date.now() })); } catch {}
  }
  function arrivedFromCard() {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(marker)); } catch {}
    clearMarker();
    return saved?.path === location.pathname && Date.now() - saved.at < 30000;
  }
  function resetLoader() {
    clearTimeout(watchdog); watchdog = 0;
    leaveTween?.kill(); leaveTween = null;
    loaderContext?.revert(); loaderContext = null;
    overlay.hidden = true;
    overlay.style.removeProperty('opacity');
    content?.removeAttribute('aria-busy');
    pendingUrl = null;
  }
  function showLoader(incoming = false) {
    overlay.hidden = false;
    content?.setAttribute('aria-busy', 'true');
    loaderContext = gsap.context(() => {
      gsap.set(overlay, { opacity: incoming ? 1 : 0 });
      if (!incoming) gsap.to(overlay, { opacity: 1, duration: .24, ease: 'power2.out' });
      gsap.to('.pn-catalog-loading-disc', { rotation: 360, duration: 2.2, repeat: -1, ease: 'none' });
      gsap.fromTo('.pn-catalog-loading-line > span', { xPercent: -110 }, { xPercent: 170, duration: 1.15, repeat: -1, ease: 'sine.inOut' });
    }, overlay);
  }
  function finishEntry() { entryContext?.revert(); entryContext = null; }
  function enterCatalog() {
    if (!catalog || reduced()) return;
    entryContext = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { duration: .7, ease: 'power3.out' } });
      const heading = catalog.querySelectorAll('.pn-catalog-heading > div, .pn-catalog-intro');
      if (heading.length) timeline.from(heading, { y: 24, opacity: 0, stagger: .08, clearProps: 'transform,opacity' }, 0);
      timeline.from('.pn-catalog-toolbar, .pn-catalog-results', { y: 18, opacity: 0, stagger: .08, clearProps: 'transform,opacity' }, .12);
      const cards = [...catalog.querySelectorAll('[data-pn-product]')].slice(0, 9);
      if (cards.length) timeline.from(cards, { y: 32, opacity: 0, filter: 'blur(6px)', stagger: .065, clearProps: 'transform,opacity,filter' }, .2);
      else timeline.from('.pn-catalog-empty', { y: 20, opacity: 0, clearProps: 'transform,opacity' }, .2);
    }, catalog);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('[data-pn-catalog-link]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        link.hasAttribute('download') || (link.target && link.target !== '_self') || reduced()) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol) || url.pathname === location.pathname) return;
    event.preventDefault();
    if (pendingUrl) return;
    pendingUrl = url;
    remember(url);
    showLoader();
    // Only the short veil reveal precedes navigation; no simulated loading percentage.
    leaveTween = gsap.delayedCall(.26, () => {
      location.assign(url.href);
      watchdog = setTimeout(() => { resetLoader(); clearMarker(); }, 12000);
    });
  }, events);
  function syncEffects() {
    if (!reduced()) return;
    const destination = pendingUrl;
    resetLoader(); finishEntry(); clearMarker();
    if (destination) location.assign(destination.href);
  }
  [motion, forced].forEach(query => query.addEventListener('change', syncEffects, events));
  document.addEventListener('pn:effectschange', syncEffects, events);
  catalog?.addEventListener('focusin', finishEntry, events);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && pendingUrl) { resetLoader(); clearMarker(); }
  }, events);
  window.addEventListener('pagehide', () => { resetLoader(); finishEntry(); }, events);
  window.addEventListener('pageshow', event => { if (event.persisted) { resetLoader(); finishEntry(); clearMarker(); } }, events);
  window.VinlumeCatalogTransition = Object.freeze({ destroy() {
    abort.abort(); resetLoader(); finishEntry();
  } });
  if (catalog) {
    const arriving = arrivedFromCard();
    if (arriving && !reduced()) {
      showLoader(true);
      loaderContext.add(() => gsap.to(overlay, { opacity: 0, duration: .42, ease: 'power2.inOut', onComplete: resetLoader }));
    }
    enterCatalog();
  }
})();
