// Per-page decoded images. Requests are deduplicated, bounded, and retried
// promptly while the device prepares an icon, without flooding the frame API.
export function createImageCache({ createImage = () => new Image(), now = () => performance.now(),
  schedule = setTimeout, cancel = clearTimeout, concurrency = 4, capacity = 384 } = {}) {
  const entries = new Map();
  const queue = [];
  let active = 0;

  function pump() {
    while (active < concurrency && queue.length) {
      const entry = queue.shift();
      if (entries.get(entry.url) !== entry) continue;
      active++;
      entry.state = 'loading';
      const art = createImage();
      art.decoding = 'async';
      let settled = false;
      const timeout = schedule(() => { finish(false); art.src = ''; }, 3000);
      const finish = loaded => {
        if (settled) return;
        settled = true;
        cancel(timeout);
        art.onload = art.onerror = null;
        active--;
        entry.state = loaded ? 'ready' : 'failed';
        if (loaded) entry.image = art;
        if (!loaded) {
          entry.failures++;
          entry.retryAt = now() + Math.min(5000, 150 * 2 ** Math.min(entry.failures - 1, 6));
        }
        pump();
      };
      art.onload = () => finish(true);
      art.onerror = () => finish(false);
      art.src = entry.url;
    }
  }

  function get(url) {
    if (!url) return null;
    let entry = entries.get(url);
    if (!entry) {
      if (entries.size >= capacity) {
        const unused = [...entries.values()].find(value => value.state !== 'loading' && value.state !== 'queued');
        if (!unused) return null;
        entries.delete(unused.url);
      }
      entry = { url, image: null, state: 'queued', failures: 0, retryAt: 0 };
      entries.set(url, entry);
      queue.push(entry);
      pump();
    } else {
      // Insertion order is the LRU order, including shared icons used by many units.
      entries.delete(url);
      entries.set(url, entry);
      if (entry.state === 'failed' && now() >= entry.retryAt) {
        entry.state = 'queued';
        queue.push(entry);
        pump();
      }
    }
    return entry.state === 'ready' ? entry.image : null;
  }
  return { get };
}
