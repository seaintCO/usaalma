import { IntegrationRepository } from "@/lib/db/repositories/integrations/integration.repository";
import { ModuleRepository } from "@/lib/db/repositories/modules/module.repository";
import { OAuthRepository } from "@/lib/db/repositories/oauth/oauth.repository";
import { EntitlementService } from "@/lib/platform/entitlements/service";
import { listAlmaModules } from "@/lib/platform/modules/registry";
import type {
  MarketplaceCatalogResponse,
  MarketplaceCategory,
  MarketplaceConnectionRecord,
  MarketplaceConnectionStatus,
  MarketplaceItem,
  MarketplaceReleaseStatus,
} from "./types";

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
    const [entitlements, installedModuleKeys, connections, voiceProviders] =
      await Promise.all([
        EntitlementService.getForUser(userId),
        ModuleRepository.listInstalledKeys(userId),
        OAuthRepository.listConnectionStates(userId),
        IntegrationRepository.listConfiguredVoiceProviders(userId),
      ]);
    const installed = new Set(installedModuleKeys);
    const accessByModuleKey = new Map(
      entitlements.modules.map((entitlement) => [
        entitlement.module.key,
        entitlement.accessStatus,
      ]),
    );
    const items: MarketplaceItem[] = [
      ...listAlmaModules().map((definition) => {
        const accessStatus =
          accessByModuleKey.get(definition.key) ?? "unavailable";
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
            ? { limitations: [...definition.limitations] }
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
          ...(connection?.providerAccountLabel
            ? { providerAccountLabel: connection.providerAccountLabel }
            : {}),
        };
      }),
    ];
    return { ok: true, items, currentPlan: entitlements.currentPlan };
  }
}
