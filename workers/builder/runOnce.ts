import { BuilderEngineRepository } from "@/lib/builder/engineRepository";
import {
  issueBuilderGatewayToken,
  type IssuedBuilderGatewayToken,
} from "@/lib/builder/gatewayTokens";
import {
  getBuilderProviders,
  type BuilderProviders,
} from "@/lib/builder/providers";
import { validateBuilderPreviewUrl } from "@/lib/builder/preview";
import {
  BUILDER_RUNTIME_LIMITS,
  BUILDER_SANDBOX_PROJECT_DIR,
} from "@/lib/builder/runtime";
import { BUILDER_STARTERS } from "@/lib/builder/starterTemplates";
import type { BuilderJob } from "@/lib/builder/types";

const WORKER_ID = `builder-worker-${process.pid}-${Date.now()}`;

export type BuilderRunOnceOptions = {
  workerId?: string;
  heartbeatIntervalMs?: number;
};

function starterFromJob(job: BuilderJob) {
  const key =
    typeof job.metadata?.starterKey === "string"
      ? job.metadata.starterKey
      : "landing_page";
  return BUILDER_STARTERS[key as keyof typeof BUILDER_STARTERS]
    ? key
    : "landing_page";
}

async function destroyBuilderWorkspace(input: {
  sandboxId?: string;
  projectId: string;
  sessionId: string | null;
  userId: string;
  workspaceId: string | null;
  reason: string;
  lifecycleStatus?: "failed" | "blocked" | "preview_ready";
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
    lifecycleStatus:
      destroyed?.status === "success"
        ? (input.lifecycleStatus ?? "failed")
        : "blocked",
    summary:
      destroyed?.status === "success"
        ? "Cleaned up the Builder sandbox."
        : "Builder sandbox cleanup could not be verified.",
    metadata: {
      reason: input.reason,
      cleanupStatus: destroyed?.status ?? "unavailable",
    },
  });
}

async function revokeGatewayToken(token: IssuedBuilderGatewayToken | null) {
  if (!token) return;
  await BuilderEngineRepository.revokeGatewayToken({
    tokenId: token.tokenId,
    reason: "builder_worker_finished",
  });
}

async function validateProject(input: {
  providers: BuilderProviders;
  sandboxId: string;
}) {
  const commands = ["install", "typecheck", "lint", "build"] as const;
  const validation = [];
  for (const command of commands) {
    const result = await input.providers.workspace.runAllowedCommand?.({
      sandboxId: input.sandboxId,
      command,
      cwd: BUILDER_SANDBOX_PROJECT_DIR,
    });
    validation.push({ command, ok: result?.status === "success" });
    if (result?.status !== "success") {
      return { ok: false as const, validation, result, command };
    }
  }
  return { ok: true as const, validation };
}

async function failJob(input: {
  jobId: string;
  status: "retryable_failed" | "permanently_failed";
  errorCode: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  await BuilderEngineRepository.updateJob({
    jobId: input.jobId,
    status: input.status,
    errorCode: input.errorCode,
    summary: input.summary,
    metadata: input.metadata,
  });
  return { claimed: true as const, status: input.errorCode };
}

export async function runBuilderJobOnce(
  optionsOrWorkerId: BuilderRunOnceOptions | string = WORKER_ID,
) {
  const workerId =
    typeof optionsOrWorkerId === "string"
      ? optionsOrWorkerId
      : (optionsOrWorkerId.workerId ?? WORKER_ID);
  const heartbeatIntervalMs =
    typeof optionsOrWorkerId === "string"
      ? 30_000
      : (optionsOrWorkerId.heartbeatIntervalMs ?? 30_000);
  const job = await BuilderEngineRepository.claimNextJob(workerId);
  if (!job) return { claimed: false as const };

  const providers = getBuilderProviders();
  const starterKey = starterFromJob(job);
  const started = await BuilderEngineRepository.updateJob({
    jobId: job.id,
    status: "running",
  });
  const heartbeat = setInterval(
    () => {
      void BuilderEngineRepository.heartbeat({
        jobId: job.id,
        workerId,
      }).catch(() => undefined);
    },
    Math.max(10_000, heartbeatIntervalMs),
  );
  let sandboxCleanup: {
    sandboxId?: string;
    projectId: string;
    sessionId: string | null;
    userId: string;
    workspaceId: string | null;
  } | null = null;

  try {
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
      await BuilderEngineRepository.updateJob({
        jobId: job.id,
        status:
          workspace.status === "blocked"
            ? "permanently_failed"
            : "retryable_failed",
        errorCode: workspace.code,
        summary: workspace.summary,
      });
      return { claimed: true as const, status: workspace.status };
    }
    sandboxCleanup = {
      sandboxId: workspace.data.sandboxId,
      projectId: started.project_id,
      sessionId: started.session_id,
      userId: started.user_id,
      workspaceId: started.workspace_id,
    };

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

    const transfer = await providers.workspace.transferStarter?.({
      sandboxId: workspace.data.sandboxId ?? "",
      starterKey,
    });
    if (transfer?.status !== "success") {
      await destroyBuilderWorkspace({
        sandboxId: workspace.data.sandboxId,
        projectId: started.project_id,
        sessionId: started.session_id,
        userId: started.user_id,
        workspaceId: started.workspace_id,
        reason: transfer?.code ?? "starter_transfer_failed",
      });
      return failJob({
        jobId: job.id,
        status: "permanently_failed",
        errorCode: transfer?.code ?? "BUILDER_PROVIDER_FAILED",
        summary: transfer?.summary ?? "Builder starter transfer failed.",
      });
    }

    await BuilderEngineRepository.updateProjectRuntime({
      userId: started.user_id,
      projectId: started.project_id,
      lifecycleStatus: "building",
      patch: {
        builder_project_dir: BUILDER_SANDBOX_PROJECT_DIR,
        starter_manifest_sha256: transfer.data.manifest.checksumSha256,
      },
    });

    await BuilderEngineRepository.appendEvent({
      userId: started.user_id,
      workspaceId: started.workspace_id,
      projectId: started.project_id,
      sessionId: started.session_id,
      eventType: "command_completed",
      lifecycleStatus: "building",
      summary: "Transferred the selected starter into the Builder sandbox.",
      metadata: {
        sandboxId: workspace.data.sandboxId,
        projectDir: BUILDER_SANDBOX_PROJECT_DIR,
        starterKey,
        checksum: transfer.data.manifest.checksumSha256,
      },
    });

    const model = process.env.ALMA_BUILDER_CODEX_MODEL;
    const gatewayUrl = process.env.ALMA_BUILDER_GATEWAY_URL;
    if (!model || !gatewayUrl) {
      await destroyBuilderWorkspace({
        sandboxId: workspace.data.sandboxId,
        projectId: started.project_id,
        sessionId: started.session_id,
        userId: started.user_id,
        workspaceId: started.workspace_id,
        reason: "builder_gateway_not_configured",
      });
      return failJob({
        jobId: job.id,
        status: "permanently_failed",
        errorCode: "BUILDER_CODING_PROVIDER_NOT_CONFIGURED",
        summary: "Builder Gateway URL and Codex model are required.",
      });
    }

    let gatewayToken: IssuedBuilderGatewayToken | null = null;
    try {
      gatewayToken = await issueBuilderGatewayToken({
        job: started,
        sandboxId: workspace.data.sandboxId ?? "",
        model,
        ttlSeconds: BUILDER_RUNTIME_LIMITS.gatewayTokenTtlSeconds,
      });
      await BuilderEngineRepository.appendEvent({
        userId: started.user_id,
        workspaceId: started.workspace_id,
        projectId: started.project_id,
        sessionId: started.session_id,
        eventType: "build_started",
        lifecycleStatus: "building",
        summary: "ALMA is building your application inside the sandbox.",
        metadata: {
          sandboxId: workspace.data.sandboxId,
          projectDir: BUILDER_SANDBOX_PROJECT_DIR,
          tokenId: gatewayToken.tokenId,
        },
      });
      const coding = await providers.codingAgent.startSession({
        projectId: started.project_id,
        prompt:
          typeof started.metadata?.revisionPrompt === "string"
            ? started.metadata.revisionPrompt
            : "Build the requested ALMA Builder project from the saved project brief.",
        language: "en",
        workingDirectory: BUILDER_SANDBOX_PROJECT_DIR,
        starter: starterKey,
        sandboxId: workspace.data.sandboxId,
        gatewayToken: gatewayToken.token,
        gatewayUrl,
        model,
      });
      if (coding.status !== "success") {
        await destroyBuilderWorkspace({
          sandboxId: workspace.data.sandboxId,
          projectId: started.project_id,
          sessionId: started.session_id,
          userId: started.user_id,
          workspaceId: started.workspace_id,
          reason: coding.code,
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
        return failJob({
          jobId: job.id,
          status:
            coding.status === "blocked"
              ? "permanently_failed"
              : "retryable_failed",
          errorCode: coding.code,
          summary: coding.summary,
        });
      }
    } finally {
      await revokeGatewayToken(gatewayToken);
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

    let validationResult = await validateProject({
      providers,
      sandboxId: workspace.data.sandboxId ?? "",
    });
    if (!validationResult.ok) {
      const repairToken = await issueBuilderGatewayToken({
        job: started,
        sandboxId: workspace.data.sandboxId ?? "",
        model,
        ttlSeconds: BUILDER_RUNTIME_LIMITS.gatewayTokenTtlSeconds,
      });
      try {
        const repair = await providers.codingAgent.startSession({
          projectId: started.project_id,
          prompt: "Repair the generated ALMA Builder project.",
          language: "en",
          workingDirectory: BUILDER_SANDBOX_PROJECT_DIR,
          starter: starterKey,
          sandboxId: workspace.data.sandboxId,
          gatewayToken: repairToken.token,
          gatewayUrl,
          model,
          repairInstructions: `Validation failed on ${validationResult.command}. Fix only ${BUILDER_SANDBOX_PROJECT_DIR}.`,
        });
        if (repair.status === "success") {
          validationResult = await validateProject({
            providers,
            sandboxId: workspace.data.sandboxId ?? "",
          });
        }
      } finally {
        await revokeGatewayToken(repairToken);
      }
    }

    const validation = validationResult.validation;
    if (!validationResult.ok) {
      await destroyBuilderWorkspace({
        sandboxId: workspace.data.sandboxId,
        projectId: started.project_id,
        sessionId: started.session_id,
        userId: started.user_id,
        workspaceId: started.workspace_id,
        reason: validationResult.result?.code ?? "validation_failed",
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
      return failJob({
        jobId: job.id,
        status: "retryable_failed",
        errorCode:
          validationResult.result?.code ?? "BUILDER_PROVIDER_RETRYABLE",
        summary:
          validationResult.result?.summary ?? "Builder validation failed.",
        metadata: { validation },
      });
    }

    const artifact = await providers.workspace.extractArtifact?.({
      sandboxId: workspace.data.sandboxId ?? "",
      userId: started.user_id,
      workspaceId: started.workspace_id,
      projectId: started.project_id,
      sessionId: started.session_id,
      jobId: started.id,
    });
    if (artifact?.status !== "success") {
      await destroyBuilderWorkspace({
        sandboxId: workspace.data.sandboxId,
        projectId: started.project_id,
        sessionId: started.session_id,
        userId: started.user_id,
        workspaceId: started.workspace_id,
        reason: artifact?.code ?? "artifact_handoff_failed",
      });
      return failJob({
        jobId: job.id,
        status: "retryable_failed",
        errorCode: artifact?.code ?? "BUILDER_PROVIDER_RETRYABLE",
        summary: artifact?.summary ?? "Builder artifact handoff failed.",
        metadata: { validation },
      });
    }

    const checkpoint =
      await BuilderEngineRepository.createCheckpointWithArtifact({
        userId: started.user_id,
        workspaceId: started.workspace_id,
        projectId: started.project_id,
        sessionId: started.session_id,
        title: "Validated Builder source",
        description: "Source archive generated after successful validation.",
        sourceReference: artifact.data.checksumSha256,
        storageBucket: artifact.data.storageBucket,
        storagePath: artifact.data.storagePath,
        sizeBytes: artifact.data.sizeBytes,
        checksumSha256: artifact.data.checksumSha256,
        metadata: {
          sandboxId: workspace.data.sandboxId,
          jobId: started.id,
          manifest: artifact.data.manifest,
        },
      });
    await BuilderEngineRepository.appendEvent({
      userId: started.user_id,
      workspaceId: started.workspace_id,
      projectId: started.project_id,
      sessionId: started.session_id,
      eventType: "checkpoint_created",
      lifecycleStatus: "validating",
      summary: "Created a validated Builder source checkpoint.",
      metadata: {
        checkpointId: checkpoint.checkpoint.id,
        artifactId: checkpoint.artifact.id,
        checksum: artifact.data.checksumSha256,
      },
    });

    await providers.workspace.runAllowedCommand?.({
      sandboxId: workspace.data.sandboxId ?? "",
      command: "start_preview",
      cwd: BUILDER_SANDBOX_PROJECT_DIR,
    });
    await BuilderEngineRepository.updateJob({
      jobId: job.id,
      status: "preview_starting",
      metadata: { validation, checkpointId: checkpoint.checkpoint.id },
    });
    const preview = await providers.preview.publishPreview({
      projectId: started.project_id,
      sandboxId: workspace.data.sandboxId,
    });
    if (
      preview.status !== "success" ||
      !validateBuilderPreviewUrl(preview.data.previewUrl)
    ) {
      await destroyBuilderWorkspace({
        ...sandboxCleanup,
        reason:
          preview.status === "success"
            ? "preview_url_validation_failed"
            : preview.code,
      });
      await BuilderEngineRepository.updateJob({
        jobId: job.id,
        status:
          preview.status === "blocked"
            ? "permanently_failed"
            : "retryable_failed",
        errorCode:
          preview.status === "success"
            ? "BUILDER_PROVIDER_FAILED"
            : preview.code,
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
      metadata: {
        validation,
        previewHost: preview.data.previewHost,
        checkpointId: checkpoint.checkpoint.id,
      },
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
    if (process.env.ALMA_BUILDER_KEEP_PREVIEW_SANDBOX !== "true") {
      await destroyBuilderWorkspace({
        ...sandboxCleanup,
        reason: "builder_preview_verified",
        lifecycleStatus: "preview_ready",
      });
    }
    return { claimed: true as const, status: "preview_ready" as const };
  } catch {
    if (sandboxCleanup) {
      await destroyBuilderWorkspace({
        ...sandboxCleanup,
        reason: "builder_worker_unhandled_error",
      });
    }
    return failJob({
      jobId: job.id,
      status: "retryable_failed",
      errorCode: "BUILDER_PROVIDER_RETRYABLE",
      summary: "Builder worker failed before completion.",
    });
  } finally {
    clearInterval(heartbeat);
  }
}
