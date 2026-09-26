import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendScripts = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(backendScripts, "../..");
const children = [
  spawn(process.execPath, [path.join(root, "backend/server/index.js")], { cwd: root, stdio: "inherit" }),
  spawn(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "--config", "frontend/vite.config.js"], {
    cwd: root,
    stdio: "inherit",
  }),
];

let stopping = false;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill();
  process.exitCode = code;
};

for (const child of children) {
  child.on("error", (error) => {
    console.error("Failed to start a development process:", error.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping && code !== 0) stop(code || 1);
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));