import { UNIT_LAYER_GROUPS, UNIT_LAYERS, matchesUnitSearch, setUnitVisibility } from './radar-unit-layers.js';
import { createMenuArt, createMenuSymbol as symbol } from './radar-menu-icons.js';

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function action(label, icon, listener) {
  const button = element('button', 'unit-bulk-button');
  button.type = 'button';
  button.append(symbol(icon), element('span', '', label));
  button.addEventListener('click', listener);
  return button;
}

export function createUnitMenu(settings, layout, onChange, onLayoutChange) {
  const root = document.getElementById('unitLayerGroups');
  const search = document.getElementById('unitSearch');
  const searchStatus = document.getElementById('unitSearchStatus');
  const empty = document.getElementById('unitSearchEmpty');
  const expanded = {};
  const sections = [];
  const buttons = [];
  const savedGroups = layout.unitGroups && typeof layout.unitGroups === 'object' ? layout.unitGroups : {};
  let searching = false;

  function setMany(entries, enabled) {
    setUnitVisibility(settings.unitTypes, entries, enabled);
    onChange();
  }

  for (const group of UNIT_LAYER_GROUPS) {
    const section = element('details', 'unit-layer-group');
    section.dataset.unitGroup = group.id;
    expanded[group.id] = typeof savedGroups[group.id] === 'boolean' ? savedGroups[group.id] : true;
    section.open = expanded[group.id];
    const summary = element('summary', '');
    const count = element('span', 'unit-group-count');
    summary.append(createMenuArt(group.icon, null, 'unit-group-art'), element('strong', '', group.label), count, symbol('chevron', 'icon disclosure'));
    const body = element('div', 'unit-group-body');
    const actions = element('div', 'unit-group-actions');
    const select = action('全组选中', 'check', () => setMany(group.entries, true));
    const hide = action('全组隐藏', 'hide', () => setMany(group.entries, false));
    select.setAttribute('aria-label', `显示全部${group.label}`);
    hide.setAttribute('aria-label', `隐藏全部${group.label}`);
    actions.append(select, hide);
    const grid = element('div', 'unit-type-grid');
    const members = [];
    for (const entry of group.entries) {
      const button = element('button', 'unit-type-button');
      button.type = 'button';
      button.dataset.unitType = entry.type;
      button.setAttribute('aria-label', entry.label);
      button.append(createMenuArt(entry.icon, entry.type, 'unit-type-art'), element('span', 'unit-type-name', entry.label), symbol('check', 'icon unit-type-check'));
      button.addEventListener('click', () => {
        settings.unitTypes[entry.type] = !settings.unitTypes[entry.type];
        onChange();
      });
      grid.append(button);
      const member = { entry, button };
      members.push(member);
      buttons.push(member);
    }
    body.append(actions, grid);
    section.append(summary, body);
    section.addEventListener('toggle', () => {
      if (searching || expanded[group.id] === section.open) return;
      expanded[group.id] = section.open;
      layout.unitGroups = { ...expanded };
      onLayoutChange();
    });
    root.append(section);
    sections.push({ group, section, count, select, hide, members });
  }

  function filter() {
    searching = Boolean(search.value.trim());
    let matches = 0;
    for (const { group, section, members } of sections) {
      let visible = 0;
      for (const { entry, button } of members) {
        button.hidden = !matchesUnitSearch(entry, group.label, search.value);
        if (!button.hidden) visible++;
      }
      section.hidden = visible === 0;
      section.open = searching ? visible > 0 : expanded[group.id];
      matches += visible;
    }
    searchStatus.textContent = searching ? `找到 ${matches} 类实体` : `${UNIT_LAYERS.length} 类实体 · 点击图标切换显示`;
    empty.hidden = matches > 0;
    document.getElementById('clearUnitSearch').hidden = !search.value;
  }

  function sync() {
    const selected = UNIT_LAYERS.filter(entry => settings.unitTypes[entry.type]).length;
    const count = document.getElementById('unitLayerCount');
    count.textContent = `${selected}/${UNIT_LAYERS.length}`;
    count.setAttribute('aria-label', `已显示 ${selected} 类，共 ${UNIT_LAYERS.length} 类实体`);
    for (const { entry, button } of buttons) {
      const visible = settings.unitTypes[entry.type];
      button.setAttribute('aria-pressed', String(visible));
      button.title = `${entry.label}：${visible ? '已显示，点击隐藏' : '已隐藏，点击显示'}`;
    }
    for (const { group, count: groupCount, select, hide } of sections) {
      const active = group.entries.filter(entry => settings.unitTypes[entry.type]).length;
      groupCount.textContent = `${active}/${group.entries.length}`;
      select.disabled = active === group.entries.length;
      hide.disabled = active === 0;
    }
    document.getElementById('showAllUnits').disabled = selected === UNIT_LAYERS.length;
    document.getElementById('hideAllUnits').disabled = selected === 0;
  }

  search.addEventListener('input', filter);
  document.getElementById('clearUnitSearch').addEventListener('click', () => {
    search.value = '';
    filter();
    search.focus();
  });
  document.getElementById('showAllUnits').addEventListener('click', () => setMany(UNIT_LAYERS, true));
  document.getElementById('hideAllUnits').addEventListener('click', () => setMany(UNIT_LAYERS, false));

  function reset() {
    search.value = '';
    for (const group of UNIT_LAYER_GROUPS) expanded[group.id] = true;
    layout.unitGroups = { ...expanded };
    filter();
    onLayoutChange();
  }

  filter();
  return { sync, reset };
}
