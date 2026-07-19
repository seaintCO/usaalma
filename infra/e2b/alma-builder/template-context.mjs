import { accessSync, constants, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_TEMPLATE_FILES = [
  "template.mjs",
  "build-template.mjs",
  "smoke.mjs",
  "smoke-check.sh",
];

export function isPathInside(child, parent, pathModule = path) {
  const relative = pathModule.relative(parent, child);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !pathModule.isAbsolute(relative))
  );
}

export function toNativeModuleDirectory(moduleUrl) {
  return path.dirname(fileURLToPath(moduleUrl));
}

export class AlmaBuilderTemplateContextError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = "AlmaBuilderTemplateContextError";
    this.code = code;
  }
}

function assertReadableFile(input) {
  const candidate = path.resolve(input.contextPath, input.relativePath);
  let realFile;
  try {
    realFile = realpathSync(candidate);
  } catch (error) {
    throw new AlmaBuilderTemplateContextError(
      "ALMA_BUILDER_TEMPLATE_FILE_MISSING",
      `${input.relativePath} is missing from the ALMA Builder E2B template context.`,
      error,
    );
  }
  if (!isPathInside(realFile, input.realContextPath)) {
    throw new AlmaBuilderTemplateContextError(
      "ALMA_BUILDER_TEMPLATE_FILE_OUTSIDE_CONTEXT",
      `${input.relativePath} resolves outside the ALMA Builder E2B template context.`,
    );
  }
  try {
    accessSync(realFile, constants.R_OK);
  } catch (error) {
    throw new AlmaBuilderTemplateContextError(
      "ALMA_BUILDER_TEMPLATE_FILE_UNREADABLE",
      `${input.relativePath} is not readable from the ALMA Builder E2B template context.`,
      error,
    );
  }
  return realFile;
}

export function resolveAlmaBuilderTemplateContext(moduleUrl = import.meta.url) {
  const contextPath = path.resolve(toNativeModuleDirectory(moduleUrl));
  if (!path.isAbsolute(contextPath)) {
    throw new AlmaBuilderTemplateContextError(
      "ALMA_BUILDER_TEMPLATE_CONTEXT_NOT_ABSOLUTE",
      "ALMA Builder E2B template context must resolve to a native absolute path.",
    );
  }

  let realContextPath;
  try {
    realContextPath = realpathSync(contextPath);
    accessSync(realContextPath, constants.R_OK);
  } catch (error) {
    throw new AlmaBuilderTemplateContextError(
      "ALMA_BUILDER_TEMPLATE_CONTEXT_UNREADABLE",
      "ALMA Builder E2B template context is not readable.",
      error,
    );
  }

  const files = Object.fromEntries(
    REQUIRED_TEMPLATE_FILES.map((relativePath) => [
      relativePath,
      assertReadableFile({
        contextPath,
        realContextPath,
        relativePath,
      }),
    ]),
  );

  const smokeScriptPath = files["smoke-check.sh"];
  if (path.basename(smokeScriptPath) !== "smoke-check.sh") {
    throw new AlmaBuilderTemplateContextError(
      "ALMA_BUILDER_TEMPLATE_SMOKE_SCRIPT_UNSAFE",
      "ALMA Builder E2B smoke script must be named smoke-check.sh.",
    );
  }

  return {
    fileContextPath: realContextPath,
    smokeScriptPath,
    files,
  };
}
