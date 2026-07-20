import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const CONFIRM = "run-one-builder-e2e";
const maxRuntimeMs = 15 * 60 * 1000;
const workerCommand = "builder:worker:once";

function safeExit(code, message, extra = {}) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        code,
        message,
        paidExternalOperation: true,
        maxRuntimeMs,
        ...extra,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value)
    safeExit("ALMA_BUILDER_LIVE_E2E_ENV_MISSING", `${name} is required.`);
  return value;
}

if (process.env.ALMA_BUILDER_LIVE_E2E_CONFIRM !== CONFIRM) {
  safeExit(
    "ALMA_BUILDER_LIVE_E2E_CONFIRM_REQUIRED",
    `This controlled non-production Builder E2E may incur OpenAI and E2B usage. Set ALMA_BUILDER_LIVE_E2E_CONFIRM=${CONFIRM} to run exactly one test project and one build.`,
  );
}

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");
const userId = required("ALMA_BUILDER_E2E_USER_ID");
required("ALMA_BUILDER_ENGINE_ENABLED");
required("ALMA_BUILDER_E2B_TEMPLATE");
required("ALMA_BUILDER_GATEWAY_URL");
required("ALMA_BUILDER_GATEWAY_SIGNING_KEY");
required("ALMA_BUILDER_WORKER_SECRET");
required("ALMA_BUILDER_CODEX_MODEL");
required("ALMA_BUILDER_CODEX_WORKER_ISOLATED");
required("ALMA_BUILDER_PREVIEW_HOSTS");
required("E2B_API_KEY");

if (process.env.ALMA_BUILDER_E2B_TEMPLATE !== "alma-builder-node-lts") {
  safeExit(
    "ALMA_BUILDER_TEMPLATE_ALIAS_INVALID",
    "Use ALMA_BUILDER_E2B_TEMPLATE=alma-builder-node-lts for the controlled E2E.",
  );
}
if (process.env.ALMA_BUILDER_CODEX_WORKER_ISOLATED !== "true") {
  safeExit(
    "ALMA_BUILDER_WORKER_ISOLATION_REQUIRED",
    "ALMA_BUILDER_CODEX_WORKER_ISOLATED must be true.",
  );
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
const idempotencyKey = `builder-live-e2e-${randomUUID()}`;
const workspaceId = process.env.ALMA_BUILDER_E2E_WORKSPACE_ID?.trim() || null;
const startedAt = Date.now();

const { data: project, error: projectError } = await client
  .from("builder_projects")
  .insert({
    user_id: userId,
    workspace_id: workspaceId,
    title: "ALMA Builder Live E2E",
    slug: `alma-builder-live-e2e-${Date.now()}`,
    original_prompt:
      "Create a small, polished landing page for an ALMA Builder readiness check. Keep it simple and mobile responsive.",
    preferred_language: "en",
    project_type: "website",
    lifecycle_status: "draft",
    idempotency_key: idempotencyKey,
    starter_key: "landing_page",
    metadata: {
      liveE2E: true,
      starterKey: "landing_page",
      createdBy: "scripts/run-alma-builder-live-e2e.mjs",
    },
  })
  .select()
  .single();
if (projectError) {
  safeExit(
    "ALMA_BUILDER_LIVE_E2E_PROJECT_CREATE_FAILED",
    "Could not create test Builder project.",
  );
}

const { data: session, error: sessionError } = await client
  .from("builder_sessions")
  .insert({
    user_id: userId,
    workspace_id: workspaceId,
    project_id: project.id,
    status: "requested",
    metadata: { liveE2E: true },
  })
  .select()
  .single();
if (sessionError) {
  safeExit(
    "ALMA_BUILDER_LIVE_E2E_SESSION_CREATE_FAILED",
    "Could not create test Builder session.",
    {
      projectId: project.id,
    },
  );
}

const { data: job, error: jobError } = await client
  .from("builder_jobs")
  .insert({
    user_id: userId,
    workspace_id: workspaceId,
    project_id: project.id,
    session_id: session.id,
    idempotency_key: idempotencyKey,
    job_type: "build_application",
    status: "queued",
    max_attempts: 1,
    metadata: {
      liveE2E: true,
      starterKey: "landing_page",
      revisionPrompt:
        "This is a controlled ALMA Builder readiness run. Build one small responsive app only.",
    },
  })
  .select()
  .single();
if (jobError) {
  safeExit(
    "ALMA_BUILDER_LIVE_E2E_JOB_CREATE_FAILED",
    "Could not enqueue test Builder job.",
    {
      projectId: project.id,
      sessionId: session.id,
    },
  );
}

await client
  .from("builder_projects")
  .update({ active_session_id: session.id, lifecycle_status: "building" })
  .eq("id", project.id);

const child = spawn("npm", ["run", workerCommand], {
  stdio: ["ignore", "pipe", "pipe"],
  shell: process.platform === "win32",
  env: {
    ...process.env,
    ALMA_BUILDER_KEEP_PREVIEW_SANDBOX: "false",
  },
});

const timer = setTimeout(() => {
  child.kill("SIGTERM");
}, maxRuntimeMs);
child.stdout.resume();
child.stderr.resume();

const exitCode = await new Promise((resolve) => {
  child.on("exit", (code) => resolve(code ?? 1));
});
clearTimeout(timer);

const { data: finalJob } = await client
  .from("builder_jobs")
  .select("status,last_error_code,safe_error_summary,metadata")
  .eq("id", job.id)
  .single();
const { data: events } = await client
  .from("builder_events")
  .select("event_type,lifecycle_status,summary")
  .eq("project_id", project.id)
  .order("sequence", { ascending: true });

console.log(
  JSON.stringify(
    {
      ok: exitCode === 0 && finalJob?.status === "preview_ready",
      code: "ALMA_BUILDER_LIVE_E2E_COMPLETED",
      paidExternalOperation: true,
      projectId: project.id,
      sessionId: session.id,
      jobId: job.id,
      finalStatus: finalJob?.status,
      errorCode: finalJob?.last_error_code,
      elapsedMs: Date.now() - startedAt,
      events: (events ?? []).map((event) => ({
        type: event.event_type,
        status: event.lifecycle_status,
        summary: event.summary,
      })),
    },
    null,
    2,
  ),
);
process.exit(exitCode === 0 && finalJob?.status === "preview_ready" ? 0 : 1);
