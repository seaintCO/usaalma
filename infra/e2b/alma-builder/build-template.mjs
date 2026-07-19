import { Template, defaultBuildLogger } from "e2b";
import {
  ALMA_BUILDER_TEMPLATE_NAME,
  createAlmaBuilderTemplate,
} from "./template.mjs";

if (!process.env.E2B_API_KEY) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        code: "E2B_TEMPLATE_BUILD_NOT_CONFIGURED",
        message:
          "E2B_API_KEY is required to build the ALMA Builder template. No cloud build was started.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const build = await Template.build(
  createAlmaBuilderTemplate(),
  ALMA_BUILDER_TEMPLATE_NAME,
  {
    cpuCount: 2,
    memoryMB: 4096,
    onBuildLogs: defaultBuildLogger(),
  },
);

console.log(
  JSON.stringify(
    {
      ok: true,
      name: ALMA_BUILDER_TEMPLATE_NAME,
      templateId: build.templateId,
      buildId: build.buildId,
      status: build.status,
    },
    null,
    2,
  ),
);
