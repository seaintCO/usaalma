import { Sandbox, type CommandResult } from "e2b";
import type {
  BuilderProviderResult,
  BuilderProviderSessionRef,
  CodingAgentProvider,
} from "@/lib/builder/providers";
import { redactBuilderSecrets } from "@/lib/builder/redaction";
import {
  BUILDER_CODEX_HOME,
  BUILDER_RUNTIME_LIMITS,
  BUILDER_SANDBOX_PROJECT_DIR,
  BUILDER_SANDBOX_TMP_DIR,
} from "@/lib/builder/runtime";

function notConfigured(summary: string): BuilderProviderResult<never> {
  return {
    status: "blocked",
    code: "BUILDER_CODING_PROVIDER_NOT_CONFIGURED",
    summary,
  };
}

function commandResult(result: CommandResult) {
  return {
    stdout: redactBuilderSecrets(result.stdout, 2500),
    stderr: redactBuilderSecrets(result.stderr || result.error || "", 2500),
    exitCode: result.exitCode,
  };
}

function isCompletedCommandResult(
  result: CommandResult | { exitCode?: number },
): result is CommandResult {
  return typeof result.exitCode === "number";
}

export function createBuilderEngineeringPrompt(input: {
  projectId: string;
  prompt: string;
  language: "en" | "es";
  starter?: string;
  repairInstructions?: string;
}) {
  return `
You are ALMA Builder Engine 1.2 running inside an isolated E2B sandbox.

Project root: ${BUILDER_SANDBOX_PROJECT_DIR}
Project ID: ${input.projectId}
Preferred language: ${input.language}
Starter: ${input.starter ?? "ALMA starter"}

Customer request:
${input.prompt}

${input.repairInstructions ? `Repair instructions:\n${input.repairInstructions}\n` : ""}
Acceptance criteria:
- Build or edit only files under ${BUILDER_SANDBOX_PROJECT_DIR}.
- Preserve a working Next.js application.
- Keep the app usable on mobile and desktop.
- Do not read, request, print, or write credentials.
- Do not access ALMA source code, other projects, or parent directories.
- Do not install system packages, configure external services, deploy, create repositories, or start tunnels.
- Do not add MCP servers or modify global Codex configuration.
- Do not bypass approvals.
- Use existing project dependencies where possible.
- Leave a concise summary of changes and any remaining validation failures.
`.trim();
}

function codexConfig(input: { gatewayUrl: string; model: string }) {
  return `
model = "${input.model}"
model_provider = "alma_builder_gateway"
approval_policy = "never"
sandbox_mode = "workspace-write"
disable_response_storage = true
show_raw_agent_reasoning = false

[model_providers.alma_builder_gateway]
name = "ALMA Builder Gateway"
base_url = "${input.gatewayUrl.replace(/\/+$/, "")}/v1"
env_key = "ALMA_BUILDER_GATEWAY_TOKEN"
wire_api = "responses"

[mcp_servers]
`.trim();
}

export class CodexCodingProvider implements CodingAgentProvider {
  async startSession(input: {
    projectId: string;
    prompt: string;
    language: "en" | "es";
    workingDirectory?: string;
    starter?: string;
    sandboxId?: string;
    gatewayToken?: string;
    gatewayUrl?: string;
    model?: string;
    repairInstructions?: string;
  }): Promise<BuilderProviderResult<BuilderProviderSessionRef>> {
    if (!process.env.E2B_API_KEY) {
      return notConfigured("Builder coding requires E2B_API_KEY.");
    }
    if (!input.sandboxId) {
      return notConfigured("Builder coding requires an E2B sandbox ID.");
    }
    if (!input.gatewayToken || !input.gatewayUrl || !input.model) {
      return notConfigured(
        "Builder coding requires a short-lived gateway token, gateway URL, and model.",
      );
    }
    const workingDirectory =
      input.workingDirectory ?? BUILDER_SANDBOX_PROJECT_DIR;
    if (workingDirectory !== BUILDER_SANDBOX_PROJECT_DIR) {
      return notConfigured(
        "Builder coding is limited to the E2B project directory.",
      );
    }
    try {
      const sandbox = await Sandbox.connect(input.sandboxId, {
        apiKey: process.env.E2B_API_KEY,
      });
      await sandbox.files.makeDir(BUILDER_SANDBOX_TMP_DIR, { user: "user" });
      await sandbox.files.makeDir(BUILDER_CODEX_HOME, { user: "user" });
      await sandbox.files.write(
        `${BUILDER_SANDBOX_TMP_DIR}/gateway-token`,
        input.gatewayToken,
        { user: "user" },
      );
      await sandbox.files.write(
        `${BUILDER_SANDBOX_TMP_DIR}/prompt.txt`,
        createBuilderEngineeringPrompt(input),
        { user: "user" },
      );
      await sandbox.files.write(
        `${BUILDER_CODEX_HOME}/config.toml`,
        codexConfig({ gatewayUrl: input.gatewayUrl, model: input.model }),
        { user: "user" },
      );
      await sandbox.files.write(
        `${BUILDER_SANDBOX_TMP_DIR}/codex-auth-helper.sh`,
        "#!/usr/bin/env bash\nset -euo pipefail\ncat /tmp/alma-builder/gateway-token\n",
        { user: "user" },
      );
      await sandbox.commands.run(
        `chmod 700 ${BUILDER_SANDBOX_TMP_DIR} ${BUILDER_CODEX_HOME} && chmod 600 ${BUILDER_SANDBOX_TMP_DIR}/gateway-token ${BUILDER_CODEX_HOME}/config.toml && chmod 700 ${BUILDER_SANDBOX_TMP_DIR}/codex-auth-helper.sh`,
        { cwd: BUILDER_SANDBOX_PROJECT_DIR, user: "user", timeoutMs: 10_000 },
      );
      const command = [
        "bash",
        "-lc",
        `"ALMA_BUILDER_GATEWAY_TOKEN=\\"$(${BUILDER_SANDBOX_TMP_DIR}/codex-auth-helper.sh)\\" CODEX_HOME=${BUILDER_CODEX_HOME} codex exec --json --ephemeral --ignore-user-config --ignore-rules --skip-git-repo-check --cd ${BUILDER_SANDBOX_PROJECT_DIR} --sandbox workspace-write --ask-for-approval never -m ${input.model} - < ${BUILDER_SANDBOX_TMP_DIR}/prompt.txt; status=$?; rm -f ${BUILDER_SANDBOX_TMP_DIR}/gateway-token ${BUILDER_SANDBOX_TMP_DIR}/prompt.txt; exit $status"`,
      ].join(" ");
      const result = await sandbox.commands.run(command, {
        cwd: BUILDER_SANDBOX_PROJECT_DIR,
        user: "user",
        timeoutMs: BUILDER_RUNTIME_LIMITS.maxCodexRuntimeMs,
        envs: {
          CODEX_HOME: BUILDER_CODEX_HOME,
          HOME: "/home/user",
        },
      });
      if (!isCompletedCommandResult(result) || result.exitCode !== 0) {
        return {
          status: "retryable_failure",
          code: "BUILDER_PROVIDER_RETRYABLE",
          summary:
            commandResult(result as CommandResult).stderr ||
            "Codex failed inside the Builder sandbox.",
        };
      }
      return {
        status: "success",
        data: {
          providerSessionId: input.sandboxId,
          providerJobId: input.projectId,
          summary: commandResult(result).stdout,
        },
      };
    } catch {
      return {
        status: "retryable_failure",
        code: "BUILDER_PROVIDER_RETRYABLE",
        summary: "Codex could not complete inside the Builder sandbox.",
      };
    }
  }
}
