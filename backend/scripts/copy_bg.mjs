import fs from "node:fs/promises";
import path from "node:path";

const src = "C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\f5b24e5b-cdfd-4cec-b1a8-21458a7012d3\\login_bg_restaurant_1790462579662.png";
const destDir = "d:\\webcop\\cafeqr\\frontend\\public";
const dest = path.join(destDir, "login_bg.png");

try {
  await fs.mkdir(destDir, { recursive: true });
  await fs.copyFile(src, dest);
  console.log("Background image copied successfully to", dest);
} catch (err) {
  console.error("Failed to copy background image:", err.message);
}
