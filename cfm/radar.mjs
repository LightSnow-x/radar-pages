export function radarRoute(pathname) {
  const cloud = pathname === '/cfm' || pathname.startsWith('/cfm/');
  const room = cloud ? /^\/cfm\/(\d{4})$/.exec(pathname)?.[1] || '' : '';
  return {cloud, room, login: cloud ? '/cfm/' : '/', frame: cloud ? (room ? '/cfm/frame.json?room='+room : null) : '/frame.json'};
}
export const defaults={points:true,teams:true,names:true,distances:true,healthRing:true,weapons:true,pointSize:10};
export function validFrame(frame){return !!frame&&frame.game==='cfm'&&frame.schema===1&&typeof frame.ready==='boolean'&&Number.isInteger(frame.mapId)&&Array.isArray(frame.players);}
export function visibleTargets(frame,settings){if(!validFrame(frame)||!frame.ready)return [];return frame.players.filter(p=>p&&typeof p.bot==='boolean'&&Number.isFinite(p.position?.u)&&Number.isFinite(p.position?.v)&&Number.isFinite(p.health)&&p.health>0);}
export function markerPoint(position,size,origin){return {x:origin.x+position.u*size,y:origin.y+position.v*size};}
export function visibleSelf(frame,settings){const self=frame?.self;return validFrame(frame)&&frame.ready&&Number.isFinite(self?.position?.u)&&Number.isFinite(self?.position?.v)?self:null;}
export function canvasResolution(width,height,pixelRatio){const ratio=Number.isFinite(pixelRatio)&&pixelRatio>0?pixelRatio:1;return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};}
export function loadSettings(storage){let result={...defaults};try{const value=JSON.parse(storage.getItem('cfm.tactical.settings')||'{}');for(const key of Object.keys(defaults)){if(key==='pointSize')continue;if(typeof value[key]==='boolean')result[key]=value[key];}if(Number.isFinite(value.pointSize))result.pointSize=Math.min(12,Math.max(3,value.pointSize));}catch{}return result;}
export function connectionState(frame,lastPacket,now,paused=false,attempted=false){
 if(paused)return 'paused';
 if(!validFrame(frame)||lastPacket===null||now-lastPacket>1000)return attempted?'offline':'connecting';
 return frame.ready?'live':'waiting';
}
export function countTargets(frame){const counts={humans:0,bots:0};for(const player of visibleTargets(frame,defaults))counts[player.bot?'bots':'humans']++;return counts;}
// Keep health colors independent of dot visibility.
export function healthColor(fraction){return fraction>.6?'#00ff00':fraction>.3?'#ffff00':'#ff0000';}
export function healthFraction(health,maximum){return Number.isFinite(health)&&health>=0&&Number.isFinite(maximum)&&maximum>0?Math.min(1,health/maximum):null;}
export function targetName(player){const name=typeof player.name==='string'?player.name.trim():'';return Array.from(name|| (player.bot?'人机':'真人')).slice(0,36).join('');}
export function targetMarkerStyle(player,settings){
 const radius=settings.pointSize*(player.bot ? .85 : 1),ratio=settings.healthRing?healthFraction(player.health,player.maxHealth):null;
 return {radius,color:player.bot?'#ffffff':'#ff5050',team:settings.points&&settings.teams&&Number.isInteger(player.teamId)&&player.teamId>0?String(player.teamId):'',
  ratio,ringRadius:settings.pointSize*1.35,ringWidth:settings.pointSize*.2,extent:ratio===null?radius:settings.pointSize*1.45};
}
export function loadMenuCollapsed(storage,compact=false){try{const value=JSON.parse(storage.getItem('cfm.tactical.controls.collapsed'));if(typeof value==='boolean')return value;}catch{}return compact;}

export function mapDisplayName(frame){return typeof frame?.mapName==='string'&&frame.mapName.trim()?frame.mapName.trim():frame?.mapId?'当前地图':'等待地图';}


// CFM owns a separate document at /radar. Importing helpers on the login page
// does not create a map or attach controls to that page.
if (typeof document !== 'undefined' && document.getElementById('cfm-map')) mountBattlefield();

function mountBattlefield() {
  const route = radarRoute(RadarPages.route);
  const element = id => document.getElementById('cfm-' + id);
  const canvas = element('map');
  const context = canvas.getContext('2d');
  const svg = element('markers');
  const targets = element('targets');
  const ownMarker = element('self');
  const markers = new Map();
  let storage;
  try { storage = localStorage; } catch { storage = {getItem: () => null, setItem: () => {}}; }
  const settings = loadSettings(storage);
  const camera = {width: 0, height: 0, ratio: 1, zoom: 1, x: 0, y: 0};
  const stream = {frame: null, received: null, attempted: false, pending: false,
    nextPoll: 0, paused: false, epoch: 0, latency: 0, issue: '', controller: null};
  const texture = {key: '', image: null, pending: false, retryAt: 0};
  let collapsed = loadMenuCollapsed(storage, matchMedia('(max-width:600px), (max-height:600px)').matches);
  let running = true;
  let lastUi = -Infinity;

  element('device-address').textContent = location.host + ' · CFM' + (route.cloud ? ' · 房间 '+route.room : '');
  function save() { try { storage.setItem('cfm.tactical.settings', JSON.stringify(settings)); } catch {} }
  function setDock(open) {
    collapsed = !open;
    element('controls').hidden = collapsed;
    element('toggle-controls').classList.toggle('active', open);
    element('toggle-controls').setAttribute('aria-expanded', String(open));
    try { storage.setItem('cfm.tactical.controls.collapsed', JSON.stringify(collapsed)); } catch {}
  }
  element('toggle-controls').addEventListener('click', () => setDock(collapsed));
  element('close-controls').addEventListener('click', () => {
    setDock(false); element('toggle-controls').focus({preventScroll: true});
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !collapsed) {
      setDock(false); element('toggle-controls').focus({preventScroll: true});
    }
  });
  setDock(!collapsed);
  for (const key of Object.keys(defaults)) {
    if (key === 'pointSize') continue;
    const checkbox = element(key);
    checkbox.checked = settings[key];
    checkbox.addEventListener('change', () => { settings[key] = checkbox.checked; save(); });
  }
  element('point-size').value = settings.pointSize;
  element('point-size-value').textContent = settings.pointSize;
  element('point-size').addEventListener('input', event => {
    settings.pointSize = Number(event.target.value);
    element('point-size-value').textContent = settings.pointSize;
    save();
  });
  const resetCamera = () => { camera.zoom = 1; camera.x = 0; camera.y = 0; };
  const zoomTo = value => { camera.zoom = Math.max(.6, Math.min(6, value)); };
  element('reset').addEventListener('click', resetCamera);
  element('zoom-in').addEventListener('click', () => zoomTo(camera.zoom * 1.2));
  element('zoom-out').addEventListener('click', () => zoomTo(camera.zoom / 1.2));
  element('pause').addEventListener('click', () => {
    stream.paused = !stream.paused;
    ++stream.epoch;
    stream.controller?.abort();
    if (!stream.paused) { stream.frame = null; stream.received = null; stream.nextPoll = 0; }
    lastUi = -Infinity;
  });

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    camera.width = bounds.width; camera.height = bounds.height;
    camera.ratio = devicePixelRatio || 1;
    const size = canvasResolution(bounds.width, bounds.height, camera.ratio);
    canvas.width = size.width; canvas.height = size.height;
    context.setTransform(size.width / Math.max(1, bounds.width), 0, 0,
      size.height / Math.max(1, bounds.height), 0, 0);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  const pointers = new Map();
  let gesture = null;
  function anchorGesture() {
    const points = [...pointers.values()];
    gesture = points.length === 2
      ? {distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y), zoom: camera.zoom}
      : points.length === 1 ? {...points[0], panX: camera.x, panY: camera.y} : null;
  }
  canvas.addEventListener('pointerdown', event => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    anchorGesture();
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId) || !gesture) return;
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    const points = [...pointers.values()];
    if (points.length === 2 && gesture.distance !== undefined) {
      zoomTo(gesture.zoom * Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) / Math.max(1, gesture.distance));
    } else if (points.length === 1 && gesture.panX !== undefined) {
      camera.x = gesture.panX + event.clientX - gesture.x;
      camera.y = gesture.panY + event.clientY - gesture.y;
    }
  });
  const release = event => { pointers.delete(event.pointerId); anchorGesture(); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('wheel', event => {
    event.preventDefault(); zoomTo(camera.zoom * Math.exp(-event.deltaY * .001));
  }, {passive: false});

  function loadTexture(frame, now) {
    const key = [frame.attachment, frame.mapId, frame.mapImage].join(':');
    if (key !== texture.key) {
      Object.assign(texture, {key, image: null, pending: false, retryAt: 0});
      resetCamera();
    }
    if (!frame.ready || !frame.mapImage || texture.image || texture.pending || now < texture.retryAt) return;
    texture.pending = true;
    const candidate = new Image();
    candidate.onload = () => {
      if (texture.key === key) Object.assign(texture, {image: candidate, pending: false, retryAt: 0});
    };
    candidate.onerror = () => {
      if (texture.key === key) Object.assign(texture, {pending: false, retryAt: performance.now() + 1000});
    };
    RadarPages.setImage(candidate, frame.mapImage);
  }
  async function receive(now) {
    if (!running || document.hidden || stream.paused || stream.pending || now < stream.nextPoll) return;
    stream.pending = true;
    stream.nextPoll = now + 50;
    const epoch = stream.epoch;
    const controller = new AbortController();
    stream.controller = controller;
    const timeout = setTimeout(() => controller.abort(), 1800);
    try {
      const response = await RadarPages.fetch(route.frame, {cache: 'no-store', signal: controller.signal});
      stream.attempted = true;
      if (!response.ok) {
        stream.frame = null; stream.received = null;
        if (route.cloud && response.status === 401) {
          running = false; location.replace('./?room='+route.room+'&expired=1');
        } else stream.nextPoll = performance.now() + 500;
        return;
      }
      const frame = await response.json();
      if (epoch !== stream.epoch || stream.paused || !running) return;
      if (!validFrame(frame)) {
        stream.frame = null; stream.received = null;
        stream.issue = frame?.game !== 'cfm' ? '此设备未提供 CFM 雷达数据，请返回登录并检查地址。' : 'CFM 数据暂不可用，正在重试。';
        stream.nextPoll = performance.now() + 500;
        return;
      }
      stream.frame = frame; stream.received = performance.now();
      stream.latency = Math.round(stream.received - now); stream.issue = '';
      loadTexture(frame, stream.received);
    } catch {
      if (epoch === stream.epoch) {
        stream.attempted = true;
        stream.nextPoll = performance.now() + 500;
      }
    } finally {
      clearTimeout(timeout); stream.pending = false;
      if (stream.controller === controller) stream.controller = null;
    }
  }
  function svgPart(parent, tag, attributes) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.append(node);
    return node;
  }
  function markerFor(id) {
    if (markers.has(id)) return markers.get(id);
    const root = svgPart(targets, 'g', {});
    const ring = svgPart(root, 'g', {fill: 'none'});
    const track = svgPart(ring, 'circle', {stroke: '#0009'});
    const health = svgPart(ring, 'circle', {pathLength: '100', transform: 'rotate(-90)'});
    const dot = svgPart(root, 'circle', {stroke: '#080b11', 'stroke-width': '1.5'});
    const team = svgPart(root, 'text', {class: 'marker-team'});
    const name = svgPart(root, 'text', {class: 'marker-name'});
    const marker = {root, ring, track, health, dot, team, name};
    markers.set(id, marker);
    return marker;
  }
  function label(value, x, y, color = '#dce5f1') {
    context.font = '500 11px system-ui, "Microsoft YaHei", sans-serif';
    context.textAlign = 'center'; context.textBaseline = 'middle';
    context.strokeStyle = '#0b1019'; context.lineWidth = 3;
    context.strokeText(value, x, y); context.fillStyle = color; context.fillText(value, x, y);
  }
  function paintTargets(frame, size, origin) {
    const present = new Set();
    for (const player of visibleTargets(frame, settings)) {
      const point = markerPoint(player.position, size, origin);
      if (point.x < -80 || point.y < -60 || point.x > camera.width + 80 || point.y > camera.height + 60) continue;
      const key = String(player.id);
      present.add(key);
      const marker = markerFor(key);
      const style = targetMarkerStyle(player, settings);
      marker.root.setAttribute('transform', `translate(${point.x} ${point.y})`);
      marker.root.setAttribute('aria-label', targetName(player) + (style.team ? ' · 队伍 ' + style.team : ''));
      marker.dot.setAttribute('r', Math.max(1, style.radius - .75));
      marker.dot.setAttribute('fill', style.color);
      marker.dot.setAttribute('display', settings.points ? 'inline' : 'none');
      marker.team.textContent = style.team;
      marker.team.setAttribute('font-size', Math.min(settings.pointSize, style.radius * 2 / Math.max(1, style.team.length)));
      marker.name.textContent = settings.names ? targetName(player) : '';
      marker.name.setAttribute('y', -style.extent - 10);
      marker.name.setAttribute('fill', player.bot ? '#f1f4f8' : '#ffe09b');
      marker.ring.setAttribute('display', style.ratio === null ? 'none' : 'inline');
      if (style.ratio !== null) {
        marker.ring.setAttribute('stroke-width', style.ringWidth);
        marker.track.setAttribute('r', style.ringRadius); marker.health.setAttribute('r', style.ringRadius);
        marker.health.setAttribute('stroke', healthColor(style.ratio));
        marker.health.setAttribute('stroke-dasharray', `${style.ratio * 100} 100`);
      }
      let lineY = point.y + style.extent + 10;
      if (settings.distances && Number.isFinite(player.distance)) { label(Math.round(player.distance) + ' m', point.x, lineY); lineY += 14; }
      if (settings.weapons && player.weapon) { label(Array.from(String(player.weapon)).slice(0,32).join(''), point.x, lineY, '#e7c88f'); lineY += 14; }
      if (settings.healthRing && style.ratio === null) label('血量 —', point.x, lineY, '#a9b1bf');
    }
    for (const [key, marker] of markers) {
      if (!present.has(key)) { marker.root.remove(); markers.delete(key); }
    }
    const self = settings.points ? visibleSelf(frame, settings) : null;
    ownMarker.setAttribute('display', self ? 'inline' : 'none');
    if (self) {
      const point = markerPoint(self.position, size, origin), radius = Math.max(4, settings.pointSize * .6);
      ownMarker.setAttribute('transform', `translate(${point.x} ${point.y})`);
      ownMarker.querySelector('circle').setAttribute('r', radius - .75);
      ownMarker.querySelector('text').setAttribute('y', -radius - 9);
    }
  }
  function updateStatus(now, state, usable) {
    if (now - lastUi < 100) return;
    lastUi = now;
    const frame = stream.frame;
    const connected = state === 'live' || state === 'waiting';
    const connection = element('connection');
    connection.dataset.state = state;
    connection.querySelector('span').textContent = {live:'实时连接',waiting:'已连接',paused:'已暂停',connecting:'连接中',offline:'连接中断'}[state];
    element('latency').textContent = connected ? stream.latency + ' ms' : '—';
    element('map-title').textContent = mapDisplayName(connected || stream.paused ? frame : null);
    element('match-state').textContent = stream.paused ? '画面冻结' : usable ? '对局进行中' : connected ? '等待对局' : route.cloud ? '云端共享' : '局域网直连';
    const count = usable ? countTargets(frame) : null;
    element('human-count').textContent = count ? count.humans : '—';
    element('bot-count').textContent = count ? count.bots : '—';
    element('zoom').textContent = Math.round(camera.zoom * 100) + '%';
    const pause = element('pause');
    pause.disabled = !stream.paused && !usable;
    pause.setAttribute('aria-pressed', String(stream.paused));
    pause.setAttribute('aria-label', stream.paused ? '继续显示' : '暂停显示');
    pause.title = stream.paused ? '继续显示' : '暂停显示';
    element('pause-text').textContent = stream.paused ? '继续' : '暂停';
    element('pause-icon').setAttribute('href', stream.paused ? '#cf-play' : '#cf-pause');
    element('frozen').hidden = !stream.paused;
    element('status').textContent = stream.paused ? '冻结位置 · 继续后获取最新数据' : stream.issue || (state === 'offline' ? '连接中断 · 已隐藏过期位置' : frame?.status || '等待设备响应');
    element('empty').hidden = usable && !!texture.image;
    element('empty-title').textContent = state === 'offline' ? '等待重新连接' : usable ? (texture.retryAt ? '底图暂不可用' : '正在载入地图') : frame?.status || '正在连接设备';
    element('empty-message').textContent = stream.issue || (state === 'offline' ? (route.cloud ? '检查网络连接，并保持游戏设备的云端共享开启。' : '检查同一局域网连接，并保持设备程序运行。') : usable ? '底图加载完成后显示人物位置，失败时会自动重试。' : '进入对局后，地图会自动载入。');
  }
  function render(now) {
    if (!running) return;
    receive(now);
    const state = connectionState(stream.frame, stream.received, now, stream.paused, stream.attempted);
    const usable = !!stream.frame?.ready && (stream.paused || state === 'live');
    updateStatus(now, state, usable);
    if (camera.ratio !== (devicePixelRatio || 1)) resize();
    context.clearRect(0, 0, camera.width, camera.height);
    const dockHeight = collapsed ? 0 : element('controls').getBoundingClientRect().height + 22;
    const availableHeight = Math.max(80, camera.height - dockHeight - 64);
    const side = Math.max(60, Math.min(camera.width - 110, availableHeight - 18)) * camera.zoom;
    const origin = {x: (camera.width - side) / 2 + camera.x, y: 48 + (availableHeight - side) / 2 + camera.y};
    svg.style.visibility = usable && texture.image ? 'visible' : 'hidden';
    if (usable && texture.image) context.drawImage(texture.image, origin.x, origin.y, side, side);
    paintTargets(usable && texture.image ? stream.frame : null, side, origin);
    requestAnimationFrame(render);
  }
  window.addEventListener('pagehide', () => { running = false; ++stream.epoch; stream.controller?.abort(); });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { running = true; stream.frame = null; stream.received = null; stream.paused = false; stream.nextPoll = 0; requestAnimationFrame(render); }
  });
  requestAnimationFrame(render);
}
