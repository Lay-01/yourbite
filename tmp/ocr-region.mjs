import { createWorker } from "tesseract.js";

const img = process.argv[2] || "tmp/ref.png";
const regions = JSON.parse(process.argv[3]); // [{name, left, top, width, height}]

const worker = await createWorker("eng");
for (const r of regions) {
  const { data } = await worker.recognize(img, {}, { rectangle: { left: r.left, top: r.top, width: r.width, height: r.height } });
  console.log(`\n===== ${r.name} (${r.left},${r.top} ${r.width}x${r.height}) =====`);
  console.log(data.text.trim());
}
await worker.terminate();
