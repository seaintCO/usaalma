import { BuilderEngineRepository } from "@/lib/builder/engineRepository";
import { getBuilderProviders } from "@/lib/builder/providers";
import { validateBuilderPreviewUrl } from "@/lib/builder/preview";
import { BUILDER_STARTERS } from "@/lib/builder/starterTemplates";
import type { BuilderJob } from "@/lib/builder/types";

const WORKER_ID = `builder-worker-${process.pid}-${Date.now()}`;

function starterFromJob(job: BuilderJob) {
  const key =
    typeof job.metadata?.starterKey === "string"
      ? job.metadata.starterKey
      : "landing_page";
  return BUILDER_STARTERS[key as keyof typeof BUILDER_STARTERS]
    ? key
    : "landing_page";
}

async function destroyWorkspaceAfterFailure(input: {
  sandboxId?: string;
  projectId: string;
  sessionId: string | null;
  userId: string;
  workspaceId: string | null;
  reason: string;
}) {
  if (!input.sandboxId) return;
  const providers = getBuilderProviders();
  const destroyed = await providers.workspace.destroyWorkspace?.({
    sandboxId: input.sandboxId,
  });
  await BuilderEngineRepository.appendEvent({
    userId: input.userId,
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    sessionId: input.sessionId,
    eventType:
      destroyed?.status === "success" ? "command_completed" : "build_failed",
    lifecycleStatus: destroyed?.status === "success" ? "failed" : "blocked",
    summary:
      destroyed?.status === "success"
        ? "Cleaned up the Builder sandbox after a failed build."
        : "Builder sandbox cleanup could not be verified.",
    metadata: {
      reason: input.reason,
      cleanupStatus: destroyed?.status ?? "unavailable",
    },
  });
}

export async function runBuilderJobOnce(workerId = WORKER_ID) {
  const job = await BuilderEngineRepository.claimNextJob(workerId);
  if (!job) return { claimed: false as const };

  const providers = getBuilderProviders();
  const starterKey = starterFromJob(job);
  const started = await BuilderEngineRepository.updateJob({
    jobId: job.id,
    status: "running",
  });
  await BuilderEngineRepository.appendEvent({
    userId: started.user_id,
    workspaceId: started.workspace_id,
    projectId: started.project_id,
    sessionId: started.session_id,
    eventType: "provisioning_started",
    lifecycleStatus: "provisioning",
    summary: "Preparing your workspace.",
  });

  const workspace = await providers.workspace.provisionWorkspace({
    projectId: started.project_id,
    userId: started.user_id,
    workspaceId: started.workspace_id,
    sessionId: started.session_id,
  });
  if (workspace.status !== "success") {
    await BuilderEngineRepository.updateJob({
      jobId: job.id,
      status:
        workspace.status === "blocked"
          ? "permanently_failed"
          : "retryable_failed",
      errorCode: workspace.code,
      summary: workspace.summary,
    });
    await BuilderEngineRepository.appendEvent({
      userId: started.user_id,
      workspaceId: started.workspace_id,
      projectId: started.project_id,
      sessionId: started.session_id,
      eventType: "provider_blocked",
      lifecycleStatus: "blocked",
      summary: workspace.summary,
      metadata: { code: workspace.code },
    });
    return { claimed: true as const, status: workspace.status };
  }

  await BuilderEngineRepository.updateProjectRuntime({
    userId: started.user_id,
    projectId: started.project_id,
    lifecycleStatus: "building",
    patch: {
      provider_workspace_id: workspace.data.providerWorkspaceId ?? null,
      provider_project_id: workspace.data.providerProjectId,
      starter_key: starterKey,
    },
  });
  await BuilderEngineRepository.appendEvent({
    userId: started.user_id,
    workspaceId: started.workspace_id,
    projectId: started.project_id,
    sessionId: started.session_id,
    eventType: "build_started",
    lifecycleStatus: "building",
    summary: "ALMA is building your application.",
  });

  const coding = await providers.codingAgent.startSession({
    projectId: started.project_id,
    prompt:
      typeof started.metadata?.revisionPrompt === "string"
        ? started.metadata.revisionPrompt
        : "Build the requested ALMA Builder project from the saved project brief.",
    language: "en",
    workingDirectory: "/home/user/app",
    starter: starterKey,
  });
  if (coding.status !== "success") {
    await destroyWorkspaceAfterFailure({
      sandboxId: workspace.data.sandboxId,
      projectId: started.project_id,
      sessionId: started.session_id,
      userId: started.user_id,
      workspaceId: started.workspace_id,
      reason: coding.code,
    });
    await BuilderEngineRepository.updateJob({
      jobId: job.id,
      status:
        coding.status === "blocked" ? "permanently_failed" : "retryable_failed",
      errorCode: coding.code,
      summary: coding.summary,
    });
    await BuilderEngineRepository.appendEvent({
      userId: started.user_id,
      workspaceId: started.workspace_id,
      projectId: started.project_id,
      sessionId: started.session_id,
      eventType: "build_failed",
      lifecycleStatus: "failed",
      summary: coding.summary,
      metadata: { code: coding.code },
    });
    return { claimed: true as const, status: coding.status };
  }

  await BuilderEngineRepository.updateJob({
    jobId: job.id,
    status: "validating",
  });
  await BuilderEngineRepository.appendEvent({
    userId: started.user_id,
    workspaceId: started.workspace_id,
    projectId: started.project_id,
    sessionId: started.session_id,
    eventType: "validation_started",
    lifecycleStatus: "validating",
    summary: "Checking your application.",
  });

  const commands = ["typecheck", "lint", "build"] as const;
  const validation = [];
  for (const command of commands) {
    const result = await providers.workspace.runAllowedCommand?.({
      sandboxId: workspace.data.sandboxId ?? "",
      command,
      cwd: "/home/user/app",
    });
    validation.push({ command, ok: result?.status === "success" });
    if (result?.status !== "success") {
      await destroyWorkspaceAfterFailure({
        sandboxId: workspace.data.sandboxId,
        projectId: started.project_id,
        sessionId: started.session_id,
        userId: started.user_id,
        workspaceId: started.workspace_id,
        reason: result?.code ?? "validation_failed",
      });
      await BuilderEngineRepository.updateJob({
        jobId: job.id,
        status: "retryable_failed",
        errorCode: result?.code ?? "BUILDER_PROVIDER_RETRYABLE",
        summary: result?.summary ?? "Builder validation failed.",
        metadata: { validation },
      });
      await BuilderEngineRepository.appendEvent({
        userId: started.user_id,
        workspaceId: started.workspace_id,
        projectId: started.project_id,
        sessionId: started.session_id,
        eventType: "build_failed",
        lifecycleStatus: "failed",
        summary: "Builder validation failed.",
        metadata: { validation },
      });
      return { claimed: true as const, status: "validation_failed" as const };
    }
  }

  await providers.workspace.runAllowedCommand?.({
    sandboxId: workspace.data.sandboxId ?? "",
    command: "start_preview",
    cwd: "/home/user/app",
  });
  await BuilderEngineRepository.updateJob({
    jobId: job.id,
    status: "preview_starting",
    metadata: { validation },
  });
  const preview = await providers.preview.publishPreview({
    projectId: started.project_id,
    sandboxId: workspace.data.sandboxId,
  });
  if (
    preview.status !== "success" ||
    !validateBuilderPreviewUrl(preview.data.previewUrl)
  ) {
    await BuilderEngineRepository.updateJob({
      jobId: job.id,
      status:
        preview.status === "blocked"
          ? "permanently_failed"
          : "retryable_failed",
      errorCode:
        preview.status === "success" ? "BUILDER_PROVIDER_FAILED" : preview.code,
      summary:
        preview.status === "success"
          ? "Builder preview failed URL validation."
          : preview.summary,
    });
    return { claimed: true as const, status: "preview_failed" as const };
  }

  await BuilderEngineRepository.updateProjectRuntime({
    userId: started.user_id,
    projectId: started.project_id,
    lifecycleStatus: "preview_ready",
    patch: {
      preview_status: "ready",
      preview_url: preview.data.previewUrl,
      preview_host: preview.data.previewHost,
      preview_expires_at: preview.data.expiresAt ?? null,
    },
  });
  await BuilderEngineRepository.updateJob({
    jobId: job.id,
    status: "preview_ready",
    metadata: { validation, previewHost: preview.data.previewHost },
  });
  await BuilderEngineRepository.appendEvent({
    userId: started.user_id,
    workspaceId: started.workspace_id,
    projectId: started.project_id,
    sessionId: started.session_id,
    eventType: "preview_ready",
    lifecycleStatus: "preview_ready",
    summary: "Your preview is ready.",
  });
  return { claimed: true as const, status: "preview_ready" as const };
}
