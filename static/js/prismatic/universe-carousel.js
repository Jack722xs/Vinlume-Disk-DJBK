/* Circular MzaCarousel adaptation. Original timing: 4500ms + 900ms transition. */
(() => {
  'use strict';
  const root = document.querySelector('[data-pn-carousel]');
  if (!root) return;
  window.VinlumeUniverses?.destroy();
  const abort = new AbortController(), events = { signal: abort.signal };
  const viewport = root.querySelector('.pn-orbit-viewport');
  const track = root.querySelector('.pn-orbit-track');
  const slides = [...track.querySelectorAll('.pn-orbit-slide')];
  const status = root.querySelector('[data-orbit-status]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const hub = root.closest('.pn-hub');
  const interval = 4500, transitionMs = 900;
  const reduced = () => motion.matches || forced.matches || Boolean(window.VinlumeEffects?.reduced);
  const mod = value => ((value % slides.length) + slides.length) % slides.length;
  // Two universes need decorative copies for a preview on both sides.
  const twins = slides.map((slide, i) => {
    const twin = slide.cloneNode(true);
    ['id', 'role', 'aria-label', 'aria-roledescription', 'data-pn-universe'].forEach(name => twin.removeAttribute(name));
    twin.dataset.orbitTwin = String(i);
    twin.setAttribute('aria-hidden', 'true');
    twin.querySelector('.pn-orbit-card').inert = true;
    twin.querySelectorAll('[id]').forEach(node => {
      const oldId = node.id;
      node.id = `${oldId}-orbit-twin`;
      twin.querySelectorAll('[fill], [stroke]').forEach(path => {
        ['fill', 'stroke'].forEach(attr => {
          if (path.getAttribute(attr) === `url(#${oldId})`) path.setAttribute(attr, `url(#${node.id})`);
        });
      });
    });
    track.appendChild(twin);
    return twin;
  });
  let index = 0, pos = 0, destination = 0;
  let drag = null, renderFrame = 0, animationFrame = 0, animating = false;
  let cycleTimer = 0, cycleStarted = 0, elapsed = 0;
  let visible = false, leaving = false, suppressClick = false, suppressTimer = 0;
  let hovering = [...slides, ...twins].some(slide => slide.matches(':hover'));
  let ambientTween = null, ambientReady = false, ambientBooted = false, ambientTarget = 0;

  function syncAmbient() {
    ambientTween?.kill(); ambientTween = null;
    if (!hub || !ambientReady || !ambientBooted || !visible || leaving || document.hidden) return;
    if (reduced() || !window.gsap) {
      hub.style.setProperty('--pn-ambient-alpha', String(ambientTarget));
      return;
    }
    const current = parseFloat(hub.style.getPropertyValue('--pn-ambient-alpha')) || 0;
    if (Math.abs(current - ambientTarget) < .001) return;
    // Only the decorative pseudo-element's opacity changes; layout and cards stay untouched.
    ambientTween = window.gsap.to(hub, {
      '--pn-ambient-alpha': ambientTarget, duration: 1.2, ease: 'sine.inOut', overwrite: 'auto'
    });
  }
  function setAmbient(value) {
    if (Math.abs(value - ambientTarget) < .006) return;
    ambientTarget = value;
    syncAmbient();
  }
  function bootAmbient() { ambientBooted = true; syncAmbient(); }
  if (document.readyState === 'complete') bootAmbient();
  else document.addEventListener('DOMContentLoaded', bootAmbient, { ...events, once: true });
  if (hub?.dataset.pnAmbientSrc) {
    const background = new Image();
    background.src = hub.dataset.pnAmbientSrc;
    const product = slides[0].querySelector('.pn-orbit-product');
    Promise.all([background.decode(), product?.decode().catch(() => {})]).then(() => {
      if (abort.signal.aborted) return;
      ambientReady = true;
      syncAmbient();
    }).catch(() => {}); // A failed decorative image never blocks navigation.
  }

  function stopCycle() {
    if (cycleTimer) elapsed += performance.now() - cycleStarted;
    clearTimeout(cycleTimer);
    cycleTimer = 0;
  }
  function syncCycle() {
    const keyboardFocus = root.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    const allowed = visible && !leaving && !hovering && !drag && !animating &&
      !keyboardFocus && !document.hidden && !reduced();
    if (!allowed) { stopCycle(); return; }
    if (cycleTimer) return;
    cycleStarted = performance.now();
    cycleTimer = setTimeout(() => {
      cycleTimer = 0;
      elapsed = 0;
      goTo(destination + 1, false);
    }, Math.max(0, interval - elapsed));
  }
  function render() {
    const compact = viewport.clientWidth <= 700, width = slides[0].offsetWidth;
    const simple = reduced();
    slides.forEach((slide, i) => {
      let distance = mod(i - pos);
      if (distance > slides.length / 2) distance -= slides.length;
      const opposite = distance >= 0 ? distance - slides.length : distance + slides.length;
      [slide, twins[i]].forEach((node, copy) => {
        const d = copy ? opposite : distance;
        const depth = simple ? 0 : -Math.abs(d) * (compact ? 50 : 145);
        const rotate = simple ? 0 : -d * (compact ? 10 : 22);
        const scale = simple ? 1 : 1 - Math.min(Math.abs(d) * .075, .25);
        node.style.transform = `translate(-50%, -50%) translate3d(${d * width * (compact ? 1.06 : .96)}px,0,${depth}px) rotateY(${rotate}deg) scale(${scale})`;
        node.style.filter = simple ? 'none' : `blur(${Math.min(Math.abs(d) * 3, 5)}px)`;
        node.style.opacity = String(1 - Math.min(Math.abs(d) * .5, .95));
        node.style.zIndex = String(20 - Math.round(Math.abs(d) * 5));
      });
    });
    if (drag?.horizontal) {
      let distance = mod(-pos);
      if (distance > slides.length / 2) distance -= slides.length;
      setAmbient(.62 * (1 - Math.min(1, Math.abs(distance))));
    }
  }
  function setState(value, announce) {
    if (value !== index && slides[index].contains(document.activeElement)) viewport.focus({ preventScroll: true });
    index = value;
    setAmbient(index === 0 ? .62 : 0);
    slides.forEach((slide, i) => {
      const active = i === index;
      slide.dataset.state = active ? 'active' : 'rest';
      slide.querySelector('.pn-orbit-card').inert = !active;
      slide.setAttribute('aria-hidden', String(!active));
    });
    if (announce) status.textContent = index === 0 ? 'Mini CD' : 'Marcos. Próximamente.';
  }
  function goTo(value, announce = true, animate = true) {
    cancelAnimationFrame(animationFrame);
    stopCycle();
    destination = value;
    const start = pos, end = destination;
    setState(mod(destination), announce);
    const duration = animate && !reduced() && Math.abs(end - start) > .001 ? transitionMs : 0;
    animating = true;
    const t0 = performance.now();
    const step = now => {
      const t = duration ? Math.min(1, (now - t0) / duration) : 1;
      pos = start + (end - start) * (1 - Math.pow(1 - t, 4));
      render();
      if (t < 1) animationFrame = requestAnimationFrame(step);
      else {
        animationFrame = 0;
        animating = false;
        pos = destination;
        elapsed = 0;
        syncCycle();
      }
    };
    if (duration) animationFrame = requestAnimationFrame(step);
    else step(t0);
  }
  function nearest(value) {
    let delta = value - mod(Math.round(destination));
    if (delta > slides.length / 2) delta -= slides.length;
    if (delta < -slides.length / 2) delta += slides.length;
    return Math.round(destination) + delta;
  }
  function syncHash() {
    const found = slides.findIndex(slide => `#${slide.id}` === location.hash);
    if (found >= 0) goTo(nearest(found), false, false);
  }
  function resetPointer() {
    root.style.setProperty('--orbit-pointer-x', '0px');
    root.style.setProperty('--orbit-pointer-y', '0px');
  }
  function endDrag(cancelled = false) {
    if (!drag) return;
    const previous = drag;
    drag = null;
    delete root.dataset.dragging;
    if (viewport.hasPointerCapture(previous.id)) viewport.releasePointerCapture(previous.id);
    if (previous.horizontal) {
      suppressClick = true;
      clearTimeout(suppressTimer);
      suppressTimer = setTimeout(() => { suppressClick = false; }, 300);
    }
    const threshold = Math.min(80, slides[0].offsetWidth * .14);
    const moved = !cancelled && previous.horizontal && Math.abs(previous.dx) > threshold;
    goTo(Math.round(previous.start) + (moved ? (previous.dx < 0 ? 1 : -1) : 0), moved);
  }
  root.dataset.enhanced = 'true';
  root.querySelector('.pn-orbit-controls').hidden = false;
  root.querySelector('[data-orbit-prev]').addEventListener('click', () => goTo(destination - 1), events);
  root.querySelector('[data-orbit-next]').addEventListener('click', () => goTo(destination + 1), events);
  root.addEventListener('pointerover', event => {
    if (event.pointerType !== 'mouse') return;
    hovering = Boolean(event.target.closest('.pn-orbit-slide'));
    syncCycle();
  }, events);
  root.addEventListener('pointerout', event => {
    if (event.pointerType !== 'mouse') return;
    hovering = Boolean(event.relatedTarget?.closest?.('.pn-orbit-slide'));
    syncCycle();
  }, events);
  root.addEventListener('pointerleave', () => { hovering = false; resetPointer(); syncCycle(); }, events);
  root.addEventListener('focusin', syncCycle, events);
  root.addEventListener('focusout', () => queueMicrotask(syncCycle), events);
  root.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input, textarea, select, [contenteditable]')) return;
    const targets = { ArrowLeft: destination - 1, ArrowRight: destination + 1, Home: nearest(0), End: nearest(slides.length - 1) };
    if (!(event.key in targets)) return;
    event.preventDefault();
    goTo(targets[event.key]);
  }, events);
  viewport.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.target.closest('a:not(.pn-orbit-cover-link), button')) return;
    if (event.pointerType === 'mouse') event.preventDefault();
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    animating = false;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, horizontal: false, start: pos };
    syncCycle();
  }, events);
  viewport.addEventListener('pointermove', event => {
    if (drag && event.pointerId === drag.id) {
      drag.dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.horizontal) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(drag.dx)) { endDrag(true); return; }
        if (Math.abs(drag.dx) < 10) return;
        drag.horizontal = true;
        viewport.setPointerCapture(event.pointerId);
        root.dataset.dragging = 'true';
      }
      if (!renderFrame) renderFrame = requestAnimationFrame(() => {
        renderFrame = 0;
        if (drag) { pos = drag.start - drag.dx / (slides[0].offsetWidth || 1); render(); }
      });
      return;
    }
    if (reduced() || !fine.matches || event.pointerType !== 'mouse') return;
    // Shared viewport coordinates never jump when active card or clone changes.
    // The background follows the pointer; the carousel itself does not tilt.
    const rect = viewport.getBoundingClientRect();
    const x = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / rect.width - .5));
    const y = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / rect.height - .5));
    root.style.setProperty('--orbit-pointer-x', `${x * 28}px`);
    root.style.setProperty('--orbit-pointer-y', `${y * 18}px`);
  }, { ...events, passive: true });
  viewport.addEventListener('pointerup', event => { if (drag?.id === event.pointerId) endDrag(); }, events);
  viewport.addEventListener('pointercancel', () => endDrag(true), events);
  viewport.addEventListener('lostpointercapture', () => endDrag(true), events);
  viewport.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); return; }
    const slide = event.target.closest('.pn-orbit-slide');
    if (!slide) return;
    const target = slide.hasAttribute('data-orbit-twin') ? Number(slide.dataset.orbitTwin) : slides.indexOf(slide);
    if (target !== index) goTo(nearest(target));
  }, { ...events, capture: true });
  function sync() {
    endDrag(true);
    root.toggleAttribute('data-reduced', reduced());
    if (reduced()) { cancelAnimationFrame(animationFrame); animationFrame = 0; animating = false; pos = destination; resetPointer(); }
    render();
    syncCycle();
    syncAmbient();
  }
  const visibility = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .1;
    syncCycle();
    syncAmbient();
  }, { threshold: .1 });
  visibility.observe(viewport);
  const resize = new ResizeObserver(() => { endDrag(true); render(); });
  resize.observe(viewport);
  [motion, forced, fine].forEach(query => query.addEventListener('change', sync, events));
  document.addEventListener('pn:effectschange', sync, events);
  document.addEventListener('visibilitychange', () => { if (document.hidden) endDrag(true); syncCycle(); syncAmbient(); }, events);
  window.addEventListener('hashchange', syncHash, events);
  window.addEventListener('pagehide', () => {
    leaving = true; endDrag(true); stopCycle(); cancelAnimationFrame(renderFrame); renderFrame = 0;
    cancelAnimationFrame(animationFrame); animationFrame = 0; animating = false; pos = destination;
    ambientTween?.kill(); ambientTween = null;
  }, events);
  window.addEventListener('pageshow', () => { leaving = false; syncHash(); sync(); }, events);
  window.VinlumeUniverses = Object.freeze({ destroy() {
    leaving = true; endDrag(true); stopCycle(); cancelAnimationFrame(animationFrame);
    abort.abort(); resize.disconnect(); visibility.disconnect();
    cancelAnimationFrame(renderFrame); clearTimeout(suppressTimer);
    resetPointer();
    ambientTween?.kill(); hub?.style.removeProperty('--pn-ambient-alpha');
    delete root.dataset.enhanced; delete root.dataset.reduced;
    twins.forEach(twin => twin.remove());
    slides.forEach(slide => {
      ['transform', 'filter', 'opacity', 'z-index'].forEach(name => slide.style.removeProperty(name));
      slide.removeAttribute('aria-hidden'); delete slide.dataset.state;
      slide.querySelector('.pn-orbit-card').inert = false;
    });
    root.querySelector('.pn-orbit-controls').hidden = true;
  } });
  goTo(0, false, false);
  syncHash();
  sync();
})();
