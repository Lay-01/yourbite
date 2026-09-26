import { PNG } from "pngjs";
import fs from "node:fs";

const input = process.argv[2];
const regions = JSON.parse(process.argv[3]);

const png = PNG.sync.read(fs.readFileSync(input));
console.log(`source: ${png.width}x${png.height}`);
for (const r of regions) {
  const out = new PNG({ width: r.width, height: r.height });
  PNG.bitblt(png, out, r.left, r.top, r.width, r.height, 0, 0);
  fs.writeFileSync(`tmp/crop-${r.name}.png`, PNG.sync.write(out));
  console.log(`wrote tmp/crop-${r.name}.png`);
}
