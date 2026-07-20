import { Sandbox } from "e2b";

const CONFIRM = "run-one-e2b-smoke";
const maxRuntimeMs = 5 * 60 * 1000;

function fail(code, message) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        code,
        message,
        paidExternalOperation: true,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

if (process.env.ALMA_BUILDER_LIVE_E2B_CONFIRM !== CONFIRM) {
  fail(
    "ALMA_BUILDER_LIVE_E2B_CONFIRM_REQUIRED",
    `Set ALMA_BUILDER_LIVE_E2B_CONFIRM=${CONFIRM} to run one live E2B smoke check.`,
  );
}

if (!process.env.E2B_API_KEY) {
  fail("E2B_API_KEY_REQUIRED", "E2B_API_KEY is required for live E2B smoke.");
}

const template =
  process.env.ALMA_BUILDER_E2B_TEMPLATE ?? "alma-builder-node-lts";
if (template !== "alma-builder-node-lts") {
  fail(
    "ALMA_BUILDER_TEMPLATE_ALIAS_INVALID",
    "Live smoke expects ALMA_BUILDER_E2B_TEMPLATE=alma-builder-node-lts.",
  );
}

const startedAt = Date.now();
let sandbox;
try {
  sandbox = await Sandbox.create(template, {
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: maxRuntimeMs,
    metadata: {
      alma: "builder-live-smoke",
      purpose: "template-readiness",
    },
  });
  const result = await sandbox.commands.run(
    "/usr/local/bin/alma-builder-smoke",
    {
      timeoutMs: 60_000,
      user: "user",
    },
  );
  if (result.exitCode !== 0) {
    fail(
      "ALMA_BUILDER_LIVE_E2B_SMOKE_FAILED",
      "The live E2B template smoke command failed.",
    );
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        code: "ALMA_BUILDER_LIVE_E2B_SMOKE_PASSED",
        template,
        sandboxCreated: true,
        smokeCommand: "alma-builder-smoke",
        elapsedMs: Date.now() - startedAt,
      },
      null,
      2,
    ),
  );
} finally {
  await sandbox?.kill?.();
}
