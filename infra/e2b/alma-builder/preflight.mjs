import { accessSync, constants } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ALMA_BUILDER_READY_FILE,
  ALMA_BUILDER_START_COMMAND,
  createAlmaBuilderTemplate,
} from "./template.mjs";
import {
  isPathInside,
  REQUIRED_TEMPLATE_FILES,
  resolveAlmaBuilderTemplateContext,
  toNativeModuleDirectory,
} from "./template-context.mjs";

function assert(condition, code, message) {
  if (!condition) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }
}

function verifyPathHandling(context) {
  assert(
    path.isAbsolute(context.fileContextPath),
    "ALMA_BUILDER_TEMPLATE_CONTEXT_NOT_ABSOLUTE",
    "fileContextPath must be a native absolute path.",
  );
  assert(
    !/^\/[A-Za-z]:\//.test(context.fileContextPath.replaceAll("\\", "/")),
    "ALMA_BUILDER_TEMPLATE_CONTEXT_URL_PATH",
    "fileContextPath must not use URL pathname form on Windows.",
  );

  const roundTrip = toNativeModuleDirectory(
    pathToFileURL(path.join(context.fileContextPath, "template.mjs")).href,
  );
  assert(
    path.resolve(roundTrip) === path.resolve(context.fileContextPath),
    "ALMA_BUILDER_TEMPLATE_FILE_URL_ROUNDTRIP_FAILED",
    "fileURLToPath must round-trip the native template context path.",
  );

  const posixRelative = path.posix.relative(
    "/tmp/alma-builder",
    "/tmp/alma-builder/smoke-check.sh",
  );
  assert(
    posixRelative === "smoke-check.sh",
    "ALMA_BUILDER_TEMPLATE_POSIX_PATH_CHECK_FAILED",
    "POSIX path containment check failed.",
  );

  const windowsRelative = path.win32.relative(
    "C:\\alma\\infra\\e2b\\alma-builder",
    "C:\\alma\\infra\\e2b\\alma-builder\\smoke-check.sh",
  );
  assert(
    windowsRelative === "smoke-check.sh",
    "ALMA_BUILDER_TEMPLATE_WINDOWS_PATH_CHECK_FAILED",
    "Windows path containment check failed.",
  );

  assert(
    isPathInside(
      "C:\\alma\\infra\\e2b\\alma-builder\\smoke-check.sh",
      "C:\\alma\\infra\\e2b\\alma-builder",
      path.win32,
    ),
    "ALMA_BUILDER_TEMPLATE_WINDOWS_CONTAINMENT_FAILED",
    "Windows path containment check failed.",
  );
  assert(
    isPathInside(
      "/tmp/alma-builder/smoke-check.sh",
      "/tmp/alma-builder",
      path.posix,
    ),
    "ALMA_BUILDER_TEMPLATE_POSIX_CONTAINMENT_FAILED",
    "POSIX path containment check failed.",
  );
}

function verifyRequiredFiles(context) {
  for (const file of REQUIRED_TEMPLATE_FILES) {
    const resolved = context.files[file];
    assert(
      resolved,
      "ALMA_BUILDER_TEMPLATE_FILE_MISSING",
      `${file} was not resolved in the template context.`,
    );
    assert(
      isPathInside(resolved, context.fileContextPath),
      "ALMA_BUILDER_TEMPLATE_FILE_OUTSIDE_CONTEXT",
      `${file} resolves outside the template context.`,
    );
    accessSync(resolved, constants.R_OK);
  }
  assert(
    context.smokeScriptPath === context.files["smoke-check.sh"],
    "ALMA_BUILDER_TEMPLATE_SMOKE_SCRIPT_MISMATCH",
    "smoke-check.sh path did not match the resolved required file.",
  );
}

function verifyStartReadinessContract() {
  assert(
    ALMA_BUILDER_READY_FILE === "/tmp/alma-builder-ready",
    "ALMA_BUILDER_TEMPLATE_READY_FILE_CHANGED",
    "waitForFile must watch /tmp/alma-builder-ready.",
  );
  assert(
    ALMA_BUILDER_START_COMMAND.includes("touch /tmp/alma-builder-ready"),
    "ALMA_BUILDER_TEMPLATE_START_COMMAND_READY_FILE_MISSING",
    "start command must create /tmp/alma-builder-ready.",
  );
  assert(
    ALMA_BUILDER_START_COMMAND.includes("sleep infinity"),
    "ALMA_BUILDER_TEMPLATE_START_COMMAND_NOT_LONG_RUNNING",
    "start command must keep the sandbox alive intentionally.",
  );
}

try {
  const context = resolveAlmaBuilderTemplateContext(import.meta.url);
  verifyPathHandling(context);
  verifyRequiredFiles(context);
  verifyStartReadinessContract();
  createAlmaBuilderTemplate();
  console.log(
    JSON.stringify(
      {
        ok: true,
        code: "ALMA_BUILDER_TEMPLATE_PREFLIGHT_PASSED",
        fileContextPath: context.fileContextPath,
        smokeScriptPath: context.smokeScriptPath,
        requiredFiles: REQUIRED_TEMPLATE_FILES,
        readyFile: ALMA_BUILDER_READY_FILE,
        cloudBuildStarted: false,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        code: error?.code ?? "ALMA_BUILDER_TEMPLATE_PREFLIGHT_FAILED",
        name: error?.name ?? "Error",
        message:
          error?.message ?? "ALMA Builder E2B template preflight failed.",
        cause: error?.cause
          ? {
              name: error.cause.name,
              code: error.cause.code,
              message: error.cause.message,
            }
          : undefined,
        cloudBuildStarted: false,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
