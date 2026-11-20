(() => {
  'use strict';

  const sources = new Map([
    ['cn', {
      version: '1.0.168.168', bytes: 54744962, manifest: 'map-pack.json',
      url: 'https://media.meilinvps.com/f.php?id=vB21DUi87RxC.zip',
    }],
    ['global', {
      version: '1.0.516.516', bytes: 31456411, manifest: 'map-pack-global.json',
      url: 'https://media.meilinvps.com/f.php?id=s9JVIa5zdyZu.zip',
    }],
  ]);
  const imagePrefix = '/atlas/image/';
  const maxPngBytes = 4 * 1024 * 1024;
  const maxAtlasBytes = 96 * 1024 * 1024;

  async function downloadZip(source, signal, report) {
    const response = await fetch(source.url, { signal, credentials: 'omit' });
    if (!response.ok || !response.body) return null;

    const bytes = new Uint8Array(source.bytes);
    const reader = response.body.getReader();
    let offset = 0;
    let lastPercent = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value.length > bytes.length - offset) {
          await reader.cancel().catch(() => {});
          return null;
        }
        bytes.set(value, offset);
        offset += value.length;
        const percent = Math.floor(offset * 100 / bytes.length);
        if (percent !== lastPercent) {
          lastPercent = percent;
          report('下载中 ' + percent + '%');
        }
      }
    } finally {
      reader.releaseLock();
    }
    return offset === bytes.length ? bytes : null;
  }

  function unzipImages(bytes, expected, signal) {
    return new Promise(resolve => {
      if (signal.aborted) { resolve(null); return; }
      const seen = new Set();
      let expandedBytes = 0;
      let invalid = false;
      let terminate;
      function finish(result) {
        signal.removeEventListener('abort', cancel);
        resolve(result);
      }
      function cancel() {
        terminate?.();
        finish(null);
      }
      signal.addEventListener('abort', cancel, { once: true });
      try {
        terminate = globalThis.fflate.unzip(bytes, {
          filter({ name, compression, originalSize }) {
            if (!expected.has(name) || seen.has(name) || (compression !== 0 && compression !== 8) ||
                originalSize < 24 || originalSize > maxPngBytes || originalSize > maxAtlasBytes - expandedBytes) {
              invalid = true;
              return false;
            }
            seen.add(name);
            expandedBytes += originalSize;
            return true;
          },
        }, (error, files) => finish(error || invalid || seen.size !== expected.size ? null : files));
      } catch (_) {
        finish(null);
      }
    });
  }

  function matchesPng(bytes, part) {
    if (!bytes || bytes.length < 24) return false;
    const header = new DataView(bytes.buffer, bytes.byteOffset, 24);
    return header.getUint32(0) === 0x89504e47 && header.getUint32(4) === 0x0d0a1a0a &&
      header.getUint32(8) === 13 && header.getUint32(12) === 0x49484452 &&
      header.getUint32(16) === part.width && header.getUint32(20) === part.height;
  }

  function createPack(catalog, files) {
    const urls = new Map();
    const maps = new Set(catalog.maps.map(map => map.gameMapId));
    const sharedGlobalMaps = new Set(catalog.sharedGlobalMapIds);
    return {
      catalog,
      supports(packet) {
        if (packet.region === catalog.region) return maps.has(packet.mapId);
        return catalog.region === 'cn' && packet.region === 'global' && sharedGlobalMaps.has(packet.mapId);
      },
      imageUrl(file) {
        const bytes = files?.[file.slice(imagePrefix.length)];
        if (!bytes) return '';
        if (!urls.has(file)) urls.set(file, URL.createObjectURL(new Blob([bytes], { type: 'image/png' })));
        return urls.get(file);
      },
      dispose() {
        for (const url of urls.values()) URL.revokeObjectURL(url);
        urls.clear();
        files = null;
      },
    };
  }

  async function load(signal, validCatalog, report, region = 'cn') {
    const source = sources.get(region);
    if (!source) return { error: '底图包暂不可用' };
    if (typeof globalThis.fflate?.unzip !== 'function') return { error: '解包组件加载失败，请刷新页面' };

    let failure = '清单读取失败，请重试';
    try {
      report('读取地图清单…');
      const response = await fetch(source.manifest, { signal });
      if (!response.ok) return { error: failure };
      const catalog = await response.json();
      if (!validCatalog(catalog) || catalog.region !== region || catalog.version !== source.version ||
          (region === 'cn' && !Array.isArray(catalog.sharedGlobalMapIds))) {
        return { error: '地图清单与底图包版本不符' };
      }

      failure = '底图包下载失败，请重试';
      report('下载中 0%');
      const bytes = await downloadZip(source, signal, report);
      if (!bytes) return { error: failure };

      const expected = new Map(catalog.maps.flatMap(map => map.layers.flatMap(layer =>
        layer.parts.map(part => [part.file.slice(imagePrefix.length), part]))));
      failure = '底图包不完整或图片尺寸不符';
      report('解包并检查图片…');
      const files = await unzipImages(bytes, expected, signal);
      if (signal.aborted) return { canceled: true };
      if (!files || [...expected].some(([name, part]) => !matchesPng(files[name], part))) return { error: failure };
      return { pack: createPack(catalog, files) };
    } catch (_) {
      return signal.aborted ? { canceled: true } : { error: failure };
    }
  }

  globalThis.UamRadarMapPack = { load };
})();
