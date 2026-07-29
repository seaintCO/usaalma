import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import {
  isBusinessEntityType,
  isUsState,
} from "@/lib/business-launch/officialResources";
import type {
  BusinessLaunchProject,
  BusinessLaunchTaskStatus,
} from "@/lib/business-launch/types";
import {
  AlmaWorkspaceAccessError,
  resolveTenantWorkspace,
} from "@/lib/platform/workspace/tenantResolver";
import { EntitlementService } from "@/lib/platform/entitlements/service";
import { createClient } from "@/lib/supabase/server";

const TASK_STATUSES = new Set<BusinessLaunchTaskStatus>([
  "not_started",
  "in_progress",
  "completed",
  "not_applicable",
]);
const REGISTERED_AGENT_STATUSES = new Set([
  "undecided",
  "self",
  "third_party",
  "confirmed",
]);
const STATE_FILING_STATUSES = new Set([
  "not_started",
  "in_progress",
  "submitted",
  "approved",
  "rejected",
]);
const EIN_STATUSES = new Set([
  "not_started",
  "in_progress",
  "received",
  "not_required",
]);
const BANK_STATUSES = new Set(["not_started", "in_progress", "opened"]);
const ACCOUNTING_STATUSES = new Set(["not_started", "in_progress", "ready"]);
const LICENSE_STATUSES = new Set([
  "not_reviewed",
  "in_progress",
  "complete",
  "not_required",
]);
const INSURANCE_STATUSES = new Set([
  "not_reviewed",
  "in_progress",
  "covered",
  "not_required",
]);
const LAUNCH_STATUSES = new Set([
  "planning",
  "filing",
  "operating",
  "paused",
]);
const DEADLINE_CADENCES = new Set([
  "one_time",
  "monthly",
  "quarterly",
  "annual",
  "custom",
]);
const DEADLINE_STATUSES = new Set(["upcoming", "completed", "dismissed"]);

const PROJECT_COLUMNS =
  "id,user_id,workspace_id,country,formation_state,entity_type,desired_name,legal_name,dba_name,business_purpose,industry,city,owner_count,registered_agent_status,state_filing_status,state_filing_number,formation_date,ein_status,ein_last_four,bank_status,accounting_status,licenses_status,insurance_status,launch_status,last_reviewed_at,archived_at,created_at,updated_at";
const TASK_COLUMNS =
  "id,project_id,user_id,workspace_id,code,stage,status,title,notes,due_date,official_url,sort_order,completed_at,created_at,updated_at";
const DEADLINE_COLUMNS =
  "id,project_id,user_id,workspace_id,name,due_date,cadence,status,official_url,notes,created_at,updated_at";

type UnknownBody = Record<string, unknown>;

function text(value: unknown, max = 500): string | null {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, max) : null;
}

function date(value: unknown): string | null {
  const normalized = text(value, 10);
  return normalized && /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? normalized
    : null;
}

function officialUrl(value: unknown): string | null {
  const normalized = text(value, 500);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".gov")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isSchemaUnavailable(error: { code?: string } | null): boolean {
  return ["42P01", "42703"].includes(String(error?.code ?? ""));
}

async function tenant(request: Request) {
  const user = await getCurrentUser();
  if (!user) return { response: unauthorized() } as const;
  const entitlement = await EntitlementService.checkModuleAccess(
    user.id,
    "business_launch",
  );
  if (entitlement?.accessStatus !== "included") {
    return {
      response: NextResponse.json(
        { ok: false, error: { code: "business_launch_plan_required" } },
        { status: 403 },
      ),
    } as const;
  }
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  try {
    const context = await resolveTenantWorkspace({
      userId: user.id,
      workspaceId,
    });
    if (context.scope === "workspace" && context.role !== "owner") {
      return {
        response: NextResponse.json(
          { ok: false, error: { code: "workspace_owner_required" } },
          { status: 403 },
        ),
      } as const;
    }
    return { user, context } as const;
  } catch (error) {
    const status =
      error instanceof AlmaWorkspaceAccessError &&
      error.code === "workspace_not_found"
        ? 404
        : 403;
    return {
      response: NextResponse.json(
        { ok: false, error: { code: "workspace_access_denied" } },
        { status },
      ),
    } as const;
  }
}

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: { code: "unauthorized" } },
    { status: 401 },
  );
}

function scoped<T>(
  query: T,
  workspaceId: string | null,
): T {
  const builder = query as {
    is: (column: string, value: null) => T;
    eq: (column: string, value: string) => T;
  };
  return workspaceId
    ? builder.eq("workspace_id", workspaceId)
    : builder.is("workspace_id", null);
}

async function readProject(input: {
  projectId: string;
  userId: string;
  workspaceId: string | null;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("business_launch_projects")
    .select(PROJECT_COLUMNS)
    .eq("id", input.projectId)
    .eq("user_id", input.userId)
    .is("archived_at", null);
  query = scoped(query, input.workspaceId);
  return query.maybeSingle();
}

export async function GET(request: Request) {
  const resolved = await tenant(request);
  if ("response" in resolved) return resolved.response;
  const { user, context } = resolved;
  const url = new URL(request.url);
  const requestedProjectId = text(url.searchParams.get("projectId"), 80);
  const supabase = await createClient();

  let projectQuery = supabase
    .from("business_launch_projects")
    .select(PROJECT_COLUMNS)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(20);
  projectQuery = scoped(projectQuery, context.workspaceId);
  const { data: projects, error: projectsError } = await projectQuery;
  if (projectsError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: isSchemaUnavailable(projectsError)
            ? "business_launch_schema_unavailable"
            : "business_launch_unavailable",
        },
      },
      { status: 503 },
    );
  }

  const selected =
    (projects as unknown as BusinessLaunchProject[] | null)?.find(
      (project) => project.id === requestedProjectId,
    ) ??
    (projects as unknown as BusinessLaunchProject[] | null)?.[0] ??
    null;
  if (!selected) {
    return NextResponse.json({ ok: true, projects: [], launch: null });
  }

  const [tasksResult, deadlinesResult] = await Promise.all([
    supabase
      .from("business_launch_tasks")
      .select(TASK_COLUMNS)
      .eq("project_id", selected.id)
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("business_compliance_deadlines")
      .select(DEADLINE_COLUMNS)
      .eq("project_id", selected.id)
      .eq("user_id", user.id)
      .order("due_date", { ascending: true }),
  ]);
  if (tasksResult.error || deadlinesResult.error) {
    return NextResponse.json(
      { ok: false, error: { code: "business_launch_details_unavailable" } },
      { status: 503 },
    );
  }
  return NextResponse.json({
    ok: true,
    projects: projects ?? [],
    launch: {
      project: selected,
      tasks: tasksResult.data ?? [],
      deadlines: deadlinesResult.data ?? [],
    },
  });
}

export async function POST(request: Request) {
  const resolved = await tenant(request);
  if ("response" in resolved) return resolved.response;
  const { user, context } = resolved;
  const body = (await request.json().catch(() => null)) as UnknownBody | null;
  const action = text(body?.action, 40) ?? "create_project";
  const supabase = await createClient();

  if (action === "create_deadline") {
    const projectId = text(body?.projectId, 80);
    const name = text(body?.name, 160);
    const dueDate = date(body?.dueDate);
    const cadence = text(body?.cadence, 20) ?? "one_time";
    const providedOfficialUrl = text(body?.officialUrl, 500);
    const verifiedOfficialUrl = officialUrl(providedOfficialUrl);
    if (
      !projectId ||
      !name ||
      !dueDate ||
      !DEADLINE_CADENCES.has(cadence) ||
      (providedOfficialUrl !== null && verifiedOfficialUrl === null)
    ) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_compliance_deadline" } },
        { status: 400 },
      );
    }
    const { data: project } = await readProject({
      projectId,
      userId: user.id,
      workspaceId: context.workspaceId,
    });
    if (!project) {
      return NextResponse.json(
        { ok: false, error: { code: "business_launch_not_found" } },
        { status: 404 },
      );
    }
    const { data, error } = await supabase
      .from("business_compliance_deadlines")
      .insert({
        project_id: projectId,
        user_id: user.id,
        workspace_id: context.workspaceId,
        name,
        due_date: dueDate,
        cadence,
        official_url: verifiedOfficialUrl,
        notes: text(body?.notes, 2000),
      })
      .select(DEADLINE_COLUMNS)
      .single();
    if (error) {
      return NextResponse.json(
        { ok: false, error: { code: "compliance_deadline_create_failed" } },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, deadline: data }, { status: 201 });
  }

  const formationState = String(body?.formationState ?? "")
    .trim()
    .toUpperCase();
  const entityType = String(body?.entityType ?? "undecided").trim();
  const desiredName = text(body?.desiredName, 160);
  const ownerCount = Number(body?.ownerCount ?? 1);
  if (
    !isUsState(formationState) ||
    !isBusinessEntityType(entityType) ||
    !desiredName ||
    !Number.isInteger(ownerCount) ||
    ownerCount < 1 ||
    ownerCount > 1000 ||
    body?.acknowledged !== true
  ) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_business_launch_project" } },
      { status: 400 },
    );
  }
  const { data, error } = await supabase
    .from("business_launch_projects")
    .insert({
      user_id: user.id,
      workspace_id: context.workspaceId,
      formation_state: formationState,
      entity_type: entityType,
      desired_name: desiredName,
      business_purpose: text(body?.businessPurpose, 2000),
      industry: text(body?.industry, 160),
      city: text(body?.city, 160),
      owner_count: ownerCount,
    })
    .select(PROJECT_COLUMNS)
    .single();
  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: isSchemaUnavailable(error)
            ? "business_launch_schema_unavailable"
            : "business_launch_create_failed",
        },
      },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, project: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const resolved = await tenant(request);
  if ("response" in resolved) return resolved.response;
  const { user, context } = resolved;
  const body = (await request.json().catch(() => null)) as UnknownBody | null;
  const kind = text(body?.kind, 30);
  const projectId = text(body?.projectId, 80);
  if (!kind || !projectId) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_business_launch_update" } },
      { status: 400 },
    );
  }
  const { data: project, error: projectError } = await readProject({
    projectId,
    userId: user.id,
    workspaceId: context.workspaceId,
  });
  if (projectError || !project) {
    return NextResponse.json(
      { ok: false, error: { code: "business_launch_not_found" } },
      { status: 404 },
    );
  }
  const supabase = await createClient();

  if (kind === "task") {
    const taskId = text(body?.taskId, 80);
    const status = text(body?.status, 30) as BusinessLaunchTaskStatus | null;
    if (!taskId || !status || !TASK_STATUSES.has(status)) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_business_launch_task" } },
        { status: 400 },
      );
    }
    const { data, error } = await supabase
      .from("business_launch_tasks")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        notes: text(body?.notes, 2000),
        due_date: date(body?.dueDate),
      })
      .eq("id", taskId)
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .select(TASK_COLUMNS)
      .single();
    if (error) {
      return NextResponse.json(
        { ok: false, error: { code: "business_launch_task_update_failed" } },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, task: data });
  }

  if (kind === "deadline") {
    const deadlineId = text(body?.deadlineId, 80);
    const status = text(body?.status, 30);
    if (!deadlineId || !status || !DEADLINE_STATUSES.has(status)) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_compliance_deadline" } },
        { status: 400 },
      );
    }
    const { data, error } = await supabase
      .from("business_compliance_deadlines")
      .update({ status })
      .eq("id", deadlineId)
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .select(DEADLINE_COLUMNS)
      .single();
    if (error) {
      return NextResponse.json(
        { ok: false, error: { code: "compliance_deadline_update_failed" } },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, deadline: data });
  }

  if (kind !== "project") {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_business_launch_update" } },
      { status: 400 },
    );
  }

  const values: Record<string, unknown> = {
    last_reviewed_at: new Date().toISOString(),
  };
  const optionalTextFields: [string, string, number][] = [
    ["legalName", "legal_name", 160],
    ["dbaName", "dba_name", 160],
    ["businessPurpose", "business_purpose", 2000],
    ["industry", "industry", 160],
    ["city", "city", 160],
    ["stateFilingNumber", "state_filing_number", 160],
  ];
  for (const [input, column, max] of optionalTextFields) {
    if (input in (body ?? {})) values[column] = text(body?.[input], max);
  }
  if ("formationDate" in (body ?? {}))
    values.formation_date = date(body?.formationDate);
  if ("einLastFour" in (body ?? {})) {
    const lastFour = text(body?.einLastFour, 4);
    if (lastFour && !/^\d{4}$/.test(lastFour)) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_ein_last_four" } },
        { status: 400 },
      );
    }
    values.ein_last_four = lastFour;
  }
  const enums: [string, string, Set<string>][] = [
    ["registeredAgentStatus", "registered_agent_status", REGISTERED_AGENT_STATUSES],
    ["stateFilingStatus", "state_filing_status", STATE_FILING_STATUSES],
    ["einStatus", "ein_status", EIN_STATUSES],
    ["bankStatus", "bank_status", BANK_STATUSES],
    ["accountingStatus", "accounting_status", ACCOUNTING_STATUSES],
    ["licensesStatus", "licenses_status", LICENSE_STATUSES],
    ["insuranceStatus", "insurance_status", INSURANCE_STATUSES],
    ["launchStatus", "launch_status", LAUNCH_STATUSES],
  ];
  for (const [input, column, allowed] of enums) {
    if (input in (body ?? {})) {
      const candidate = text(body?.[input], 40);
      if (!candidate || !allowed.has(candidate)) {
        return NextResponse.json(
          { ok: false, error: { code: "invalid_business_launch_update" } },
          { status: 400 },
        );
      }
      values[column] = candidate;
    }
  }
  if ("entityType" in (body ?? {})) {
    const entityType = text(body?.entityType, 40);
    if (!entityType || !isBusinessEntityType(entityType)) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_business_launch_update" } },
        { status: 400 },
      );
    }
    values.entity_type = entityType;
  }
  const { data, error } = await supabase
    .from("business_launch_projects")
    .update(values)
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select(PROJECT_COLUMNS)
    .single();
  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "business_launch_update_failed" } },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, project: data });
}
