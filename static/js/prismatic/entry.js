/* Phase 1 enhancement. Native fragment links own navigation/history/focus.
   Scroll is only observed for bounded hero parallax; never intercepted. */
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
  const specular = entry.querySelector('#pn-specular-light');
  const universes = entry.querySelector('.pn-universes');
  const switches = [...entry.querySelectorAll('[data-pn-select]')];
  const facets = entry.querySelector('.pn-word-facets');
  const zones = [...entry.querySelectorAll('[data-pn-universe]')];
  const animations = new Set();
  let frame = 0;
  let depthFrame = 0;
  let coverVisible = true;
  let active = null;
  let target = { x: .65, y: .35 };
  let current = { ...target };
  const reduced = () => motion.matches || Boolean(window.VinlumeEffects?.reduced);
  function updateDepth() {
    depthFrame = 0;
    if (!cover || reduced() || !coverVisible || document.hidden) return;
    const rect = cover.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, -rect.top / (rect.height || 1)));
    cover.style.setProperty('--pn-scroll-depth', `${(progress * 28).toFixed(2)}px`);
  }
  function scheduleDepth() {
    if (!depthFrame && coverVisible && !reduced() && !document.hidden) depthFrame = requestAnimationFrame(updateDepth);
  }
  window.addEventListener('scroll', scheduleDepth, { ...options, passive: true });
  window.addEventListener('resize', scheduleDepth, { ...options, passive: true });
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
    window.VinlumeCrystal?.reset();
    current = { x: .65, y: .35 };
    target = { ...current };
    entry.style.removeProperty('--pn-scene-x');
    entry.style.removeProperty('--pn-scene-y');
    entry.style.removeProperty('--pn-light-dx');
    entry.style.removeProperty('--pn-light-dy');
    facets?.style.removeProperty('--pn-facet-shift');
    reflection?.setAttribute('cx', '65%');
    reflection?.setAttribute('cy', '35%');
    specular?.setAttribute('x', '936');
    specular?.setAttribute('y', '-90');
    zones.forEach(zone => {
      ['--pn-zone-x', '--pn-zone-y', '--pn-object-y', '--pn-object-turn'].forEach(name => zone.style.removeProperty(name));
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
      window.VinlumeCrystal?.setLight(current.x, current.y);
      entry.style.setProperty('--pn-scene-x', x);
      entry.style.setProperty('--pn-scene-y', y);
      reflection?.setAttribute('cx', x);
      reflection?.setAttribute('cy', y);
      specular?.setAttribute('x', (current.x * 1440).toFixed(1));
      specular?.setAttribute('y', (current.y * 260 - 180).toFixed(1));
      entry.style.setProperty('--pn-light-dx', `${((current.x - .65) * -24).toFixed(2)}px`);
      entry.style.setProperty('--pn-light-dy', `${((current.y - .35) * -16).toFixed(2)}px`);
      facets?.style.setProperty('--pn-facet-shift', `${((current.x - .65) * 380).toFixed(2)}px`);
    } else {
      active.style.setProperty('--pn-zone-x', x);
      active.style.setProperty('--pn-zone-y', y);
      active.style.setProperty('--pn-object-y', `${((current.y - .5) * -10).toFixed(2)}px`);
      active.style.setProperty('--pn-object-turn', `${((current.x - .5) * 12).toFixed(2)}deg`);
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
    scene.addEventListener('pointerleave', () => {
      if (reduced() || document.hidden) { resetLight(); return; }
      target = { x: .65, y: .35 };
      if (active && !frame) frame = requestAnimationFrame(renderLight);
    }, options);
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
        duration: index === 0 ? 1100 : 800, delay: index * 180,
        easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards'
      });
    });
  }
  function selectUniverse(value, focusPanel = false) {
    const selected = zones.find(zone => zone.dataset.pnUniverse === value);
    if (!selected || !universes) return;
    const changed = universes.dataset.pnActive !== value;
    universes.dataset.pnActive = value;
    universes.dataset.pnEnhanced = 'true';
    switches.forEach(button => {
      const expanded = button.dataset.pnSelect === value;
      button.setAttribute('aria-pressed', String(expanded));
      button.setAttribute('aria-expanded', String(expanded));
      if (button.classList.contains('pn-universe-recall')) button.hidden = expanded;
    });
    zones.forEach(zone => {
      const details = zone.querySelector('[data-pn-details]');
      if (details) details.inert = zone !== selected;
    });
    if (changed) {
      cancelAnimations();
      animate(selected.querySelector('.pn-universe-copy'), [
        { opacity: .12, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 600, delay: 140, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    }
    // Inline recalls disappear after activation. Keep focus in the expanded scene.
    if (focusPanel) selected.focus({ preventScroll: true });
  }
  const selector = entry.querySelector('.pn-universe-switch');
  if (selector) selector.hidden = false;
  switches.forEach(button => {
    button.addEventListener('click', () => selectUniverse(button.dataset.pnSelect, button.classList.contains('pn-universe-recall')), options);
  });
  function syncHash() {
    const zone = zones.find(item => `#${item.id}` === location.hash);
    if (zone) selectUniverse(zone.dataset.pnUniverse);
  }
  selectUniverse(zones.find(item => `#${item.id}` === location.hash)?.dataset.pnUniverse || 'cd');
  window.addEventListener('hashchange', syncHash, options);
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(item => {
      coverVisible = item.isIntersecting;
      if (coverVisible) scheduleDepth();
      else { cancelAnimationFrame(depthFrame); depthFrame = 0; }
      window.VinlumeCrystal?.setVisible(item.isIntersecting);
      if (!item.isIntersecting) resetLight();
    });
  }, { threshold: .05 }) : null;
  if (cover) observer?.observe(cover);
  function sync() {
    window.VinlumeCrystal?.setReduced(reduced());
    if (reduced()) { cancelAnimationFrame(depthFrame); depthFrame = 0; cover?.style.removeProperty('--pn-scroll-depth'); }
    else scheduleDepth();
    if (reduced() || !fine.matches) { resetLight(); cancelAnimations(); }
  }
  document.addEventListener('pn:effectschange', sync, options);
  motion.addEventListener('change', sync, options);
  fine.addEventListener('change', sync, options);
  // Keyboard users never have to wait for an entrance animation to finish.
  entry.addEventListener('focusin', cancelAnimations, options);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { resetLight(); cancelAnimations(); cancelAnimationFrame(depthFrame); depthFrame = 0; }
    else scheduleDepth();
  }, options);
  window.addEventListener('blur', resetLight, options);
  window.addEventListener('pagehide', () => { resetLight(); cancelAnimations(); cancelAnimationFrame(depthFrame); depthFrame = 0; }, options);
  window.addEventListener('pageshow', sync, options);
  window.VinlumeEntry = Object.freeze({ destroy() {
    resetLight(); cancelAnimations(); cancelAnimationFrame(depthFrame); cover?.style.removeProperty('--pn-scroll-depth'); observer?.disconnect(); controller.abort();
    delete universes.dataset.pnEnhanced;
    zones.forEach(zone => { const details = zone.querySelector('[data-pn-details]'); if (details) details.inert = false; });
    switches.filter(button => button.classList.contains('pn-universe-recall')).forEach(button => { button.hidden = true; });
    if (selector) selector.hidden = true;
  } });
})();
