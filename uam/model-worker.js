'use strict';

importScripts('vendor/fflate-0.8.3.js');

const headerBytes = 64;
const maxCommentBytes = 16384;
const instanceBytes = 64;
const maxObjects = 1000000;
const maxModelBytes = 150 * 1024 * 1024;
const trianglesPerPage = 25000;
const structureBudget = 520000;
const terrainBudget = 180000;
const littleEndian = new Uint8Array(Uint16Array.of(1).buffer)[0] === 1;
const finite = Number.isFinite;

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; ++bit) value = value >>> 1 ^ ((value & 1) ? 0xedb88320 : 0);
  return value;
});

async function readMember(url, map, signal) {
  const response = await fetch(url, {
    credentials: 'omit', signal,
    headers: { Range: `bytes=${map.offset}-${map.offset + map.bytes - 1}` },
  });
  if (response.status !== 206 || !response.body) {
    await response.body?.cancel().catch(() => {});
    return null;
  }
  const output = new Uint8Array(map.expanded);
  let received = 0, written = 0, checksum = 0xffffffff, lastProgress = -1, overflow = false;
  const inflate = new globalThis.fflate.Inflate(chunk => {
    if (overflow || chunk.length > output.length - written) { overflow = true; return; }
    output.set(chunk, written);
    written += chunk.length;
    for (const byte of chunk) checksum = checksum >>> 8 ^ crcTable[(checksum ^ byte) & 255];
  });
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.length > map.bytes - received) return null;
      received += value.length;
      inflate.push(value, false);
      if (overflow) return null;
      const progress = Math.floor(received * 100 / map.bytes);
      if (progress !== lastProgress) {
        lastProgress = progress;
        postMessage({ progress: '下载 3D 地图 ' + progress + '%' });
      }
    }
    if (received !== map.bytes) return null;
    inflate.push(new Uint8Array(), true);
    return !overflow && written === output.length && ((checksum ^ 0xffffffff) >>> 0) === map.crc ? output : null;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

const emptyBounds = () => ({ minimum: [Infinity, Infinity, Infinity], maximum: [-Infinity, -Infinity, -Infinity] });

function values(view, start, count, Type, method) {
  if (littleEndian && start % 4 === 0) return new Type(view.buffer, start, count);
  return Type.from({ length: count }, (_, index) => view[method](start + index * 4, true));
}

function readModel(bytes) {
  if (bytes.length < headerBytes) return null;
  const view = new DataView(bytes.buffer);
  const u32 = at => view.getUint32(at, true);
  const wide = at => Number(view.getBigUint64(at, true));
  const expectedMagic = [85, 65, 77, 67, 79, 76, 50, 0];
  if (expectedMagic.some((byte, i) => bytes[i] !== byte) || u32(8) !== 2) return null;
  const header = u32(12), meshCount = u32(16), instanceCount = u32(20);
  const comment = wide(56), meshEnd = header + wide(40);
  if (comment < 1 || comment > maxCommentBytes || header !== headerBytes + comment ||
      !meshCount || meshCount > maxObjects || !instanceCount || instanceCount > maxObjects ||
      meshEnd < header + meshCount * 16 || meshEnd > bytes.length ||
      wide(48) !== instanceCount * instanceBytes || meshEnd + wide(48) !== bytes.length) return null;

  const meshes = [];
  let offset = header, totalVertices = 0, totalTriangles = 0;
  for (let i = 0; i < meshCount; ++i) {
    if (meshEnd - offset < 16) return null;
    const count = u32(offset), indexCount = u32(offset + 4), flag = u32(offset + 8);
    if (!count || !indexCount || indexCount % 3 || flag > 1 || u32(offset + 12) ||
        count * 12 + indexCount * 4 > meshEnd - offset - 16) return null;
    offset += 16;
    const vertices = values(view, offset, count * 3, Float32Array, 'getFloat32');
    offset += count * 12;
    const indices = values(view, offset, indexCount, Uint32Array, 'getUint32');
    offset += indexCount * 4;
    const { minimum, maximum } = emptyBounds();
    for (let vertex = 0; vertex < vertices.length; ++vertex) {
      const coordinate = vertices[vertex], axis = vertex % 3;
      if (!finite(coordinate)) return null;
      minimum[axis] = Math.min(minimum[axis], coordinate);
      maximum[axis] = Math.max(maximum[axis], coordinate);
    }
    if (indices.some(index => index >= count)) return null;
    meshes.push({ vertices, indices, minimum, maximum, terrain: flag === 1, variants: new Map() });
    totalVertices += count;
    totalTriangles += indexCount / 3;
  }
  if (offset !== meshEnd || totalVertices !== wide(24) || totalTriangles !== wide(32)) return null;

  const instances = [], ids = new Set();
  for (let i = 0; i < instanceCount; ++i, offset += instanceBytes) {
    const mesh = meshes[u32(offset)], flags = u32(offset + 4);
    const key = view.getBigUint64(offset + 8, true) || BigInt(i + 1);
    if (!mesh || flags > 3 || ids.has(key)) return null;
    ids.add(key);
    const transform = values(view, offset + 16, 12, Float32Array, 'getFloat32');
    if (!transform.every(finite)) return null;
    if (!(flags & 2)) continue;
    const scale = Math.max(1e-6, Math.hypot(transform[0], transform[4], transform[8]),
      Math.hypot(transform[1], transform[5], transform[9]), Math.hypot(transform[2], transform[6], transform[10]));
    const tier = Math.ceil(Math.log2(scale));
    if (!mesh.variants.has(tier)) mesh.variants.set(tier, { mesh, scale: 2 ** tier, uses: 0, geometry: null });
    const variant = mesh.variants.get(tier);
    ++variant.uses;
    instances.push({ variant, transform });
  }
  return { meshes, instances };
}

function simplifyMesh(mesh, spacing) {
  const { vertices, indices, minimum, maximum } = mesh;
  const span = maximum.map((value, axis) => value - minimum[axis]);
  const step = Math.max(spacing, ...span.map(value => value / 65534));
  const dimensions = span.map(value => Math.floor(value / step) + 1);
  if (!finite(step) || step <= 0) return null;
  const remap = new Uint32Array(vertices.length / 3);
  const sums = new Float64Array(vertices.length), uses = new Uint32Array(remap.length);
  const cells = new Map();
  for (let i = 0, at = 0; i < remap.length; ++i, at += 3) {
    const x = Math.floor((vertices[at] - minimum[0]) / step);
    const y = Math.floor((vertices[at + 1] - minimum[1]) / step);
    const z = Math.floor((vertices[at + 2] - minimum[2]) / step);
    const key = (x * dimensions[1] + y) * dimensions[2] + z;
    let index = cells.get(key);
    if (index === undefined) { index = cells.size; cells.set(key, index); }
    remap[i] = index;
    ++uses[index];
    for (let axis = 0; axis < 3; ++axis) sums[index * 3 + axis] += vertices[at + axis];
  }
  if (cells.size < 3) return null;
  if (cells.size === remap.length) return mesh;

  const simplified = new Float32Array(cells.size * 3);
  for (let index = 0; index < cells.size; ++index) {
    for (let axis = 0; axis < 3; ++axis) simplified[index * 3 + axis] = sums[index * 3 + axis] / uses[index];
  }
  const reduced = new Uint32Array(indices.length), seen = new Set();
  const numeric = Number.isSafeInteger(cells.size ** 3);
  let length = 0;
  for (let at = 0; at < indices.length; at += 3) {
    const a = remap[indices[at]], b = remap[indices[at + 1]], c = remap[indices[at + 2]];
    if (a === b || a === c || b === c) continue;
    const low = Math.min(a, b, c), high = Math.max(a, b, c), middle = a + b + c - low - high;
    const key = numeric ? (low * cells.size + middle) * cells.size + high : `${low},${middle},${high}`;
    if (seen.has(key)) continue;
    seen.add(key);
    reduced[length++] = a; reduced[length++] = b; reduced[length++] = c;
  }
  return length ? { vertices: simplified, indices: reduced.slice(0, length) } : null;
}

function applyBudget(variants, budget, spacing) {
  const original = variants.reduce((sum, { mesh, uses }) => sum + mesh.indices.length / 3 * uses, 0);
  let step = original > budget ? spacing : 0;
  for (let pass = 0; pass < 8; ++pass) {
    let total = 0;
    for (const variant of variants) {
      const mesh = variant.mesh;
      variant.geometry = step ? simplifyMesh(mesh, step / variant.scale) : mesh;
      if (variant.geometry) total += variant.geometry.indices.length / 3 * variant.uses;
    }
    if (total <= budget) return true;
    step *= Math.max(1.35, Math.sqrt(total / budget));
  }
  return false;
}

function extendBounds(instance, bounds) {
  const { transform, variant: { mesh } } = instance;
  const center = [];
  for (let row = 0; row < 3; ++row) {
    let min = transform[row * 4 + 3], max = min;
    for (let column = 0; column < 3; ++column) {
      const factor = transform[row * 4 + column];
      const a = factor * mesh.minimum[column], b = factor * mesh.maximum[column];
      min += Math.min(a, b);
      max += Math.max(a, b);
    }
    if (!finite(min) || !finite(max) || Math.max(Math.abs(min), Math.abs(max)) > 1e8) return null;
    bounds.minimum[row] = Math.min(bounds.minimum[row], min);
    bounds.maximum[row] = Math.max(bounds.maximum[row], max);
    center[row] = (min + max) * .5;
  }
  return center;
}

function overviewBounds(drawables, bounds) {
  const focusMinimum = [], focusMaximum = [];
  for (let axis = 0; axis < 3; ++axis) {
    const centers = drawables.map(item => item.center[axis]).sort((a, b) => a - b);
    const last = centers.length - 1;
    const low = centers[Math.floor(last * .05)], high = centers[Math.ceil(last * .95)];
    const margin = Math.max(800, (high - low) * .18);
    focusMinimum[axis] = Math.max(bounds.minimum[axis], low - margin);
    focusMaximum[axis] = Math.min(bounds.maximum[axis], high + margin);
  }
  const span = (minimum, maximum) => Math.hypot(...maximum.map((value, axis) => value - minimum[axis]));
  // Far boundary meshes should not pull the overview camera away from the playable scene.
  return span(bounds.minimum, bounds.maximum) > 1.6 * span(focusMinimum, focusMaximum) ?
    { focusMinimum, focusMaximum } : {};
}

function makePages(model) {
  const variants = model.meshes.flatMap(mesh => [...mesh.variants.values()]);
  if (!applyBudget(variants.filter(v => !v.mesh.terrain), structureBudget, 100) ||
      !applyBudget(variants.filter(v => v.mesh.terrain), terrainBudget, 240)) return null;

  const bounds = emptyBounds(), drawn = [];
  let total = 0, terrain = 0;
  for (const instance of model.instances) {
    if (!instance.variant.geometry) continue;
    const center = extendBounds(instance, bounds);
    if (!center) return null;
    const triangles = instance.variant.geometry.indices.length / 3;
    total += triangles;
    if (instance.variant.mesh.terrain) terrain += triangles;
    drawn.push({ ...instance, center, tileX: Math.floor(center[0] / 16000), tileY: Math.floor(center[1] / 16000) });
  }
  if (!total || total > structureBudget + terrainBudget) return null;
  const overview = overviewBounds(drawn, bounds);
  const minimum = overview.focusMinimum || bounds.minimum, maximum = overview.focusMaximum || bounds.maximum;
  const origin = minimum.map((value, axis) => (value + maximum[axis]) * .5);
  drawn.sort((a, b) => a.tileX - b.tileX || a.tileY - b.tileY);
  const pages = [];
  let vertices, at = 0, remaining = total;
  for (const { transform, variant } of drawn) {
    const geometry = variant.geometry;
    for (let index = 0; index < geometry.indices.length; index += 3) {
      if (!vertices || at === vertices.length) {
        const count = Math.min(remaining, trianglesPerPage);
        vertices = new Float32Array(count * 9);
        pages.push(vertices);
        at = 0;
        remaining -= count;
      }
      for (let corner = 0; corner < 3; ++corner) {
        const value = geometry.indices[index + corner] * 3;
        const x = geometry.vertices[value], y = geometry.vertices[value + 1], z = geometry.vertices[value + 2];
        for (let row = 0; row < 3; ++row) {
          const r = row * 4;
          vertices[at++] = (transform[r] * x + transform[r + 1] * y + transform[r + 2] * z + transform[r + 3] - origin[row]) * .01;
        }
      }
    }
  }
  return { ...bounds, ...overview, origin, total, terrain, pages };
}

globalThis.onmessage = async ({ data: { url, map } }) => {
  if (!map || ![map.offset, map.bytes, map.expanded, map.crc].every(Number.isSafeInteger) ||
      map.offset < 0 || map.bytes <= 0 || map.expanded < headerBytes || map.expanded > maxModelBytes) {
    postMessage({ error: '3D 地图索引无效' });
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const bytes = await readMember(url, map, controller.signal);
    if (!bytes) { postMessage({ error: '3D 地图分段不完整或校验失败' }); return; }
    postMessage({ progress: '正在整理 3D 几何…' });
    const model = readModel(bytes);
    const scene = model && makePages(model);
    if (!scene) { postMessage({ error: '3D 地图几何无法加载' }); return; }
    postMessage({ scene }, scene.pages.map(page => page.buffer));
  } catch (_) {
    postMessage({ error: controller.signal.aborted ? '3D 地图下载超时，可重试' : '3D 地图暂不可用，可重试' });
  } finally {
    clearTimeout(timeout);
  }
};
