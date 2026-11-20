(() => {
  'use strict';

  const avatarArchiveUrl = 'https://media.meilinvps.com/f.php?id=Jkl8FW2NzjCL.zip';
  const limits = {'nailong.json': 2*1024*1024, 'nailong-2d.png': 256*1024};
  let archive = null;

  async function download() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(avatarArchiveUrl, {credentials:'omit', signal:controller.signal});
      if (!response.ok) return null;
      const maximum = 1024*1024;
      if (Number(response.headers.get('Content-Length')) > maximum || !response.body) return null;
      const reader = response.body.getReader();
      const bytes = new Uint8Array(maximum);
      let total = 0;
      try {
        for (;;) {
          const {done,value} = await reader.read();
          if (done) break;
          if (value.length > maximum-total) {
            await reader.cancel();
            return null;
          }
          bytes.set(value,total);
          total += value.length;
        }
      } finally {
        reader.releaseLock();
      }
      const files = globalThis.fflate.unzipSync(bytes.subarray(0,total), {filter: entry =>
        Object.hasOwn(limits, entry.name) && entry.originalSize>0 && entry.originalSize<=limits[entry.name]});
      return Object.keys(limits).every(name=>files[name]?.length) ? files : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  function load() {
    if (!avatarArchiveUrl) return Promise.resolve(null);
    archive ??= download().then(files => {
      if (!files) archive = null;
      return files;
    });
    return archive;
  }

  async function model() {
    const request = load();
    const bytes = (await request)?.['nailong.json'];
    if (!bytes) return null;
    let decoded = null;
    try {
      decoded = globalThis.UamRadarAvatar?.decode(JSON.parse(new TextDecoder().decode(bytes))) || null;
    } catch {}
    if (!decoded && archive===request) archive = null;
    return decoded;
  }

  function marker(redraw) {
    if (!avatarArchiveUrl) return null;
    const image = new Image();
    void load().then(files => {
      const bytes = files?.['nailong-2d.png'];
      if (!bytes) return;
      const url = URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
      image.onload = () => { URL.revokeObjectURL(url); redraw(); };
      image.onerror = () => URL.revokeObjectURL(url);
      image.src = url;
    });
    return image;
  }

  globalThis.DfmRadarAvatarPack = {available:!!avatarArchiveUrl, model, marker};
})();
