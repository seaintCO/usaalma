import { createHash, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUILDER_ENGINE_LIMITS } from "./limits";
import { redactBuilderMetadata, redactBuilderSecrets } from "./redaction";
import type {
  BuilderEventType,
  BuilderJob,
  BuilderJobStatus,
  BuilderLifecycleState,
  BuilderProject,
} from "./types";

export type BuilderGatewayTokenRecord = {
  id: string;
  token_id: string;
  token_hash: string;
  user_id: string;
  workspace_id: string | null;
  project_id: string;
  session_id: string | null;
  job_id: string;
  sandbox_id: string;
  model: string;
  audience: string;
  issuer: string;
  request_count: number;
  token_count: number;
  expires_at: string;
  revoked_at: string | null;
  safe_failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

export class BuilderEngineRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "builder_schema_unavailable"
      | "builder_job_not_found"
      | "builder_quota_exceeded"
      | "builder_duplicate_active_job",
  ) {
    super(message);
    this.name = "BuilderEngineRepositoryError";
  }
}

function admin() {
  return createAdminClient();
}

function schemaError(error: { code?: string; message?: string } | null) {
  if (!error) return null;
  if (error.code === "42P01" || error.code === "42703") {
    return new BuilderEngineRepositoryError(
      "Builder Engine storage is not available in this environment.",
      "builder_schema_unavailable",
    );
  }
  if (error.code === "23505") {
    return new BuilderEngineRepositoryError(
      "A Builder job is already active for this project.",
      "builder_duplicate_active_job",
    );
  }
  return error;
}

export function builderJobIdempotencyKey(input: {
  projectId: string;
  sessionId: string;
  revisionPrompt?: string;
}) {
  return createHash("sha256")
    .update(
      [
        "builder-engine-1",
        input.projectId,
        input.sessionId,
        input.revisionPrompt ?? "",
      ].join("\n"),
    )
    .digest("hex");
}

export class BuilderEngineRepository {
  static async countProjectsForUser(userId: string) {
    const { count, error } = await admin()
      .from("builder_projects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("archived_at", null);
    const mapped = schemaError(error);
    if (mapped) throw mapped;
    return count ?? 0;
  }

  static async countRecentBuilds(input: {
    userId: string;
    workspaceId: string | null;
  }) {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    let query = admin()
      .from("builder_jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .gte("created_at", since.toISOString());
    query = input.workspaceId
      ? query.eq("workspace_id", input.workspaceId)
      : query.is("workspace_id", null);
    const { count, error } = await query;
    const mapped = schemaError(error);
    if (mapped) throw mapped;
    return count ?? 0;
  }

  static async createBuildJob(input: {
    userId: string;
    project: BuilderProject;
    sessionId: string;
    starterKey: string;
    revisionPrompt?: string;
  }) {
    const idempotencyKey = builderJobIdempotencyKey({
      projectId: input.project.id,
      sessionId: input.sessionId,
      revisionPrompt: input.revisionPrompt,
    });
    const { data: existing, error: existingError } = await admin()
      .from("builder_jobs")
      .select("*")
      .eq("user_id", input.userId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    const mappedExisting = schemaError(existingError);
    if (mappedExisting) throw mappedExisting;
    if (existing) return existing as BuilderJob;

    const { data, error } = await admin()
      .from("builder_jobs")
      .insert({
        user_id: input.userId,
        workspace_id: input.project.workspace_id,
        project_id: input.project.id,
        session_id: input.sessionId,
        idempotency_key: idempotencyKey,
        job_type: "build_application",
        status: "queued",
        max_attempts: BUILDER_ENGINE_LIMITS.maxValidationAttempts,
        metadata: redactBuilderMetadata({
          starterKey: input.starterKey,
          revisionPrompt: input.revisionPrompt ?? null,
        }),
      })
      .select()
      .single();
    const mapped = schemaError(error);
    if (mapped) throw mapped;
    return data as BuilderJob;
  }

  static async claimNextJob(workerId: string = randomUUID()) {
    const { data, error } = await admin().rpc("alma_claim_builder_job", {
      input_worker_id: workerId,
      input_lease_seconds: Math.floor(BUILDER_ENGINE_LIMITS.jobLeaseMs / 1000),
    });
    const mapped = schemaError(error);
    if (mapped) throw mapped;
    return ((data ?? []) as BuilderJob[])[0] ?? null;
  }

  static async heartbeat(input: { jobId: string; workerId: string }) {
    const { error } = await admin()
      .from("builder_jobs")
      .update({
        lease_expires_at: new Date(
          Date.now() + BUILDER_ENGINE_LIMITS.jobLeaseMs,
        ).toISOString(),
        last_heartbeat_at: new Date().toISOString(),
      })
      .eq("id", input.jobId)
      .eq("lease_owner", input.workerId);
    const mapped = schemaError(error);
    if (mapped) throw mapped;
  }

  static async updateJob(input: {
    jobId: string;
    status: BuilderJobStatus;
    errorCode?: string | null;
    summary?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const terminal = [
      "completed",
      "retryable_failed",
      "permanently_failed",
      "cancelled",
      "expired",
    ].includes(input.status);
    const { data, error } = await admin()
      .from("builder_jobs")
      .update({
        status: input.status,
        last_error_code: input.errorCode ?? null,
        safe_error_summary: input.summary
          ? redactBuilderSecrets(input.summary, 1000)
          : null,
        ...(input.metadata
          ? { metadata: redactBuilderMetadata(input.metadata) }
          : {}),
        ...(terminal ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", input.jobId)
      .select()
      .single();
    const mapped = schemaError(error);
    if (mapped) throw mapped;
    return data as BuilderJob;
  }

  static async getActiveLeasedJob(jobId: string) {
    const { data, error } = await admin()
      .from("builder_jobs")
      .select("*")
      .eq("id", jobId)
      .in("status", ["leased", "running", "validating", "preview_starting"])
      .gt("lease_expires_at", new Date().toISOString())
      .maybeSingle();
    const mapped = schemaError(error);
    if (mapped) throw mapped;
    return (data as BuilderJob | null) ?? null;
  }

  static async createGatewayToken(input: {
    tokenId: string;
    tokenHash: string;
    job: BuilderJob;
    sandboxId: string;
    model: string;
    audience: string;
    issuer: string;
    expiresAt: string;
  }) {
    const { data, error } = await admin()
      .from("builder_gateway_tokens")
      .insert({
        token_id: input.tokenId,
        token_hash: input.tokenHash,
        user_id: input.job.user_id,
        workspace_id: input.job.workspace_id,
        project_id: input.job.project_id,
        session_id: input.job.session_id,
        job_id: input.job.id,
        sandbox_id: input.sandboxId,
        model: input.model,
        audience: input.audience,
        issuer: input.issuer,
        expires_at: input.expiresAt,
      })
      .select()
      .single();
    const mapped = schemaError(error);
    if (mapped) throw mapped;
    return data as BuilderGatewayTokenRecord;
  }

  static async getGatewayToken(input: { tokenId: string; tokenHash: string }) {
    const { data, error } = await admin()
      .from("builder_gateway_tokens")
      .select("*")
      .eq("token_id", input.tokenId)
      .eq("token_hash", input.tokenHash)
      .maybeSingle();
    const mapped = schemaError(error);
    if (mapped) throw mapped;
    return (data as BuilderGatewayTokenRecord | null) ?? null;
  }

  static async incrementGatewayTokenUsage(input: {
    tokenId: string;
    tokenCount?: number;
  }) {
    const { data: existing, error: existingError } = await admin()
      .from("builder_gateway_tokens")
      .select("request_count,token_count")
      .eq("token_id", input.tokenId)
      .maybeSingle();
    const mappedExisting = schemaError(existingError);
    if (mappedExisting) throw mappedExisting;
    const { error } = await admin()
      .from("builder_gateway_tokens")
      .update({
        request_count: Number(existing?.request_count ?? 0) + 1,
        token_count:
          Number(existing?.token_count ?? 0) + (input.tokenCount ?? 0),
      })
      .eq("token_id", input.tokenId);
    const mapped = schemaError(error);
    if (mapped) throw mapped;
  }

  static async revokeGatewayToken(input: {
    tokenId: string;
    reason?: string | null;
  }) {
    const { error } = await admin()
      .from("builder_gateway_tokens")
      .update({
        revoked_at: new Date().toISOString(),
        safe_failure_reason: input.reason
          ? redactBuilderSecrets(input.reason, 500)
          : null,
      })
      .eq("token_id", input.tokenId)
      .is("revoked_at", null);
    const mapped = schemaError(error);
    if (mapped) throw mapped;
  }

  static async createCheckpointWithArtifact(input: {
    userId: string;
    workspaceId: string | null;
    projectId: string;
    sessionId: string | null;
    title: string;
    description: string;
    sourceReference: string;
    storageBucket: string;
    storagePath: string;
    sizeBytes: number;
    checksumSha256: string;
    metadata?: Record<string, unknown>;
  }) {
    const client = admin();
    const { data: checkpoint, error: checkpointError } = await client
      .from("builder_checkpoints")
      .insert({
        user_id: input.userId,
        workspace_id: input.workspaceId,
        project_id: input.projectId,
        session_id: input.sessionId,
        checkpoint_label: input.title,
        description: input.description,
        source_reference: input.sourceReference,
        status: "created",
        metadata: redactBuilderMetadata(input.metadata),
      })
      .select()
      .single();
    const mappedCheckpoint = schemaError(checkpointError);
    if (mappedCheckpoint) throw mappedCheckpoint;
    const { data: artifact, error: artifactError } = await client
      .from("builder_artifacts")
      .insert({
        user_id: input.userId,
        workspace_id: input.workspaceId,
        project_id: input.projectId,
        session_id: input.sessionId,
        checkpoint_id: checkpoint.id,
        artifact_type: "source_archive",
        title: input.title,
        storage_bucket: input.storageBucket,
        storage_path: input.storagePath,
        mime_type: "application/zip",
        size_bytes: input.sizeBytes,
        checksum_sha256: input.checksumSha256,
        metadata: redactBuilderMetadata(input.metadata),
      })
      .select()
      .single();
    const mappedArtifact = schemaError(artifactError);
    if (mappedArtifact) throw mappedArtifact;
    await client
      .from("builder_projects")
      .update({ latest_checkpoint_id: checkpoint.id })
      .eq("id", input.projectId)
      .eq("user_id", input.userId);
    return { checkpoint, artifact };
  }

  static async cancelJob(input: { userId: string; projectId: string }) {
    const { data, error } = await admin()
      .from("builder_jobs")
      .update({
        status: "cancelled",
        cancel_requested_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("user_id", input.userId)
      .eq("project_id", input.projectId)
      .in("status", [
        "queued",
        "leased",
        "running",
        "validating",
        "preview_starting",
      ])
      .select();
    const mapped = schemaError(error);
    if (mapped) throw mapped;
    return (data ?? []) as BuilderJob[];
  }

  static async appendEvent(input: {
    userId: string;
    workspaceId: string | null;
    projectId: string;
    sessionId?: string | null;
    eventType: BuilderEventType;
    lifecycleStatus: BuilderLifecycleState;
    summary: string;
    metadata?: Record<string, unknown>;
  }) {
    const { error } = await admin()
      .from("builder_events")
      .insert({
        user_id: input.userId,
        workspace_id: input.workspaceId,
        project_id: input.projectId,
        session_id: input.sessionId ?? null,
        event_type: input.eventType,
        lifecycle_status: input.lifecycleStatus,
        summary: redactBuilderSecrets(input.summary, 1000),
        metadata: redactBuilderMetadata(input.metadata),
      });
    const mapped = schemaError(error);
    if (mapped) throw mapped;
  }

  static async updateProjectRuntime(input: {
    projectId: string;
    userId: string;
    lifecycleStatus: BuilderLifecycleState;
    patch?: Record<string, unknown>;
  }) {
    const { data, error } = await admin()
      .from("builder_projects")
      .update({
        lifecycle_status: input.lifecycleStatus,
        ...(input.patch ?? {}),
      })
      .eq("id", input.projectId)
      .eq("user_id", input.userId)
      .select()
      .single();
    const mapped = schemaError(error);
    if (mapped) throw mapped;
    return data as BuilderProject;
  }
}
