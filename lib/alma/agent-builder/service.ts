import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeTool } from "@/lib/ai/tools/registry";
import {
  redactExecutionData,
  redactExecutionText,
} from "@/lib/alma/security/redactExecutionData";
import { ModuleRepository } from "@/lib/db/repositories/modules/module.repository";
import {
  AGENT_APPROVAL_MODES,
  AGENT_BUILDER_TOOLS,
  AGENT_CONNECTION_PROVIDERS,
  AGENT_TEMPLATES,
  DISALLOWED_ACTION_PATTERNS,
  SENSITIVE_TOOL_NAMES,
  isAgentLanguage,
  isAgentStatus,
  isApprovalMode,
  safeText,
  slugifyAgentName,
  toolByName,
  type AgentApprovalMode,
  type AgentBuilderTool,
} from "./catalog";

type AgentRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  status: "draft" | "active" | "paused" | "archived";
  role: string;
  description: string;
  personality: string;
  system_instructions: string;
  language_mode: "auto" | "en" | "es";
  autonomy_level: "manual" | "supervised" | "trusted";
  approval_mode: AgentApprovalMode;
  memory_enabled: boolean;
  voice_enabled: boolean;
  voice_provider: string | null;
  voice_id: string | null;
  elevenlabs_voice_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AgentPayload = {
  name?: unknown;
  role?: unknown;
  description?: unknown;
  instructions?: unknown;
  language?: unknown;
  status?: unknown;
  approvalMode?: unknown;
  memoryEnabled?: unknown;
  voiceEnabled?: unknown;
  voiceProvider?: unknown;
  voiceId?: unknown;
  templateKey?: unknown;
};

function safeError(code: string, message = code) {
  return { ok: false as const, error: { code, message } };
}

function normalizeAgent(row: AgentRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    role: row.role,
    description: row.description,
    instructions: row.system_instructions,
    language: row.language_mode,
    approvalMode: row.approval_mode,
    memoryEnabled: row.memory_enabled,
    voiceEnabled: row.voice_enabled,
    voiceProvider: row.voice_provider,
    voiceId: row.voice_id ?? row.elevenlabs_voice_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizePayload(input: AgentPayload) {
  const template =
    typeof input.templateKey === "string"
      ? AGENT_TEMPLATES.find((item) => item.key === input.templateKey)
      : null;
  const name = safeText(input.name, 120) || template?.name || "New Agent";
  const role = safeText(input.role, 120) || template?.role || "Assistant";
  const description =
    safeText(input.description, 600) || template?.description || "";
  const instructions =
    safeText(input.instructions, 8000) || template?.instructions || "";
  const language = isAgentLanguage(input.language)
    ? input.language
    : (template?.language ?? "auto");
  const status = isAgentStatus(input.status) ? input.status : "draft";
  const approvalMode = isApprovalMode(input.approvalMode)
    ? input.approvalMode
    : (template?.approvalMode ?? "ask_for_sensitive");
  const memoryEnabled =
    typeof input.memoryEnabled === "boolean"
      ? input.memoryEnabled
      : (template?.memoryEnabled ?? true);
  const voiceEnabled =
    typeof input.voiceEnabled === "boolean" ? input.voiceEnabled : false;
  const voiceProvider =
    input.voiceProvider === "elevenlabs" && voiceEnabled ? "elevenlabs" : null;
  const voiceId = voiceEnabled ? safeText(input.voiceId, 160) || null : null;
  return {
    name,
    role,
    description,
    instructions,
    language,
    status,
    approvalMode,
    memoryEnabled,
    voiceEnabled,
    voiceProvider,
    voiceId,
    template,
  };
}

async function ownedAgent(userId: string, agentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agentId)
    .eq("user_id", userId)
    .neq("status", "archived")
    .maybeSingle();
  if (error) throw error;
  return data as AgentRow | null;
}

async function uniqueSlug(userId: string, name: string) {
  const supabase = createAdminClient();
  const base = slugifyAgentName(name);
  for (let index = 0; index < 20; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`;
    const { data } = await supabase
      .from("agents")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function listAgents(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return {
    ok: true as const,
    agents: (data as AgentRow[]).map(normalizeAgent),
  };
}

export async function createAgent(userId: string, input: AgentPayload) {
  const payload = normalizePayload(input);
  const supabase = createAdminClient();
  const slug = await uniqueSlug(userId, payload.name);
  const { data, error } = await supabase
    .from("agents")
    .insert({
      user_id: userId,
      name: payload.name,
      slug,
      status: payload.status,
      role: payload.role,
      description: payload.description,
      personality: payload.role,
      system_instructions: payload.instructions,
      language_mode: payload.language,
      autonomy_level:
        payload.approvalMode === "trusted_tools_only"
          ? "trusted"
          : "supervised",
      approval_mode: payload.approvalMode,
      memory_enabled: payload.memoryEnabled,
      voice_enabled: payload.voiceEnabled,
      voice_provider: payload.voiceProvider,
      voice_id: payload.voiceId,
      elevenlabs_voice_id:
        payload.voiceProvider === "elevenlabs" ? payload.voiceId : null,
      metadata: {
        builder_version: 1,
        template_key: payload.template?.key ?? null,
        limitations: [
          "No autonomous schedules yet.",
          "No multi-agent delegation yet.",
          "No unrestricted external actions.",
        ],
      },
    })
    .select("*")
    .single();
  if (error) throw error;
  if (payload.template?.recommendedTools.length) {
    const available = await listAvailableTools(userId);
    const assignable = new Set(
      available.filter((tool) => tool.available).map((tool) => tool.name),
    );
    await assignTools(
      userId,
      data.id,
      payload.template.recommendedTools.filter(
        (name) => toolByName(name) && assignable.has(name),
      ),
    );
  }
  await recordActivity(userId, data.id, "agent_created", "Agent created.", {
    templateKey: payload.template?.key ?? null,
  });
  return { ok: true as const, agent: normalizeAgent(data as AgentRow) };
}

export async function getAgent(userId: string, agentId: string) {
  const agent = await ownedAgent(userId, agentId);
  if (!agent) return safeError("not_found", "Agent not found.");
  const [tools, connections, memories, activity] = await Promise.all([
    listAgentTools(userId, agentId),
    listAgentConnections(userId, agentId),
    listAgentMemory(userId, agentId),
    listActivity(userId, agentId),
  ]);
  return {
    ok: true as const,
    agent: normalizeAgent(agent),
    tools: tools.ok ? tools.tools : [],
    connections: connections.ok ? connections.connections : [],
    memories: memories.ok ? memories.memories : [],
    activity: activity.ok ? activity.activity : [],
  };
}

export async function updateAgent(
  userId: string,
  agentId: string,
  input: AgentPayload,
) {
  const agent = await ownedAgent(userId, agentId);
  if (!agent) return safeError("not_found", "Agent not found.");
  const payload = normalizePayload({
    name: input.name ?? agent.name,
    role: input.role ?? agent.role,
    description: input.description ?? agent.description,
    instructions: input.instructions ?? agent.system_instructions,
    language: input.language ?? agent.language_mode,
    status: input.status ?? agent.status,
    approvalMode: input.approvalMode ?? agent.approval_mode,
    memoryEnabled: input.memoryEnabled ?? agent.memory_enabled,
    voiceEnabled: input.voiceEnabled ?? agent.voice_enabled,
    voiceProvider: input.voiceProvider ?? agent.voice_provider,
    voiceId: input.voiceId ?? agent.voice_id ?? agent.elevenlabs_voice_id,
  });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .update({
      name: payload.name,
      role: payload.role,
      description: payload.description,
      personality: payload.role,
      system_instructions: payload.instructions,
      language_mode: payload.language,
      status: payload.status,
      approval_mode: payload.approvalMode,
      autonomy_level:
        payload.approvalMode === "trusted_tools_only"
          ? "trusted"
          : "supervised",
      memory_enabled: payload.memoryEnabled,
      voice_enabled: payload.voiceEnabled,
      voice_provider: payload.voiceProvider,
      voice_id: payload.voiceId,
      elevenlabs_voice_id:
        payload.voiceProvider === "elevenlabs" ? payload.voiceId : null,
    })
    .eq("id", agentId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  await recordActivity(userId, agentId, "agent_updated", "Agent updated.");
  return { ok: true as const, agent: normalizeAgent(data as AgentRow) };
}

export async function setAgentStatus(
  userId: string,
  agentId: string,
  status: "active" | "paused" | "archived",
) {
  const agent = await ownedAgent(userId, agentId);
  if (!agent) return safeError("not_found", "Agent not found.");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .update({ status })
    .eq("id", agentId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  await recordActivity(userId, agentId, `agent_${status}`, `Agent ${status}.`);
  return { ok: true as const, agent: normalizeAgent(data as AgentRow) };
}

export async function duplicateAgent(
  userId: string,
  agentId: string,
  idempotencyKey: string,
) {
  const agent = await ownedAgent(userId, agentId);
  if (!agent) return safeError("not_found", "Agent not found.");
  const supabase = createAdminClient();
  const duplicateKey =
    idempotencyKey && idempotencyKey.length >= 8
      ? idempotencyKey.slice(0, 160)
      : crypto.randomUUID();
  const { data: existing } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", userId)
    .eq("duplicate_idempotency_key", duplicateKey)
    .maybeSingle();
  if (existing) return { ok: true as const, agent: normalizeAgent(existing) };
  const slug = await uniqueSlug(userId, `${agent.name} copy`);
  const { data, error } = await supabase
    .from("agents")
    .insert({
      user_id: userId,
      name: `${agent.name} copy`,
      slug,
      status: "draft",
      role: agent.role,
      description: agent.description,
      personality: agent.personality,
      system_instructions: agent.system_instructions,
      language_mode: agent.language_mode,
      autonomy_level: agent.autonomy_level,
      approval_mode: agent.approval_mode,
      memory_enabled: agent.memory_enabled,
      voice_enabled: agent.voice_enabled,
      voice_provider: agent.voice_provider,
      voice_id: agent.voice_id,
      elevenlabs_voice_id: agent.elevenlabs_voice_id,
      duplicate_source_agent_id: agent.id,
      duplicate_idempotency_key: duplicateKey,
      metadata: { ...(agent.metadata ?? {}), duplicated_from: agent.id },
    })
    .select("*")
    .single();
  if (error) throw error;
  const tools = await listAgentTools(userId, agentId);
  if (tools.ok)
    await assignTools(
      userId,
      data.id,
      tools.tools.map((t) => t.name),
    );
  const connections = await listAgentConnections(userId, agentId);
  if (connections.ok)
    await assignConnections(
      userId,
      data.id,
      connections.connections.map((connection) => connection.id),
    );
  await recordActivity(
    userId,
    data.id,
    "agent_duplicated",
    "Agent duplicated.",
    {
      sourceAgentId: agent.id,
    },
  );
  return { ok: true as const, agent: normalizeAgent(data as AgentRow) };
}

export async function listAvailableTools(userId: string) {
  const supabase = createAdminClient();
  const [modules, { data: connections }] = await Promise.all([
    ModuleRepository.listInstalledKeys(userId),
    supabase
      .from("oauth_connections")
      .select("provider, connected, connection_status")
      .eq("user_id", userId),
  ]);
  const installed = new Set(modules);
  const verifiedProviders = new Set(
    (connections ?? [])
      .filter(
        (item) => item.connected && item.connection_status === "connected",
      )
      .map((item) => item.provider),
  );
  return (AGENT_BUILDER_TOOLS as readonly AgentBuilderTool[]).map((tool) => ({
    ...tool,
    available:
      !tool.unavailable &&
      !tool.disallowed &&
      (!tool.moduleKey || installed.has(tool.moduleKey)) &&
      (!tool.provider || verifiedProviders.has(tool.provider)),
    requiresConnection:
      Boolean(tool.provider) &&
      (!tool.provider || !verifiedProviders.has(tool.provider)),
  }));
}

export async function listAgentTools(userId: string, agentId: string) {
  const agent = await ownedAgent(userId, agentId);
  if (!agent) return safeError("not_found", "Agent not found.");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_permissions")
    .select("tool_name,effect,conditions")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .eq("action", "use_tool")
    .not("tool_name", "is", null);
  if (error) throw error;
  return {
    ok: true as const,
    tools: (data ?? []).map((item) => ({
      name: item.tool_name,
      effect: item.effect,
      conditions: item.conditions ?? {},
    })),
  };
}

export async function assignTools(
  userId: string,
  agentId: string,
  toolNames: string[],
) {
  const agent = await ownedAgent(userId, agentId);
  if (!agent) return safeError("not_found", "Agent not found.");
  const available = await listAvailableTools(userId);
  const allowed = new Map(available.map((tool) => [tool.name, tool]));
  const cleaned = [...new Set(toolNames.map((name) => safeText(name, 80)))];
  for (const name of cleaned) {
    const tool = allowed.get(name);
    if (!tool || !tool.available)
      return safeError("tool_unavailable", `Tool is unavailable: ${name}`);
  }
  const supabase = createAdminClient();
  await supabase
    .from("agent_permissions")
    .delete()
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .eq("action", "use_tool");
  if (cleaned.length) {
    const { error } = await supabase.from("agent_permissions").insert(
      cleaned.map((name) => {
        const tool = allowed.get(name)!;
        return {
          agent_id: agentId,
          user_id: userId,
          tool_name: name,
          action: "use_tool",
          effect:
            tool.sensitive || agent.approval_mode === "always_ask"
              ? "require_approval"
              : "allow",
          conditions: {
            sensitive: Boolean(tool.sensitive),
            group: tool.group,
            provider: tool.provider ?? null,
          },
        };
      }),
    );
    if (error) throw error;
  }
  await recordActivity(
    userId,
    agentId,
    "tools_assigned",
    "Tool permissions updated.",
    {
      tools: cleaned,
    },
  );
  return listAgentTools(userId, agentId);
}

export async function listVerifiedConnections(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("oauth_connections")
    .select(
      "id,provider,provider_account_email,metadata,connected,connection_status",
    )
    .eq("user_id", userId)
    .in("provider", [...AGENT_CONNECTION_PROVIDERS]);
  if (error) throw error;
  return (data ?? [])
    .filter(
      (connection) =>
        connection.connected && connection.connection_status === "connected",
    )
    .map((connection) => ({
      id: connection.id,
      provider: connection.provider,
      label:
        connection.provider_account_email ??
        (connection.metadata as { provider_account_label?: string } | null)
          ?.provider_account_label ??
        connection.provider,
    }));
}

export async function listAgentConnections(userId: string, agentId: string) {
  const agent = await ownedAgent(userId, agentId);
  if (!agent) return safeError("not_found", "Agent not found.");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_connection_assignments")
    .select(
      "connection_id,provider,oauth_connections(id,provider_account_email,metadata)",
    )
    .eq("user_id", userId)
    .eq("agent_id", agentId);
  if (error) throw error;
  return {
    ok: true as const,
    connections: (data ?? []).map((item) => {
      const connection = Array.isArray(item.oauth_connections)
        ? item.oauth_connections[0]
        : item.oauth_connections;
      return {
        id: item.connection_id,
        provider: item.provider,
        label:
          connection?.provider_account_email ??
          (connection?.metadata as { provider_account_label?: string } | null)
            ?.provider_account_label ??
          item.provider,
      };
    }),
  };
}

export async function assignConnections(
  userId: string,
  agentId: string,
  connectionIds: string[],
) {
  const agent = await ownedAgent(userId, agentId);
  if (!agent) return safeError("not_found", "Agent not found.");
  const verified = await listVerifiedConnections(userId);
  const allowed = new Map(
    verified.map((connection) => [connection.id, connection]),
  );
  const cleaned = [...new Set(connectionIds.map((id) => safeText(id, 80)))];
  for (const id of cleaned) {
    if (!allowed.has(id))
      return safeError("connection_unavailable", "Connection is not verified.");
  }
  const supabase = createAdminClient();
  await supabase
    .from("agent_connection_assignments")
    .delete()
    .eq("user_id", userId)
    .eq("agent_id", agentId);
  if (cleaned.length) {
    const { error } = await supabase
      .from("agent_connection_assignments")
      .insert(
        cleaned.map((id) => ({
          agent_id: agentId,
          user_id: userId,
          connection_id: id,
          provider: allowed.get(id)!.provider,
        })),
      );
    if (error) throw error;
  }
  await recordActivity(
    userId,
    agentId,
    "connections_assigned",
    "Connection assignments updated.",
  );
  return listAgentConnections(userId, agentId);
}

export async function listAgentMemory(userId: string, agentId: string) {
  const agent = await ownedAgent(userId, agentId);
  if (!agent) return safeError("not_found", "Agent not found.");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_memories")
    .select("id,category,memory_key,memory_value,importance,updated_at")
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return {
    ok: true as const,
    memories: data ?? [],
    summary: data?.length
      ? `${data.length} stored memories`
      : "No memories stored for this agent.",
  };
}

export async function clearMemory(
  userId: string,
  agentId: string,
  memoryId?: string,
) {
  const agent = await ownedAgent(userId, agentId);
  if (!agent) return safeError("not_found", "Agent not found.");
  const supabase = createAdminClient();
  const query = supabase
    .from("agent_memories")
    .delete()
    .eq("user_id", userId)
    .eq("agent_id", agentId);
  const { error } = memoryId ? await query.eq("id", memoryId) : await query;
  if (error) throw error;
  await recordActivity(
    userId,
    agentId,
    memoryId ? "memory_cleared" : "all_memory_cleared",
    memoryId ? "One memory cleared." : "All agent memory cleared.",
  );
  return listAgentMemory(userId, agentId);
}

export async function listActivity(userId: string, agentId: string) {
  const agent = await ownedAgent(userId, agentId);
  if (!agent) return safeError("not_found", "Agent not found.");
  const supabase = createAdminClient();
  const [
    { data: executions },
    { data: steps },
    { data: logs },
    { data: approvals },
  ] = await Promise.all([
    supabase
      .from("agent_executions")
      .select(
        "id,status,trigger_type,goal,result,error,started_at,completed_at,created_at",
      )
      .eq("user_id", userId)
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("agent_execution_steps")
      .select("id,execution_id,kind,status,tool_name,error,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("agent_activity_logs")
      .select("id,execution_id,level,event_type,summary,created_at")
      .eq("user_id", userId)
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("agent_approvals")
      .select("id,execution_id,status,action_summary,tool_name,requested_at")
      .eq("user_id", userId)
      .eq("agent_id", agentId)
      .order("requested_at", { ascending: false })
      .limit(20),
  ]);
  const executionIds = new Set((executions ?? []).map((item) => item.id));
  return {
    ok: true as const,
    activity: {
      executions: executions ?? [],
      steps: (steps ?? []).filter((step) =>
        executionIds.has(step.execution_id),
      ),
      logs: logs ?? [],
      approvals: approvals ?? [],
    },
  };
}

async function recordActivity(
  userId: string,
  agentId: string,
  eventType: string,
  summary: string,
  metadata: Record<string, unknown> = {},
) {
  const supabase = createAdminClient();
  await supabase.from("agent_activity_logs").insert({
    agent_id: agentId,
    user_id: userId,
    event_type: eventType,
    summary: redactExecutionText(summary) || "[REDACTED]",
    metadata: redactExecutionData(metadata),
  });
}

function detectRequestedTool(prompt: string, assignedTools: string[]) {
  const lower = prompt.toLowerCase();
  if (/email|gmail/.test(lower)) {
    if (assignedTools.includes("draft_gmail")) return "draft_gmail";
    if (assignedTools.includes("summarize_gmail")) return "summarize_gmail";
  }
  if (/invoice|factura/.test(lower) && assignedTools.includes("create_invoice"))
    return "create_invoice";
  if (
    /image|logo|visual/.test(lower) &&
    assignedTools.includes("generate_image")
  )
    return "generate_image";
  if (/task|tarea/.test(lower) && assignedTools.includes("create_task"))
    return "create_task";
  if (/note|nota/.test(lower) && assignedTools.includes("create_note"))
    return "create_note";
  if (/crm|contact|lead/.test(lower) && assignedTools.includes("list_crm"))
    return "list_crm";
  if (/trade|stock|symbol|journal|watchlist/.test(lower)) {
    return (
      assignedTools.find(
        (name) => name.includes("trading") || name.includes("watchlist"),
      ) ?? null
    );
  }
  return null;
}

export async function testAgent(
  userId: string,
  agentId: string,
  prompt: string,
) {
  const agent = await ownedAgent(userId, agentId);
  if (!agent) return safeError("not_found", "Agent not found.");
  const cleanPrompt = safeText(prompt, 2000);
  if (!cleanPrompt) return safeError("prompt_required", "Prompt is required.");
  const supabase = createAdminClient();
  const { data: execution, error } = await supabase
    .from("agent_executions")
    .insert({
      agent_id: agentId,
      user_id: userId,
      trigger_type: "manual",
      intent: "agent_builder_test",
      status: "running",
      goal: cleanPrompt,
      plan: { mode: "agent_builder_v1", agentRole: agent.role },
      result: {},
    })
    .select("*")
    .single();
  if (error) throw error;

  const tools = await listAgentTools(userId, agentId);
  const assignedTools = tools.ok ? tools.tools.map((tool) => tool.name) : [];
  const requestedTool = detectRequestedTool(cleanPrompt, assignedTools);
  const disallowed = DISALLOWED_ACTION_PATTERNS.test(cleanPrompt);
  const approvalRequired =
    disallowed ||
    agent.approval_mode === "always_ask" ||
    (requestedTool ? SENSITIVE_TOOL_NAMES.has(requestedTool) : false);

  await supabase.from("agent_execution_steps").insert({
    execution_id: execution.id,
    sequence: 1,
    kind: "plan",
    status: "completed",
    input: { prompt: "[REDACTED]", assignedTools },
    output: {
      requestedTool,
      approvalRequired,
      safeMode: true,
    },
  });

  if (approvalRequired) {
    const { data: approval } = await supabase
      .from("agent_approvals")
      .insert({
        agent_id: agentId,
        execution_id: execution.id,
        user_id: userId,
        status: "pending",
        action_summary: disallowed
          ? "Blocked or sensitive action requires explicit approval."
          : "Sensitive tool action requires approval.",
        tool_name: requestedTool,
        arguments_redacted: { prompt: "[REDACTED]" },
      })
      .select("*")
      .single();
    await supabase
      .from("agent_executions")
      .update({
        status: "waiting_approval",
        result: {
          approvalRequired: true,
          requestedTool,
          message:
            "This test reached an approval-required action and paused safely.",
        },
      })
      .eq("id", execution.id);
    await recordActivity(
      userId,
      agentId,
      "approval_required",
      "Test Agent paused for approval.",
      { executionId: execution.id, requestedTool },
    );
    return {
      ok: true as const,
      result: {
        status: "waiting_approval",
        executionId: execution.id,
        requestedTool,
        approval,
        message:
          "This test reached an approval-required action and paused safely.",
      },
    };
  }

  let toolResult: unknown = null;
  if (requestedTool) {
    await supabase.from("agent_execution_steps").insert({
      execution_id: execution.id,
      sequence: 2,
      kind: "tool",
      status: "running",
      tool_name: requestedTool,
      input: { prompt: "[REDACTED]" },
      output: {},
    });
    if (
      requestedTool === "list_tasks" ||
      requestedTool === "list_notes" ||
      requestedTool === "list_crm"
    ) {
      toolResult = await executeTool(
        userId,
        requestedTool,
        {},
        { executionId: execution.id },
      );
    } else {
      toolResult = {
        success: true,
        message:
          "Tool action was recognized. Mutating or external side effects are not executed automatically in Agent Builder V1 tests.",
      };
    }
    await supabase
      .from("agent_execution_steps")
      .update({
        status: "completed",
        output: redactExecutionData({ result: toolResult }),
        completed_at: new Date().toISOString(),
      })
      .eq("execution_id", execution.id)
      .eq("sequence", 2);
  }

  const final = `${agent.name} test completed safely. ${requestedTool ? `Requested tool: ${requestedTool}.` : "No tool action was required."}`;
  await supabase
    .from("agent_executions")
    .update({
      status: "completed",
      result: { final, requestedTool, toolResult },
      completed_at: new Date().toISOString(),
    })
    .eq("id", execution.id);
  await recordActivity(
    userId,
    agentId,
    "test_completed",
    "Test Agent completed.",
    {
      executionId: execution.id,
      requestedTool,
    },
  );
  return {
    ok: true as const,
    result: {
      status: "completed",
      executionId: execution.id,
      requestedTool,
      message: final,
      toolResult,
    },
  };
}

export function builderOptions() {
  return {
    ok: true as const,
    templates: AGENT_TEMPLATES,
    tools: AGENT_BUILDER_TOOLS,
    approvalModes: AGENT_APPROVAL_MODES,
  };
}
