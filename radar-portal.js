'use strict';

(() => {
  const welcome = document.getElementById('welcome');
  const openButton = document.getElementById('show-intro');
  const canvas = document.getElementById('snow');
  if (typeof welcome.showModal !== 'function') return;
  const key = 'lightsnow.intro.v2';
  let seen = false;
  let openedFromButton = false;
  try { seen = localStorage.getItem(key) === 'seen'; } catch (_) { /* The introduction remains usable without storage. */ }

  function open(fromButton) {
    if (welcome.open) return;
    welcome.classList.remove('is-leaving');
    openedFromButton = fromButton;
    welcome.append(canvas);
    welcome.showModal();
    document.documentElement.classList.add('intro-open');
  }
  function close() {
    if (welcome.classList.contains('is-leaving')) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { welcome.close(); return; }
    welcome.classList.add('is-leaving');
    setTimeout(() => welcome.close(), 420);
  }
  openButton.hidden = false;
  openButton.addEventListener('click', () => open(true));
  document.getElementById('enter-lobby').addEventListener('click', close);
  document.getElementById('skip-intro')?.addEventListener('click', close);
  welcome.addEventListener('close', () => {
    document.body.prepend(canvas);
    document.documentElement.classList.remove('intro-open');
    try { localStorage.setItem(key, 'seen'); } catch (_) { /* No persistence is required to enter the lobby. */ }
    (openedFromButton ? openButton : document.getElementById('games-title')).focus({preventScroll: true});
    document.dispatchEvent(new Event('portal:entered'));
  });
  if (!seen) open(false);
})();

(() => {
  const button = document.getElementById('mist-toggle');
  if (!button) return;
  let enabled = true;
  try { enabled = localStorage.getItem('lightsnow.mist') !== 'off'; } catch (_) { /* Optional preference. */ }
  function sync() {
    document.documentElement.classList.toggle('mist-soft', !enabled);
    button.setAttribute('aria-pressed', String(enabled));
  }
  button.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem('lightsnow.mist', enabled ? 'on' : 'off'); } catch (_) { /* Keep this visit's choice. */ }
    sync();
  });
  sync();
})();

(() => {
  const canvas = document.getElementById('snow');
  const toggles = [...document.querySelectorAll('.snow-toggle')];
  const context = canvas.getContext('2d');
  if (!context) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const preferenceKey = 'lightsnow.snow';
  let preference = null;
  try { preference = localStorage.getItem(preferenceKey); } catch (_) { /* Storage is optional. */ }
  let enabled = !motion.matches && preference !== 'off';
  let width = 0;
  let height = 0;
  let flakes = [];
  let frame = 0;
  let lastTime = 0;

  function resize() {
    width = innerWidth;
    height = innerHeight;
    const scale = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    const count = Math.min(110, Math.max(28, Math.round(width * height / 11500)));
    flakes = Array.from({length: count}, () => {
      const depth = Math.random();
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: .6 + depth * 2,
        speed: 9 + depth * 21,
        drift: 2 + depth * 7,
        phase: Math.random() * Math.PI * 2,
        alpha: .35 + depth * .48
      };
    });
  }

  function draw(now) {
    frame = requestAnimationFrame(draw);
    if (lastTime && now - lastTime < 1000 / 30) return;
    const elapsed = lastTime ? Math.min((now - lastTime) / 1000, .08) : 0;
    lastTime = now;
    context.clearRect(0, 0, width, height);
    for (const flake of flakes) {
      flake.y += flake.speed * elapsed;
      flake.x += (flake.drift + Math.sin(now / 3200 + flake.phase) * 5) * elapsed;
      if (flake.y > height + 4) { flake.y = -4; flake.x = Math.random() * width; }
      if (flake.x > width + 4) flake.x = -4;
      if (flake.x < -4) flake.x = width + 4;
      context.beginPath();
      context.fillStyle = `rgba(255, 255, 255, ${flake.alpha})`;
      context.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    for (const toggle of toggles) {
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.querySelector('.snow-status').textContent = enabled ? '开' : '关';
    }
    if (enabled && !document.hidden) frame = requestAnimationFrame(draw);
    else context.clearRect(0, 0, width, height);
  }

  for (const toggle of toggles) toggle.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch (_) { /* Keep the session choice. */ }
    sync();
  });
  motion.addEventListener('change', () => {
    if (motion.matches) { enabled = false; sync(); }
  });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('resize', resize, {passive: true});
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('pageshow', sync);
  resize();
  for (const toggle of toggles) toggle.hidden = false;
  sync();
})();
