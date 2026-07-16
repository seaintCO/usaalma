import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = ["app", "components", "lib"];
const extensions = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".json",
  ".md",
]);
const ignoredSegments = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
]);
const ignoredFiles = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
]);

const mojibakePattern = /Ãƒ|Ã‚|Ã¢|ï¿½|�|â€|â€”|â†|Â·|informaciÃ|aquÃ|polÃ|TÃ/;

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoredSegments.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, files);
      continue;
    }
    if (ignoredFiles.has(entry.name)) continue;
    if (extensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

const findings = [];
for (const root of roots) {
  const files = await walk(root);
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (mojibakePattern.test(line)) {
        findings.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }
}

if (findings.length) {
  console.error("Mojibake scan failed:");
  console.error(findings.join("\n"));
  process.exit(1);
}

console.log("Mojibake scan passed.");
