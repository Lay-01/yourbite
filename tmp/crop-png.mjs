import fs from "node:fs";
import { PNG } from "pngjs";

// usage: node crop-png.mjs <src> <dst> <x> <y> <w> <h> [scale]
const [src, dst, X, Y, CW, CH] = process.argv.slice(2);
const scale = Number(process.argv[7] || 1);
const png = PNG.sync.read(fs.readFileSync(src));
const out = new PNG({ width: CW * scale, height: CH * scale });
for (let y = 0; y < CH * scale; y++) {
  for (let x = 0; x < CW * scale; x++) {
    const sx = +X + Math.floor(x / scale), sy = +Y + Math.floor(y / scale);
    const si = (sy * png.width + sx) * 4, di = (y * out.width + x) * 4;
    out.data[di] = png.data[si]; out.data[di + 1] = png.data[si + 1];
    out.data[di + 2] = png.data[si + 2]; out.data[di + 3] = png.data[si + 3];
  }
}
fs.writeFileSync(dst, PNG.sync.write(out));
console.log(`wrote ${dst} ${out.width}x${out.height}`);
