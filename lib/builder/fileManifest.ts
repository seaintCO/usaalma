import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const EXCLUDED_SEGMENTS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".cache",
]);

const EXCLUDED_FILENAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".npmrc",
  ".yarnrc",
]);

export type BuilderManifestFile = {
  relativePath: string;
  sizeBytes: number;
  checksumSha256: string;
};

export type BuilderManifest = {
  files: BuilderManifestFile[];
  totalBytes: number;
  checksumSha256: string;
};

export class BuilderFileManifestError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "path_traversal"
      | "symlink_escape"
      | "excluded_path"
      | "too_many_files"
      | "too_large",
  ) {
    super(message);
    this.name = "BuilderFileManifestError";
  }
}

export function normalizeBuilderRelativePath(value: string) {
  const normalized = value.replaceAll("\\", "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new BuilderFileManifestError(
      "Builder path escapes the project root.",
      "path_traversal",
    );
  }
  return normalized;
}

export function isBuilderPathExcluded(relativePath: string) {
  const normalized = normalizeBuilderRelativePath(relativePath);
  const parts = normalized.split("/");
  if (parts.some((part) => EXCLUDED_SEGMENTS.has(part))) return true;
  const filename = parts[parts.length - 1]?.toLowerCase() ?? "";
  if (EXCLUDED_FILENAMES.has(filename)) return true;
  if (filename.startsWith(".env.")) return true;
  if (
    filename.includes("secret") ||
    filename.includes("private-key") ||
    filename.endsWith(".pem") ||
    filename.endsWith(".key")
  ) {
    return true;
  }
  return false;
}

export function sha256Bytes(bytes: Buffer | Uint8Array | string) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function assertWithinRoot(root: string, candidate: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (
    resolvedCandidate !== resolvedRoot &&
    !resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new BuilderFileManifestError(
      "Builder path escapes the project root.",
      "path_traversal",
    );
  }
}

export function collectLocalBuilderFiles(input: {
  root: string;
  maxFiles: number;
  maxBytes: number;
}) {
  const files: Array<BuilderManifestFile & { absolutePath: string }> = [];
  let totalBytes = 0;
  const root = path.resolve(input.root);

  function walk(directory: string) {
    assertWithinRoot(root, directory);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      assertWithinRoot(root, absolutePath);
      const relativePath = normalizeBuilderRelativePath(
        path.relative(root, absolutePath),
      );
      if (isBuilderPathExcluded(relativePath)) continue;
      const stat = lstatSync(absolutePath);
      if (stat.isSymbolicLink()) {
        throw new BuilderFileManifestError(
          "Builder starter contains a symlink.",
          "symlink_escape",
        );
      }
      if (stat.isDirectory()) {
        walk(absolutePath);
        continue;
      }
      if (!stat.isFile()) continue;
      totalBytes += stat.size;
      if (files.length + 1 > input.maxFiles) {
        throw new BuilderFileManifestError(
          "Builder file count limit exceeded.",
          "too_many_files",
        );
      }
      if (totalBytes > input.maxBytes) {
        throw new BuilderFileManifestError(
          "Builder byte limit exceeded.",
          "too_large",
        );
      }
      files.push({
        absolutePath,
        relativePath,
        sizeBytes: stat.size,
        checksumSha256: sha256Bytes(readFileSync(absolutePath)),
      });
    }
  }

  walk(root);
  return createBuilderManifest(files);
}

export function createBuilderManifest(files: BuilderManifestFile[]) {
  const ordered = [...files].sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath),
  );
  const totalBytes = ordered.reduce((sum, file) => sum + file.sizeBytes, 0);
  const checksumSha256 = sha256Bytes(
    ordered
      .map(
        (file) =>
          `${file.relativePath}\0${file.sizeBytes}\0${file.checksumSha256}`,
      )
      .join("\n"),
  );
  return { files: ordered, totalBytes, checksumSha256 };
}
