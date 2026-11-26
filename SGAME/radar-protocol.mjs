const coordinateLimit = 10000;
const eventLimit = 32 * 1024;
const kinds = new Set(['frame', 'viewers', 'ended', 'ping']);

const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const coordinate = value => integer(value, 0, coordinateLimit);
const camp = value => integer(value, 1, 2);
const percent = value => integer(value, 0, 100);
const point = value => Array.isArray(value) && value.length === 2 && value.every(coordinate);

function rows(value, count, columns, check) {
  return Array.isArray(value) && value.length <= count &&
    value.every(row => Array.isArray(row) && row.length === columns && check(row));
}

export function parseRadarFrame(raw) {
  let frame;
  try {
    frame = JSON.parse(raw);
  } catch {
    return null;
  }
  if (frame?.version !== 1 || typeof frame.ready !== 'boolean') return null;
  if (!frame.ready) return { ready: false };
  const heroes = rows(frame.h, 64, 4, ([id, x, y, hp]) => integer(id, 100, 9999) &&
    coordinate(x) && coordinate(y) && percent(hp));
  const monsters = rows(frame.m, 256, 4, ([kind, x, y, seconds]) => integer(kind, 0, 0x7fffffff) &&
    coordinate(x) && coordinate(y) && integer(seconds, 0, 86400));
  const structures = frame.t == null || rows(frame.t, 48, 5, ([team, kind, x, y, hp]) =>
    camp(team) && integer(kind, 1, 2) && coordinate(x) && coordinate(y) && percent(hp));
  if (!camp(frame.camp) || !heroes || !monsters || !structures || (frame.s != null && !point(frame.s))) return null;
  if (frame.map !== null && (typeof frame.map !== 'string' || !/^[a-z0-9_]{1,24}$/.test(frame.map))) return null;
  return frame;
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
