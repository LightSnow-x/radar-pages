const MARKER_HEIGHTS = Object.freeze({ tower: 22, building: 26, ward: 18, trap: 18, plant: 16 });
const VIRTUAL_UNIT_MAX_HEALTH = 1;
const web = Boolean(globalThis.RadarPages?.Stream);

export function mapImageUrl(name) {
  if (typeof name !== 'string' || !/^[a-z0-9_-]{1,80}$/i.test(name)) return null;
  return `${web ? '.' : ''}/assets/maps/${name.toLowerCase()}.png`;
}

export function unitHasHealthBar(unit) {
  return Number.isFinite(unit.maxHp) && unit.maxHp > VIRTUAL_UNIT_MAX_HEALTH;
}

export function localIconUrl(route, frame) {
  if (typeof route !== 'string' || route.includes('..') ||
      route.length > 1100 || !/^\/assets\/local-minimap\/(?:(?:dynamic\/)?[a-z0-9_.-]+|resource\/[0-9a-f]+)\.png$/.test(route)) return null;
  return assetImageUrl(route, frame);
}

export function assetImageUrl(route, frame) {
  if (web) {
    const icon = /^\/assets\/local-minimap\/([a-z0-9_.-]+\.png)$/.exec(route);
    return icon && !icon[1].includes('..') ? globalThis.LolmRadarIcons?.[icon[1]] ?? null : null;
  }
  const revision = frame.assetVersions?.[route];
  const suffix = Number.isSafeInteger(revision) && revision > 0 ? `_${revision}` : '';
  return `${route}?v=${frame.generation}_${frame.assetRevision || 0}${suffix}`;
}

export function unitIconSize(image, markerScale, unit) {
  if (!(image.naturalWidth > 0) || !(image.naturalHeight > 0)) return null;
  const baseHeight = MARKER_HEIGHTS[unit.kind] || 20;
  // Tiny atlas symbols (the flower is 10 px) should not be enlarged to the
  // generic 20 px summon size. Preserve aspect ratio and user marker scaling.
  const height = Math.min(baseHeight, image.naturalHeight * 1.2) * markerScale;
  return { width: height * image.naturalWidth / image.naturalHeight, height };
}

export function drawLocalIcon(context, image, x, y, width, height, route) {
  context.save();
  if (typeof route === 'string' && route.startsWith('/assets/local-minimap/resource/')) {
    context.beginPath();
    context.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
    context.closePath();
    context.clip();
  }
  context.drawImage(image, x, y, width, height);
  context.restore();
}
