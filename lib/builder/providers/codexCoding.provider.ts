import { Codex } from "@openai/codex-sdk";
import type {
  BuilderProviderResult,
  BuilderProviderSessionRef,
  CodingAgentProvider,
} from "@/lib/builder/providers";
import { redactBuilderSecrets } from "@/lib/builder/redaction";

function notConfigured(): BuilderProviderResult<never> {
  return {
    status: "blocked",
    code: "BUILDER_CODING_PROVIDER_NOT_CONFIGURED",
    summary:
      "Builder coding provider is not configured. Add the server-side Codex/OpenAI credential before running builds.",
  };
}

function notIsolated(): BuilderProviderResult<never> {
  return {
    status: "blocked",
    code: "BUILDER_CODING_PROVIDER_NOT_CONFIGURED",
    summary:
      "Builder coding provider is not enabled until the worker runs inside an isolated Builder workspace.",
  };
}

function remoteFilesystemBridgeUnavailable(): BuilderProviderResult<never> {
  return {
    status: "blocked",
    code: "BUILDER_CODING_PROVIDER_NOT_CONFIGURED",
    summary:
      "Builder coding is blocked because the Codex SDK cannot yet be proven to edit the same remote E2B filesystem used for validation and preview.",
  };
}

function hasRemoteE2BFilesystemBridge() {
  return false;
}

export function createBuilderEngineeringPrompt(input: {
  projectId: string;
  prompt: string;
  language: "en" | "es";
  starter?: string;
}) {
  return `
You are ALMA Builder Engine 1. Work only inside the ALMA-owned starter application directory.

Customer request:
${input.prompt}

Preferred language: ${input.language}
Starter: ${input.starter ?? "ALMA starter"}

Rules:
- Build or edit only the starter Next.js application.
- Do not read, request, print, or write credentials.
- Do not access ALMA application source outside the allowed project directory.
- Do not install system packages, run Docker, or execute customer-provided scripts.
- Preserve starter security, auth boundaries, and environment separation.
- Keep the app usable on mobile and desktop.
- After edits, summarize files changed, validation status, and remaining failures.
`.trim();
}

export class CodexCodingProvider implements CodingAgentProvider {
  async startSession(input: {
    projectId: string;
    prompt: string;
    language: "en" | "es";
    workingDirectory?: string;
    starter?: string;
  }): Promise<BuilderProviderResult<BuilderProviderSessionRef>> {
    if (process.env.ALMA_BUILDER_CODEX_WORKER_ISOLATED !== "true") {
      return notIsolated();
    }
    if (!hasRemoteE2BFilesystemBridge()) {
      return remoteFilesystemBridgeUnavailable();
    }
    if (!process.env.OPENAI_API_KEY && !process.env.CODEX_API_KEY) {
      return notConfigured();
    }
    if (!input.workingDirectory) {
      return {
        status: "permanent_failure",
        code: "BUILDER_PROVIDER_FAILED",
        summary:
          "Builder coding provider requires an isolated working directory.",
      };
    }
    try {
      const codex = new Codex({
        apiKey: process.env.CODEX_API_KEY ?? process.env.OPENAI_API_KEY,
        env: {
          PATH: process.env.PATH ?? "",
          HOME: process.env.HOME ?? "/tmp",
        },
        config: {
          sandbox_workspace_write: { network_access: false },
          show_raw_agent_reasoning: false,
        },
      });
      const thread = codex.startThread({
        workingDirectory: input.workingDirectory,
        skipGitRepoCheck: true,
        sandboxMode: "workspace-write",
        networkAccessEnabled: false,
        webSearchMode: "disabled",
        approvalPolicy: "never",
      });
      const turn = await thread.run(
        createBuilderEngineeringPrompt({
          projectId: input.projectId,
          prompt: redactBuilderSecrets(input.prompt, 12000),
          language: input.language,
          starter: input.starter,
        }),
      );
      return {
        status: "success",
        data: {
          providerSessionId: thread.id ?? input.projectId,
          providerJobId: redactBuilderSecrets(turn.finalResponse, 500),
        },
      };
    } catch {
      return {
        status: "retryable_failure",
        code: "BUILDER_PROVIDER_RETRYABLE",
        summary: "Codex could not complete the Builder coding pass.",
      };
    }
  }
}
