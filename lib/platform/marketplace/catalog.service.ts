import { SubscriptionRepository } from "@/lib/db/repositories/billing/subscription.repository";
import { IntegrationRepository } from "@/lib/db/repositories/integrations/integration.repository";
import { ModuleRepository } from "@/lib/db/repositories/modules/module.repository";
import { OAuthRepository } from "@/lib/db/repositories/oauth/oauth.repository";
import type {
  MarketplaceAccessStatus,
  MarketplaceCatalogResponse,
  MarketplaceCategory,
  MarketplaceConnectionRecord,
  MarketplaceConnectionStatus,
  MarketplaceItem,
  MarketplaceReleaseStatus,
} from "./types";

type InternalModuleDefinition = {
  key: string;
  name: string;
  category: MarketplaceCategory;
  description: string;
  route?: string;
  releaseStatus: MarketplaceReleaseStatus;
  entitlementKey?: string;
  requiredPlan?: string;
  installKey?: string;
  limitations?: string[];
};

type ProviderDefinition = {
  key: string;
  name: string;
  category: MarketplaceCategory;
  description: string;
  providerKey?: string;
  releaseStatus: MarketplaceReleaseStatus;
  requiredScopes?: string[];
  setupRequirements?: string[];
  connectionKind: "oauth" | "custom" | "unavailable";
};

// This is intentionally metadata only. User-specific entitlement, installation, and
// connection state are resolved below from owned records.
const INTERNAL_MODULES: readonly InternalModuleDefinition[] = [
  {
    key: "tasks",
    name: "Tasks",
    category: "Productivity",
    description: "Organize owned work.",
    route: "/tasks",
    releaseStatus: "active",
    entitlementKey: "tasks",
    installKey: "tasks",
  },
  {
    key: "notes",
    name: "Notes",
    category: "Productivity",
    description: "Capture and retrieve notes.",
    route: "/notes",
    releaseStatus: "active",
    entitlementKey: "notes",
    installKey: "notes",
  },
  {
    key: "planner",
    name: "Planner",
    category: "Productivity",
    description: "Plan time, meetings, and reminders.",
    route: "/planner",
    releaseStatus: "active",
    entitlementKey: "planner",
  },
  {
    key: "documents",
    name: "Documents",
    category: "Productivity",
    description: "Store and work with owned documents.",
    route: "/documents",
    releaseStatus: "active",
    entitlementKey: "documents",
    installKey: "documents",
  },
  {
    key: "fitness",
    name: "Fitness",
    category: "Fitness",
    description: "Track health and fitness records.",
    route: "/fitness",
    releaseStatus: "active",
    entitlementKey: "fitness",
  },
  {
    key: "crm",
    name: "CRM",
    category: "Business",
    description: "Manage contacts, companies, and opportunities.",
    route: "/crm",
    releaseStatus: "active",
    entitlementKey: "crm",
    installKey: "crm",
    requiredPlan: "business",
  },
  {
    key: "invoicing",
    name: "Invoices",
    category: "Business",
    description: "Create and manage owned invoices.",
    route: "/invoicing",
    releaseStatus: "active",
    entitlementKey: "invoicing",
    installKey: "invoicing",
    requiredPlan: "business",
  },
  {
    key: "images",
    name: "Images",
    category: "Creative",
    description: "Generate and manage owned visual assets.",
    route: "/images",
    releaseStatus: "active",
    entitlementKey: "image_generator",
    installKey: "image_generator",
  },
  {
    key: "creative_studio",
    name: "Creative Studio",
    category: "Creative",
    description: "Create brand and campaign workspaces.",
    route: "/creative",
    releaseStatus: "beta",
    requiredPlan: "business",
    limitations: ["Lifecycle management remains in beta."],
  },
  {
    key: "launch_studio",
    name: "Launch Studio",
    category: "Business",
    description: "Build and persist launch plans.",
    route: "/launch-studio",
    releaseStatus: "beta",
    requiredPlan: "business",
    limitations: ["Some project lifecycle workflows remain in beta."],
  },
  {
    key: "trader",
    name: "Trader",
    category: "Finance",
    description: "Record and review educational trading analysis.",
    route: "/trader",
    releaseStatus: "beta",
    requiredPlan: "business",
    limitations: ["No live prices, brokerage execution, or investment advice."],
  },
  {
    key: "automations",
    name: "Automations",
    category: "Developer",
    description: "Build automated workflows.",
    releaseStatus: "coming_soon",
    entitlementKey: "automations",
    installKey: "automations",
    limitations: ["Not yet verified as an end-to-end release workflow."],
  },
];

const PROVIDERS: readonly ProviderDefinition[] = [
  {
    key: "google",
    name: "Google Workspace",
    category: "Communication",
    description: "Connect supported Google Workspace capabilities.",
    providerKey: "google_workspace",
    releaseStatus: "active",
    requiredScopes: ["Gmail", "Google Calendar", "Google Drive file access"],
    connectionKind: "oauth",
  },
  {
    key: "stripe",
    name: "Stripe",
    category: "Business",
    description: "Connect a Stripe account where supported.",
    providerKey: "stripe",
    releaseStatus: "active",
    requiredScopes: ["Stripe Connect read/write"],
    connectionKind: "oauth",
  },
  {
    key: "elevenlabs",
    name: "ElevenLabs",
    category: "Communication",
    description: "Configure voice synthesis for ALMA voice features.",
    providerKey: "elevenlabs",
    releaseStatus: "active",
    setupRequirements: ["An ElevenLabs API key and voice configuration"],
    connectionKind: "custom",
  },
  {
    key: "twilio",
    name: "Twilio",
    category: "Communication",
    description: "Configure phone and receptionist capabilities.",
    providerKey: "twilio",
    releaseStatus: "active",
    setupRequirements: ["Twilio account credentials and a phone number"],
    connectionKind: "custom",
  },
  {
    key: "github",
    name: "GitHub",
    category: "Developer",
    description: "Source control connection.",
    releaseStatus: "coming_soon",
    connectionKind: "unavailable",
  },
  {
    key: "slack",
    name: "Slack",
    category: "Communication",
    description: "Team communication connection.",
    releaseStatus: "coming_soon",
    connectionKind: "unavailable",
  },
  {
    key: "notion",
    name: "Notion",
    category: "Productivity",
    description: "Workspace knowledge connection.",
    releaseStatus: "coming_soon",
    connectionKind: "unavailable",
  },
  {
    key: "gmail",
    name: "Gmail",
    category: "Communication",
    description: "Email capability through Google Workspace.",
    providerKey: "google_workspace",
    releaseStatus: "coming_soon",
    requiredScopes: ["Gmail"],
    connectionKind: "unavailable",
  },
  {
    key: "google_calendar",
    name: "Google Calendar",
    category: "Productivity",
    description: "Calendar capability through Google Workspace.",
    providerKey: "google_workspace",
    releaseStatus: "coming_soon",
    requiredScopes: ["Google Calendar"],
    connectionKind: "unavailable",
  },
  {
    key: "google_drive",
    name: "Google Drive",
    category: "Productivity",
    description: "Drive capability through Google Workspace.",
    providerKey: "google_workspace",
    releaseStatus: "coming_soon",
    requiredScopes: ["Google Drive"],
    connectionKind: "unavailable",
  },
];

function hasActivePlan(
  subscription: { plan?: string | null; status?: string | null } | null,
) {
  return Boolean(
    subscription?.plan &&
    ["active", "trialing"].includes(subscription.status ?? ""),
  );
}

function accessForModule(
  definition: InternalModuleDefinition,
  plan: string | null,
  subscription: { plan?: string | null; status?: string | null } | null,
): MarketplaceAccessStatus {
  if (definition.releaseStatus === "coming_soon") return "unavailable";
  if (!plan || !hasActivePlan(subscription)) return "unavailable";
  if (!definition.requiredPlan) return "included";
  return plan === definition.requiredPlan ? "included" : "upgrade_required";
}

function connectionStatusFor(
  definition: ProviderDefinition,
  records: readonly MarketplaceConnectionRecord[],
  voiceProviders: ReadonlySet<string>,
): MarketplaceConnectionStatus {
  if (definition.connectionKind === "unavailable") return "coming_soon";
  const record = records.find(
    (item) => item.provider === definition.providerKey && !item.isMock,
  );
  const expiresAt = record?.expiresAt
    ? new Date(record.expiresAt).getTime()
    : 0;
  const hasUsableGoogleCredentials =
    definition.providerKey !== "google_workspace" ||
    Boolean(record?.hasRefreshToken || expiresAt > Date.now());
  if (
    record?.connected &&
    hasUsableGoogleCredentials &&
    record.status !== "reconnect_required" &&
    record.status !== "disconnected"
  )
    return "connected";
  if (
    record &&
    ["invalid", "disconnected", "reconnect_required", "expired"].includes(
      record.status ?? "",
    )
  )
    return "reconnect_required";
  if (
    definition.connectionKind === "custom" &&
    voiceProviders.has(definition.key)
  )
    return "connected";
  return definition.connectionKind === "oauth" ? "connect" : "setup_required";
}

export class MarketplaceCatalogService {
  static async getForUser(userId: string): Promise<MarketplaceCatalogResponse> {
    const [subscription, installedModuleKeys, connections, voiceProviders] =
      await Promise.all([
        SubscriptionRepository.get(userId),
        ModuleRepository.listInstalledKeys(userId),
        OAuthRepository.listConnectionStates(userId),
        IntegrationRepository.listConfiguredVoiceProviders(userId),
      ]);
    const plan = hasActivePlan(subscription)
      ? (subscription?.plan ?? null)
      : null;
    const installed = new Set(installedModuleKeys);
    const items: MarketplaceItem[] = [
      ...INTERNAL_MODULES.map((definition) => {
        const accessStatus = accessForModule(definition, plan, subscription);
        return {
          key: definition.key,
          name: definition.name,
          category: definition.category,
          itemType: "internal_module" as const,
          description: definition.description,
          releaseStatus: definition.releaseStatus,
          accessStatus,
          ...(definition.installKey && accessStatus === "included"
            ? {
                installStatus: installed.has(definition.installKey)
                  ? ("installed" as const)
                  : ("available" as const),
              }
            : {}),
          ...(definition.route ? { route: definition.route } : {}),
          ...(definition.requiredPlan
            ? { requiredPlan: definition.requiredPlan }
            : {}),
          ...(definition.limitations
            ? { limitations: definition.limitations }
            : {}),
        };
      }),
      ...PROVIDERS.map((definition) => {
        const connection = connections.find(
          (item) => item.provider === definition.providerKey && !item.isMock,
        );
        return {
          key: definition.key,
          name: definition.name,
          category: definition.category,
          itemType: "external_connection" as const,
          description: definition.description,
          releaseStatus: definition.releaseStatus,
          accessStatus:
            definition.releaseStatus === "coming_soon"
              ? ("unavailable" as const)
              : ("included" as const),
          connectionStatus: connectionStatusFor(
            definition,
            connections,
            new Set(voiceProviders),
          ),
          ...(definition.providerKey
            ? { providerKey: definition.providerKey }
            : {}),
          ...(definition.requiredScopes
            ? { requiredScopes: definition.requiredScopes }
            : {}),
          ...(connection?.grantedScopes?.length
            ? { grantedScopes: connection.grantedScopes }
            : {}),
          ...(definition.setupRequirements
            ? { setupRequirements: definition.setupRequirements }
            : {}),
          ...(connection?.providerAccountEmail
            ? { providerAccountEmail: connection.providerAccountEmail }
            : {}),
        };
      }),
    ];
    return { ok: true, items, currentPlan: plan };
  }
}
