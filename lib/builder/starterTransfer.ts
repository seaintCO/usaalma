import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Sandbox } from "e2b";
import { BUILDER_STARTERS } from "./starterTemplates";
import type { BuilderStarterKey } from "./types";
import { collectLocalBuilderFiles, type BuilderManifest } from "./fileManifest";
import { BUILDER_RUNTIME_LIMITS, BUILDER_SANDBOX_PROJECT_DIR } from "./runtime";

const STARTER_ROOT = path.join(process.cwd(), "builder-starters");

export class BuilderStarterTransferError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "starter_not_found"
      | "starter_transfer_failed"
      | "starter_manifest_mismatch",
  ) {
    super(message);
    this.name = "BuilderStarterTransferError";
  }
}

export function getBuilderStarterDirectory(starterKey: BuilderStarterKey) {
  const starter = BUILDER_STARTERS[starterKey];
  const directory = path.join(STARTER_ROOT, starter.directory);
  if (!existsSync(directory)) {
    throw new BuilderStarterTransferError(
      "Builder starter template is missing.",
      "starter_not_found",
    );
  }
  return directory;
}

export async function transferBuilderStarterToSandbox(input: {
  sandbox: Sandbox;
  starterKey: BuilderStarterKey;
}) {
  const root = getBuilderStarterDirectory(input.starterKey);
  const manifest = collectLocalBuilderFiles({
    root,
    maxFiles: BUILDER_RUNTIME_LIMITS.maxStarterFiles,
    maxBytes: BUILDER_RUNTIME_LIMITS.maxStarterBytes,
  });
  await input.sandbox.files.makeDir(BUILDER_SANDBOX_PROJECT_DIR, {
    user: "user",
  });
  await input.sandbox.files.write(
    manifest.files.map((file) => {
      const data = readFileSync(path.join(root, file.relativePath));
      return {
        path: `${BUILDER_SANDBOX_PROJECT_DIR}/${file.relativePath}`,
        data: data.buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength,
        ),
      };
    }),
    { user: "user" },
  );
  await input.sandbox.files.write(
    `${BUILDER_SANDBOX_PROJECT_DIR}/.alma-builder-starter-manifest.json`,
    JSON.stringify(manifest, null, 2),
    { user: "user" },
  );
  return manifest as BuilderManifest;
}
