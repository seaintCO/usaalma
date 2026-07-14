export type AgentLanguageMode = "en" | "es" | "auto";
export type AgentStatus = "active" | "paused" | "archived";
export type AgentAutonomyLevel = "manual" | "supervised" | "trusted";
export type AgentExecutionStatus = "pending" | "running" | "waiting_approval" | "completed" | "failed" | "cancelled";
export type AgentExecutionTrigger = "chat" | "manual" | "scheduled" | "event";
export type AgentStepKind = "plan" | "tool" | "approval" | "verification" | "reflection";
export type AgentStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type AgentApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type AgentPermissionEffect = "allow" | "deny" | "require_approval";
export type AgentActivityLevel = "info" | "success" | "warning" | "error";

export type AlmaAgent = {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  name: string;
  slug: string;
  status: AgentStatus;
  personality: string;
  system_instructions: string;
  language_mode: AgentLanguageMode;
  elevenlabs_voice_id?: string | null;
  autonomy_level: AgentAutonomyLevel;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AgentMemory = {
  id: string;
  agent_id: string;
  user_id: string;
  category: string;
  memory_key: string;
  memory_value: string;
  importance: number;
  source: string;
  confidence: number;
  expires_at?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AgentTask = {
  id: string;
  agent_id: string;
  user_id: string;
  title: string;
  instructions: string;
  status: "draft" | "active" | "paused" | "completed" | "failed";
  priority: "low" | "medium" | "high";
  schedule_type: "manual" | "once" | "recurring";
  schedule_expression?: string | null;
  next_run_at?: string | null;
  last_run_at?: string | null;
  failure_count: number;
  retry_after?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AgentExecution = {
  id: string;
  agent_id: string;
  task_id?: string | null;
  user_id: string;
  conversation_id?: string | null;
  trigger_type: AgentExecutionTrigger;
  intent?: string | null;
  status: AgentExecutionStatus;
  goal?: string | null;
  plan: Record<string, unknown>;
  result: Record<string, unknown>;
  error?: string | null;
  started_at: string;
  completed_at?: string | null;
  created_at: string;
};

export type AgentExecutionStep = {
  id: string;
  execution_id: string;
  sequence: number;
  kind: AgentStepKind;
  status: AgentStepStatus;
  tool_name?: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: string | null;
  attempt: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
};

export type AgentApproval = {
  id: string;
  agent_id: string;
  execution_id: string;
  execution_step_id?: string | null;
  user_id: string;
  status: AgentApprovalStatus;
  action_summary: string;
  tool_name?: string | null;
  arguments_redacted: Record<string, unknown>;
  requested_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  expires_at?: string | null;
};

export type AgentPermission = {
  id: string;
  agent_id: string;
  user_id: string;
  connection_id?: string | null;
  tool_name?: string | null;
  resource_scope?: string | null;
  action: string;
  effect: AgentPermissionEffect;
  conditions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AgentActivityLog = {
  id: string;
  agent_id: string;
  execution_id?: string | null;
  user_id: string;
  level: AgentActivityLevel;
  event_type: string;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AgentExecutionInput = {
  agentId: string;
  userId: string;
  conversationId?: string | null;
  triggerType: AgentExecutionTrigger;
  intent?: string | null;
  goal?: string | null;
  plan?: Record<string, unknown>;
};
