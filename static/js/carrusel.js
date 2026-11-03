// Manual navigation remains available when motion/effects are reduced.
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('carrusel');
  if (!container) return;
  const slides = [...container.querySelectorAll('.carrusel-slide')];
  const next = document.getElementById('carrusel-sig');
  const previous = document.getElementById('carrusel-ant');
  if (slides.length < 2 || !next || !previous) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let index = Math.max(0, slides.findIndex(slide => slide.classList.contains('activa')));
  let timer;
  let hovered = false;
  function show(value) {
    index = (value + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle('activa', i === index);
      slide.setAttribute('aria-hidden', String(i !== index));
    });
  }
  function stop() { clearInterval(timer); }
  function sync() {
    stop();
    if (motion.matches || window.VinlumeEffects?.reduced || document.hidden || hovered || container.contains(document.activeElement)) return;
    timer = setInterval(() => show(index + 1), 3000);
  }
  next.addEventListener('click', () => { show(index + 1); sync(); });
  previous.addEventListener('click', () => { show(index - 1); sync(); });
  container.addEventListener('pointerenter', () => { hovered = true; stop(); });
  container.addEventListener('pointerleave', () => { hovered = false; sync(); });
  container.addEventListener('focusin', stop);
  container.addEventListener('focusout', () => queueMicrotask(sync));
  document.addEventListener('pn:effectschange', sync);
  motion.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', sync);
  show(index);
  sync();
});
