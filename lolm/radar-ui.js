import { localIconUrl } from './radar-unit-icons.js';
import { createUnitVisibility } from './radar-unit-layers.js';
import { createUnitMenu } from './radar-unit-menu.js';
import { applyMenuArt } from './radar-menu-icons.js';

const SETTINGS_KEY = 'lolm-lan-radar-v1';
const LAYOUT_KEY = 'lolm-lan-radar-layout-v1';
const DEFAULTS = Object.freeze({
  heroes: true, portraits: true, health: true, labels: false, allies: true, enemies: true,
  visibleOnly: false, deadHeroes: false, jungle: true, smallMonsters: false, timers: true,
  jungleLabels: false, teamView: true, markerScale: 1, refresh: 100
});

const MAP_NAMES = Object.freeze({
  scene_battle: ['召唤师峡谷', '经典战场'],
  scene_battle_ionia: ['召唤师峡谷', '艾欧尼亚峡谷'],
  scene_battle_ionia_infernal1: ['召唤师峡谷', '艾欧尼亚 · 炼狱地形'],
  scene_battle_ionia_mountain1: ['召唤师峡谷', '艾欧尼亚 · 山脉地形'],
  scene_battle_infernal: ['召唤师峡谷', '炼狱地形'],
  scene_battle_mountain: ['召唤师峡谷', '山脉地形'],
  scene_battle_baronbroken: ['召唤师峡谷', '男爵破坏地形'],
  scene_battle_infernal_baronbroken: ['召唤师峡谷', '炼狱 · 男爵破坏地形'],
  scene_battle_mountain_baronbroken: ['召唤师峡谷', '山脉 · 男爵破坏地形'],
  scene_battle_abyss: ['嚎哭深渊', '极地战场'],
  scene_battle_tutorial: ['训练战场', '教学地图']
});
const CAMP_NAMES = Object.freeze({
  2: '小龙', 3: '纳什男爵', 4: '峡谷先锋', 5: '蓝 BUFF', 6: '红 BUFF',
  7: '三狼', 8: '石甲虫', 9: '锋喙鸟', 10: '魔沼蛙', 11: '河道迅捷蟹',
  13: '峡谷先锋', 14: '峡谷先锋', 15: '纳什男爵'
});

function storedObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function timeLabel(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function campLabel(item) {
  const icon = typeof item.icon === 'string' ? item.icon.toLowerCase() : '';
  if (icon.includes('elderdragon')) return '远古巨龙';
  if (icon.includes('xiaolongfire')) return '炼狱亚龙';
  if (icon.includes('xiaolongearth')) return '山脉亚龙';
  if (icon.includes('xiaolongair')) return '云端亚龙';
  if (icon.includes('xiaolongwater')) return '海洋亚龙';
  if (icon.includes('xiaolongice')) return '冰霜亚龙';
  return CAMP_NAMES[item.poi] || `野怪 #${item.id}`;
}

export function createRadarUi() {
  applyMenuArt();
  const byId = id => document.getElementById(id);
  const settings = { ...DEFAULTS };
  const saved = storedObject(SETTINGS_KEY);
  for (const key of Object.keys(DEFAULTS)) {
    if (typeof saved[key] === typeof DEFAULTS[key]) settings[key] = saved[key];
  }
  settings.unitTypes = createUnitVisibility(saved);
  settings.markerScale = Number.isFinite(settings.markerScale) ? Math.max(.7, Math.min(1.8, settings.markerScale)) : 1;
  settings.refresh = [100, 200, 500].includes(settings.refresh) ? settings.refresh : 100;

  const layout = storedObject(LAYOUT_KEY);
  layout.groups = layout.groups && typeof layout.groups === 'object' ? layout.groups : {};
  const controls = byId('controls');
  const menuButton = byId('menuButton');
  const groups = [...document.querySelectorAll('[data-group]')];
  const inputs = [...document.querySelectorAll('[data-setting]')];
  const layers = [...document.querySelectorAll('[data-layer]')];
  const backgrounds = [document.querySelector('.topbar'), byId('workspace'), document.querySelector('.site-footer')];
  let menuOpen = false;
  let currentFrame = null;
  let objectivesSignature = '';
  const unitMenu = createUnitMenu(settings, layout, () => {
    syncSettings();
    byId('inspection').hidden = true;
    persist(SETTINGS_KEY, settings);
  }, () => persist(LAYOUT_KEY, layout));

  function persist(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      byId('settingsSaved').textContent = '偏好自动保存';
    } catch { byId('settingsSaved').textContent = '本次会话有效'; }
  }

  function syncSettings() {
    unitMenu.sync();
    for (const input of inputs) input.checked = settings[input.dataset.setting];
    for (const layer of layers) layer.setAttribute('aria-pressed', String(settings[layer.dataset.layer]));
    byId('markerScale').value = settings.markerScale;
    byId('scaleValue').textContent = `${Math.round(settings.markerScale * 100)}%`;
    byId('refresh').value = settings.refresh;
    for (const group of groups) {
      const counter = group.querySelector('.group-count');
      const members = [...group.querySelectorAll('[data-setting]')];
      if (counter) counter.textContent = `${members.filter(input => input.checked).length}/${members.length}`;
    }
    updateView();
    updateObjectives();
  }

  function setMenu(open, { focus = false } = {}) {
    const focusedInside = controls.contains(document.activeElement);
    menuOpen = open;
    controls.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '收起图层设置' : '展开图层设置');
    byId('menuScrim').hidden = !open;
    document.body.classList.toggle('drawer-open', open);
    for (const node of backgrounds) node.inert = open;
    if (open) {
      controls.setAttribute('role', 'dialog');
      controls.setAttribute('aria-modal', 'true');
    } else {
      controls.removeAttribute('role');
      controls.removeAttribute('aria-modal');
    }
    if (focus && open) byId('closeMenu').focus();
    if (!open && (focus || focusedInside)) menuButton.focus();
  }

  const closeMenu = () => setMenu(false, { focus: true });
  menuButton.addEventListener('click', () => setMenu(!menuOpen, { focus: true }));
  byId('closeMenu').addEventListener('click', closeMenu);
  byId('menuScrim').addEventListener('click', closeMenu);
  document.addEventListener('keydown', event => {
    if (!menuOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
    } else if (event.key === 'Tab') {
      const focusable = [...controls.querySelectorAll('button, summary, input, select')].filter(node => node.getClientRects().length && !node.disabled);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  for (const group of groups) {
    if (typeof layout.groups[group.dataset.group] === 'boolean') group.open = layout.groups[group.dataset.group];
    group.addEventListener('toggle', () => {
      layout.groups[group.dataset.group] = group.open;
      persist(LAYOUT_KEY, layout);
    });
  }
  for (const input of inputs) input.addEventListener('change', () => {
    settings[input.dataset.setting] = input.checked;
    syncSettings();
    persist(SETTINGS_KEY, settings);
  });
  for (const layer of layers) layer.addEventListener('click', () => {
    const key = layer.dataset.layer;
    settings[key] = !settings[key];
    syncSettings();
    persist(SETTINGS_KEY, settings);
  });
  byId('markerScale').addEventListener('input', event => {
    settings.markerScale = Number(event.target.value);
    syncSettings();
    persist(SETTINGS_KEY, settings);
  });
  byId('refresh').addEventListener('change', event => {
    settings.refresh = Number(event.target.value);
    persist(SETTINGS_KEY, settings);
  });
  byId('reset').addEventListener('click', () => {
    Object.assign(settings, DEFAULTS);
    settings.unitTypes = createUnitVisibility();
    unitMenu.reset();
    for (const group of groups) group.open = group.dataset.group === 'units';
    byId('inspection').hidden = true;
    syncSettings();
    persist(SETTINGS_KEY, settings);
  });

  function updateView() {
    const camp = currentFrame ? (currentFrame.localCamp === currentFrame.blueCamp ? '蓝方' : currentFrame.localCamp === currentFrame.redCamp ? '红方' : '己方') : '己方';
    byId('viewLabel').textContent = settings.teamView ? `${camp}视角` : '固定地图视角';
  }

  function updateObjectives() {
    const timers = currentFrame && settings.timers ? currentFrame.timers.filter(item => Number.isFinite(item.seconds) && item.seconds > 0).sort((a, b) => a.seconds - b.seconds) : [];
    const monsters = currentFrame && settings.jungle ? currentFrame.monsters.filter(item => !item.dead && !item.small && item.primary) : [];
    const entries = [...timers.map(item => ({ item, timer: true })), ...monsters.map(item => ({ item, timer: false }))].slice(0, 6);
    const signature = JSON.stringify([Boolean(currentFrame), currentFrame?.generation, currentFrame?.assetRevision, settings.jungle, settings.timers, entries.map(({ item, timer }) => [item.id, item.anchorId, item.objectId, item.poi, localIconUrl(item.icon, currentFrame), item.seconds, timer])]);
    if (signature === objectivesSignature) return;
    objectivesSignature = signature;
    byId('objectiveStatus').textContent = !currentFrame ? '等待营地信息' : timers.length ? `${timers.length} 处营地正在刷新` : settings.timers ? '暂无刷新倒计时' : '倒计时已隐藏';
    const list = byId('objectiveList');
    const fragment = document.createDocumentFragment();
    for (const { item, timer } of entries) {
      const card = element('div', 'objective-item');
      const art = element('span', 'objective-art');
      const icon = element('img', '');
      // Only the radar's own bounded asset route is accepted from frame data.
      const ownIcon = localIconUrl(item.icon, currentFrame);
      icon.alt = '';
      icon.addEventListener('error', () => { icon.hidden = true; art.textContent = '◇'; }, { once: true });
      if (ownIcon) { icon.src = ownIcon; art.append(icon); }
      else art.textContent = '◇';
      const copy = element('div', 'objective-copy');
      copy.append(element('strong', '', campLabel(item)));
      copy.append(element('small', '', timer ? '距离刷新' : '当前已发现'));
      card.append(art, copy, element('span', `objective-value${timer ? '' : ' alive'}`, timer ? timeLabel(item.seconds) : '存活'));
      card.title = `${timer ? '营地' : '野怪'} ID ${item.id}${item.anchorId ? ` · 营地对象 ${item.anchorId}` : ''}`;
      fragment.append(card);
    }
    if (!entries.length) fragment.append(element('p', 'objective-empty', !currentFrame ? '营地状态将在对局开始后显示' : !settings.jungle && !settings.timers ? '野怪与计时已隐藏，可在显示设置中开启' : '当前没有可显示的营地信息'));
    list.replaceChildren(fragment);
  }

  function updateFrame(data) {
    const changedSession = !currentFrame || currentFrame.generation !== data.generation || currentFrame.map.name !== data.map.name;
    currentFrame = data;
    const name = (data.map.name || '').toLowerCase();
    const presentation = MAP_NAMES[name];
    byId('mapTitle').textContent = presentation ? presentation[0] : name ? '当前战场' : '地图识别中';
    byId('mapVariant').textContent = presentation ? presentation[1] : name || '等待读取当前地图名称';
    byId('mapTitle').title = name;
    byId('scene').textContent = data.map.configId ? `对局 ${data.map.configId}` : '地图已同步';
    byId('scene').title = `${data.map.scene || ''} · ${name}`;
    byId('frameInfo').textContent = `同步 #${data.sequence}`;
    for (const [key, id] of [['heroes', 'heroCount'], ['monsters', 'monsterCount'], ['timers', 'timerCount'], ['units', 'unitCount']]) {
      byId(id).textContent = key === 'timers' ? data.timers.filter(item => Number.isFinite(item.seconds) && item.seconds > 0).length : data[key].length;
    }
    if (changedSession) byId('inspection').hidden = true;
    updateView();
    updateObjectives();
  }

  function clearFrame() {
    if (!currentFrame) return;
    currentFrame = null;
    byId('mapTitle').textContent = '等待战场';
    byId('mapVariant').textContent = '连接后自动识别当前地图';
    byId('mapTitle').removeAttribute('title');
    byId('scene').textContent = '等待对局';
    byId('scene').removeAttribute('title');
    byId('frameInfo').textContent = '尚未同步';
    for (const id of ['heroCount', 'monsterCount', 'timerCount', 'unitCount']) byId(id).textContent = '—';
    byId('inspection').hidden = true;
    updateView();
    updateObjectives();
  }

  syncSettings();
  setMenu(false);
  return { settings, updateFrame, clearFrame };
}
