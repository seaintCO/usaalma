import type { MarketplaceCategory } from "@/lib/platform/marketplace/types";
import { WORKSPACE_ROUTES } from "@/lib/platform/workspaceRoutes";

export type AlmaPlanKey = "free" | "personal" | "starter" | "pro" | "business";

export type AlmaModuleGroup =
  "free_core" | "office" | "creator" | "studio" | "trader" | "fitness";

export type AlmaModuleReleaseStatus = "active" | "beta" | "coming_soon";

export type AlmaActionRisk = "internal" | "external" | "protected";

export type AlmaApprovalPolicy =
  "automatic" | "approval_required" | "always_protected";

export type AlmaModuleDefinition = {
  key: string;
  name: string;
  group: AlmaModuleGroup;
  category: MarketplaceCategory;
  description: string;
  releaseStatus: AlmaModuleReleaseStatus;
  requiredPlan: AlmaPlanKey;
  entitlementKey: string;
  route?: string;
  installKey?: string;
  legacyKeys?: readonly string[];
  capabilities: readonly string[];
  defaultRisk: AlmaActionRisk;
  approvalPolicy: AlmaApprovalPolicy;
  limitations?: readonly string[];
};

export const ALMA_MODULE_REGISTRY = [
  {
    key: "tasks",
    name: "Tasks",
    group: "free_core",
    category: "Productivity",
    description: "Organize owned work.",
    route: WORKSPACE_ROUTES.tasks,
    releaseStatus: "active",
    requiredPlan: "free",
    entitlementKey: "tasks",
    installKey: "tasks",
    capabilities: ["tasks.create", "tasks.read", "tasks.update"],
    defaultRisk: "internal",
    approvalPolicy: "automatic",
  },
  {
    key: "notes",
    name: "Notes",
    group: "free_core",
    category: "Productivity",
    description: "Capture and retrieve notes.",
    route: WORKSPACE_ROUTES.notes,
    releaseStatus: "active",
    requiredPlan: "free",
    entitlementKey: "notes",
    installKey: "notes",
    capabilities: [
      "notes.create",
      "notes.read",
      "notes.update",
      "notes.delete",
    ],
    defaultRisk: "internal",
    approvalPolicy: "approval_required",
  },
  {
    key: "planner",
    name: "Planner",
    group: "free_core",
    category: "Productivity",
    description: "Plan time, meetings, and reminders.",
    route: WORKSPACE_ROUTES.planner,
    releaseStatus: "active",
    requiredPlan: "free",
    entitlementKey: "planner",
    installKey: "planner",
    capabilities: ["planner.create", "planner.read", "planner.update"],
    defaultRisk: "internal",
    approvalPolicy: "automatic",
  },
  {
    key: "documents",
    name: "Documents",
    group: "free_core",
    category: "Productivity",
    description: "Store and work with owned documents.",
    route: WORKSPACE_ROUTES.documents,
    releaseStatus: "active",
    requiredPlan: "free",
    entitlementKey: "documents",
    installKey: "documents",
    capabilities: ["documents.create", "documents.read", "documents.update"],
    defaultRisk: "internal",
    approvalPolicy: "automatic",
  },
  {
    key: "communications",
    name: "Bilingual Communications",
    group: "free_core",
    category: "Communication",
    description:
      "Correct, translate, and prepare owned business messages in English and Spanish.",
    route: WORKSPACE_ROUTES.communications,
    releaseStatus: "active",
    requiredPlan: "free",
    entitlementKey: "communications",
    installKey: "communications",
    capabilities: [
      "communications.translate",
      "communications.correct",
      "communications.prepare_external_message",
    ],
    defaultRisk: "external",
    approvalPolicy: "approval_required",
    limitations: ["External sends still require the Approval Center."],
  },
  {
    key: "translator",
    name: "Translator",
    group: "free_core",
    category: "Communication",
    description: "Text and speech translation for English and Spanish.",
    route: WORKSPACE_ROUTES.translator,
    releaseStatus: "beta",
    requiredPlan: "free",
    entitlementKey: "communications",
    installKey: "translator",
    capabilities: ["translator.text", "translator.speech"],
    defaultRisk: "internal",
    approvalPolicy: "automatic",
  },
  {
    key: "voice",
    name: "Realtime Voice",
    group: "free_core",
    category: "Communication",
    description:
      "Talk with ALMA using a secure server-created realtime voice session.",
    releaseStatus: "beta",
    requiredPlan: "personal",
    entitlementKey: "voice",
    installKey: "voice",
    capabilities: ["voice.realtime", "voice.transcribe", "voice.speech"],
    defaultRisk: "external",
    approvalPolicy: "approval_required",
    limitations: [
      "External, financial, destructive, or state-changing voice requests still require approval.",
      "No raw audio is stored by default.",
    ],
  },
  {
    key: "workspaces",
    name: "Workspaces",
    group: "free_core",
    category: "Productivity",
    description: "Create and manage owned ALMA workspaces.",
    releaseStatus: "active",
    requiredPlan: "personal",
    entitlementKey: "workspaces",
    installKey: "workspaces",
    capabilities: ["workspaces.create", "workspaces.read"],
    defaultRisk: "internal",
    approvalPolicy: "automatic",
  },
  {
    key: "office",
    name: "Alma Office",
    group: "office",
    category: "Business",
    description:
      "Prepare customers, price books, estimates, approvals, and invoice handoff.",
    route: WORKSPACE_ROUTES.office,
    releaseStatus: "beta",
    requiredPlan: "business",
    entitlementKey: "office",
    installKey: "office",
    legacyKeys: ["crm", "invoicing"],
    capabilities: [
      "office.customers",
      "office.price_book",
      "office.estimates",
      "office.approvals",
    ],
    defaultRisk: "external",
    approvalPolicy: "approval_required",
    limitations: [
      "No QuickBooks or WhatsApp OAuth in this milestone.",
      "Payment links require a real connected provider.",
      "AI may use only saved service prices.",
    ],
  },
  {
    key: "crm",
    name: "CRM",
    group: "office",
    category: "Business",
    description: "Manage contacts, companies, and opportunities.",
    route: WORKSPACE_ROUTES.crm,
    releaseStatus: "active",
    requiredPlan: "business",
    entitlementKey: "crm",
    installKey: "crm",
    capabilities: ["crm.contacts", "crm.companies", "crm.opportunities"],
    defaultRisk: "internal",
    approvalPolicy: "automatic",
  },
  {
    key: "construction",
    name: "Construction Blueprint",
    group: "office",
    category: "Business",
    description:
      "Manual project takeoff and crew documentation with plan/photo upload, verified measurements, material estimates, scope notes, crew instructions, and private PDF export.",
    route: WORKSPACE_ROUTES.construction,
    releaseStatus: "beta",
    requiredPlan: "business",
    entitlementKey: "construction",
    installKey: "construction",
    capabilities: [
      "construction.projects",
      "construction.files",
      "construction.measurements",
      "construction.exports",
    ],
    defaultRisk: "internal",
    approvalPolicy: "automatic",
    limitations: [
      "No automatic takeoff, OCR, or scale detection.",
      "No engineering, architectural, or code-compliance approval.",
      "No supplier pricing or ordering.",
      "Measurements require field verification.",
      "Quantity and waste assumptions may vary.",
    ],
  },
  {
    key: "invoicing",
    name: "Invoices",
    group: "office",
    category: "Business",
    description: "Create and manage owned invoices.",
    route: WORKSPACE_ROUTES.invoicing,
    releaseStatus: "active",
    requiredPlan: "business",
    entitlementKey: "invoicing",
    installKey: "invoicing",
    capabilities: ["invoices.create", "invoices.read", "invoices.update"],
    defaultRisk: "external",
    approvalPolicy: "approval_required",
  },
  {
    key: "ai_receptionist",
    name: "AI Receptionist",
    group: "office",
    category: "Communication",
    description: "Configure ALMA receptionist capabilities.",
    releaseStatus: "beta",
    requiredPlan: "business",
    entitlementKey: "ai_receptionist",
    installKey: "ai_receptionist",
    capabilities: ["receptionist.configure", "receptionist.calls"],
    defaultRisk: "external",
    approvalPolicy: "approval_required",
  },
  {
    key: "images",
    name: "Images",
    group: "creator",
    category: "Creative",
    description: "Generate and manage owned visual assets.",
    route: WORKSPACE_ROUTES.images,
    releaseStatus: "active",
    requiredPlan: "personal",
    entitlementKey: "image_generator",
    installKey: "image_generator",
    legacyKeys: ["image_generator"],
    capabilities: ["images.generate", "images.edit", "images.assets"],
    defaultRisk: "internal",
    approvalPolicy: "automatic",
  },
  {
    key: "creative_studio",
    name: "Creative Studio",
    group: "creator",
    category: "Creative",
    description: "Create brand and campaign workspaces.",
    route: WORKSPACE_ROUTES.creative,
    releaseStatus: "beta",
    requiredPlan: "business",
    entitlementKey: "creative_studio",
    capabilities: ["creative.projects", "creative.assets"],
    defaultRisk: "internal",
    approvalPolicy: "automatic",
    limitations: ["Lifecycle management remains in beta."],
  },
  {
    key: "launch_studio",
    name: "Launch Studio",
    group: "studio",
    category: "Business",
    description: "Build and persist launch plans.",
    route: WORKSPACE_ROUTES.launch,
    releaseStatus: "beta",
    requiredPlan: "business",
    entitlementKey: "launch_studio",
    capabilities: ["launch.projects", "launch.exports"],
    defaultRisk: "external",
    approvalPolicy: "approval_required",
    limitations: ["Some project lifecycle workflows remain in beta."],
  },
  {
    key: "trader",
    name: "Trader",
    group: "trader",
    category: "Finance",
    description: "Record and review educational trading analysis.",
    route: WORKSPACE_ROUTES.trader,
    releaseStatus: "beta",
    requiredPlan: "business",
    entitlementKey: "trader",
    capabilities: ["trader.watchlist", "trader.analysis", "trader.journal"],
    defaultRisk: "protected",
    approvalPolicy: "always_protected",
    limitations: ["No live prices, brokerage execution, or investment advice."],
  },
  {
    key: "fitness",
    name: "Fitness",
    group: "fitness",
    category: "Fitness",
    description: "Track health and fitness records.",
    route: WORKSPACE_ROUTES.fitness,
    releaseStatus: "active",
    requiredPlan: "personal",
    entitlementKey: "fitness",
    capabilities: ["fitness.meals", "fitness.goals", "fitness.progress"],
    defaultRisk: "internal",
    approvalPolicy: "automatic",
  },
  {
    key: "agent_builder",
    name: "Agent Builder",
    group: "studio",
    category: "Developer",
    description:
      "Create persisted ALMA agents with scoped tools and approvals.",
    route: WORKSPACE_ROUTES.agents,
    releaseStatus: "beta",
    requiredPlan: "business",
    entitlementKey: "agent_builder",
    capabilities: ["agents.create", "agents.test", "agents.approvals"],
    defaultRisk: "external",
    approvalPolicy: "approval_required",
    limitations: [
      "No autonomous schedules.",
      "No multi-agent delegation.",
      "No unrestricted external actions.",
    ],
  },
  {
    key: "builder",
    name: "ALMA Builder",
    group: "studio",
    category: "Developer",
    description:
      "Describe a website, portal, internal tool, or lightweight app in English or Spanish and prepare it for an isolated Builder Engine.",
    route: WORKSPACE_ROUTES.builder,
    releaseStatus: "beta",
    requiredPlan: "business",
    entitlementKey: "builder",
    installKey: "builder",
    capabilities: [
      "builder.projects",
      "builder.sessions",
      "builder.events",
      "builder.approvals",
    ],
    defaultRisk: "protected",
    approvalPolicy: "always_protected",
    limitations: [
      "The isolated Builder Engine is not configured in this milestone.",
      "Blocked response code: BUILDER_ENGINE_NOT_CONFIGURED.",
      "No repositories, previews, deployments, or customer code execution are created yet.",
      "External Builder actions require approval before execution.",
    ],
  },
  {
    key: "automations",
    name: "Automations",
    group: "studio",
    category: "Developer",
    description: "Build automated workflows.",
    releaseStatus: "coming_soon",
    requiredPlan: "business",
    entitlementKey: "automations",
    installKey: "automations",
    capabilities: ["automations.design"],
    defaultRisk: "external",
    approvalPolicy: "approval_required",
    limitations: ["Not yet verified as an end-to-end release workflow."],
  },
] as const satisfies readonly AlmaModuleDefinition[];

export type AlmaModuleKey = (typeof ALMA_MODULE_REGISTRY)[number]["key"];

export function listAlmaModules(): readonly AlmaModuleDefinition[] {
  return ALMA_MODULE_REGISTRY;
}

export function resolveAlmaModuleKey(
  moduleKey: string,
): AlmaModuleDefinition | null {
  return (
    listAlmaModules().find(
      (definition) =>
        definition.key === moduleKey ||
        definition.entitlementKey === moduleKey ||
        definition.installKey === moduleKey ||
        definition.legacyKeys?.includes(moduleKey),
    ) ?? null
  );
}

export function isAlmaModuleKey(moduleKey: string): boolean {
  return Boolean(resolveAlmaModuleKey(moduleKey));
}
