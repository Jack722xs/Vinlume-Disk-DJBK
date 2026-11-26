/* Cover and story enhancement. Native fragment links own navigation/history/focus.
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
  const wordmark = entry.querySelector('.pn-wordmark');
  const story = entry.querySelector('[data-pn-mini-story]');
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

  }
  function renderLight() {
    frame = 0;
    if (!active || reduced() || document.hidden) return;
    const smoothing = active === cover ? .38 : .14;
    current.x += (target.x - current.x) * smoothing;
    current.y += (target.y - current.y) * smoothing;
    const x = `${(current.x * 100).toFixed(2)}%`;
    const y = `${(current.y * 100).toFixed(2)}%`;
    if (active === cover) {
      window.VinlumeCrystal?.setLight(current.x, current.y);
      entry.style.setProperty('--pn-scene-x', x);
      entry.style.setProperty('--pn-scene-y', y);
      entry.style.setProperty('--pn-light-dx', `${((current.x - .65) * -24).toFixed(2)}px`);
      entry.style.setProperty('--pn-light-dy', `${((current.y - .35) * -16).toFixed(2)}px`);
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
  [cover].filter(Boolean).forEach(scene => {
    scene.addEventListener('focusin', event => {
      if (reduced() || !event.target.closest('a, button')) return;
      if (active !== scene) { resetLight(); active = scene; }
      const r = scene.getBoundingClientRect(), item = event.target.getBoundingClientRect();
      target = { x: Math.max(0, Math.min(1, (item.left + item.width / 2 - r.left) / r.width)), y: Math.max(0, Math.min(1, (item.top + item.height / 2 - r.top) / r.height)) };
      if (!frame) frame = requestAnimationFrame(renderLight);
    }, options);
    scene.addEventListener('pointermove', event => {
      if (reduced() || !fine.matches || event.pointerType !== 'mouse') return;
      const rect = (scene === cover ? wordmark : scene).getBoundingClientRect();
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
      const isTitle = element.contains(wordmark);
      animate(element, isTitle ? [{opacity:.12,clipPath:'inset(0 100% 0 0)',filter:'blur(6px)'},{opacity:1,clipPath:'inset(0)',filter:'blur(0px)'}] : [{ opacity: .08, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], {
        duration: index === 0 ? 1650 : 950, delay: index * 180,
        easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards'
      });
    });
  }
  function storyVisibility(open) {
    if (!story) return;
    story.hidden = !open;
    entry.dataset.pnStoryVisible = String(open);
    document.dispatchEvent(new CustomEvent('pn:storychange'));
  }
  entry.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.target.closest('[data-story-open]')) storyVisibility(true);
    if (event.target.closest('[data-story-close]')) storyVisibility(false);
  }, options);
  function syncHash() {
    storyVisibility(/^#(?:mini-cd|nfc-)/.test(location.hash));
  }
  syncHash();
  window.addEventListener('hashchange', syncHash, options);
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(item => {
      coverVisible = item.isIntersecting;
      if (coverVisible) scheduleDepth();
      else { cancelAnimationFrame(depthFrame); depthFrame = 0; }
      cover.dataset.visible = String(item.isIntersecting);
      if (!item.isIntersecting) resetLight();
    });
  }, { threshold: .05 }) : null;
  if (cover) observer?.observe(cover);
  function sync() {

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
  window.addEventListener('pageshow', () => { syncHash(); sync(); }, options);
  window.VinlumeEntry = Object.freeze({ destroy() {
    resetLight(); cancelAnimations(); cancelAnimationFrame(depthFrame); cover?.style.removeProperty('--pn-scroll-depth'); observer?.disconnect(); controller.abort();
    if (story) story.hidden = false;
    delete entry.dataset.pnStoryVisible;
  } });
})();
