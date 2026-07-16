import { toolDefinitions } from "@/lib/ai/tools/registry";

export const AGENT_STATUSES = ["draft", "active", "paused"] as const;
export const AGENT_LANGUAGES = ["auto", "en", "es"] as const;
export const AGENT_APPROVAL_MODES = [
  "always_ask",
  "ask_for_sensitive",
  "trusted_tools_only",
] as const;
export const AGENT_CONNECTION_PROVIDERS = [
  "google_workspace",
  "stripe",
] as const;

export type AgentBuilderStatus = (typeof AGENT_STATUSES)[number];
export type AgentBuilderLanguage = (typeof AGENT_LANGUAGES)[number];
export type AgentApprovalMode = (typeof AGENT_APPROVAL_MODES)[number];
export type AgentConnectionProvider =
  (typeof AGENT_CONNECTION_PROVIDERS)[number];
export type AgentToolGroup =
  | "Productivity"
  | "Business"
  | "Creative"
  | "Finance"
  | "Communication"
  | "Developer";

export type AgentBuilderTool = {
  name: string;
  label: string;
  group: AgentToolGroup;
  moduleKey?: string;
  provider?: AgentConnectionProvider;
  sensitive?: boolean;
  beta?: boolean;
  unavailable?: boolean;
  disallowed?: boolean;
  description: string;
};

const canonicalToolNames = new Set(toolDefinitions.map((tool) => tool.name));

const toolCatalog = [
  {
    name: "create_task",
    label: "Create tasks",
    group: "Productivity",
    moduleKey: "tasks",
    description: "Create owned tasks.",
  },
  {
    name: "list_tasks",
    label: "List tasks",
    group: "Productivity",
    moduleKey: "tasks",
    description: "Read owned tasks.",
  },
  {
    name: "update_task_status",
    label: "Update task status",
    group: "Productivity",
    moduleKey: "tasks",
    sensitive: true,
    description: "Complete, reopen, or cancel owned tasks.",
  },
  {
    name: "create_note",
    label: "Create notes",
    group: "Productivity",
    moduleKey: "notes",
    description: "Create owned notes.",
  },
  {
    name: "list_notes",
    label: "List notes",
    group: "Productivity",
    moduleKey: "notes",
    description: "Read owned notes.",
  },
  {
    name: "update_note",
    label: "Update notes",
    group: "Productivity",
    moduleKey: "notes",
    sensitive: true,
    description: "Update owned notes.",
  },
  {
    name: "delete_note",
    label: "Delete notes",
    group: "Productivity",
    moduleKey: "notes",
    sensitive: true,
    description: "Delete owned notes with approval.",
  },
  {
    name: "get_note",
    label: "Read note",
    group: "Productivity",
    moduleKey: "notes",
    description: "Read one owned note by title.",
  },
  {
    name: "create_document",
    label: "Create documents",
    group: "Productivity",
    moduleKey: "documents",
    description: "Create owned documents.",
  },
  {
    name: "create_contact",
    label: "Create contacts",
    group: "Business",
    moduleKey: "crm",
    description: "Create owned CRM contacts.",
  },
  {
    name: "create_company",
    label: "Create companies",
    group: "Business",
    moduleKey: "crm",
    description: "Create owned CRM companies.",
  },
  {
    name: "create_opportunity",
    label: "Create opportunities",
    group: "Business",
    moduleKey: "crm",
    description: "Create owned CRM opportunities.",
  },
  {
    name: "list_crm",
    label: "List CRM",
    group: "Business",
    moduleKey: "crm",
    description: "Read owned CRM data.",
  },
  {
    name: "update_opportunity_stage",
    label: "Update opportunities",
    group: "Business",
    moduleKey: "crm",
    sensitive: true,
    description: "Move an owned CRM opportunity stage.",
  },
  {
    name: "create_crm_activity",
    label: "Record activity",
    group: "Business",
    moduleKey: "crm",
    description: "Record owned CRM notes or activity.",
  },
  {
    name: "create_crm_follow_up",
    label: "Create CRM follow-up",
    group: "Business",
    moduleKey: "crm",
    description: "Create an owned follow-up task.",
  },
  {
    name: "create_invoice",
    label: "Create invoices",
    group: "Business",
    moduleKey: "invoicing",
    sensitive: true,
    description: "Create owned invoices.",
  },
  {
    name: "add_invoice_item",
    label: "Add invoice items",
    group: "Business",
    moduleKey: "invoicing",
    sensitive: true,
    description: "Add line items to owned invoices.",
  },
  {
    name: "update_invoice_item",
    label: "Update invoice items",
    group: "Business",
    moduleKey: "invoicing",
    sensitive: true,
    description: "Update line items on owned invoices.",
  },
  {
    name: "set_invoice_amounts",
    label: "Set invoice amounts",
    group: "Business",
    moduleKey: "invoicing",
    sensitive: true,
    description: "Set tax, discount, or due dates.",
  },
  {
    name: "list_unpaid_invoices",
    label: "List unpaid invoices",
    group: "Business",
    moduleKey: "invoicing",
    description: "Read owned unpaid invoices.",
  },
  {
    name: "get_invoice",
    label: "Read invoices",
    group: "Business",
    moduleKey: "invoicing",
    description: "Read one owned invoice.",
  },
  {
    name: "mark_invoice_paid",
    label: "Mark invoice paid",
    group: "Business",
    moduleKey: "invoicing",
    sensitive: true,
    description: "Mark an owned invoice paid.",
  },
  {
    name: "cancel_invoice",
    label: "Cancel invoices",
    group: "Business",
    moduleKey: "invoicing",
    sensitive: true,
    description: "Cancel an owned invoice.",
  },
  {
    name: "duplicate_invoice",
    label: "Duplicate invoices",
    group: "Business",
    moduleKey: "invoicing",
    description: "Duplicate an owned invoice.",
  },
  {
    name: "generate_image",
    label: "Generate images",
    group: "Creative",
    moduleKey: "image_generator",
    description: "Generate owned images.",
  },
  {
    name: "add_to_watchlist",
    label: "Add watchlist symbol",
    group: "Finance",
    moduleKey: "trader",
    beta: true,
    description: "Add an educational trading symbol to a watchlist.",
  },
  {
    name: "list_watchlist",
    label: "List watchlist",
    group: "Finance",
    moduleKey: "trader",
    beta: true,
    description: "Read the owned trading watchlist.",
  },
  {
    name: "save_trading_analysis",
    label: "Save trading analysis",
    group: "Finance",
    moduleKey: "trader",
    beta: true,
    description: "Save educational trading analysis. No trade execution.",
  },
  {
    name: "create_trading_journal_entry",
    label: "Create trading journal",
    group: "Finance",
    moduleKey: "trader",
    beta: true,
    description: "Create an educational trading journal entry.",
  },
  {
    name: "list_trading_journal",
    label: "List trading journal",
    group: "Finance",
    moduleKey: "trader",
    beta: true,
    description: "Read owned trading journal entries.",
  },
  {
    name: "analyze_trading_journal",
    label: "Analyze trading journal",
    group: "Finance",
    moduleKey: "trader",
    beta: true,
    description: "Summarize saved journal patterns.",
  },
  {
    name: "summarize_gmail",
    label: "Summarize Gmail",
    group: "Communication",
    provider: "google_workspace",
    description: "Read and summarize Gmail through a verified connection.",
  },
  {
    name: "draft_gmail",
    label: "Draft Gmail",
    group: "Communication",
    provider: "google_workspace",
    sensitive: true,
    description: "Create Gmail drafts through a verified connection.",
  },
  {
    name: "send_gmail",
    label: "Send Gmail",
    group: "Communication",
    provider: "google_workspace",
    sensitive: true,
    unavailable: true,
    description: "Unrestricted email sending is disabled in V1.",
  },
  {
    name: "create_receptionist",
    label: "Create receptionist",
    group: "Communication",
    moduleKey: "ai_receptionist",
    sensitive: true,
    description: "Configure owned receptionist records.",
  },
  {
    name: "create_workflow",
    label: "Create workflows",
    group: "Developer",
    unavailable: true,
    description: "Autonomous workflows are not exposed in Agent Builder V1.",
  },
  {
    name: "run_workflow",
    label: "Run workflows",
    group: "Developer",
    unavailable: true,
    description: "Autonomous workflow execution is not exposed in V1.",
  },
] satisfies AgentBuilderTool[];

export const AGENT_BUILDER_TOOLS = toolCatalog.filter((tool) =>
  canonicalToolNames.has(tool.name),
);

export const SENSITIVE_TOOL_NAMES = new Set(
  AGENT_BUILDER_TOOLS.filter((tool) => tool.sensitive).map((tool) => tool.name),
);

export const DISALLOWED_ACTION_PATTERNS =
  /\b(send\s+email|send\s+gmail|transfer|payment|pay\s|brokerage|place\s+(a\s+)?trade|buy\s+\d|sell\s+\d|market\s+order|limit\s+order|delete\s+everything|disconnect)\b/i;

export const AGENT_TEMPLATES = [
  {
    key: "executive_assistant",
    name: "Executive Assistant",
    role: "Executive Assistant",
    description:
      "Keeps priorities, notes, follow-ups, and decisions organized.",
    instructions:
      "Help the user stay organized. Prefer concise summaries, next actions, and careful follow-up tracking. Ask before destructive or external actions.",
    recommendedTools: [
      "create_task",
      "list_tasks",
      "create_note",
      "list_notes",
    ],
    approvalMode: "ask_for_sensitive",
    memoryEnabled: true,
    language: "auto",
  },
  {
    key: "marketing_director",
    name: "Marketing Director",
    role: "Marketing Director",
    description: "Plans campaigns, creative briefs, and content ideas.",
    instructions:
      "Help plan positioning, campaigns, creative briefs, and content. Keep brand strategy clear and practical.",
    recommendedTools: ["create_note", "list_notes", "generate_image"],
    approvalMode: "ask_for_sensitive",
    memoryEnabled: true,
    language: "auto",
  },
  {
    key: "sales_manager",
    name: "Sales Manager",
    role: "Sales Manager",
    description: "Manages CRM follow-ups, pipeline notes, and outreach prep.",
    instructions:
      "Help manage opportunities, contacts, follow-ups, and sales notes. Draft external messaging only; ask before sending.",
    recommendedTools: [
      "create_contact",
      "list_crm",
      "create_crm_follow_up",
      "draft_gmail",
    ],
    approvalMode: "ask_for_sensitive",
    memoryEnabled: true,
    language: "auto",
  },
  {
    key: "fitness_coach",
    name: "Fitness Coach",
    role: "Fitness Coach",
    description: "Supports health goals with safe planning and tracking.",
    instructions:
      "Help the user stay consistent with fitness goals. Avoid medical claims and encourage professional advice for health decisions.",
    recommendedTools: ["create_task", "create_note"],
    approvalMode: "ask_for_sensitive",
    memoryEnabled: true,
    language: "auto",
  },
  {
    key: "trading_analyst",
    name: "Trading Analyst",
    role: "Trading Analyst",
    description: "Reviews educational trading notes and watchlists.",
    instructions:
      "Provide educational analysis only. Never place trades, recommend brokerage orders, or promise returns.",
    recommendedTools: [
      "list_watchlist",
      "save_trading_analysis",
      "analyze_trading_journal",
    ],
    approvalMode: "always_ask",
    memoryEnabled: false,
    language: "auto",
  },
  {
    key: "receptionist",
    name: "Receptionist",
    role: "Receptionist",
    description: "Helps prepare receptionist scripts and call workflows.",
    instructions:
      "Help create safe receptionist scripts and business intake notes. Ask before external communication or publishing.",
    recommendedTools: ["create_note", "create_receptionist"],
    approvalMode: "always_ask",
    memoryEnabled: true,
    language: "auto",
  },
  {
    key: "tutor",
    name: "Tutor",
    role: "Tutor",
    description: "Explains topics, creates study plans, and tracks learning.",
    instructions:
      "Teach clearly and patiently. Break topics into steps and create study tasks when helpful.",
    recommendedTools: ["create_task", "create_note", "create_document"],
    approvalMode: "ask_for_sensitive",
    memoryEnabled: true,
    language: "auto",
  },
] as const;

export function isAgentStatus(value: unknown): value is AgentBuilderStatus {
  return AGENT_STATUSES.includes(value as AgentBuilderStatus);
}

export function isAgentLanguage(value: unknown): value is AgentBuilderLanguage {
  return AGENT_LANGUAGES.includes(value as AgentBuilderLanguage);
}

export function isApprovalMode(value: unknown): value is AgentApprovalMode {
  return AGENT_APPROVAL_MODES.includes(value as AgentApprovalMode);
}

export function slugifyAgentName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug || "agent";
}

export function safeText(value: unknown, max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function toolByName(name: string) {
  return AGENT_BUILDER_TOOLS.find((tool) => tool.name === name) ?? null;
}
