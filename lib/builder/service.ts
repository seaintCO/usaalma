import { EntitlementService } from "@/lib/platform/entitlements/service";
import {
  resolveTenantWorkspace,
  type AlmaTenantContext,
} from "@/lib/platform/workspace/tenantResolver";
import { BuilderRepository, BuilderRepositoryError } from "./repository";
import { getBuilderProviders } from "./providers";
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
      | "builder_invalid_transition",
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
      await BuilderRepository.appendEvent({
        userId: input.userId,
        workspaceId: project.workspace_id,
        projectId: project.id,
        eventType: "session_requested",
        lifecycleStatus: project.lifecycle_status,
        summary: "Builder session requested.",
      });
      const result = await getBuilderProviders().codingAgent.startSession({
        projectId: project.id,
        prompt: project.original_prompt,
        language: project.preferred_language,
      });
      if (result.status === "blocked") {
        const session = await BuilderRepository.createSession({
          userId: input.userId,
          project,
          status: "blocked",
          lastErrorCode: result.code,
          safeErrorSummary: result.summary,
        });
        const blockedProject = await BuilderRepository.setActiveSession({
          userId: input.userId,
          project,
          sessionId: session.id,
          status: "blocked",
          errorCode: result.code,
          safeErrorSummary: result.summary,
        });
        await BuilderRepository.appendEvent({
          userId: input.userId,
          workspaceId: project.workspace_id,
          projectId: project.id,
          sessionId: session.id,
          eventType: "provider_blocked",
          lifecycleStatus: "blocked",
          summary:
            "The isolated Builder Engine is not configured yet. No code execution was started.",
          metadata: { code: result.code },
        });
        return { project: blockedProject, session, result };
      }

      return { project, session: null, result };
    } catch (error) {
      mapRepositoryError(error);
    }
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
