import fs from "node:fs";
import { PNG } from "pngjs";

const png = PNG.sync.read(fs.readFileSync("tmp/ref-cust.png"));
const { width: W, height: H, data } = png;
const px = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };

// Vertical edge strength: for each x, count rows where color changes sharply across x
const vEdge = new Array(W).fill(0);
for (let x = 3; x < W; x++) {
  let c = 0;
  for (let y = 95; y < 795; y += 2) {
    const a = px(x, y), b = px(x - 3, y);
    if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 18) c++;
  }
  vEdge[x] = c;
}
const peaks = [];
for (let x = 3; x < W; x++) {
  if (vEdge[x] > 150 && vEdge[x] >= vEdge[x - 1] && vEdge[x] >= vEdge[x + 1] && vEdge[x] > vEdge[x - 3] && vEdge[x] > vEdge[x + 3]) peaks.push([x, vEdge[x]]);
}
console.log("vertical edge peaks (x, strength):", peaks.map(([x, s]) => `${x}:${s}`).join(" "));

// Horizontal edge strength
const hEdge = new Array(H).fill(0);
for (let y = 3; y < H; y++) {
  let c = 0;
  for (let x = 360; x < 1795; x += 2) {
    const a = px(x, y), b = px(x, y - 3);
    if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 18) c++;
  }
  hEdge[y] = c;
}
const hpeaks = [];
for (let y = 3; y < H; y++) {
  if (hEdge[y] > 250 && hEdge[y] >= hEdge[y - 1] && hEdge[y] >= hEdge[y + 1]) hpeaks.push([y, hEdge[y]]);
}
console.log("horizontal edge peaks (y, strength):", hpeaks.map(([y, s]) => `${y}:${s}`).join(" "));

// Photo regions: saturated pixel clustering (photos of food)
const satSet = [];
for (let y = 90; y < H; y += 4) for (let x = 352; x < 1800; x += 4) {
  const [r, g, b] = px(x, y);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx - mn > 60 && mx > 90) satSet.push([x, y]);
}
// cluster by grid cells 20px then merge bboxes of nearby clusters
const cells = new Map();
for (const [x, y] of satSet) {
  const k = `${Math.floor(x / 30)},${Math.floor(y / 30)}`;
  cells.set(k, (cells.get(k) || 0) + 1);
}
// flood-fill clusters of occupied cells
const occ = new Set(cells.keys());
const seen = new Set();
const clusters = [];
for (const k of occ) {
  if (seen.has(k)) continue;
  const stack = [k]; seen.add(k);
  let minx = 1e9, maxx = -1, miny = 1e9, maxy = -1, n = 0;
  while (stack.length) {
    const cur = stack.pop();
    const [cx, cy] = cur.split(",").map(Number);
    minx = Math.min(minx, cx); maxx = Math.max(maxx, cx);
    miny = Math.min(miny, cy); maxy = Math.max(maxy, cy); n++;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const nk = `${cx + dx},${cy + dy}`;
      if (occ.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(nk); }
    }
  }
  if (n > 4) clusters.push({ x: minx * 30, y: miny * 30, w: (maxx - minx + 1) * 30, h: (maxy - miny + 1) * 30, cells: n });
}
clusters.sort((a, b) => a.y - b.y || a.x - b.x);
console.log("\nphoto-like clusters:");
for (const c of clusters) console.log(`  x=${c.x} y=${c.y} w=${c.w} h=${c.h} cells=${c.cells}`);
