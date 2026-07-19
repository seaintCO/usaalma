import { Template, waitForFile } from "e2b";

export const ALMA_BUILDER_TEMPLATE_NAME = "alma-builder-node-lts";
export const ALMA_BUILDER_WORKDIR = "/home/user/app";

export function createAlmaBuilderTemplate() {
  return Template({
    fileContextPath: new URL(".", import.meta.url).pathname,
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
    .makeDir(ALMA_BUILDER_WORKDIR, { mode: 0o755, user: "root" })
    .copy("smoke-check.sh", "/usr/local/bin/alma-builder-smoke", {
      mode: 0o755,
      user: "root",
    })
    .runCmd(
      "chown -R user:user /home/user/app && chown root:root /usr/local/bin/alma-builder-smoke",
      { user: "root" },
    )
    .setWorkdir(ALMA_BUILDER_WORKDIR)
    .setUser("user")
    .setStartCmd(
      "bash -lc 'mkdir -p /home/user/app && touch /tmp/alma-builder-ready && sleep infinity'",
      waitForFile("/tmp/alma-builder-ready"),
    );
}
