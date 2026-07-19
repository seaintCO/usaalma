import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  canTransitionBuilderProject,
  isBuilderLanguage,
  isBuilderLifecycleState,
  isBuilderProjectType,
  type BuilderCheckpoint,
  type BuilderEvent,
  type BuilderEventType,
  type BuilderLanguage,
  type BuilderLifecycleState,
  type BuilderProject,
  type BuilderProjectType,
} from "./types";

export class BuilderRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "builder_schema_unavailable"
      | "builder_project_not_found"
      | "builder_invalid_transition"
      | "builder_invalid_input",
  ) {
    super(message);
    this.name = "BuilderRepositoryError";
  }
}

export type BuilderProjectDraftInput = {
  title: string;
  originalPrompt: string;
  preferredLanguage: BuilderLanguage;
  projectType: BuilderProjectType;
  companyContext?: string;
  workspaceId?: string | null;
  idempotencyKey?: string | null;
};

export type BuilderProjectDraftPatch = Partial<
  Pick<
    BuilderProjectDraftInput,
    | "title"
    | "originalPrompt"
    | "preferredLanguage"
    | "projectType"
    | "companyContext"
  >
>;

function cleanString(value: unknown, maxLength: number, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : fallback;
  return normalized.slice(0, maxLength);
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
  return slug || "builder-project";
}

function stableIdempotencyKey(input: BuilderProjectDraftInput) {
  if (input.idempotencyKey?.trim()) {
    return cleanString(input.idempotencyKey, 160);
  }
  return createHash("sha256")
    .update(
      [
        input.workspaceId ?? "personal",
        input.title,
        input.originalPrompt,
        input.projectType,
        input.preferredLanguage,
      ].join("\n"),
    )
    .digest("hex");
}

function mapSchemaError(error: { code?: string; message?: string } | null) {
  if (!error) return null;
  if (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.message?.includes("builder_")
  ) {
    return new BuilderRepositoryError(
      "Builder storage is not available in this environment.",
      "builder_schema_unavailable",
    );
  }
  return error;
}

function assertDraftInput(input: BuilderProjectDraftInput) {
  const title = cleanString(input.title, 120);
  const originalPrompt = cleanString(input.originalPrompt, 12000);
  const preferredLanguage = isBuilderLanguage(input.preferredLanguage)
    ? input.preferredLanguage
    : "en";
  const projectType = isBuilderProjectType(input.projectType)
    ? input.projectType
    : "custom_app";
  if (!title || !originalPrompt) {
    throw new BuilderRepositoryError(
      "Builder project title and description are required.",
      "builder_invalid_input",
    );
  }
  return {
    title,
    slug: slugify(title),
    originalPrompt,
    preferredLanguage,
    projectType,
    companyContext: cleanString(input.companyContext, 4000),
  };
}

export class BuilderRepository {
  static async listProjects(input: {
    userId: string;
    workspaceId?: string | null;
  }) {
    const supabase = await createClient();
    let query = supabase
      .from("builder_projects")
      .select("*")
      .eq("user_id", input.userId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false });
    query = input.workspaceId
      ? query.eq("workspace_id", input.workspaceId)
      : query.is("workspace_id", null);
    const { data, error } = await query;
    const mappedError = mapSchemaError(error);
    if (mappedError) throw mappedError;
    return (data ?? []) as BuilderProject[];
  }

  static async createDraft(userId: string, input: BuilderProjectDraftInput) {
    const normalized = assertDraftInput(input);
    const idempotencyKey = stableIdempotencyKey(input);
    const supabase = await createClient();
    const existing = await supabase
      .from("builder_projects")
      .select("*")
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    const mappedExistingError = mapSchemaError(existing.error);
    if (mappedExistingError) throw mappedExistingError;
    if (existing.data) return existing.data as BuilderProject;

    const { data, error } = await supabase
      .from("builder_projects")
      .insert({
        user_id: userId,
        workspace_id: input.workspaceId ?? null,
        title: normalized.title,
        slug: normalized.slug,
        original_prompt: normalized.originalPrompt,
        preferred_language: normalized.preferredLanguage,
        project_type: normalized.projectType,
        lifecycle_status: "draft",
        idempotency_key: idempotencyKey,
        metadata: normalized.companyContext
          ? { companyContext: normalized.companyContext }
          : {},
      })
      .select()
      .single();
    const mappedError = mapSchemaError(error);
    if (mappedError) throw mappedError;
    const project = data as BuilderProject;
    await BuilderRepository.appendEvent({
      userId,
      workspaceId: project.workspace_id,
      projectId: project.id,
      eventType: "project_created",
      lifecycleStatus: "draft",
      summary: "Builder project draft created.",
    });
    return project;
  }

  static async getProject(input: {
    userId: string;
    projectId: string;
    workspaceId?: string | null;
  }) {
    const supabase = await createClient();
    let query = supabase
      .from("builder_projects")
      .select("*")
      .eq("id", input.projectId)
      .eq("user_id", input.userId);
    query = input.workspaceId
      ? query.eq("workspace_id", input.workspaceId)
      : query.is("workspace_id", null);
    const { data, error } = await query.maybeSingle();
    const mappedError = mapSchemaError(error);
    if (mappedError) throw mappedError;
    return (data as BuilderProject | null) ?? null;
  }

  static async updateDraft(input: {
    userId: string;
    projectId: string;
    workspaceId?: string | null;
    patch: BuilderProjectDraftPatch;
  }) {
    const project = await BuilderRepository.getProject(input);
    if (!project) {
      throw new BuilderRepositoryError(
        "Builder project not found.",
        "builder_project_not_found",
      );
    }
    if (project.lifecycle_status !== "draft") {
      throw new BuilderRepositoryError(
        "Only draft Builder project fields can be edited.",
        "builder_invalid_transition",
      );
    }
    const next: Record<string, unknown> = {};
    if (input.patch.title !== undefined) {
      const title = cleanString(input.patch.title, 120);
      if (!title) {
        throw new BuilderRepositoryError(
          "Missing title.",
          "builder_invalid_input",
        );
      }
      next.title = title;
      next.slug = slugify(title);
    }
    if (input.patch.originalPrompt !== undefined) {
      const prompt = cleanString(input.patch.originalPrompt, 12000);
      if (!prompt) {
        throw new BuilderRepositoryError(
          "Missing project description.",
          "builder_invalid_input",
        );
      }
      next.original_prompt = prompt;
    }
    if (input.patch.preferredLanguage !== undefined) {
      if (!isBuilderLanguage(input.patch.preferredLanguage)) {
        throw new BuilderRepositoryError(
          "Invalid Builder language.",
          "builder_invalid_input",
        );
      }
      next.preferred_language = input.patch.preferredLanguage;
    }
    if (input.patch.projectType !== undefined) {
      if (!isBuilderProjectType(input.patch.projectType)) {
        throw new BuilderRepositoryError(
          "Invalid Builder project type.",
          "builder_invalid_input",
        );
      }
      next.project_type = input.patch.projectType;
    }
    if (input.patch.companyContext !== undefined) {
      next.metadata = {
        ...(project.metadata ?? {}),
        companyContext: cleanString(input.patch.companyContext, 4000),
      };
    }

    const supabase = await createClient();
    let query = supabase
      .from("builder_projects")
      .update(next)
      .eq("id", input.projectId)
      .eq("user_id", input.userId);
    query = input.workspaceId
      ? query.eq("workspace_id", input.workspaceId)
      : query.is("workspace_id", null);
    const { data, error } = await query.select().single();
    const mappedError = mapSchemaError(error);
    if (mappedError) throw mappedError;
    const updated = data as BuilderProject;
    await BuilderRepository.appendEvent({
      userId: input.userId,
      workspaceId: updated.workspace_id,
      projectId: updated.id,
      eventType: "project_updated",
      lifecycleStatus: updated.lifecycle_status,
      summary: "Builder project draft updated.",
    });
    return updated;
  }

  static async updateLifecycle(input: {
    userId: string;
    project: BuilderProject;
    nextStatus: BuilderLifecycleState;
    patch?: Record<string, unknown>;
  }) {
    if (
      !canTransitionBuilderProject(
        input.project.lifecycle_status,
        input.nextStatus,
      )
    ) {
      throw new BuilderRepositoryError(
        "Invalid Builder lifecycle transition.",
        "builder_invalid_transition",
      );
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("builder_projects")
      .update({
        ...(input.patch ?? {}),
        lifecycle_status: input.nextStatus,
      })
      .eq("id", input.project.id)
      .eq("user_id", input.userId)
      .select()
      .single();
    const mappedError = mapSchemaError(error);
    if (mappedError) throw mappedError;
    return data as BuilderProject;
  }

  static async createSession(input: {
    userId: string;
    project: BuilderProject;
    status: "requested" | "blocked" | "active" | "failed";
    providerJobId?: string | null;
    providerSessionId?: string | null;
    lastErrorCode?: string | null;
    safeErrorSummary?: string | null;
  }) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("builder_sessions")
      .insert({
        user_id: input.userId,
        workspace_id: input.project.workspace_id,
        project_id: input.project.id,
        status: input.status,
        provider_job_id: input.providerJobId ?? null,
        provider_session_id: input.providerSessionId ?? null,
        last_error_code: input.lastErrorCode ?? null,
        safe_error_summary: input.safeErrorSummary ?? null,
      })
      .select()
      .single();
    const mappedError = mapSchemaError(error);
    if (mappedError) throw mappedError;
    return data as { id: string };
  }

  static async setActiveSession(input: {
    userId: string;
    project: BuilderProject;
    sessionId: string;
    status: BuilderLifecycleState;
    errorCode?: string | null;
    safeErrorSummary?: string | null;
  }) {
    return BuilderRepository.updateLifecycle({
      userId: input.userId,
      project: input.project,
      nextStatus: input.status,
      patch: {
        active_session_id: input.sessionId,
        last_error_code: input.errorCode ?? null,
        safe_error_summary: input.safeErrorSummary ?? null,
      },
    });
  }

  static async appendEvent(input: {
    userId: string;
    workspaceId?: string | null;
    projectId: string;
    sessionId?: string | null;
    eventType: BuilderEventType;
    lifecycleStatus: BuilderLifecycleState;
    summary: string;
    providerCorrelationId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (!isBuilderLifecycleState(input.lifecycleStatus)) {
      throw new BuilderRepositoryError(
        "Invalid Builder event lifecycle state.",
        "builder_invalid_input",
      );
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("builder_events")
      .insert({
        user_id: input.userId,
        workspace_id: input.workspaceId ?? null,
        project_id: input.projectId,
        session_id: input.sessionId ?? null,
        event_type: input.eventType,
        lifecycle_status: input.lifecycleStatus,
        summary: cleanString(input.summary, 1000),
        provider_correlation_id: input.providerCorrelationId ?? null,
        metadata: input.metadata ?? {},
      })
      .select()
      .single();
    const mappedError = mapSchemaError(error);
    if (mappedError) throw mappedError;
    return data as BuilderEvent;
  }

  static async listEvents(input: {
    userId: string;
    projectId: string;
    workspaceId?: string | null;
    afterSequence?: number;
  }) {
    const supabase = await createClient();
    let query = supabase
      .from("builder_events")
      .select("*")
      .eq("project_id", input.projectId)
      .eq("user_id", input.userId)
      .order("sequence", { ascending: true })
      .limit(100);
    query = input.workspaceId
      ? query.eq("workspace_id", input.workspaceId)
      : query.is("workspace_id", null);
    if (input.afterSequence && Number.isFinite(input.afterSequence)) {
      query = query.gt("sequence", input.afterSequence);
    }
    const { data, error } = await query;
    const mappedError = mapSchemaError(error);
    if (mappedError) throw mappedError;
    return (data ?? []) as BuilderEvent[];
  }

  static async listCheckpoints(input: {
    userId: string;
    projectId: string;
    workspaceId?: string | null;
  }) {
    const supabase = await createClient();
    let query = supabase
      .from("builder_checkpoints")
      .select("*")
      .eq("project_id", input.projectId)
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false });
    query = input.workspaceId
      ? query.eq("workspace_id", input.workspaceId)
      : query.is("workspace_id", null);
    const { data, error } = await query;
    const mappedError = mapSchemaError(error);
    if (mappedError) throw mappedError;
    return (data ?? []) as BuilderCheckpoint[];
  }

  static async archiveProject(input: {
    userId: string;
    projectId: string;
    workspaceId?: string | null;
  }) {
    const project = await BuilderRepository.getProject(input);
    if (!project) {
      throw new BuilderRepositoryError(
        "Builder project not found.",
        "builder_project_not_found",
      );
    }
    const archived = await BuilderRepository.updateLifecycle({
      userId: input.userId,
      project,
      nextStatus: "archived",
      patch: { archived_at: new Date().toISOString() },
    });
    await BuilderRepository.appendEvent({
      userId: input.userId,
      workspaceId: archived.workspace_id,
      projectId: archived.id,
      eventType: "project_archived",
      lifecycleStatus: "archived",
      summary: "Builder project archived.",
    });
    return archived;
  }
}
