export type MarketplaceCategory =
  | "Productivity"
  | "Business"
  | "Finance"
  | "Fitness"
  | "Creative"
  | "Communication"
  | "Developer";

export type MarketplaceItemType = "internal_module" | "external_connection";

export type MarketplaceReleaseStatus = "active" | "beta" | "coming_soon";

export type MarketplaceAccessStatus =
  "included" | "upgrade_required" | "unavailable";

export type MarketplaceInstallStatus = "available" | "installed";

export type MarketplaceConnectionStatus =
  | "connect"
  | "connected"
  | "reconnect_required"
  | "setup_required"
  | "coming_soon"
  | "upgrade_required";

export type MarketplaceItem = {
  key: string;
  name: string;
  category: MarketplaceCategory;
  itemType: MarketplaceItemType;
  description: string;
  releaseStatus: MarketplaceReleaseStatus;
  accessStatus: MarketplaceAccessStatus;
  installStatus?: MarketplaceInstallStatus;
  connectionStatus?: MarketplaceConnectionStatus;
  route?: string;
  providerKey?: string;
  requiredPlan?: string;
  requiredScopes?: string[];
  grantedScopes?: string[];
  setupRequirements?: string[];
  limitations?: string[];
  providerAccountEmail?: string;
};

export type MarketplaceCatalogResponse = {
  ok: true;
  items: MarketplaceItem[];
  currentPlan: string | null;
};

export type MarketplaceCatalogErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type MarketplaceConnectionRecord = {
  provider: string;
  connected: boolean;
  status?: string | null;
  isMock: boolean;
  expiresAt?: string | null;
  hasRefreshToken?: boolean;
  providerAccountEmail?: string | null;
  grantedScopes?: string[];
};
