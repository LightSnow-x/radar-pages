// The five keys match RadarUnitPolicy.cpp. Legacy groups only migrate retained
// choices; verified traps now have their own independent, enabled-by-default key.
function group(id, label, icon, entries) {
  return Object.freeze({ id, label, icon, entries: Object.freeze(entries.map(
    ([type, name, symbol, legacy]) => Object.freeze({ type, label: name, icon: symbol, legacy })
  )) });
}

export const UNIT_LAYER_GROUPS = Object.freeze([
  group('vision', '眼位、陷阱与血包', 'eye', [
    ['ward', '眼位显示', 'eye', 'wards'],
    ['trap', '陷阱显示', 'trap', 'traps'],
    ['health_fruit', '血包', 'fruit', 'plants']
  ]),
  group('structures', '泉水与防御塔', 'tower', [
    ['fountain', '泉水', 'fountain', 'buildings'],
    ['tower', '防御塔', 'tower', 'buildings']
  ])
]);

export const UNIT_LAYERS = Object.freeze(UNIT_LAYER_GROUPS.flatMap(item => item.entries));
const KNOWN_TYPES = new Set(UNIT_LAYERS.map(item => item.type));
const LEGACY_DEFAULTS = Object.freeze({ buildings: true, wards: true, traps: true, plants: true });

export function createUnitVisibility(saved = {}) {
  const explicit = saved.unitTypes && typeof saved.unitTypes === 'object' && !Array.isArray(saved.unitTypes) ? saved.unitTypes : {};
  return Object.fromEntries(UNIT_LAYERS.map(({ type, legacy }) => [type,
    typeof explicit[type] === 'boolean' ? explicit[type] :
      typeof saved[legacy] === 'boolean' ? saved[legacy] : LEGACY_DEFAULTS[legacy]
  ]));
}

export function isUnitVisible(unit, visibility) {
  return KNOWN_TYPES.has(unit.type) && visibility[unit.type] === true;
}

export function selectVisibleUnits(units, visibility) {
  // Presentation comes from current game UI state, not missing-owner inference.
  // Raw auxiliary objects remain in the frame but never create a second marker.
  return units.filter(unit => !unit.dead && !unit.plantCompanion &&
    unit.markerKind !== 'hidden' && isUnitVisible(unit, visibility));
}

export function setUnitVisibility(visibility, entries, enabled) {
  for (const { type } of entries) visibility[type] = enabled;
}

export function matchesUnitSearch(entry, groupLabel, query) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const text = `${entry.label} ${groupLabel} ${entry.type}`.toLocaleLowerCase();
  return words.every(word => text.includes(word));
}
