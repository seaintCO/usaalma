const mode = process.argv.includes("--loop")
  ? "loop"
  : process.argv.includes("--once")
    ? "once"
    : "unknown";

const report = {
  ok: false,
  code: "BUILDER_RUNTIME_WIRING_BLOCKED",
  mode,
  message:
    "The Builder worker entrypoint is intentionally blocked until Codex edits can be proven to target the same remote E2B filesystem used for validation and preview.",
  boundary:
    "Current Engine 1 wiring provisions E2B for commands, but the Codex SDK working directory is a local ALMA worker filesystem path.",
  nextSteps: [
    "Implement a remote filesystem bridge where all Codex reads and writes target E2B files APIs, or replace the coding provider with one that natively operates inside the E2B workspace.",
    "Keep controller credentials out of generated commands and generated project files.",
    "Add starter transfer, artifact manifest/checksum storage, and cleanup-state persistence before enabling live builds.",
  ],
};

console.error(JSON.stringify(report, null, 2));
process.exit(1);
