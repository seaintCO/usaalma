import type {
  MarketplaceAccessStatus,
  MarketplaceCategory,
  MarketplaceConnectionStatus,
  MarketplaceInstallStatus,
  MarketplaceItem,
  MarketplaceReleaseStatus,
} from "@/lib/platform/marketplace/types";

export type MarketplaceLanguage = "en" | "es";

const COPY = {
  en: {
    back: "Back to ALMA",
    eyebrow: "Marketplace",
    title: "Connect the parts of ALMA that are ready for your workspace.",
    description:
      "Browse real ALMA modules and provider connections. Availability reflects your current plan and saved workspace state.",
    modules: "ALMA Modules",
    connections: "Connections",
    search: "Search marketplace",
    category: "Category",
    release: "Release",
    status: "Status",
    all: "All",
    loading: "Loading your marketplace...",
    retry: "Retry",
    empty: "No marketplace items match these filters.",
    unavailable: "The marketplace is temporarily unavailable.",
    open: "Open",
    install: "Install",
    installing: "Installing...",
    installed: "Installed",
    upgrade: "Upgrade Required",
    comingSoon: "Coming Soon",
    connect: "Connect",
    connected: "Connected",
    disconnect: "Disconnect",
    reconnect: "Reconnect",
    requiresSetup: "Requires Setup",
    details: "Details",
    close: "Close",
    limitations: "Limitations",
    permissions: "Permissions",
    setup: "Setup requirements",
    requiredPlan: "Required plan",
    included: "Included",
    available: "Available",
    active: "Active",
    beta: "Beta",
    connection: "Connection",
    module: "Module",
    account: "Connected account",
    installFailed: "ALMA could not install this module. Please try again.",
  },
  es: {
    back: "Volver a ALMA",
    eyebrow: "Marketplace",
    title:
      "Conecta las partes de ALMA que estan listas para tu espacio de trabajo.",
    description:
      "Explora modulos reales de ALMA y conexiones de proveedores. La disponibilidad refleja tu plan actual y el estado guardado de tu espacio.",
    modules: "Modulos de ALMA",
    connections: "Conexiones",
    search: "Buscar en Marketplace",
    category: "Categoria",
    release: "Lanzamiento",
    status: "Estado",
    all: "Todos",
    loading: "Cargando tu Marketplace...",
    retry: "Reintentar",
    empty: "Ningun elemento coincide con estos filtros.",
    unavailable: "Marketplace no esta disponible temporalmente.",
    open: "Abrir",
    install: "Instalar",
    installing: "Instalando...",
    installed: "Instalado",
    upgrade: "Requiere mejora",
    comingSoon: "Proximamente",
    connect: "Conectar",
    connected: "Conectado",
    disconnect: "Desconectar",
    reconnect: "Reconectar",
    requiresSetup: "Requiere configuracion",
    details: "Detalles",
    close: "Cerrar",
    limitations: "Limitaciones",
    permissions: "Permisos",
    setup: "Requisitos de configuracion",
    requiredPlan: "Plan requerido",
    included: "Incluido",
    available: "Disponible",
    active: "Activo",
    beta: "Beta",
    connection: "Conexion",
    module: "Modulo",
    account: "Cuenta conectada",
    installFailed: "ALMA no pudo instalar este modulo. Intentalo de nuevo.",
  },
} as const;

export type MarketplaceCopy = (typeof COPY)[MarketplaceLanguage];

export function getMarketplaceCopy(
  language: MarketplaceLanguage,
): MarketplaceCopy {
  return COPY[language];
}

export function releaseLabel(
  value: MarketplaceReleaseStatus,
  copy: MarketplaceCopy,
) {
  return value === "active"
    ? copy.active
    : value === "beta"
      ? copy.beta
      : copy.comingSoon;
}

export function accessLabel(
  value: MarketplaceAccessStatus,
  copy: MarketplaceCopy,
) {
  return value === "included"
    ? copy.included
    : value === "upgrade_required"
      ? copy.upgrade
      : copy.unavailable;
}

export function installLabel(
  value: MarketplaceInstallStatus,
  copy: MarketplaceCopy,
) {
  return value === "installed" ? copy.installed : copy.available;
}

export function connectionLabel(
  value: MarketplaceConnectionStatus,
  copy: MarketplaceCopy,
) {
  switch (value) {
    case "connected":
      return copy.connected;
    case "reconnect_required":
      return copy.reconnect;
    case "setup_required":
      return copy.requiresSetup;
    case "upgrade_required":
      return copy.upgrade;
    case "coming_soon":
      return copy.comingSoon;
    default:
      return copy.connect;
  }
}

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  "Productivity",
  "Business",
  "Finance",
  "Fitness",
  "Creative",
  "Communication",
  "Developer",
];

const ITEM_COPY: Partial<
  Record<
    MarketplaceLanguage,
    Partial<Record<string, Pick<MarketplaceItem, "name" | "description">>>
  >
> = {
  es: {
    construction: {
      name: "Construction Blueprint",
      description:
        "Takeoff manual de proyectos y documentacion de equipo con planos/fotos, medidas verificadas, estimaciones de materiales, alcance, instrucciones de equipo y PDF privado.",
    },
  },
};

const LIMITATION_COPY: Partial<
  Record<MarketplaceLanguage, Partial<Record<string, string[]>>>
> = {
  es: {
    construction: [
      "Sin takeoff automatico, OCR ni deteccion de escala.",
      "No es aprobacion de ingenieria, arquitectura ni codigo.",
      "Sin precios de proveedores ni ordenes de compra.",
      "Las medidas requieren verificacion en campo.",
      "Las cantidades y factores de desperdicio pueden variar.",
    ],
  },
};

export function localizeMarketplaceItem(
  item: MarketplaceItem,
  language: MarketplaceLanguage,
): MarketplaceItem {
  const itemCopy = ITEM_COPY[language]?.[item.key];
  const limitations = LIMITATION_COPY[language]?.[item.key];
  return {
    ...item,
    ...(itemCopy ?? {}),
    ...(limitations ? { limitations } : {}),
  };
}
