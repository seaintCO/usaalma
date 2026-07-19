import { EntitlementService } from "@/lib/platform/entitlements/service";
import { prepareAuditedAction } from "@/lib/platform/actions/executionBoundary";
import {
  resolveTenantWorkspace,
  type AlmaTenantContext,
} from "@/lib/platform/workspace/tenantResolver";
import { BuilderRepository, BuilderRepositoryError } from "./repository";
import {
  BuilderEngineRepository,
  BuilderEngineRepositoryError,
} from "./engineRepository";
import { BUILDER_ENGINE_LIMITS } from "./limits";
import { isBuilderStarterKey } from "./starterTemplates";
import type {
  BuilderProjectDraftInput,
  BuilderProjectDraftPatch,
} from "./repository";

export class BuilderServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "unauthorized"
      | "builder_entitlement_required"
      | "builder_schema_unavailable"
      | "builder_project_not_found"
      | "builder_invalid_input"
      | "builder_invalid_transition"
      | "builder_quota_exceeded"
      | "builder_duplicate_active_job",
    public readonly httpStatus = 400,
  ) {
    super(message);
    this.name = "BuilderServiceError";
  }
}

async function builderContext(input: {
  userId: string;
  workspaceId?: string | null;
}): Promise<AlmaTenantContext> {
  const tenant = await resolveTenantWorkspace(input);
  const entitlement = await EntitlementService.checkModuleAccess(
    input.userId,
    "builder",
  );
  if (!entitlement || entitlement.accessStatus !== "included") {
    throw new BuilderServiceError(
      "Builder access is not included for this account.",
      "builder_entitlement_required",
      403,
    );
  }
  return tenant;
}

function mapRepositoryError(error: unknown): never {
  if (error instanceof BuilderRepositoryError) {
    const status =
      error.code === "builder_schema_unavailable"
        ? 503
        : error.code === "builder_project_not_found"
          ? 404
          : 400;
    throw new BuilderServiceError(error.message, error.code, status);
  }
  if (error instanceof BuilderEngineRepositoryError) {
    const status =
      error.code === "builder_schema_unavailable"
        ? 503
        : error.code === "builder_job_not_found"
          ? 404
          : 429;
    throw new BuilderServiceError(
      error.message,
      error.code === "builder_job_not_found"
        ? "builder_project_not_found"
        : error.code,
      status,
    );
  }
  throw new BuilderServiceError(
    "Builder is temporarily unavailable.",
    "builder_schema_unavailable",
    503,
  );
}

export class BuilderService {
  static async listProjects(input: {
    userId: string;
    workspaceId?: string | null;
  }) {
    const tenant = await builderContext(input);
    try {
      return BuilderRepository.listProjects({
        userId: input.userId,
        workspaceId: tenant.workspaceId,
      });
    } catch (error) {
      mapRepositoryError(error);
    }
  }

  static async createDraft(input: {
    userId: string;
    workspaceId?: string | null;
    draft: Omit<BuilderProjectDraftInput, "workspaceId">;
  }) {
    const tenant = await builderContext(input);
    try {
      return BuilderRepository.createDraft(input.userId, {
        ...input.draft,
        workspaceId: tenant.workspaceId,
      });
    } catch (error) {
      mapRepositoryError(error);
    }
  }

  static async getProject(input: {
    userId: string;
    projectId: string;
    workspaceId?: string | null;
  }) {
    const tenant = await builderContext(input);
    try {
      const project = await BuilderRepository.getProject({
        userId: input.userId,
        workspaceId: tenant.workspaceId,
        projectId: input.projectId,
      });
      if (!project) {
        throw new BuilderRepositoryError(
          "Builder project not found.",
          "builder_project_not_found",
        );
      }
      return project;
    } catch (error) {
      mapRepositoryError(error);
    }
  }

  static async updateDraft(input: {
    userId: string;
    projectId: string;
    workspaceId?: string | null;
    patch: BuilderProjectDraftPatch;
  }) {
    const tenant = await builderContext(input);
    try {
      return BuilderRepository.updateDraft({
        userId: input.userId,
        workspaceId: tenant.workspaceId,
        projectId: input.projectId,
        patch: input.patch,
      });
    } catch (error) {
      mapRepositoryError(error);
    }
  }

  static async startSession(input: {
    userId: string;
    projectId: string;
    workspaceId?: string | null;
    starterKey?: string | null;
    revisionPrompt?: string | null;
  }) {
    const tenant = await builderContext(input);
    try {
      const project = await BuilderRepository.getProject({
        userId: input.userId,
        workspaceId: tenant.workspaceId,
        projectId: input.projectId,
      });
      if (!project) {
        throw new BuilderRepositoryError(
          "Builder project not found.",
          "builder_project_not_found",
        );
      }
      const starterKey = isBuilderStarterKey(input.starterKey)
        ? input.starterKey
        : isBuilderStarterKey(project.starter_key)
          ? project.starter_key
          : isBuilderStarterKey(project.metadata?.starterKey)
            ? project.metadata.starterKey
            : "landing_page";
      if (
        project.original_prompt.length > BUILDER_ENGINE_LIMITS.maxPromptLength
      ) {
        throw new BuilderServiceError(
          "Builder prompt is too long for Engine 1.",
          "builder_quota_exceeded",
          429,
        );
      }
      const projectCount = await BuilderEngineRepository.countProjectsForUser(
        input.userId,
      );
      if (projectCount > BUILDER_ENGINE_LIMITS.maxProjectsPerUser) {
        throw new BuilderServiceError(
          "Builder project limit reached for this account.",
          "builder_quota_exceeded",
          429,
        );
      }
      const recentBuilds = await BuilderEngineRepository.countRecentBuilds({
        userId: input.userId,
        workspaceId: project.workspace_id,
      });
      if (recentBuilds >= BUILDER_ENGINE_LIMITS.maxBuildsPerBillingPeriod) {
        throw new BuilderServiceError(
          "Builder monthly build limit reached for this account.",
          "builder_quota_exceeded",
          429,
        );
      }
      await BuilderRepository.appendEvent({
        userId: input.userId,
        workspaceId: project.workspace_id,
        projectId: project.id,
        eventType: "session_requested",
        lifecycleStatus: project.lifecycle_status,
        summary: "Builder session requested.",
      });
      const session = await BuilderRepository.createSession({
        userId: input.userId,
        project,
        status: "requested",
      });
      const job = await BuilderEngineRepository.createBuildJob({
        userId: input.userId,
        project,
        sessionId: session.id,
        starterKey,
        revisionPrompt: input.revisionPrompt ?? undefined,
      });
      const queuedProject = await BuilderRepository.setActiveSession({
        userId: input.userId,
        project,
        sessionId: session.id,
        status: "building",
      });
      return {
        project: queuedProject,
        session,
        job,
        result: {
          status: "success" as const,
          data: { providerSessionId: session.id, providerJobId: job.id },
        },
      };
    } catch (error) {
      if (error instanceof BuilderServiceError) throw error;
      mapRepositoryError(error);
    }
  }

  static async cancelBuild(input: {
    userId: string;
    projectId: string;
    workspaceId?: string | null;
  }) {
    const tenant = await builderContext(input);
    const project = await BuilderRepository.getProject({
      userId: input.userId,
      workspaceId: tenant.workspaceId,
      projectId: input.projectId,
    });
    if (!project) {
      throw new BuilderServiceError(
        "Builder project not found.",
        "builder_project_not_found",
        404,
      );
    }
    const jobs = await BuilderEngineRepository.cancelJob({
      userId: input.userId,
      projectId: input.projectId,
    });
    await BuilderEngineRepository.appendEvent({
      userId: input.userId,
      workspaceId: project.workspace_id,
      projectId: project.id,
      sessionId: project.active_session_id,
      eventType: "build_failed",
      lifecycleStatus: "blocked",
      summary: "Builder run was cancelled.",
    });
    return { project, jobs };
  }

  static async prepareGithubSave(input: {
    userId: string;
    projectId: string;
    workspaceId?: string | null;
    repositoryName?: string | null;
  }) {
    const tenant = await builderContext(input);
    const project = await BuilderRepository.getProject({
      userId: input.userId,
      workspaceId: tenant.workspaceId,
      projectId: input.projectId,
    });
    if (!project) {
      throw new BuilderServiceError(
        "Builder project not found.",
        "builder_project_not_found",
        404,
      );
    }
    const repositoryName =
      typeof input.repositoryName === "string" && input.repositoryName.trim()
        ? input.repositoryName.trim().slice(0, 80)
        : project.slug;
    const approval = await prepareAuditedAction({
      userId: input.userId,
      workspaceId: project.workspace_id,
      domain: "builder",
      actionKey: "builder.source.push",
      actionSummary: `Save Builder project "${project.title}" to a private GitHub repository.`,
      riskLevel: "protected",
      approvalPolicy: "always_protected",
      requestedPayload: {
        projectId: project.id,
        projectTitle: project.title,
        repositoryName,
        visibility: "private",
        sourceReference: project.latest_checkpoint_id,
        previewUrl: project.preview_url,
      },
    });
    await BuilderEngineRepository.appendEvent({
      userId: input.userId,
      workspaceId: project.workspace_id,
      projectId: project.id,
      sessionId: project.active_session_id,
      eventType: "approval_requested",
      lifecycleStatus: "awaiting_approval",
      summary: "Approval required to save this to GitHub.",
      metadata: {
        actionKey: "builder.source.push",
        approvalId: approval.approval?.id ?? null,
      },
    });
    const updated = await BuilderEngineRepository.updateProjectRuntime({
      userId: input.userId,
      projectId: project.id,
      lifecycleStatus: "awaiting_approval",
      patch: { source_control_status: "pending_approval" },
    });
    return { project: updated, approval };
  }

  static async listEvents(input: {
    userId: string;
    projectId: string;
    workspaceId?: string | null;
    afterSequence?: number;
  }) {
    const tenant = await builderContext(input);
    try {
      return BuilderRepository.listEvents({
        userId: input.userId,
        workspaceId: tenant.workspaceId,
        projectId: input.projectId,
        afterSequence: input.afterSequence,
      });
    } catch (error) {
      mapRepositoryError(error);
    }
  }

  static async listCheckpoints(input: {
    userId: string;
    projectId: string;
    workspaceId?: string | null;
  }) {
    const tenant = await builderContext(input);
    try {
      return BuilderRepository.listCheckpoints({
        userId: input.userId,
        workspaceId: tenant.workspaceId,
        projectId: input.projectId,
      });
    } catch (error) {
      mapRepositoryError(error);
    }
  }

  static async archiveProject(input: {
    userId: string;
    projectId: string;
    workspaceId?: string | null;
  }) {
    const tenant = await builderContext(input);
    try {
      return BuilderRepository.archiveProject({
        userId: input.userId,
        workspaceId: tenant.workspaceId,
        projectId: input.projectId,
      });
    } catch (error) {
      mapRepositoryError(error);
    }
  }
}
