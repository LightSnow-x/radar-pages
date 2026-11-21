(() => {
  'use strict';

  const url = "https://media.meilinvps.com/f.php?id=CIqz0OGxnfgV.zip";
  const indexSize = 4096;
  const zipHeaderSize = 30;
  const indexName = 'index.json';
  const indexEnd = zipHeaderSize + indexName.length + indexSize;
  const pageHeader = 96;
  const pageTriangles = 50000;
  const triangleBytes = 72;
  const maxPageBytes = pageHeader + pageTriangles * triangleBytes;
  const maxTextureBatch = 256 * 1024;
  const textureCacheBytes = 8 * 1024 * 1024;
  const maxMapIndex = 2 * 1024 * 1024;
  const maxTriangles = 1800000;
  const finite = Number.isFinite;
  const integer = Number.isSafeInteger;
  let index;

  const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
    for (let bit = 0; bit < 8; ++bit) value = value >>> 1 ^ ((value & 1) ? 0xedb88320 : 0);
    return value;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const value of bytes) crc = crc >>> 8 ^ crcTable[(crc ^ value) & 255];
    return (crc ^ 0xffffffff) >>> 0;
  }

  async function range(offset, length, signal) {
    if (signal.aborted) return null;
    const controller = new AbortController(), abort = () => controller.abort();
    const timer = setTimeout(abort, 30000);
    signal.addEventListener('abort', abort, { once: true });
    let reader;
    try {
      const last = offset + length - 1;
      const response = await fetch(url, { credentials: 'omit', signal: controller.signal,
        headers: { Range: `bytes=${offset}-${last}` } });
      const contentRange = response.headers.get('Content-Range');
      if (response.status !== 206 || !response.body || (contentRange && !contentRange.startsWith(`bytes ${offset}-${last}/`))) {
        await response.body?.cancel().catch(() => {});
        return null;
      }
      reader = response.body.getReader();
      const bytes = new Uint8Array(length);
      let at = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return at === length && !signal.aborted ? bytes : null;
        if (value.length > length - at) return null;
        bytes.set(value, at);
        at += value.length;
      }
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      if (reader) {
        void reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    }
  }

  const checksum = value => integer(value) && value >= 0 && value <= 0xffffffff;
  function validRange(value, max, end = index.end) {
    if (!Array.isArray(value) || value.length < 2) return false;
    const [offset, length] = value;
    return integer(offset) && integer(length) && offset >= indexEnd && length > 0 && length <= max && offset <= end - length;
  }
  const stored = (value, max, end) => validRange(value, max, end) && value.length === 3 && checksum(value[2]);
  const vector = (value, length) => Array.isArray(value) && value.length === length && value.every(finite);
  const decoder = new TextDecoder('utf-8', { fatal: true });
  function parse(bytes) {
    try { return bytes && JSON.parse(decoder.decode(bytes)); } catch (_) { return null; }
  }

  async function readIndex(signal) {
    if (index) return index;
    const bytes = await range(0, indexEnd, signal);
    if (!bytes) return null;
    const header = new DataView(bytes.buffer);
    if (header.getUint32(0, true) !== 0x04034b50 || header.getUint16(6, true) !== 0 || header.getUint16(8, true) !== 0 ||
        header.getUint32(18, true) !== indexSize || header.getUint32(22, true) !== indexSize ||
        header.getUint16(26, true) !== indexName.length || header.getUint16(28, true) !== 0 ||
        [...indexName].some((letter, i) => bytes[zipHeaderSize + i] !== letter.charCodeAt(0))) return null;
    const payload = bytes.subarray(zipHeaderSize + indexName.length);
    if (crc32(payload) !== header.getUint32(14, true)) return null;
    const data = parse(payload);
    if (data?.format !== 'UAM-WEB-COLOR-1' || !integer(data.end) || data.end < indexEnd || data.end > 0xffffffff ||
        !data.maps || typeof data.maps !== 'object' || Array.isArray(data.maps) ||
        Object.values(data.maps).some(value => !stored(value, maxMapIndex, data.end))) return null;
    index = data;
    return index;
  }

  async function readStored([offset, length, expected], signal) {
    const bytes = await range(offset, length, signal);
    return bytes && crc32(bytes) === expected ? bytes : null;
  }

  function validCatalog(data, map) {
    if (data?.id !== map.id || data.mapId !== (map.mapId ?? 0) || typeof data.revision !== 'string' ||
        !/^[1-9]\d{0,19}$/.test(data.revision) || BigInt(data.revision) > 18446744073709551615n ||
        !integer(data.total) || data.total < 1 || data.total > maxTriangles ||
        !integer(data.terrain) || data.terrain < 0 || data.terrain > data.total ||
        !integer(data.unavailable) || data.unavailable < 0 ||
        (data.focus !== null && (!Array.isArray(data.focus) || data.focus.length !== 2 ||
          !data.focus.every(value => vector(value, 3)) || data.focus[0].some((v, i) => v >= data.focus[1][i]))) ||
        !Array.isArray(data.pages) || data.pages.length !== Math.ceil(data.total / pageTriangles) ||
        !Array.isArray(data.materials) || data.materials.length < 1 || data.materials.length > 65536 ||
        !Array.isArray(data.imageRanges) || !data.imageRanges.length || data.imageRanges.length > data.materials.length ||
        !Array.isArray(data.batches) || data.batches.length > data.imageRanges.length) return false;
    if (data.pages.some((part, page) => !validRange(part, maxPageBytes + 2048) || part.length !== 4 || !checksum(part[3]) ||
        part[2] !== pageHeader + triangleBytes * Math.min(pageTriangles, data.total - page * pageTriangles)) ||
        data.batches.some(part => !stored(part, maxTextureBatch))) return false;
    if (data.imageRanges.some(item => {
      if (!Array.isArray(item) || item.length !== 5 || !item.every(integer)) return true;
      const [batch, start, length, width, height] = item;
      return batch < 0 || batch >= data.batches.length || start < 0 || length < 12 || start > data.batches[batch][1] - length ||
        width < 1 || width > 512 || height < 1 || height > 512;
    })) return false;
    return data.materials.every((row, id) => row?.id === id && typeof row.texture === 'string' &&
      (row.texture === '' || (/^(0|[1-9]\d*)$/.test(row.texture) && Number(row.texture) < data.imageRanges.length)) &&
      vector(row.tint, 4) && vector(row.scale, 2) && vector(row.offset, 2) && finite(row.rotation) &&
      finite(row.alphaCutoff) && typeof row.repeat === 'boolean');
  }

  function surfaces(catalog) {
    const batches = new Map();
    let size = 0;
    return { materials: catalog.materials, unavailable: catalog.unavailable,
      async readTexture(id, signal) {
        const [batch, start, length, width, height] = catalog.imageRanges[Number(id)];
        const part = catalog.batches[batch];
        let pending = batches.get(batch);
        if (pending) batches.delete(batch);
        else {
          pending = readStored(part, signal);
          size += part[1];
        }
        batches.set(batch, pending);
        while (size > textureCacheBytes) {
          const oldest = batches.keys().next().value;
          batches.delete(oldest);
          size -= catalog.batches[oldest][1];
        }
        const bytes = await pending;
        if (!bytes) {
          if (batches.get(batch) === pending) {
            batches.delete(batch);
            size -= part[1];
          }
          return null;
        }
        if (signal.aborted) return null;
        return { blob: new Blob([bytes.subarray(start, start + length)], { type: 'image/webp' }), width, height };
      } };
  }

  async function open(map, signal) {
    const root = await readIndex(signal);
    if (!root) return { error: '无法读取 3D 彩图 ZIP，请重试或切回 3D' };
    if (!Object.hasOwn(root.maps, map.id)) return { error: '当前地图暂无 3D 彩图，可切回 3D' };
    const catalog = parse(await readStored(root.maps[map.id], signal));
    if (!validCatalog(catalog, map)) return { error: '3D 彩图清单校验失败，可重试' };
    const surfaceAssets = surfaces(catalog);
    return { scene: { pageCount: catalog.pages.length,
      async readPage(page, signal) {
        const [offset, length, expanded, crc] = catalog.pages[page];
        const compressed = await range(offset, length, signal);
        if (!compressed) return null;
        let bytes;
        try { bytes = globalThis.fflate.inflateSync(compressed, { out: new Uint8Array(expanded) }); }
        catch (_) { return null; }
        if (bytes.length !== expanded || crc32(bytes) !== crc) return null;
        const value = globalThis.UamRadar3D.decode(bytes.buffer, { page, region: 'cn', mapId: catalog.mapId,
          revision: catalog.revision, textured: true, materialCount: catalog.materials.length });
        if (!value?.surfaces || value.total !== catalog.total || value.terrain !== catalog.terrain) return null;
        if (catalog.focus) [value.focusMinimum, value.focusMaximum] = catalog.focus;
        if (page === 0) value.surfaceAssets = surfaceAssets;
        return value;
      } } };
  }

  globalThis.UamRadarColorPack = { open };
})();
