import { readFileSync } from "node:fs";
import { Template } from "e2b";
import {
  ALMA_BUILDER_WORKDIR,
  createAlmaBuilderTemplate,
} from "./template.mjs";

const template = createAlmaBuilderTemplate();
const templateSource = readFileSync(
  new URL("./template.mjs", import.meta.url),
  "utf8",
);
const renderedJson = await Template.toJSON(template, false);
const renderedDockerfile = Template.toDockerfile(template);
const combined = `${templateSource}\n${renderedJson}\n${renderedDockerfile}`;
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
  "setUser",
  "user",
  "waitForFile",
  "/tmp/alma-builder-ready",
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

if (failed) process.exit(1);

console.log("ALMA Builder E2B template smoke checks passed.");
