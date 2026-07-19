import { readFileSync } from "node:fs";
import path from "node:path";
import { Template } from "e2b";
import {
  ALMA_BUILDER_READY_FILE,
  ALMA_BUILDER_START_COMMAND,
  ALMA_BUILDER_WORKDIR,
  createAlmaBuilderTemplate,
} from "./template.mjs";
import { resolveAlmaBuilderTemplateContext } from "./template-context.mjs";

const context = resolveAlmaBuilderTemplateContext(import.meta.url);
const template = createAlmaBuilderTemplate();
const templateSource = readFileSync(
  new URL("./template.mjs", import.meta.url),
  "utf8",
);
const templateContextSource = readFileSync(
  new URL("./template-context.mjs", import.meta.url),
  "utf8",
);
const renderedJson = await Template.toJSON(template, false);
const renderedDockerfile = Template.toDockerfile(template);
const combined = `${templateSource}\n${templateContextSource}\n${renderedJson}\n${renderedDockerfile}`;
const smokeScript = readFileSync(
  new URL("./smoke-check.sh", import.meta.url),
  "utf8",
);

const required = [
  ALMA_BUILDER_WORKDIR,
  "fromNodeImage",
  "build-essential",
  "@openai/codex@0.144.6",
  "alma-builder-smoke",
  "fileURLToPath",
  "resolveAlmaBuilderTemplateContext",
  "setUser",
  "user",
  "waitForFile",
  ALMA_BUILDER_READY_FILE,
];
const forbidden = [
  "OPENAI_API_KEY",
  "CODEX_API_KEY",
  "E2B_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GITHUB_APP_PRIVATE_KEY",
  "STRIPE_SECRET_KEY",
];

let failed = false;
for (const needle of required) {
  if (!combined.includes(needle)) {
    console.error(`template missing required marker: ${needle}`);
    failed = true;
  }
}
for (const needle of forbidden) {
  if (combined.includes(needle)) {
    console.error(`template contains forbidden secret marker: ${needle}`);
    failed = true;
  }
}
for (const needle of forbidden) {
  if (!smokeScript.includes(needle) && needle !== "STRIPE_SECRET_KEY") {
    console.error(`smoke script does not check secret marker: ${needle}`);
    failed = true;
  }
}
if (!path.isAbsolute(context.fileContextPath)) {
  console.error("template fileContextPath is not a native absolute path");
  failed = true;
}
if (!context.smokeScriptPath.endsWith("smoke-check.sh")) {
  console.error("template smoke script path is not resolved");
  failed = true;
}
if (!ALMA_BUILDER_START_COMMAND.includes(`touch ${ALMA_BUILDER_READY_FILE}`)) {
  console.error("template start command does not create readiness file");
  failed = true;
}
if (!ALMA_BUILDER_START_COMMAND.includes("sleep infinity")) {
  console.error("template start command is not intentionally long-running");
  failed = true;
}

if (failed) process.exit(1);

console.log("ALMA Builder E2B template smoke checks passed.");
