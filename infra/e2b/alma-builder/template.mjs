import { Template, waitForFile } from "e2b";
import { resolveAlmaBuilderTemplateContext } from "./template-context.mjs";

export const ALMA_BUILDER_TEMPLATE_NAME = "alma-builder-node-lts";
export const ALMA_BUILDER_WORKDIR = "/workspace/project";
export const ALMA_BUILDER_CODEX_VERSION = "0.144.6";
export const ALMA_BUILDER_READY_FILE = "/tmp/alma-builder-ready";
export const ALMA_BUILDER_START_COMMAND =
  "bash -lc 'mkdir -p /workspace/project && touch /tmp/alma-builder-ready && sleep infinity'";

export function createAlmaBuilderTemplate() {
  const context = resolveAlmaBuilderTemplateContext(import.meta.url);
  return Template({
    fileContextPath: context.fileContextPath,
    fileIgnorePatterns: [
      ".env",
      ".env.*",
      ".git",
      "node_modules",
      ".next",
      "dist",
      "coverage",
    ],
  })
    .fromNodeImage("22")
    .aptInstall(["git", "curl", "ca-certificates", "build-essential"])
    .runCmd(`npm install -g @openai/codex@${ALMA_BUILDER_CODEX_VERSION}`, {
      user: "root",
    })
    .makeDir(ALMA_BUILDER_WORKDIR, { mode: 0o755, user: "root" })
    .copy("smoke-check.sh", "/usr/local/bin/alma-builder-smoke", {
      mode: 0o755,
      user: "root",
    })
    .runCmd(
      "chown -R user:user /workspace/project && chown root:root /usr/local/bin/alma-builder-smoke",
      { user: "root" },
    )
    .setWorkdir(ALMA_BUILDER_WORKDIR)
    .setUser("user")
    .setStartCmd(
      ALMA_BUILDER_START_COMMAND,
      waitForFile(ALMA_BUILDER_READY_FILE),
    );
}
