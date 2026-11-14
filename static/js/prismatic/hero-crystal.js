/* Phase 07: lazy adapter for the approved Diamond laboratory, home only. */
(() => {
  'use strict';
  window.VinlumeCrystalLoader?.destroy();
  const canvas = document.querySelector('.pn-crystal-word'), heading = canvas?.closest('h1');
  if (!heading || !window.IntersectionObserver || !window.ResizeObserver) return;
  const events = new AbortController(), options = {signal: events.signal};
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 900px), (pointer: coarse)');
  const forced = matchMedia('(forced-colors: active)');
  let instance = null, loading = false, epoch = 0, visible = false, failed = false, leaving = false;
  const constrained = navigator.connection?.saveData;
  const allowed = () => !failed && !leaving && !constrained && !compact.matches && !motion.matches && !forced.matches && !window.VinlumeEffects?.reduced;
  const release = () => { epoch++; instance?.destroy(); instance = null; delete window.VinlumeCrystal; canvas.hidden = true; heading.classList.remove('pn-crystal-ready'); };
  async function sync() {
    if (!allowed()) { release(); canvas.dataset.optical = motion.matches ? 'static-motion' : forced.matches ? 'static-colors' : window.VinlumeEffects?.reduced ? 'static-effects' : compact.matches ? 'static-mobile' : constrained ? 'static-data' : 'static'; return; }
    if (instance) { instance.setVisible(visible && !document.hidden); return; }
    if (!visible || document.hidden || loading) return;
    loading = true; const token = ++epoch;
    canvas.dataset.optical = 'loading'; let candidate;
    try {
      const module = await import(canvas.dataset.opticalModule);
      if (token !== epoch || !allowed()) return;
      candidate = await module.createHero(canvas, heading);
      if (token !== epoch || !allowed()) { candidate.destroy(); return; }
      instance = candidate; window.VinlumeCrystal = instance;
      instance.setVisible(visible && !document.hidden);
    } catch (error) {
      candidate?.destroy();
      if (token === epoch) { failed = true; release(); canvas.dataset.optical = 'fallback'; console.info('VINLUME: se conserva el cristal estÃ¡tico.', error.message); }
    } finally { loading = false; if (token !== epoch && allowed()) sync(); }
  }
  const observer = new IntersectionObserver(entries => { visible = entries[0].intersectionRatio >= .2; sync(); }, {threshold:[0,.2]});
  observer.observe(heading);
  [motion,compact,forced].forEach(query => query.addEventListener('change',sync,options));
  document.addEventListener('pn:effectschange',sync,options);
  document.addEventListener('visibilitychange',sync,options);
  window.addEventListener('pagehide',() => { leaving = true; release(); },options);
  window.addEventListener('pageshow',() => { leaving = false; sync(); },options);
  window.VinlumeCrystalLoader = {destroy() { leaving = true; release(); observer.disconnect(); events.abort(); }};
})();
