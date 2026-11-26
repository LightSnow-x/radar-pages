import { abilityIconUrl, abilityState, heroPortraitUrls, mapPoint, parseRadarFrame, pvp9MapId, readRadarEvents, structureMarkers } from './radar-protocol.mjs?v=b679adc25f90';

const element = id => document.getElementById(id);
const room = new URLSearchParams(location.search).get('room') || '';
const roomValid = /^[0-9]{4}$/.test(room);
const web = document.body.dataset.mode === 'web';
const pages = window.RadarPages;
const canvas = element('markers');
const context = canvas.getContext('2d');
const surface = element('map-surface');
const mapImage = element('map-image');
const mapName = element('map-name');
const mapNote = element('map-note');
const rotate = element('rotate-map');
const reconnect = element('reconnect');
const connection = element('connection');
const mapMessage = element('map-message');
const viewers = element('viewers');
const layers = element('layer-options');
const options = layers.elements;
const healthStyles = element('health-style');
const structureStatus = element('structure-status');
const lanesStatus = element('lanes-status');
const enemyCards = new Map();
let enemyOrder = '';
const staleAfter = 4200;
const monsterIcons = new Map([
  [266010, 'Icon_XiaoGuai_1'],
  [266011, 'Icon_XiaoGuai_1_2'],
  [16411, 'Icon_ShenShi_1'],
]);
const colors = { 1: '#90dbff', 2: '#ffa093' };
const images = new Map();
const portraits = new Map();
let session;
let frame;
let mapLoad = 'idle';
let rotated = false;
let healthStyle = 'circular';
let drawId = 0;
let staleTimer = 0;
let retryTimer = 0;
let retryDelay = 1500;
let intelSignature = '';
let actionTimer = 0;

element('room-number').textContent = roomValid ? room : '—';
if (roomValid) element('change-room').href = './?room=' + room;

function setText(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

function setConnection(state, label) {
  if (connection.dataset.state !== state) connection.dataset.state = state;
  setText(connection, label);
}

function renderIntel(current) {
  const cooling = current ? current.m.filter(row => row[3] > 0).sort((a, b) => a[3] - b[3]) : [];
  setText(element('hero-count'), current ? String(current.h.length + (current.u?.length ?? 0)) : '—');
  setText(element('camp-count'), current ? String(current.m.filter(row => row[3] === 0).length) : '—');
  setText(element('respawn-count'), current ? String(cooling.length) : '—');
  if (!web) {
    const towers = current?.t;
    const alive = team => towers.filter(row => row[0] === team && row[1] === 1 && row[4] > 0).length;
    setText(element('own-towers'), towers ? String(alive(current.camp)) : '—');
    setText(element('enemy-towers'), towers ? String(alive(3 - current.camp)) : '—');
    const destroyed = towers?.filter(row => row[1] === 1 && row[4] === 0).length || 0;
    setText(element('tower-note'), towers ? (destroyed ? destroyed + ' 座防御塔已摧毁' : '建筑状态随对局同步') : '等待防御塔数据');
  }
  const shown = cooling.slice(0, 5);
  const signature = current ? JSON.stringify(shown) : 'waiting';
  if (signature === intelSignature) return;
  intelSignature = signature;
  const list = element('respawn-list');
  list.replaceChildren();
  if (!shown.length) {
    const empty = document.createElement('p');
    empty.className = 'intel-empty';
    empty.textContent = current ? '当前没有刷新中的营地' : '进入对局后显示营地刷新时间';
    list.append(empty);
    return;
  }
  for (const [kind, , , seconds] of shown) {
    const row = document.createElement('div');
    row.className = 'respawn-row';
    const caption = document.createElement('span');
    const art = document.createElement('img');
    art.src = './icons/monsters/' + (monsterIcons.get(kind) || 'Icon_XiaoGuai_2') + '.png';
    art.alt = '';
    caption.append(art, document.createTextNode('野区营地'));
    const time = document.createElement('strong');
    time.textContent = seconds < 60 ? seconds + ' 秒' : Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    row.append(caption, time);
    list.append(row);
  }
}

function makeAbilityCell(label, summoner, compact = false) {
  const root = document.createElement('div');
  root.className = 'ability-cell' + (label === '大招' ? ' ultimate' : '');
  root.setAttribute('role', 'img');
  const icon = document.createElement('span');
  icon.className = 'ability-icon';
  const fallback = document.createElement('span');
  fallback.className = 'ability-fallback';
  fallback.textContent = label;
  const img = document.createElement('img');
  img.alt = ''; img.hidden = true; img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
  img.addEventListener('load', () => { img.hidden = false; });
  img.addEventListener('error', () => { img.hidden = true; });
  const value = document.createElement('span');
  value.className = 'ability-value';
  const caption = document.createElement('span');
  caption.className = 'ability-label'; caption.textContent = label;
  icon.append(fallback, img, value); root.append(icon, caption);
  return { root, img, value, label, summoner, compact, url: null };
}

function updateAbilityCell(cell, data) {
  const state = cell.summoner && data[0] === 0 && data[2] === 0 ? 'none' : abilityState(data);
  if (cell.root.dataset.state !== state) cell.root.dataset.state = state;
  const seconds = data[1];
  const text = state === 'none' ? '—' : state === 'unknown' ? '?' : state === 'unlearned' ? (cell.compact ? '—' : '未学') :
    state === 'ready' ? '✓' : seconds < 100 ? String(seconds) : Math.ceil(seconds / 60) + 'm';
  const description = state === 'none' ? '未携带' : state === 'unknown' ? '暂不可用' : state === 'unlearned' ? '未学习' :
    state === 'ready' ? '就绪' : `冷却 ${seconds} 秒`;
  const name = cell.compact ? ['一技能', '二技能', '三技能'][Number(cell.label) - 1] : cell.summoner ? '召唤师技能' : cell.label;
  const title = name + ' · ' + description;
  if (cell.root.title !== title) { cell.root.title = title; cell.root.setAttribute('aria-label', title); }
  setText(cell.value, text);
  const url = abilityIconUrl(data[0], cell.summoner);
  if (url !== cell.url) {
    cell.url = url; cell.img.hidden = true;
    if (url) cell.img.src = url;
    else cell.img.removeAttribute('src');
  }
}

function makeEnemyCard(row) {
  const [, heroId, , skills] = row;
  const root = document.createElement('article'); root.className = 'enemy-card';
  root.setAttribute('aria-label', '敌方英雄 ' + heroId);
  const header = document.createElement('div'); header.className = 'enemy-header';
  const portrait = document.createElement('div'); portrait.className = 'enemy-avatar';
  const code = document.createElement('span'); code.textContent = String(heroId);
  const img = document.createElement('img'); img.alt = ''; img.hidden = true;
  img.referrerPolicy = 'no-referrer'; img.decoding = 'async';
  const urls = heroPortraitUrls(heroId); let attempt = 0;
  img.addEventListener('load', () => { img.hidden = !options.namedItem('portraits').checked; });
  img.addEventListener('error', () => {
    img.hidden = true;
    if (options.namedItem('portraits').checked && ++attempt < urls.length) img.src = urls[attempt];
  });
  portrait.append(code, img);
  const state = document.createElement('span'); state.className = 'enemy-state';
  header.append(portrait, state);
  const primary = document.createElement('div'); primary.className = 'enemy-primary';
  const ultimate = makeAbilityCell('大招', false);
  const summoner = makeAbilityCell('召唤', true);
  primary.append(ultimate.root, summoner.root);
  const secondary = document.createElement('div'); secondary.className = 'enemy-secondary';
  const normal = skills.slice(0, -1).map((_, i) => makeAbilityCell(String(i + 1), false, true));
  secondary.append(...normal.map(cell => cell.root));
  root.append(header, primary, secondary);
  return { root, heroId, img, state, ultimate, summoner, normal, count: skills.length, portraitStarted: false };
}

function renderEnemyPanel(current) {
  const show = options.namedItem('enemySkills').checked;
  document.body.dataset.enemyPanel = String(show);
  element('enemy-panel').hidden = !show;
  if (!show) return;
  const rows = current?.a || [];
  setText(element('enemy-count'), rows.length ? rows.length + ' 名英雄' : '等待同步');
  const empty = element('enemy-empty');
  empty.hidden = rows.length > 0;
  setText(empty, !current ? '进入对局后显示技能计时' : current.a == null ? '等待技能信息' : '当前没有敌方英雄');
  const order = rows.map(row => row[0] + ':' + row[1]).join(',');
  const keys = new Set();
  const children = [];
  for (const row of rows) {
    const [slot, heroId, state, skills, summoner] = row;
    const key = slot + ':' + heroId; keys.add(key);
    let card = enemyCards.get(key);
    if (!card || card.count !== skills.length) { card = makeEnemyCard(row); enemyCards.set(key, card); enemyOrder = ''; }
    card.root.dataset.state = String(state);
    setText(card.state, ['未知', '可见', '无视野', '已阵亡'][state]);
    if (options.namedItem('portraits').checked) {
      if (!card.portraitStarted) { card.portraitStarted = true; card.img.src = heroPortraitUrls(heroId)[0]; }
      card.img.hidden = !card.img.complete || !card.img.naturalWidth;
    } else card.img.hidden = true;
    updateAbilityCell(card.ultimate, skills.at(-1));
    updateAbilityCell(card.summoner, summoner);
    card.normal.forEach((cell, i) => updateAbilityCell(cell, skills[i]));
    children.push(card.root);
  }
  for (const key of enemyCards.keys()) if (!keys.has(key)) enemyCards.delete(key);
  if (order !== enemyOrder || !rows.length) {
    element('enemy-list').replaceChildren(...children);
    enemyOrder = order;
  }
}

function showMessage(title, detail, canRetry = false) {
  setText(element('map-message-title'), title);
  setText(element('map-message-detail'), detail);
  reconnect.hidden = !canRetry;
  mapMessage.hidden = false;
}

function updateStructureLayer(current) {
  const available = structureMarkers(current, web) !== null;
  options.namedItem('structures').disabled = !available;
  if (web) {
    setText(structureStatus, available ? '地图固定点位' : current ? '当前地图暂无固定点位' : '识别战场后显示地图固定点位');
  } else {
    setText(structureStatus, available ? '双方建筑位置与摧毁状态' : '等待设备提供建筑数据');
  }
}

function showNoFrame(state, label, title, detail, canRetry = false) {
  frame = null;
  renderIntel(null);
  renderEnemyPanel(null);
  options.namedItem('lanes').disabled = true;
  setText(lanesStatus, '等待兵线数据');
  clearTimeout(staleTimer);
  setConnection(state, label);
  setText(mapName, '等待对局');
  mapNote.hidden = true;
  rotate.disabled = true;
  updateStructureLayer(null);
  mapImage.hidden = true;
  canvas.hidden = true;
  showMessage(title, detail, canRetry);
}

function showWaiting() {
  showNoFrame('waiting', '已进房', '等待进入对局', '进入对局后自动显示实时位置。');
}

function clearLink() {
  clearTimeout(retryTimer);
  const last = session;
  session = null;
  last?.close?.();
}

function requestDraw() {
  if (!context || !frame || drawId || document.hidden) return;
  drawId = requestAnimationFrame(() => {
    drawId = 0;
    if (frame && !document.hidden) draw();
  });
}

function loadMap() {
  if (mapLoad !== 'idle') return;
  mapLoad = 'loading';
  mapImage.sizes = '(orientation: portrait) calc(100vw - 24px), (max-height: 600px) calc(100vh - 68px), min(900px, calc(100vh - 260px))';
  mapImage.srcset = './maps/pvp_9_small.png 344w, ./maps/pvp_9_big.png 702w';
  mapImage.src = './maps/pvp_9_small.png';
}

function updateMap() {
  if (!frame) return;
  const knownMap = frame.map === pvp9MapId;
  setText(mapName, knownMap ? '王者峡谷' : '对局网格');
  if (knownMap) loadMap();
  mapImage.hidden = !knownMap || mapLoad !== 'ready';
  mapNote.hidden = knownMap && mapLoad === 'ready' && Boolean(context);
  if (!context) setText(mapNote, '当前浏览器不支持地图标记。');
  else if (!knownMap) setText(mapNote, '当前地图暂无底图，实时位置显示在网格上。');
  else if (mapLoad === 'error') setText(mapNote, '底图未能加载，实时位置显示在网格上。');
  else setText(mapNote, '正在加载底图，实时位置已显示。');
  rotate.disabled = !context && mapImage.hidden;
  canvas.hidden = !context;
  requestDraw();
}

mapImage.addEventListener('load', () => {
  mapLoad = 'ready';
  updateMap();
});
mapImage.addEventListener('error', () => {
  mapLoad = 'error';
  updateMap();
});

function icon(path) {
  if (images.has(path)) return images.get(path);
  const image = new Image();
  images.set(path, image);
  image.addEventListener('load', requestDraw, { once: true });
  image.src = path;
  return image;
}

function drawIcon(image, x, y, size) {
  if (!image.complete || !image.naturalWidth) return false;
  const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, x - width / 2, y - height / 2, width, height);
  return true;
}

function diamond(x, y, size, color) {
  context.beginPath();
  context.moveTo(x, y - size);
  context.lineTo(x + size, y);
  context.lineTo(x, y + size);
  context.lineTo(x - size, y);
  context.closePath();
  context.fillStyle = color;
  context.fill();
}

function dot(x, y, radius, color) {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
}

function label(text, x, y, textSize, color = '#fff8e8') {
  context.font = `600 ${textSize}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = 3;
  context.strokeStyle = '#02101a';
  context.strokeText(text, x, y);
  context.fillStyle = color;
  context.fillText(text, x, y);
}

function paintMonsters(size, marker, position) {
  for (const [kind, px, py, seconds] of frame.m) {
    const [x, y] = position(px, py);
    if (seconds > 0) {
      dot(x, y, marker * .42, '#152735');
      label(String(seconds), x, y, size < 360 ? 10 : 11, '#f0ce89');
      continue;
    }
    const name = monsterIcons.get(kind) || 'Icon_XiaoGuai_2';
    if (!drawIcon(icon('./icons/monsters/' + name + '.png'), x, y, marker * 1.18)) {
      diamond(x, y, marker * .26, '#f4c266');
    }
  }
}

function paintStructures(marker, position) {
  for (const [camp, kind, px, py, hp] of structureMarkers(frame, web) ?? []) {
    const [x, y] = position(px, py);
    const file = 'NewStyle_JGS_' + (kind === 2 ? 'Base_' : 'Tower_') + (camp === 1 ? 'Bule' : 'Red') + '.png';
    context.globalAlpha = hp === 0 ? .28 : 1;
    if (!drawIcon(icon('./icons/towers_and_bases/' + file), x, y, marker * 1.6)) {
      diamond(x, y, marker * .48, colors[camp]);
    }
    context.globalAlpha = 1;
    if (hp === undefined) continue;
    if (hp === 0) {
      context.beginPath();
      context.moveTo(x - marker * .3, y - marker * .3);
      context.lineTo(x + marker * .3, y + marker * .3);
      context.moveTo(x + marker * .3, y - marker * .3);
      context.lineTo(x - marker * .3, y + marker * .3);
      context.lineWidth = 1.8;
      context.strokeStyle = '#a7b0b4';
      context.stroke();
    } else if (options.namedItem('structureHealth').checked) {
      const width = marker * 1.15;
      const top = y + marker * .65;
      context.fillStyle = '#07131de6';
      context.fillRect(x - width / 2 - 1, top - 1, width + 2, 5);
      context.fillStyle = hp <= 25 ? '#f0ad6b' : colors[camp];
      context.fillRect(x - width / 2, top, width * hp / 100, 3);
    }
  }
}

function roundedRect(x, y, width, height, rounding) {
  const r = Math.min(rounding, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function paintHeroHealth(x, y, radius, hp) {
  const fraction = Math.max(0, Math.min(1, hp / 100));
  // Match worker_art's minimap palette and the horizontal bar's dimensions.
  const ring = healthStyle === 'horizontal' ? 1 : fraction;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.strokeStyle = '#692324';
  context.lineWidth = 1.7;
  context.stroke();
  if (ring > 0) {
    context.beginPath();
    context.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring);
    context.strokeStyle = '#fe4f4f';
    context.stroke();
  }
  if (healthStyle !== 'horizontal') return;
  const portraitRadius = radius - 2;
  const width = portraitRadius * 2.25;
  const height = Math.max(4, portraitRadius * .22);
  const left = x - width / 2;
  const top = y + portraitRadius * 1.13;
  const rounding = height * .46;
  roundedRect(left - 2, top - 2, width + 4, height + 4, rounding + 2);
  context.fillStyle = '#250c0ee1';
  context.fill();
  roundedRect(left, top, width, height, rounding);
  context.fillStyle = '#692324';
  context.fill();
  if (fraction > 0) {
    context.save();
    context.clip();
    context.fillStyle = '#fe4f4f';
    context.fillRect(left, top, width * fraction, height);
    context.restore();
  }
  roundedRect(left, top, width, height, rounding);
  context.strokeStyle = '#f8d5d6be';
  context.lineWidth = 1;
  context.stroke();
}

function paintHeroes(rows, size, marker, position, opacity) {
  if (!rows?.length) return;
  const enemy = frame.camp === 1 ? 2 : 1;
  const radius = Math.max(11, marker * .55);
  context.save();
  context.globalAlpha = opacity;
  for (const [id, px, py, hp] of rows) {
    const [x, y] = position(px, py);
    dot(x, y, radius + 2, '#071620');
    dot(x, y, radius, colors[enemy]);
    dot(x, y, radius - 2, '#263341');
    paintHeroHealth(x, y, radius, hp);
    if (!paintPortrait(id, x, y, radius - 2)) label(String(id), x, y, size < 360 ? 10 : 11);
  }
  context.restore();
}

function paintPortrait(id, x, y, radius) {
  if (!options.namedItem('portraits').checked) return false;
  const urls = heroPortraitUrls(id);
  if (!urls.length) return false;
  let image = portraits.get(id);
  if (!image) {
    image = new Image();
    image.referrerPolicy = 'no-referrer';
    image.decoding = 'async';
    // Each browser loads these public CDN URLs directly. No relay/proxy,
    // embedded portrait assets or publisher-supplied URL is involved.
    image.addEventListener('load', requestDraw);
    let attempt = 0;
    image.addEventListener('error', () => {
      if (++attempt < urls.length) image.src = urls[attempt];
    });
    if (portraits.size >= 64) portraits.delete(portraits.keys().next().value);
    portraits.set(id, image);
    image.src = urls[0];
  }
  if (!image.complete || !image.naturalWidth) return false;
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.clip();
  context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2,
    side, side, x - radius, y - radius, radius * 2, radius * 2);
  context.restore();
  return true;
}

function draw() {
  const size = surface.clientWidth;
  if (!size) return;
  const pixels = Math.max(1, Math.round(size * Math.min(window.devicePixelRatio || 1, 2)));
  if (canvas.width !== pixels || canvas.height !== pixels) {
    canvas.width = pixels;
    canvas.height = pixels;
  }
  context.setTransform(pixels / size, 0, 0, pixels / size, 0, 0);
  context.clearRect(0, 0, size, size);
  const marker = Math.max(15, Math.min(size * .045, 29));
  const position = (x, y) => mapPoint(x, y, size, rotated);

  if (options.namedItem('lanes').checked) {
    const radius = Math.max(2, Math.min(3.5, size * .006));
    for (const [camp, px, py] of frame.l || []) {
      const [x, y] = position(px, py);
      dot(x, y, radius + 1, '#06131bea');
      dot(x, y, radius, colors[camp]);
    }
  }
  if (options.namedItem('structures').checked) paintStructures(marker, position);
  if (options.namedItem('monsters').checked) paintMonsters(size, marker, position);
  if (options.namedItem('heroes').checked) {
    paintHeroes(frame.u, size, marker, position, .65);
    paintHeroes(frame.h, size, marker, position, 1);
  }
  if (options.namedItem('self').checked && frame.s) {
    const [x, y] = position(...frame.s);
    const radius = Math.max(11, marker * .55);
    dot(x, y, radius + 2, '#071620');
    dot(x, y, radius, colors[frame.camp]);
    if (!paintPortrait(frame.sid, x, y, radius - 2)) dot(x, y, radius * .4, '#0b2030');
    dot(x, y + radius + 2, 2.5, '#ecfff6');
  }
}

function handleEvent(active, type, data) {
  if (session !== active) return;
  if (type === 'viewers') {
    if (/^[0-9]{1,5}$/.test(data)) setText(viewers, String(Number(data)));
    return;
  }
  if (type === 'ended') {
    clearLink();
    location.replace('./?ended=1&room=' + room);
    return;
  }
  if (type !== 'frame') return;
  const next = parseRadarFrame(data);
  if (!next) return;
  if (!next.ready) {
    showWaiting();
    return;
  }
  frame = next;
  renderIntel(frame);
  renderEnemyPanel(frame);
  options.namedItem('lanes').disabled = frame.l == null;
  setText(lanesStatus, frame.l == null ? '等待兵线数据' : '双方兵线 · ' + frame.l.length + ' 个单位');
  document.body.dataset.camp = String(frame.camp);
  clearTimeout(staleTimer);
  staleTimer = setTimeout(() => {
    if (session === active) showNoFrame('waiting', '等待更新', '等待对局数据', '收到新数据后自动恢复。');
  }, staleAfter);
  setConnection(frame.demo ? 'demo' : 'live', frame.demo ? '演示数据' : '实时连接');
  setText(element('data-label'), frame.demo ? '演示数据 · 非实时对局' : 'BATTLEFIELD');
  mapMessage.hidden = true;
  if (layers.dataset.camp !== String(frame.camp)) layers.dataset.camp = String(frame.camp);
  updateStructureLayer(frame);
  updateMap();
}

function refuse(status) {
  const details = {
    400: ['房间号无效', '请输入四位房间号。'],
    401: ['授权已失效', '请重新连接房间。'],
    403: ['连接未获准', '请从当前雷达入口连接房间。'],
    404: ['房间未开放', '检查四位房间号，并确认设备已开启共享。'],
    429: ['请求过于频繁', '稍后再连接房间。'],
  }[status];
  if (!details) return false;
  clearLink();
  setText(viewers, '—');
  showNoFrame('error', details[0], details[0], details[1], status !== 400);
  return true;
}

function waitingForRetry() {
  setText(viewers, '—');
  showNoFrame('error', '尝试重新连接', '房间连接中断',
    web ? '确认手机端的网页雷达仍在运行。' : '确认两台设备在同一局域网，并保持手机端共享开启。');
}

async function connectLan(active) {
  const controller = new AbortController();
  const handshake = setTimeout(() => controller.abort(), 8000);
  active.close = () => controller.abort();
  try {
    const response = await fetch('./' + room + '/events', {
      cache: 'no-store',
      headers: { Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    clearTimeout(handshake);
    if (session !== active) return;
    if (refuse(response.status)) return;
    if (response.ok && response.body && response.headers.get('content-type')?.startsWith('text/event-stream')) {
      retryDelay = 1500;
      showWaiting();
      for await (const { type, data } of readRadarEvents(response.body)) {
        if (session !== active) return;
        handleEvent(active, type, data);
      }
    }
  } catch {
    // A dropped LAN connection is retried. Deliberately leaving the room cancels it.
  } finally {
    clearTimeout(handshake);
    if (session === active) {
      controller.abort();
      waitingForRetry();
      retryTimer = setTimeout(() => {
        if (session !== active) return;
        session = null;
        start();
      }, retryDelay);
      retryDelay = Math.min(12000, retryDelay * 2);
    }
  }
}

function connectWeb(active) {
  if (!pages?.Stream) {
    clearLink();
    showNoFrame('error', '连接组件未加载', '连接组件未加载', '刷新页面后再进入房间。');
    return;
  }
  const stream = new pages.Stream(pages.route + '/events');
  active.close = () => stream.close();
  stream.addEventListener('open', () => {
    if (session === active) showWaiting();
  });
  for (const type of ['frame', 'viewers', 'ended']) {
    stream.addEventListener(type, event => handleEvent(active, type, event.data));
  }
  stream.addEventListener('error', () => {
    if (session !== active) return;
    if (!refuse(stream.roomStatus)) waitingForRetry();
  });
}

function start() {
  if (session || !roomValid || document.hidden) return;
  session = {};
  setText(viewers, '—');
  showNoFrame('waiting', '正在连接', '正在连接房间', '连接成功后自动同步对局。');
  if (web) connectWeb(session);
  else void connectLan(session);
}

function suspend() {
  clearLink();
  showNoFrame('waiting', '已暂停', '等待重新连接', '返回此页面后自动恢复。');
}

rotate.addEventListener('click', () => {
  rotated = !rotated;
  surface.dataset.rotated = String(rotated);
  rotate.setAttribute('aria-pressed', String(rotated));
  setText(element('view-direction'), rotated ? '旋转视角 · 180°' : '标准视角');
  requestDraw();
});
reconnect.addEventListener('click', start);
function savePreferences() {
  const saved = { rotated, healthStyle };
  for (const input of layers.querySelectorAll('input')) saved[input.name] = input.checked;
  try { localStorage.setItem('sgame-radar-view', JSON.stringify(saved)); } catch { /* Storage can be unavailable in private browsing. */ }
}
try {
  const saved = JSON.parse(localStorage.getItem('sgame-radar-view') || 'null');
  if (saved && typeof saved === 'object') {
    for (const input of layers.querySelectorAll('input')) {
      if (typeof saved[input.name] === 'boolean') input.checked = saved[input.name];
    }
    if (saved.healthStyle === 'horizontal' || saved.healthStyle === 'circular') healthStyle = saved.healthStyle;
    if (saved.rotated === true) {
      rotated = true;
      surface.dataset.rotated = 'true';
      rotate.setAttribute('aria-pressed', 'true');
      setText(element('view-direction'), '旋转视角 · 180°');
    }
  }
} catch { /* Ignore incomplete preferences and retain usable defaults. */ }
for (const input of healthStyles.querySelectorAll('input')) input.checked = input.value === healthStyle;
healthStyles.addEventListener('change', event => {
  if (event.target.value !== 'horizontal' && event.target.value !== 'circular') return;
  healthStyle = event.target.value;
  savePreferences();
  requestDraw();
});
rotate.addEventListener('click', savePreferences);
layers.addEventListener('change', () => { savePreferences(); renderEnemyPanel(frame); requestDraw(); });

const menu = element('radar-menu');
const openMenu = element('open-menu');
openMenu.addEventListener('click', () => {
  menu.showModal();
  openMenu.setAttribute('aria-expanded', 'true');
});
element('close-menu').addEventListener('click', () => menu.close());
menu.addEventListener('close', () => {
  openMenu.setAttribute('aria-expanded', 'false');
  openMenu.focus({ preventScroll: true });
});
menu.addEventListener('click', event => {
  const box = menu.getBoundingClientRect();
  if (event.target === menu && (event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom)) menu.close();
});
const tabs = [...menu.querySelectorAll('[role="tab"]')];
function selectTab(selected) {
  for (const tab of tabs) {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    element(tab.getAttribute('aria-controls')).hidden = !active;
  }
}
for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[1 - tabs.indexOf(tab)];
    selectTab(next);
    next.focus();
  });
}
function notifyAction(message) {
  clearTimeout(actionTimer);
  const status = element('action-status');
  setText(status, message);
  status.hidden = false;
  actionTimer = setTimeout(() => { status.hidden = true; }, 4000);
}
const fullscreen = element('fullscreen');
fullscreen.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else notifyAction('当前浏览器不支持全屏，可横屏查看地图。');
  } catch { notifyAction('暂时无法进入全屏，请使用浏览器的全屏功能。'); }
});
document.addEventListener('fullscreenchange', () => {
  fullscreen.setAttribute('aria-pressed', String(Boolean(document.fullscreenElement)));
  fullscreen.querySelector('span').textContent = document.fullscreenElement ? '退出' : '全屏';
  requestDraw();
});
if (window.ResizeObserver) new ResizeObserver(requestDraw).observe(surface);
else addEventListener('resize', requestDraw);
if (!roomValid) refuse(400);
else {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspend();
    else start();
  });
  addEventListener('pagehide', suspend);
  addEventListener('pageshow', start);
  start();
}
