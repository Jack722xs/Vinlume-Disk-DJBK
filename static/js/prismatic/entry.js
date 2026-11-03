/* Phase 1 enhancement. Native fragment links own navigation/history/focus.
   No scroll handler, scroll interception, or permanent animation loop. */
(() => {
  'use strict';
  const entry = document.querySelector('[data-pn-entry]');
  if (!entry) return;
  window.VinlumeEntry?.destroy();
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const cover = entry.querySelector('.pn-cover');
  const reflection = entry.querySelector('#pn-refraction');
  const facets = entry.querySelector('.pn-word-facets');
  const zones = [...entry.querySelectorAll('[data-pn-universe]')];
  const animations = new Set();
  let frame = 0;
  let active = null;
  let target = { x: .65, y: .35 };
  let current = { ...target };
  let inCover = false;
  const reduced = () => motion.matches || Boolean(window.VinlumeEffects?.reduced);
  function cancelAnimations() {
    animations.forEach(animation => animation.cancel());
    animations.clear();
  }
  function stopLight() {
    cancelAnimationFrame(frame);
    frame = 0;
    active = null;
  }
  function resetLight() {
    stopLight();
    current = { x: .65, y: .35 };
    target = { ...current };
    entry.style.removeProperty('--pn-scene-x');
    entry.style.removeProperty('--pn-scene-y');
    facets?.style.removeProperty('--pn-facet-shift');
    reflection?.setAttribute('cx', '65%');
    reflection?.setAttribute('cy', '35%');
    zones.forEach(zone => {
      ['--pn-zone-x', '--pn-zone-y', '--pn-object-y'].forEach(name => zone.style.removeProperty(name));
    });
  }
  function renderLight() {
    frame = 0;
    if (!active || reduced() || document.hidden) return;
    current.x += (target.x - current.x) * .14;
    current.y += (target.y - current.y) * .14;
    const x = `${(current.x * 100).toFixed(2)}%`;
    const y = `${(current.y * 100).toFixed(2)}%`;
    if (active === cover) {
      entry.style.setProperty('--pn-scene-x', x);
      entry.style.setProperty('--pn-scene-y', y);
      reflection?.setAttribute('cx', x);
      reflection?.setAttribute('cy', y);
      facets?.style.setProperty('--pn-facet-shift', `${((current.x - .5) * 18).toFixed(2)}px`);
    } else {
      active.style.setProperty('--pn-zone-x', x);
      active.style.setProperty('--pn-zone-y', y);
      active.style.setProperty('--pn-object-y', `${((current.y - .5) * -10).toFixed(2)}px`);
    }
    if (Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > .001) {
      frame = requestAnimationFrame(renderLight);
    }
  }
  [cover, ...zones].filter(Boolean).forEach(scene => {
    scene.addEventListener('pointermove', event => {
      if (reduced() || !fine.matches || event.pointerType !== 'mouse') return;
      const rect = scene.getBoundingClientRect();
      if (active !== scene) { resetLight(); active = scene; }
      target = {
        x: Math.max(0, Math.min(1, (event.clientX - rect.left) / (rect.width || 1))),
        y: Math.max(0, Math.min(1, (event.clientY - rect.top) / (rect.height || 1)))
      };
      if (!frame) frame = requestAnimationFrame(renderLight);
    }, { ...options, passive: true });
    scene.addEventListener('pointerleave', resetLight, options);
  });
  function animate(element, keyframes, timing) {
    if (reduced() || !element?.animate) return;
    const animation = element.animate(keyframes, timing);
    animations.add(animation);
    const clean = () => animations.delete(animation);
    animation.addEventListener('finish', clean, { once: true });
    animation.addEventListener('cancel', clean, { once: true });
  }
  // Opacity is only changed by a running animation: failed/absent JS hides nothing.
  if (!location.hash || location.hash === '#inicio') {
    entry.querySelectorAll('[data-pn-intro]').forEach((element, index) => {
      animate(element, [{ opacity: .08, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: index === 1 ? 1200 : 800, delay: index * 180,
        easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards'
      });
    });
  }
  const seen = new WeakSet();
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(item => {
      if (item.target === cover) {
        inCover = item.isIntersecting;
        if (!inCover) resetLight();
      } else if (item.isIntersecting && !seen.has(item.target)) {
        seen.add(item.target);
        const future = item.target.classList.contains('pn-universe-future');
        animate(item.target.querySelector('.pn-universe-copy'), [
          { opacity: .15, transform: future ? 'translateX(20px)' : 'translateY(28px)' },
          { opacity: 1, transform: 'translate(0,0)' }
        ], { duration: future ? 1000 : 800, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    });
  }, { threshold: .12 }) : null;
  if (cover) observer?.observe(cover);
  zones.forEach(zone => observer?.observe(zone));
  function sync() {
    if (reduced() || !fine.matches) { resetLight(); cancelAnimations(); }
  }
  document.addEventListener('pn:effectschange', sync, options);
  motion.addEventListener('change', sync, options);
  fine.addEventListener('change', sync, options);
  // Keyboard users never have to wait for an entrance animation to finish.
  entry.addEventListener('focusin', cancelAnimations, options);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { resetLight(); cancelAnimations(); }
  }, options);
  window.addEventListener('blur', resetLight, options);
  window.addEventListener('pagehide', () => { resetLight(); cancelAnimations(); }, options);
  window.addEventListener('pageshow', sync, options);
  window.VinlumeEntry = Object.freeze({ destroy() {
    resetLight(); cancelAnimations(); observer?.disconnect(); controller.abort();
  } });
})();
