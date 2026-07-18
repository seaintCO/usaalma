"use client";

import {
  ArrowUpRight,
  KeyRound,
  Loader2,
  PlugZap,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import type {
  MarketplaceCatalogResponse,
  MarketplaceItem,
} from "@/lib/platform/marketplace/types";

const COPY = {
  en: {
    title: "Connections",
    subtitle: "External providers connected to ALMA.",
    loading: "Loading connections...",
    unavailable: "Connections are temporarily unavailable.",
    retry: "Retry",
    empty: "No connections are available yet.",
    connect: "Connect",
    reconnect: "Reconnect",
    connected: "Connected",
    disconnect: "Disconnect",
    setup: "Setup",
    upgrade: "Upgrade required",
    comingSoon: "Coming soon",
    unavailableState: "Unavailable",
  },
  es: {
    title: "Conexiones",
    subtitle: "Proveedores externos conectados a ALMA.",
    loading: "Cargando conexiones...",
    unavailable: "Conexiones no esta disponible temporalmente.",
    retry: "Reintentar",
    empty: "Aun no hay conexiones disponibles.",
    connect: "Conectar",
    reconnect: "Reconectar",
    connected: "Conectado",
    disconnect: "Desconectar",
    setup: "Configurar",
    upgrade: "Requiere mejora",
    comingSoon: "Proximamente",
    unavailableState: "No disponible",
  },
} as const;

type ConnectionsCopy = (typeof COPY)[keyof typeof COPY];

function connectionHref(item: MarketplaceItem, returnTo = "%2Fconnections") {
  if (item.providerKey === "google_workspace") {
    return `/api/oauth/google/start?returnTo=${returnTo}`;
  }
  if (item.providerKey === "stripe") {
    return `/api/oauth/stripe/start?returnTo=${returnTo}`;
  }
  if (item.connectionStatus === "setup_required") return "/voice-connections";
  return null;
}

function statusLabel(item: MarketplaceItem, copy: ConnectionsCopy) {
  switch (item.connectionStatus) {
    case "connected":
      return copy.connected;
    case "reconnect_required":
      return copy.reconnect;
    case "setup_required":
      return copy.setup;
    case "upgrade_required":
      return copy.upgrade;
    case "coming_soon":
      return copy.comingSoon;
    case "connect":
      return copy.connect;
    default:
      return copy.unavailableState;
  }
}

export default function ConnectionsPage() {
  const [language, setLanguage] = useState<AlmaShellLanguage>("en");
  const [catalog, setCatalog] = useState<MarketplaceCatalogResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mutatingKey, setMutatingKey] = useState<string | null>(null);
  const copy = COPY[language];

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [catalogResponse, languageResponse] = await Promise.all([
        fetch("/api/marketplace/catalog", { cache: "no-store" }),
        fetch("/api/settings/language", { cache: "no-store" }),
      ]);
      if (!catalogResponse.ok) throw new Error("catalog_unavailable");
      setCatalog((await catalogResponse.json()) as MarketplaceCatalogResponse);
      if (languageResponse.ok) {
        const languagePayload = await languageResponse.json();
        setLanguage(languagePayload.language === "es" ? "es" : "en");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const connections = useMemo(
    () =>
      (catalog?.items ?? []).filter(
        (item) => item.itemType === "external_connection",
      ),
    [catalog?.items],
  );

  async function disconnect(item: MarketplaceItem) {
    const routes: Record<string, string> = {
      google_workspace: "/api/oauth/google/disconnect",
      stripe: "/api/oauth/stripe/disconnect",
    };
    const route = item.providerKey ? routes[item.providerKey] : undefined;
    if (!route) return;
    setMutatingKey(item.key);
    try {
      const response = await fetch(route, { method: "POST" });
      if (!response.ok) throw new Error("disconnect_failed");
      await load();
    } catch {
      setError(true);
    } finally {
      setMutatingKey(null);
    }
  }

  return (
    <AlmaShell
      language={language}
      activeWorkspace="connections"
      title={copy.title}
      onLanguageChange={setLanguage}
    >
      <div className="min-h-full px-4 pb-24 pt-6 text-[#111111] md:px-8 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white">
              <KeyRound className="h-5 w-5" />
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

          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {copy.loading}
            </div>
          ) : null}

          {error && !loading ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <p className="text-sm text-[#6B7280]">{copy.unavailable}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-black px-3 text-sm font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                {copy.retry}
              </button>
            </div>
          ) : null}

          {!loading && !error ? (
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {connections.length ? (
                connections.map((item) => {
                  const href = connectionHref(item);
                  const connected = item.connectionStatus === "connected";
                  return (
                    <article
                      key={item.key}
                      className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="truncate text-base font-semibold">
                            {item.name}
                          </h2>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#6B7280]">
                            {item.description}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-[#E5E7EB] px-2 py-1 text-[11px] font-medium">
                          {statusLabel(item, copy)}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {connected ? (
                          <button
                            type="button"
                            onClick={() => void disconnect(item)}
                            disabled={mutatingKey === item.key}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-sm font-medium disabled:opacity-60"
                          >
                            {mutatingKey === item.key ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Unplug className="h-4 w-4" />
                            )}
                            {copy.disconnect}
                          </button>
                        ) : null}
                        {href && !connected ? (
                          <a
                            href={href}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-3 text-sm font-medium text-white"
                          >
                            <PlugZap className="h-4 w-4" />
                            {statusLabel(item, copy)}
                            <ArrowUpRight className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280]">
                  {copy.empty}
                </p>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </AlmaShell>
  );
}
