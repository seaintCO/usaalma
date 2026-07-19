export const BUILDER_PROJECT_TYPES = [
  "website",
  "portal",
  "internal_tool",
  "booking",
  "custom_app",
] as const;

export type BuilderProjectType = (typeof BUILDER_PROJECT_TYPES)[number];

export const BUILDER_LANGUAGES = ["en", "es"] as const;

export type BuilderLanguage = (typeof BUILDER_LANGUAGES)[number];

export const BUILDER_LIFECYCLE_STATES = [
  "draft",
  "provisioning",
  "ready",
  "building",
  "validating",
  "awaiting_approval",
  "preview_ready",
  "blocked",
  "failed",
  "archived",
] as const;

export type BuilderLifecycleState = (typeof BUILDER_LIFECYCLE_STATES)[number];

export const BUILDER_EVENT_TYPES = [
  "project_created",
  "project_updated",
  "session_requested",
  "provisioning_started",
  "provider_blocked",
  "build_started",
  "command_started",
  "command_completed",
  "validation_started",
  "validation_completed",
  "checkpoint_created",
  "approval_requested",
  "preview_ready",
  "build_failed",
  "project_archived",
] as const;

export type BuilderEventType = (typeof BUILDER_EVENT_TYPES)[number];

export type BuilderPreviewStatus =
  "not_available" | "provisioning" | "ready" | "blocked" | "failed";

export type BuilderSourceControlStatus =
  "not_configured" | "pending_approval" | "connected" | "blocked" | "failed";

export type BuilderDeploymentStatus =
  "not_configured" | "pending_approval" | "deployed" | "blocked" | "failed";

export type BuilderSessionStatus =
  | "requested"
  | "blocked"
  | "provisioning"
  | "active"
  | "completed"
  | "failed"
  | "cancelled";

export type BuilderJobStatus =
  | "queued"
  | "leased"
  | "running"
  | "validating"
  | "preview_starting"
  | "preview_ready"
  | "awaiting_approval"
  | "completed"
  | "retryable_failed"
  | "permanently_failed"
  | "cancelled"
  | "expired";

export type BuilderStarterKey =
  "landing_page" | "booking_website" | "client_portal" | "internal_dashboard";

export type BuilderValidationResult = {
  command: string;
  ok: boolean;
  summary: string;
  exitCode?: number | null;
};

export type BuilderJob = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  project_id: string;
  session_id: string | null;
  idempotency_key: string;
  job_type: string;
  status: BuilderJobStatus;
  provider_job_id: string | null;
  attempt_count: number;
  max_attempts: number;
  lease_owner: string | null;
  lease_expires_at: string | null;
  cancel_requested_at: string | null;
  last_heartbeat_at: string | null;
  last_error_code: string | null;
  safe_error_summary: string | null;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type BuilderProject = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  title: string;
  slug: string;
  original_prompt: string;
  preferred_language: BuilderLanguage;
  project_type: BuilderProjectType;
  lifecycle_status: BuilderLifecycleState;
  provider_project_id: string | null;
  provider_workspace_id: string | null;
  provider_repository_id: string | null;
  active_session_id: string | null;
  latest_checkpoint_id: string | null;
  preview_status: BuilderPreviewStatus;
  preview_url: string | null;
  preview_host: string | null;
  preview_expires_at?: string | null;
  source_control_status: BuilderSourceControlStatus;
  deployment_status: BuilderDeploymentStatus;
  starter_key?: BuilderStarterKey | null;
  github_owner?: string | null;
  github_repository?: string | null;
  github_commit_sha?: string | null;
  build_requested_at?: string | null;
  last_error_code: string | null;
  safe_error_summary: string | null;
  metadata: Record<string, unknown>;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BuilderEvent = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  project_id: string;
  session_id: string | null;
  sequence: number;
  event_type: BuilderEventType;
  lifecycle_status: BuilderLifecycleState;
  summary: string;
  provider_correlation_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BuilderCheckpoint = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  project_id: string;
  session_id: string | null;
  checkpoint_label: string;
  description: string | null;
  source_reference: string | null;
  status:
    "created" | "approved" | "restoring" | "restored" | "blocked" | "failed";
  restore_requires_approval: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const TRANSITIONS: Record<BuilderLifecycleState, BuilderLifecycleState[]> = {
  draft: ["provisioning", "ready", "blocked", "failed", "archived"],
  provisioning: ["ready", "blocked", "failed", "archived"],
  ready: ["building", "awaiting_approval", "blocked", "failed", "archived"],
  building: [
    "validating",
    "awaiting_approval",
    "preview_ready",
    "blocked",
    "failed",
    "archived",
  ],
  validating: ["preview_ready", "awaiting_approval", "blocked", "failed"],
  awaiting_approval: [
    "ready",
    "building",
    "preview_ready",
    "blocked",
    "failed",
  ],
  preview_ready: [
    "building",
    "awaiting_approval",
    "blocked",
    "failed",
    "archived",
  ],
  blocked: ["ready", "provisioning", "building", "failed", "archived"],
  failed: ["ready", "building", "archived"],
  archived: [],
};

export function canTransitionBuilderProject(
  from: BuilderLifecycleState,
  to: BuilderLifecycleState,
) {
  return from === to || TRANSITIONS[from].includes(to);
}

export function isBuilderProjectType(
  value: unknown,
): value is BuilderProjectType {
  return (
    typeof value === "string" &&
    BUILDER_PROJECT_TYPES.includes(value as BuilderProjectType)
  );
}

export function isBuilderLanguage(value: unknown): value is BuilderLanguage {
  return (
    typeof value === "string" &&
    BUILDER_LANGUAGES.includes(value as BuilderLanguage)
  );
}

export function isBuilderLifecycleState(
  value: unknown,
): value is BuilderLifecycleState {
  return (
    typeof value === "string" &&
    BUILDER_LIFECYCLE_STATES.includes(value as BuilderLifecycleState)
  );
}
