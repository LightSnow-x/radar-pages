'use strict';

(() => {
  const endpoint = document.querySelector('.radar-online')?.dataset.viewerCountUrl;
  const display = document.getElementById('radar-online-total');
  if (!endpoint || !display) return;
  const number = new Intl.NumberFormat('zh-CN');
  let connection;

  function show(total) {
    const label = Number.isSafeInteger(total) && total >= 0 ? number.format(total) : '—';
    if (display.textContent !== label) display.textContent = label;
  }

  function refresh() {
    if (connection || document.hidden) return;
    let socket;
    try {
      socket = new WebSocket(endpoint);
    } catch (_) {
      show(null);
      return;
    }
    connection = socket;
    const timeout = setTimeout(() => finish(null), 4000);
    function finish(total) {
      if (connection !== socket) return;
      connection = undefined;
      clearTimeout(timeout);
      if (socket.readyState < WebSocket.CLOSING) socket.close();
      show(total);
    }
    socket.addEventListener('message', ({ data }) => {
      try {
        const packet = JSON.parse(data);
        finish(packet?.type === 'viewer-count' ? packet.total : null);
      } catch (_) {
        finish(null);
      }
    });
    socket.addEventListener('error', () => finish(null));
    socket.addEventListener('close', () => finish(null));
  }

  refresh();
  document.addEventListener('visibilitychange', refresh);
  setInterval(refresh, 5000);
})();

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
    openedFromButton = fromButton;
    welcome.append(canvas);
    welcome.showModal();
    document.documentElement.classList.add('intro-open');
  }
  openButton.hidden = false;
  openButton.addEventListener('click', () => open(true));
  document.getElementById('enter-lobby').addEventListener('click', () => welcome.close());
  document.getElementById('skip-intro')?.addEventListener('click', () => welcome.close());
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
  let context;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const preferenceKey = 'lightsnow.snow';
  let preference = null;
  try { preference = localStorage.getItem(preferenceKey); } catch (_) { /* Storage is optional. */ }
  let enabled = !motion.matches && preference === 'on';
  let width = 0;
  let height = 0;
  let flakes = [];
  let timer = 0;
  let lastTime = 0;

  function resize() {
    width = innerWidth;
    height = innerHeight;
    const scale = Math.min(1, Math.sqrt(650000 / (width * height)));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    const count = Math.min(56, Math.max(18, Math.round(width * height / 19000)));
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

  function draw() {
    const now = performance.now();
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
    timer = setTimeout(draw, 1000 / 24);
  }

  function sync() {
    clearTimeout(timer);
    timer = 0;
    lastTime = 0;
    if (enabled && !context) {
      context = canvas.getContext('2d');
      if (context) resize();
      else enabled = false;
    }
    const active = enabled && !document.hidden;
    canvas.hidden = !active;
    for (const toggle of toggles) {
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.querySelector('.snow-status').textContent = enabled ? '开' : '关';
    }
    if (active) draw();
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
  window.addEventListener('resize', () => { if (enabled) resize(); }, {passive: true});
  window.addEventListener('pagehide', () => { clearTimeout(timer); });
  window.addEventListener('pageshow', sync);
  for (const toggle of toggles) toggle.hidden = false;
  sync();
})();
