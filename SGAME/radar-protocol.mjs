const coordinateLimit = 10000;
const eventLimit = 32 * 1024;
const kinds = new Set(['frame', 'viewers', 'ended', 'ping']);
export const pvp9MapId = 'pvp_9';

// Fixed building locations on the pvp_9 image. These are normalized browser
// coordinates, checked against both LAN and web captures of this map.
// Rows contain camp, kind, x and y. Only live LAN rows have a health field.
const pvp9Structures = [
  [1, 1, 248, 3057], [1, 1, 312, 5654], [1, 1, 418, 7538],
  [1, 1, 1827, 8173], [1, 1, 2462, 9582], [1, 1, 3169, 7077],
  [1, 1, 3913, 5827], [1, 1, 4743, 9569], [1, 1, 7385, 9617],
  [1, 2, 899, 9101],
  [2, 1, 3057, 248], [2, 1, 5257, 431], [2, 1, 6087, 4173],
  [2, 1, 6831, 2923], [2, 1, 7532, 422], [2, 1, 8173, 1827],
  [2, 1, 9583, 2462], [2, 1, 9617, 7385], [2, 1, 9688, 4346],
  [2, 2, 9101, 899],
];

export function structureMarkers(frame, web) {
  if (!frame?.ready) return null;
  if (!web) return frame.t ?? null;
  return frame.map === pvp9MapId ? pvp9Structures : null;
}

const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const coordinate = value => integer(value, 0, coordinateLimit);
const camp = value => integer(value, 1, 2);
const percent = value => integer(value, 0, 100);
const point = value => Array.isArray(value) && value.length === 2 && value.every(coordinate);

function rows(value, count, columns, check) {
  return Array.isArray(value) && value.length <= count &&
    value.every(row => Array.isArray(row) && row.length === columns && check(row));
}

const ability = (row, summoner) => Array.isArray(row) && row.length === 3 &&
  integer(row[0], summoner ? 0 : 10000, summoner ? 80999 : 999999) &&
  (!summoner || row[0] === 0 || row[0] >= 80000) &&
  ((row[1] === -1 && row[2] === -1) || (integer(row[1], 0, 86400) && integer(row[2], 0, 30)));

export function parseRadarFrame(raw) {
  let frame;
  try {
    frame = JSON.parse(raw);
  } catch {
    return null;
  }
  if (frame?.version !== 1 || typeof frame.ready !== 'boolean') return null;
  if (frame.demo != null && typeof frame.demo !== 'boolean') return null;
  if (!frame.ready) return { ready: false };
  const heroes = rows(frame.h, 64, 4, ([id, x, y, hp]) => integer(id, 100, 9999) &&
    coordinate(x) && coordinate(y) && percent(hp));
  const monsters = rows(frame.m, 256, 4, ([kind, x, y, seconds]) => integer(kind, 0, 0x7fffffff) &&
    coordinate(x) && coordinate(y) && integer(seconds, 0, 86400));
  const structures = frame.t == null || rows(frame.t, 48, 5, ([team, kind, x, y, hp]) =>
    camp(team) && integer(kind, 1, 2) && coordinate(x) && coordinate(y) && percent(hp));
  const lanes = frame.l == null || rows(frame.l, 256, 3, ([team, x, y]) => camp(team) && coordinate(x) && coordinate(y));
  const seen = new Set();
  const skills = frame.a == null || rows(frame.a, 10, 5, ([slot, id, state, normal, summon]) => {
    if (!integer(slot, 0, 9) || seen.has(slot)) return false;
    seen.add(slot);
    return integer(id, 100, 9999) && integer(state, 0, 3) &&
      Array.isArray(normal) && normal.length >= 3 && normal.length <= 4 &&
      normal.every(row => ability(row, false)) && ability(summon, true);
  });
  if (!camp(frame.camp) || !heroes || !monsters || !structures || !lanes || !skills || (frame.s != null && !point(frame.s))) return null;
  if (frame.sid != null && !integer(frame.sid, 100, 9999)) return null;
  if (frame.map !== null && (typeof frame.map !== 'string' || !/^[a-z0-9_]{1,24}$/.test(frame.map))) return null;
  return frame;
}

export function unconfirmedHeroIds(roster) {
  const dimmed = new Set();
  const other = new Set();
  for (const [, id, state] of roster ?? []) {
    if (state === 0 || state === 2) dimmed.add(id);
    else other.add(id);
  }
  // A hero type can appear more than once. Use normal styling when its
  // roster entries disagree rather than attaching a state to the wrong marker.
  for (const id of other) dimmed.delete(id);
  return dimmed;
}

export function heroPortraitUrls(id) {
  if (!integer(id, 100, 9999)) return [];
  const path = `https://game.gtimg.cn/images/yxzj/img201606/heroimg/${id}/${id}`;
  return [path + '.jpg', path + '.png'];
}

export function abilityIconUrl(id, summoner = false) {
  const base = 'https://game.gtimg.cn/images/yxzj/img201606/';
  if (summoner) return integer(id, 80000, 80999) ? base + `summoner/${id}.jpg` : null;
  if (!integer(id, 10000, 999999)) return null;
  const owner = [32010, 32020, 32030].includes(id) ? 120 : Math.floor(id / 100);
  return base + `heroimg/${owner}/${id}.png`;
}

export function abilityState([, seconds, level]) {
  if (seconds < 0 || level < 0) return 'unknown';
  if (!level) return 'unlearned';
  return seconds > 0 ? 'cooldown' : 'ready';
}

export function mapPoint(x, y, size, rotated) {
  const scale = size / coordinateLimit;
  return rotated ? [(coordinateLimit - x) * scale, (coordinateLimit - y) * scale] : [x * scale, y * scale];
}

// The LAN reader reports the HTTP status before reading SSE. The same event
// names arrive through RadarPages.Stream on GitHub Pages.
export async function* readRadarEvents(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let type = '';
  let parts = [];
  let eventSize = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let start = 0;
      let newline;
      while ((newline = buffer.indexOf('\n', start)) !== -1) {
        const line = buffer.slice(start, newline).replace(/\r$/, '');
        start = newline + 1;
        if (line.length > eventLimit) return;
        if (!line) {
          if (kinds.has(type) && (parts.length || type === 'ended')) yield { type, data: parts.join('\n') };
          type = '';
          parts = [];
          eventSize = 0;
        } else if (line.startsWith('event:')) {
          type = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const text = line.slice(line[5] === ' ' ? 6 : 5);
          eventSize += text.length + 1;
          if (eventSize > eventLimit) return;
          parts.push(text);
        }
      }
      buffer = buffer.slice(start);
      if (buffer.length > eventLimit) return;
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
