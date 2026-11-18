(() => {
  const video = document.querySelector('[data-prism-video]');
  const host = video?.closest('[data-prism-host]');
  if (!host) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  let visible = !window.IntersectionObserver;

  function staticMode() {
    return motion.matches || forcedColors.matches || window.VinlumeEffects?.reduced;
  }

  function shouldPlay() {
    return visible && !document.hidden && !staticMode() && !video.error;
  }

  function sync() {
    if (!shouldPlay()) {
      video.pause();
      if (staticMode() || video.error) video.hidden = true;
      return;
    }

    if (!video.hasAttribute('src')) video.src = video.dataset.src;
    video.play().catch(() => {
      if (video.paused) video.hidden = true;
    });
  }

  video.addEventListener('playing', () => {
    if (shouldPlay()) video.hidden = false;
    else sync();
  });
  video.addEventListener('error', sync);
  motion.addEventListener('change', sync);
  forcedColors.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('pn:effectschange', sync);
  if (window.IntersectionObserver) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }).observe(host);
  }
  sync();
})();
