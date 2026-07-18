"use client";

import { AppWindow, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import type {
  MarketplaceCatalogResponse,
  MarketplaceItem,
} from "@/lib/platform/marketplace/types";

type GroupKey =
  "free_core" | "office" | "creator" | "studio" | "trader" | "fitness";

type LoadState = "loading" | "ready" | "auth" | "error";

const GROUP_LABELS: Record<
  AlmaShellLanguage,
  Record<GroupKey, { title: string; description: string }>
> = {
  en: {
    free_core: {
      title: "Free/Core",
      description: "Everyday tools ALMA can use as a foundation.",
    },
    office: {
      title: "Office",
      description: "Customers, estimates, invoices, and field-ready work.",
    },
    creator: {
      title: "Creator",
      description: "Image and creative production surfaces.",
    },
    studio: {
      title: "Studio",
      description: "Launch, agent, and automation workspaces.",
    },
    trader: {
      title: "Trader",
      description: "Educational market analysis and journal tools.",
    },
    fitness: {
      title: "Fitness",
      description: "Nutrition, goals, meals, and progress tracking.",
    },
  },
  es: {
    free_core: {
      title: "Gratis/Core",
      description: "Herramientas diarias que ALMA puede usar como base.",
    },
    office: {
      title: "Office",
      description: "Clientes, estimados, facturas y trabajo de campo.",
    },
    creator: {
      title: "Creator",
      description: "Superficies para imagenes y produccion creativa.",
    },
    studio: {
      title: "Studio",
      description: "Espacios de lanzamiento, agentes y automatizacion.",
    },
    trader: {
      title: "Trader",
      description: "Analisis educativo de mercado y diario privado.",
    },
    fitness: {
      title: "Fitness",
      description: "Nutricion, metas, comidas y progreso.",
    },
  },
};

const COPY = {
  en: {
    title: "Apps",
    subtitle: "Available ALMA apps for your account.",
    loading: "Loading apps...",
    error: "Apps are temporarily unavailable.",
    auth: "Sign in to view the apps available for your account.",
    retry: "Retry",
    open: "Open",
    included: "Included",
    active: "Active",
    upgrade: "Upgrade required",
    comingSoon: "Coming soon",
    unavailable: "Unavailable",
  },
  es: {
    title: "Apps",
    subtitle: "Apps de ALMA disponibles en tu cuenta.",
    loading: "Cargando apps...",
    error: "Apps no esta disponible temporalmente.",
    auth: "Inicia sesion para ver las apps disponibles en tu cuenta.",
    retry: "Reintentar",
    open: "Abrir",
    included: "Incluido",
    active: "Activo",
    upgrade: "Requiere mejora",
    comingSoon: "Proximamente",
    unavailable: "No disponible",
  },
} as const;

type AppsCopy = (typeof COPY)[keyof typeof COPY];

function statusLabel(item: MarketplaceItem, copy: AppsCopy) {
  if (item.releaseStatus === "coming_soon") return copy.comingSoon;
  if (item.installStatus === "installed") return copy.active;
  if (item.accessStatus === "included") return copy.included;
  if (item.accessStatus === "upgrade_required") return copy.upgrade;
  return copy.unavailable;
}

function statusClass(item: MarketplaceItem) {
  if (item.releaseStatus === "coming_soon")
    return "border-[#E5E7EB] text-[#6B7280]";
  if (item.installStatus === "installed") return "border-black text-black";
  if (item.accessStatus === "included")
    return "border-green-200 text-green-700";
  if (item.accessStatus === "upgrade_required")
    return "border-[#E5E7EB] text-black";
  return "border-[#E5E7EB] text-[#6B7280]";
}

export default function AppsPage() {
  const [language, setLanguage] = useState<AlmaShellLanguage>("en");
  const [catalog, setCatalog] = useState<MarketplaceCatalogResponse | null>(
    null,
  );
  const [state, setState] = useState<LoadState>("loading");
  const copy = COPY[language];

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [catalogResponse, languageResponse] = await Promise.all([
        fetch("/api/marketplace/catalog", { cache: "no-store" }),
        fetch("/api/settings/language", { cache: "no-store" }),
      ]);
      const payload = (await catalogResponse.json()) as
        MarketplaceCatalogResponse | { ok: false; error?: { code?: string } };
      if (catalogResponse.status === 401) {
        setCatalog(null);
        setState("auth");
      } else if (!catalogResponse.ok || payload.ok === false) {
        setCatalog(null);
        setState("error");
      } else {
        setCatalog(payload);
        setState("ready");
      }
      if (languageResponse.ok) {
        const languagePayload = await languageResponse.json();
        setLanguage(languagePayload.language === "es" ? "es" : "en");
      }
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const items = (catalog?.items ?? []).filter(
      (item) => item.itemType === "internal_module",
    );
    return items.reduce<Record<GroupKey, MarketplaceItem[]>>(
      (accumulator, item) => {
        const group = (item.group ?? "free_core") as GroupKey;
        if (accumulator[group]) accumulator[group].push(item);
        return accumulator;
      },
      {
        free_core: [],
        office: [],
        creator: [],
        studio: [],
        trader: [],
        fitness: [],
      },
    );
  }, [catalog?.items]);

  return (
    <AlmaShell
      language={language}
      activeWorkspace="apps"
      title={copy.title}
      onLanguageChange={setLanguage}
    >
      <div className="min-h-full px-4 pb-24 pt-6 text-[#111111] md:px-8 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white">
              <AppWindow className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              {copy.title}
            </h1>
            <p
              className="mt-3 w-full max-w-full break-words text-sm leading-6 text-[#6B7280] md:max-w-2xl md:text-base"
              style={{ maxWidth: "min(42rem, calc(100vw - 2rem))" }}
            >
              {copy.subtitle}
            </p>
          </header>

          {state === "loading" ? (
            <div className="flex items-center gap-2 rounded-xl bg-white p-4 text-sm text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {copy.loading}
            </div>
          ) : null}

          {state === "auth" || state === "error" ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <p className="text-sm text-[#6B7280]">
                {state === "auth" ? copy.auth : copy.error}
              </p>
              {state === "error" ? (
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-black px-3 text-sm font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  {copy.retry}
                </button>
              ) : null}
            </div>
          ) : null}

          {state === "ready" && catalog ? (
            <div className="space-y-8">
              {(Object.keys(grouped) as GroupKey[]).map((group) => {
                const meta = GROUP_LABELS[language][group];
                return (
                  <section key={group}>
                    <div className="mb-3">
                      <h2 className="text-lg font-semibold">{meta.title}</h2>
                      <p className="text-sm text-[#6B7280]">
                        {meta.description}
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {grouped[group].map((item) => (
                        <article
                          key={item.key}
                          className="min-w-0 rounded-xl border border-[#E5E7EB] bg-white p-4"
                        >
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-semibold">
                                {item.name}
                              </h3>
                              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#6B7280]">
                                {item.description}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${statusClass(item)}`}
                            >
                              {statusLabel(item, copy)}
                            </span>
                          </div>
                          {item.route && item.accessStatus === "included" ? (
                            <a
                              href={item.route}
                              className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-3 text-sm font-medium text-white"
                            >
                              {copy.open}
                              <ArrowUpRight className="h-4 w-4" />
                            </a>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </AlmaShell>
  );
}
