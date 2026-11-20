const pagesMaps = new Map([["/maps/1.png","maps/1.png"],["/maps/2.png","maps/2.png"],["/maps/97.png","maps/97.png"],["/maps/99.png","maps/99.png"],["/maps/100.png","maps/99.png"],["/maps/109.png","maps/109.png"],["/maps/113.png","maps/113.png"],["/maps/114.png","maps/114.png"],["/maps/116.png","maps/116.png"],["/maps/117.png","maps/117.png"],["/maps/120.png","maps/120.png"],["/maps/1003.png","maps/1003.png"],["/maps/1004.png","maps/1004.png"],["/maps/1005.png","maps/1005.png"],["/maps/1006.png","maps/1006.png"],["/maps/1007.png","maps/1007.png"],["/maps/1009.png","maps/1009.png"],["/maps/1010.png","maps/1010.png"],["/maps/1011.png","maps/1011.png"],["/maps/1012.png","maps/1012.png"],["/maps/1013.png","maps/1013.png"],["/maps/5001.png","maps/5001.png"],["/maps/5002.png","maps/5002.png"],["/maps/5003.png","maps/5003.png"]]);
const inside = value => Number.isFinite(value) && value >= 0 && value <= 1;
export const validPosition = value => !!value && inside(value.u) && inside(value.v);
export const validFrame = frame => frame?.game === 'valorant' && frame.schema === 1 &&
  typeof frame.ready === 'boolean' && typeof frame.mapId === 'string' && Array.isArray(frame.players);

export function imageRect(width, height, imageWidth, imageHeight) {
  if (![width, height, imageWidth, imageHeight].every(n => Number.isFinite(n) && n > 0)) return null;
  const scale = Math.min(width / imageWidth, height / imageHeight);
  const w = imageWidth * scale, h = imageHeight * scale;
  return {x: (width - w) / 2, y: (height - h) / 2, w, h};
}

export function visiblePlayers(frame, options) {
  if (!validFrame(frame) || !frame.ready) return [];
  return frame.players.filter(p => validPosition(p?.position) && typeof p.ally === 'boolean' &&
    Number.isFinite(p.health) && p.health > 0 && (p.ally ? options.allies : options.enemies));
}

const teammateId = /^t[1-9]\d{0,19}-([1-9]\d{0,9})$/;
const teammateNumber = id => Number(id.slice(id.indexOf('-') + 1));
const viewLabel = id => id === 'overview' ? '全图' : id === 'self' ? '自己' : '队友 ' + teammateNumber(id);

export function teammates(frame) {
  const unique = new Map();
  for (const p of visiblePlayers(frame, {allies: true, enemies: false})) {
    if (typeof p.followId !== 'string' || !teammateId.test(p.followId)) continue;
    unique.set(p.followId, unique.has(p.followId) ? null : p);
  }
  return [...unique.values()].filter(Boolean).sort((a, b) => teammateNumber(a.followId) - teammateNumber(b.followId));
}

export function resolveView(id, self, squad, missingMs = Infinity) {
  if (id !== 'overview') {
    const ally = squad.find(p => p.followId === id);
    if (ally) return {id, subject: ally};
    if ((id !== 'self' || !self) && missingMs < 1600) return {id, subject: null, waiting: true};
    if (self) return {id: 'self', subject: self};
  }
  return {id: 'overview', subject: null};
}

export function mapViewRect(width, height, imageWidth, imageHeight, focus) {
  const rect = imageRect(width, height, imageWidth, imageHeight);
  if (!rect || !validPosition(focus)) return rect;
  const w = rect.w * 2, h = rect.h * 2;
  return {x: width / 2 - focus.u * w, y: height / 2 - focus.v * h, w, h};
}

// Native headings already include the map's rotation. Canvas angles start at the right.
export const beamAngle = degrees => Number.isFinite(degrees) && degrees >= 0 && degrees < 360
  ? (degrees - 90) * Math.PI / 180 : null;

// URLs from a frame can only select assets served by this radar.
const mapPath = path => typeof path === 'string' && /^\/maps\/\d+\.png$/.test(path) ? path : '';
export const portraitPath = path => typeof path === 'string' &&
  /^\/portraits\/[1-9]\d{0,19}\/[1-9]\d{0,9}\.png$/.test(path) ? path : '';

const hasWorld = point => point && [point.x, point.y, point.z].every(Number.isFinite);

export function markerStats(subject, options, observer = null) {
  const parts = [];
  if (options.health && Number.isFinite(subject.health) && subject.health > 0) parts.push(Math.max(1, Math.round(subject.health)) + ' HP');
  if (options.distance) {
    let distance = subject.distance;
    if (observer) {
      const a = observer.world, b = subject.world;
      distance = hasWorld(a) && hasWorld(b) ? Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z) / 100 : null;
    }
    if (Number.isFinite(distance) && distance >= 0) parts.push(Math.round(distance) + ' m');
  }
  return parts.join(' · ');
}

function icon(name, classes) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'), use = document.createElementNS(ns, 'use');
  svg.setAttribute('class', classes);
  svg.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', '#i-' + name);
  svg.append(use);
  return svg;
}

if (typeof document !== 'undefined') mountRadar();

function mountRadar() {
  const el = id => document.getElementById(id);
  const canvas = el('map-canvas'), ctx = canvas.getContext('2d');
  const options = {}, symbols = {}, images = new Map();
  const palette = getComputedStyle(canvas);
  for (const [kind, color] of [['self', '--gold'], ['ally', '--mint'], ['enemy', '--enemy']]) {
    symbols[kind] = {path: new Path2D(el('shape-' + kind).getAttribute('d')), color: palette.getPropertyValue(color).trim()};
  }
  let frame = null, received = null, busy = false, rosterKey = '';
  let viewId = 'overview', viewMenuKey = '', mapId = '', lastViewSample = 0;
  const toggle = el('menu-toggle'), menu = el('radar-menu');
  const room = RadarPages.room;
  if (room) {
    document.title = '房间 ' + room + ' · 无畏契约雷达';
    const change = el('change-room');
    change.href = '../../'; change.textContent = '房间 ' + room + ' · 更换房间'; change.hidden = false;
  }
  function setMenu(open, returnFocus = false) {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) paint();
    if (returnFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  document.addEventListener('pointerdown', e => {
    if (!menu.hidden && !el('menu-anchor').contains(e.target)) setMenu(false);
  });
  document.addEventListener('focusin', e => {
    if (!menu.hidden && !el('menu-anchor').contains(e.target)) setMenu(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { e.preventDefault(); setMenu(false, true); }
  });
  el('view-options').addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button || button.disabled) return;
    viewId = button.value; lastViewSample = performance.now();
    el('follow-note').hidden = true;
    setMenu(false, true);
    paint();
  });
  for (const key of ['allies', 'enemies', 'portraits', 'health', 'distance', 'headings']) {
    const input = el(key);
    options[key] = input.checked;
    input.addEventListener('change', () => { options[key] = input.checked; paint(); });
  }

  async function pollFrame() {
    if (busy || document.hidden) return;
    busy = true;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 2200);
    try {
      const response = await RadarPages.fetch('frame.json', {signal: controller.signal, cache: 'no-store', mode: 'same-origin', credentials: room ? 'same-origin' : 'omit'});
      if (room && response.status === 401) {
        frame = null; paint(); location.replace('./?ended=1&room=' + room); return;
      }
      const data = response.ok ? await response.json() : null;
      frame = validFrame(data) ? data : null;
    } catch { frame = null; }
    finally { clearTimeout(timeout); busy = false; }
    received = performance.now();
    paint();
  }

  // One decoded image per active path, shared by every map marker and menu row.
  function imageFor(path, wanted, now) {
    if (!path) return null;
    wanted.add(path);
    let entry = images.get(path);
    if (!entry) {
      entry = {image: null, loading: null, retryAt: 0, delay: 500};
      images.set(path, entry);
    }
    if (!entry.image && !entry.loading && now >= entry.retryAt) {
      const image = new Image();
      entry.loading = image;
      image.onload = () => {
        if (images.get(path) !== entry) return;
        entry.loading = null; entry.image = image; paint();
      };
      image.onerror = () => {
        if (images.get(path) !== entry) return;
        entry.loading = null; entry.retryAt = performance.now() + entry.delay;
        entry.delay = Math.min(8000, entry.delay * 2); paint();
      };
      const staticPath = pagesMaps.get(path);
      if (staticPath) {
        const failed = image.onerror;
        image.onerror = () => {
          if (images.get(path) !== entry) return;
          image.onerror = failed;
          RadarPages.setImage(image, path.slice(1));
        };
        image.src = staticPath;
      } else {
        RadarPages.setImage(image, path.slice(1));
      }
    }
    return entry.image;
  }
  function discardUnused(wanted) {
    for (const [path, entry] of images) {
      if (wanted.has(path)) continue;
      images.delete(path);
      if (entry.loading) {
        entry.loading.onload = entry.loading.onerror = null;
        entry.loading.removeAttribute('src');
      }
    }
  }

  function symbolAt(kind, x, y, radius) {
    const symbol = symbols[kind];
    ctx.save();
    ctx.translate(x - radius, y - radius);
    ctx.scale(radius / 12, radius / 12);
    ctx.lineJoin = 'round'; ctx.lineWidth = 3.2; ctx.strokeStyle = '#101a20';
    ctx.stroke(symbol.path); ctx.fillStyle = symbol.color; ctx.fill(symbol.path, 'evenodd');
    ctx.restore();
  }

  function drawBeam(subject, kind, dest, focused) {
    const angle = beamAngle(subject.heading);
    if (angle === null) return;
    const x = dest.x + subject.position.u * dest.w, y = dest.y + subject.position.v * dest.h;
    const radius = focused ? 65 : 48, half = .7, color = symbols[kind].color;
    const light = ctx.createRadialGradient(x, y, 2, x, y, radius);
    light.addColorStop(0, color + 'ab');
    light.addColorStop(.6, color + (focused ? '60' : '45'));
    light.addColorStop(1, color + '18');
    ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, radius, angle-half, angle+half);
    ctx.closePath(); ctx.fillStyle = light; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, radius, angle-half, angle+half);
    ctx.lineWidth = focused ? 1.5 : 1; ctx.strokeStyle = color + '8a'; ctx.stroke();
  }

  function drawSubject(subject, kind, dest, portrait, focused, observer) {
    const x = dest.x + subject.position.u * dest.w, y = dest.y + subject.position.v * dest.h;
    const r = portrait ? 14 : kind === 'self' ? 10 : 8;
    if (x < -r || y < -r || x > canvas.clientWidth+r || y > canvas.clientHeight+r) return;
    if (focused) {
      ctx.beginPath(); ctx.arc(x, y, r+4, 0, 2*Math.PI);
      ctx.strokeStyle = symbols[kind].color; ctx.lineWidth = 1.5; ctx.stroke();
    }
    if (portrait) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.clip();
      ctx.fillStyle = '#16232a'; ctx.fillRect(x - r, y - r, 2*r, 2*r);
      const imageSize = imageRect(2*r, 2*r, portrait.naturalWidth, portrait.naturalHeight);
      if (imageSize) ctx.drawImage(portrait, x-r+imageSize.x, y-r+imageSize.y, imageSize.w, imageSize.h);
      ctx.restore();
      ctx.beginPath(); ctx.arc(x, y, r, 0, 2*Math.PI);
      ctx.lineWidth = 4; ctx.strokeStyle = '#0f191d'; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = symbols[kind].color; ctx.stroke();
      symbolAt(kind, x+r*.7, y-r*.7, 5);
    } else symbolAt(kind, x, y, r);

    const label = markerStats(subject, options, observer);
    if (!label) return;
    ctx.font = '600 11px system-ui, sans-serif';
    const width = ctx.measureText(label).width + 10, height = 17;
    const left = Math.max(0, Math.min(canvas.clientWidth-width, x-width/2));
    const top = y+r+height+5 < canvas.clientHeight ? y+r+3 : y-r-height-3;
    ctx.fillStyle = '#0f1b22ed'; ctx.fillRect(left, top, width, height);
    ctx.fillStyle = '#f4f4ed'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, left+width/2, top+height/2);
    if (options.health && subject.health > 0 && Number.isFinite(subject.maxHealth) && subject.maxHealth > 0) {
      ctx.fillStyle = '#627076'; ctx.fillRect(left, top+height-1, width, 2);
      ctx.fillStyle = symbols[kind].color;
      ctx.fillRect(left, top+height-1, width*Math.min(1, subject.health/subject.maxHealth), 2);
    }
  }

  function drawBoard(texture, sites, players, self, faces, view) {
    if (!ctx) return;
    const width = canvas.clientWidth, height = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.round(width*dpr), h = Math.round(height*dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    if (!texture) return;
    const dest = mapViewRect(width, height, texture.naturalWidth, texture.naturalHeight, view.subject?.position);
    if (!dest) return;
    ctx.drawImage(texture, dest.x, dest.y, dest.w, dest.h);
    ctx.font = 'bold 13px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const site of sites) {
      const x = dest.x + site.u*dest.w, y = dest.y + site.v*dest.h;
      ctx.fillStyle = '#182227e8'; ctx.fillRect(x-9, y-9, 18, 18);
      ctx.strokeStyle = '#b6ad80'; ctx.lineWidth = 1; ctx.strokeRect(x-9, y-9, 18, 18);
      ctx.fillStyle = '#eee4b4'; ctx.fillText(site.name, x, y+.5);
    }
    const observer = view.subject?.ally ? view.subject : null;
    if (options.headings) {
      for (const p of players) drawBeam(p, p.ally ? 'ally' : 'enemy', dest, p === observer);
      if (self) drawBeam(self, 'self', dest, self === view.subject);
    }
    for (const p of players) {
      if (p !== observer) drawSubject(p, p.ally ? 'ally' : 'enemy', dest, faces.get(p.portrait), false, observer);
    }
    if (self) drawSubject(self, 'self', dest, faces.get(self.portrait), self === view.subject, observer);
    if (observer) drawSubject(observer, 'ally', dest, faces.get(observer.portrait), true, observer);
  }

  function faceBadge(kind, face) {
    if (face) {
      const tile = document.createElement('canvas');
      tile.width = tile.height = 58;
      const context = tile.getContext('2d'), dest = imageRect(58, 58, face.naturalWidth, face.naturalHeight);
      if (context && dest) {
        context.drawImage(face, dest.x, dest.y, dest.w, dest.h);
        tile.className = 'roster-face ' + kind; tile.setAttribute('aria-hidden', 'true');
        return tile;
      }
    }
    return icon(kind, 'marker ' + kind);
  }

  function drawViewMenu(squad, self, faces) {
    const choices = [{id: 'overview'}, {id: 'self', player: self},
      ...squad.map(player => ({id: player.followId, player}))];
    const key = JSON.stringify(choices.map(({id, player}) => [id, !!player, player?.portrait, !!faces.get(player?.portrait)]));
    const group = el('view-options');
    if (key !== viewMenuKey) {
      viewMenuKey = key;
      const restore = group.contains(document.activeElement) ? document.activeElement.value : null;
      group.replaceChildren(...choices.map(({id, player}) => {
        const button = document.createElement('button');
        button.type = 'button'; button.value = id; button.disabled = id === 'self' && !player;
        const badge = id === 'overview' ? icon('overview', 'icon') : faceBadge(id === 'self' ? 'self' : 'ally', faces.get(player?.portrait));
        button.append(badge, viewLabel(id));
        return button;
      }));
      if (restore) ([...group.children].find(b => b.value === restore && !b.disabled) || group.firstElementChild).focus();
    }
    for (const button of group.children) button.setAttribute('aria-pressed', String(button.value === viewId));
  }

  function drawRoster(players, faces, ready, observer) {
    const key = JSON.stringify([ready, players.map(p => [p.id, p.ally, p.hero, p.portrait, !!faces.get(p.portrait), markerStats(p, options, observer)])]);
    if (key === rosterKey) return;
    rosterKey = key;
    el('count').textContent = ready ? String(players.length) : '—';
    el('roster-empty').hidden = !!players.length;
    el('roster-empty').textContent = ready ? '当前没有符合显示设置的英雄' : '等待对局数据';
    el('roster').replaceChildren(...players.map(p => {
      const row = document.createElement('li'), stats = document.createElement('span');
      const kind = p.ally ? 'ally' : 'enemy', side = p.ally ? '队友' : '敌方', face = faces.get(p.portrait);
      const badge = faceBadge(kind, face);
      stats.className = 'stats'; stats.textContent = markerStats(p, options, observer);
      row.setAttribute('aria-label', [side, p.hero, stats.textContent].filter(Boolean).join(' '));
      row.append(badge, side, stats);
      return row;
    }));
  }

  function paint() {
    const now = performance.now(), fresh = !!frame && now-received <= 1200;
    const wanted = new Set(), faces = new Map();
    const path = fresh ? mapPath(frame.mapImage) : '';
    const texture = imageFor(path, wanted, now), ready = !!(fresh && frame.ready && path);
    const players = ready ? visiblePlayers(frame, options) : [];
    const self = ready && validPosition(frame.self?.position) ? frame.self : null;
    const squad = ready ? teammates(frame) : [];
    const currentMap = ready ? frame.mapId : '';
    if (currentMap && currentMap !== mapId) {
      mapId = currentMap; viewId = 'overview'; el('follow-note').hidden = true;
    }
    const view = resolveView(viewId, self, squad, now-lastViewSample);
    if (view.subject) lastViewSample = now;
    if (view.id !== viewId) {
      viewId = view.id;
      const note = el('follow-note');
      note.textContent = '观测目标暂不可用，已切回' + viewLabel(viewId);
      note.hidden = false;
    }
    const observer = view.subject?.ally ? view.subject : null;
    if (observer && !options.allies) players.push(observer);
    if (options.portraits) {
      const subjects = menu.hidden || options.allies ? players : [...players, ...squad];
      for (const subject of self ? [self, ...subjects] : subjects) {
        const url = portraitPath(subject.portrait);
        if (url && !faces.has(url)) faces.set(url, imageFor(url, wanted, now));
      }
    }
    discardUnused(wanted);
    const sites = texture && Array.isArray(frame?.sites) ? frame.sites.filter(s=>validPosition(s) && ['A','B','C'].includes(s.name)) : [];
    drawBoard(texture, sites, view.waiting ? [] : players, view.waiting ? null : self, faces, view);
    if (!menu.hidden) {
      drawViewMenu(squad, self, faces);
      drawRoster(view.waiting ? [] : players, faces, ready && !view.waiting, observer);
    }
    el('view-caption').textContent = viewId === 'overview' ? '当前对局' : '跟随 · ' + viewLabel(viewId);
    el('map-title').textContent = (fresh && frame.mapName) || '等待地图';
    el('site-legend').hidden = !sites.length;

    const state = fresh && frame.sourceOnline !== false ? 'online' : received === null ? 'connecting' : 'offline';
    const connection = el('connection');
    if (connection.parentElement.dataset.state !== state) {
      connection.parentElement.dataset.state = state;
      el('connection-icon').setAttribute('href', state === 'offline' ? '#i-offline' : '#i-wifi');
      connection.textContent = state === 'online' ? '设备已连接' : state === 'connecting' ? '正在连接' : '设备已断开';
    }
    const message = !ctx ? '此浏览器无法绘制地图' : !fresh ? (received === null ? '正在连接游戏设备…' : '连接中断，正在重连…') :
      !path ? frame.status || '等待进入对局' : !texture ? (images.get(path)?.retryAt > now ? '底图读取失败，正在重试…' : '正在载入地图…') :
      view.waiting ? '正在等待' + viewLabel(viewId) + '的位置…' : '';
    el('map-empty').hidden = !message;
    if (el('empty-message').textContent !== message) el('empty-message').textContent = message;
    el('empty-icon').setAttribute('href', state === 'offline' ? '#i-offline' : '#i-radar');
    el('frame-status').textContent = fresh && !message ? frame.status : '';
  }

  new ResizeObserver(paint).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { paint(); void pollFrame(); } });
  window.addEventListener('pageshow', e => { if (e.persisted) { frame = null; paint(); void pollFrame(); } });
  setInterval(() => {
    if (document.hidden) return;
    if (frame && performance.now()-received > 1200) { frame = null; paint(); }
    void pollFrame();
  }, 140);
  void pollFrame();
}
