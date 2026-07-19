import { Sandbox, type CommandResult } from "e2b";
import { createBuilderSourceArtifact } from "@/lib/builder/artifactHandoff";
import { BUILDER_ENGINE_LIMITS } from "@/lib/builder/limits";
import { redactBuilderSecrets } from "@/lib/builder/redaction";
import { transferBuilderStarterToSandbox } from "@/lib/builder/starterTransfer";
import type {
  BuilderCommandName,
  BuilderProviderResult,
  BuilderProviderProjectRef,
  WorkspaceProvider,
} from "@/lib/builder/providers";
import {
  BUILDER_RUNTIME_LIMITS,
  BUILDER_SANDBOX_PROJECT_DIR,
} from "@/lib/builder/runtime";
import { isBuilderStarterKey } from "@/lib/builder/starterTemplates";

const COMMANDS: Record<BuilderCommandName, string> = {
  install: "npm install --ignore-scripts",
  typecheck: "npx tsc --noEmit",
  lint: "npm run lint",
  test: "npm test -- --runInBand",
  build: "npm run build",
  start_preview: "npm run dev -- --hostname 0.0.0.0 --port 3000",
  git_status: "git status --short",
  git_diff: "git diff --stat",
};

function missingWorkspace(): BuilderProviderResult<never> {
  return {
    status: "blocked",
    code: "BUILDER_WORKSPACE_PROVIDER_NOT_CONFIGURED",
    summary:
      "Builder workspace provider is not configured. Add E2B_API_KEY and an ALMA Builder template before starting builds.",
  };
}

function commandResult(result: CommandResult) {
  return {
    stdout: redactBuilderSecrets(result.stdout, 2000),
    stderr: redactBuilderSecrets(result.stderr || result.error || "", 2000),
    exitCode: result.exitCode,
  };
}

function isCompletedCommandResult(
  result: CommandResult | { exitCode?: number },
): result is CommandResult {
  return typeof result.exitCode === "number";
}

export class E2BWorkspaceProvider implements WorkspaceProvider {
  async provisionWorkspace(input: {
    projectId: string;
    userId: string;
    workspaceId: string | null;
    sessionId?: string | null;
  }): Promise<BuilderProviderResult<BuilderProviderProjectRef>> {
    if (!process.env.E2B_API_KEY || !process.env.ALMA_BUILDER_E2B_TEMPLATE) {
      return missingWorkspace();
    }
    try {
      const sandbox = await Sandbox.create(
        process.env.ALMA_BUILDER_E2B_TEMPLATE,
        {
          apiKey: process.env.E2B_API_KEY,
          timeoutMs: BUILDER_ENGINE_LIMITS.maxSessionDurationMs,
          metadata: {
            alma: "builder",
            projectId: input.projectId,
            userId: input.userId,
            workspaceId: input.workspaceId ?? "personal",
            sessionId: input.sessionId ?? "",
          },
        },
      );
      await sandbox.setTimeout(BUILDER_ENGINE_LIMITS.maxSessionDurationMs);
      return {
        status: "success",
        data: {
          providerProjectId: input.projectId,
          providerWorkspaceId: sandbox.sandboxId,
          sandboxId: sandbox.sandboxId,
          sandboxDomain: sandbox.sandboxDomain,
        },
      };
    } catch {
      return {
        status: "retryable_failure",
        code: "BUILDER_PROVIDER_RETRYABLE",
        summary: "Builder workspace could not be provisioned.",
      };
    }
  }

  async runAllowedCommand(input: {
    sandboxId: string;
    command: BuilderCommandName;
    cwd?: string;
  }) {
    if (!process.env.E2B_API_KEY) return missingWorkspace();
    try {
      const sandbox = await Sandbox.connect(input.sandboxId, {
        apiKey: process.env.E2B_API_KEY,
      });
      const command = COMMANDS[input.command];
      const result = await sandbox.commands.run(command, {
        cwd: input.cwd ?? BUILDER_SANDBOX_PROJECT_DIR,
        timeoutMs:
          input.command === "start_preview"
            ? 15_000
            : BUILDER_ENGINE_LIMITS.maxSessionDurationMs,
        ...(input.command === "start_preview" ? { background: true } : {}),
      });
      if (isCompletedCommandResult(result)) {
        return { status: "success" as const, data: commandResult(result) };
      }
      return {
        status: "success" as const,
        data: { stdout: "Preview server started.", stderr: "", exitCode: 0 },
      };
    } catch {
      return {
        status: "retryable_failure" as const,
        code: "BUILDER_PROVIDER_RETRYABLE" as const,
        summary: "Builder command failed inside the isolated workspace.",
      };
    }
  }

  async destroyWorkspace(input: { sandboxId: string }) {
    if (!process.env.E2B_API_KEY) return missingWorkspace();
    try {
      const sandbox = await Sandbox.connect(input.sandboxId, {
        apiKey: process.env.E2B_API_KEY,
      });
      await sandbox.kill();
      return { status: "success" as const, data: { destroyed: true as const } };
    } catch {
      return {
        status: "retryable_failure" as const,
        code: "BUILDER_PROVIDER_RETRYABLE" as const,
        summary: "Builder workspace cleanup could not be confirmed.",
      };
    }
  }

  async transferStarter(input: { sandboxId: string; starterKey: string }) {
    if (!process.env.E2B_API_KEY) return missingWorkspace();
    if (!isBuilderStarterKey(input.starterKey)) {
      return {
        status: "permanent_failure" as const,
        code: "BUILDER_PROVIDER_FAILED" as const,
        summary: "Builder starter template is invalid.",
      };
    }
    try {
      const sandbox = await Sandbox.connect(input.sandboxId, {
        apiKey: process.env.E2B_API_KEY,
      });
      const manifest = await transferBuilderStarterToSandbox({
        sandbox,
        starterKey: input.starterKey,
      });
      return { status: "success" as const, data: { manifest } };
    } catch {
      return {
        status: "permanent_failure" as const,
        code: "BUILDER_PROVIDER_FAILED" as const,
        summary: "Builder starter could not be transferred safely.",
      };
    }
  }

  async extractArtifact(input: {
    sandboxId: string;
    userId: string;
    workspaceId: string | null;
    projectId: string;
    sessionId: string | null;
    jobId: string;
  }) {
    if (!process.env.E2B_API_KEY) return missingWorkspace();
    try {
      const sandbox = await Sandbox.connect(input.sandboxId, {
        apiKey: process.env.E2B_API_KEY,
      });
      const artifact = await createBuilderSourceArtifact({
        sandbox,
        userId: input.userId,
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        sessionId: input.sessionId,
        jobId: input.jobId,
      });
      if (
        artifact.manifest.files.length > BUILDER_RUNTIME_LIMITS.maxArtifactFiles
      ) {
        return {
          status: "permanent_failure" as const,
          code: "BUILDER_PROVIDER_FAILED" as const,
          summary: "Builder artifact file count exceeded.",
        };
      }
      return { status: "success" as const, data: artifact };
    } catch {
      return {
        status: "retryable_failure" as const,
        code: "BUILDER_PROVIDER_RETRYABLE" as const,
        summary: "Builder artifact could not be extracted safely.",
      };
    }
  }
}
