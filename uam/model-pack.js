(() => {
  'use strict';

  const url = 'https://media.meilinvps.com/f.php?id=KEdWmsQPbXa3.zip';
  // Each range is the deflate payload of one member in the supplied UAMCOL2 archive.
  const maps = [
    { id: 'farm', name: '农场', mapId: 1102, offset: 63948309, bytes: 26062892, expanded: 71595672, crc: 0x68d5001e },
    { id: 'valley', name: '山谷', mapId: 702, offset: 130204106, bytes: 47954558, expanded: 135882388, crc: 0x00bc1277 },
    { id: 'north', name: '北部山区', mapId: 401, offset: 90011248, bytes: 31842447, expanded: 89133360, crc: 0xb92b3293 },
    { id: 'armory', name: '前线要塞', mapId: 1401, offset: 18093464, bytes: 21696355, expanded: 61829784, crc: 0xe6295745 },
    { id: 'tv', name: '电视台', mapId: 1601, offset: 122590345, bytes: 7613718, expanded: 19039204, crc: 0x0e251213 },
    { id: 'bay', name: '湾区', mapId: 201, offset: 39789859, bytes: 23457771, expanded: 58223672, crc: 0x3bca5f14 },
    { id: 'airport', name: '机场', mapId: 9701, offset: 44, bytes: 18093377, expanded: 47107708, crc: 0x6cd50500 },
    { id: 'courtyard', name: '庭院', offset: 63247676, bytes: 700592, expanded: 1647912, crc: 0xa0310b4b },
    { id: 'range', name: '靶场', offset: 121853746, bytes: 736552, expanded: 1758032, crc: 0x03328171 },
  ];
  const script = new URL(document.currentScript.src);
  const workerUrl = new URL('model-worker.js', script);
  workerUrl.search = script.search;

  function load(map, signal, report) {
    return new Promise(resolve => {
      if (signal.aborted) { resolve({ canceled: true }); return; }

      let worker;
      function finish(result) {
        signal.removeEventListener('abort', cancel);
        worker?.terminate();
        resolve(result);
      }
      function cancel() { finish({ canceled: true }); }

      try {
        worker = new Worker(workerUrl);
        signal.addEventListener('abort', cancel, { once: true });
        worker.onmessage = ({ data }) => {
          if (data.progress) report(data.progress);
          else finish(data);
        };
        worker.onerror = () => finish({ error: '3D 模型处理组件暂不可用' });
        worker.postMessage({ url, map });
      } catch (_) {
        finish({ error: '3D 模型处理组件暂不可用' });
      }
    });
  }

  globalThis.UamRadarModelPack = { maps, load };
})();
