import { Template, defaultBuildLogger } from "e2b";
import {
  ALMA_BUILDER_TEMPLATE_NAME,
  createAlmaBuilderTemplate,
} from "./template.mjs";
import { resolveAlmaBuilderTemplateContext } from "./template-context.mjs";

function serializeError(error) {
  return {
    name: error?.name ?? "Error",
    code: error?.code ?? "ALMA_BUILDER_TEMPLATE_BUILD_FAILED",
    message:
      typeof error?.message === "string" && error.message.trim()
        ? error.message
        : "ALMA Builder E2B template build failed.",
    cause: error?.cause
      ? {
          name: error.cause.name ?? "Error",
          code: error.cause.code,
          message: error.cause.message,
        }
      : undefined,
  };
}

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

try {
  const context = resolveAlmaBuilderTemplateContext(import.meta.url);
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
        fileContextPath: context.fileContextPath,
        templateId: build.templateId,
        buildId: build.buildId,
        status: build.status,
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
        stage: "alma_builder_e2b_template_build",
        error: serializeError(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
