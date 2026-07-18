"use client";

import {
  MarketplaceCatalogCard,
  type MarketplaceCardAction,
} from "@/components/marketplace/MarketplaceCatalogCard";
import { MarketplaceDetailDialog } from "@/components/marketplace/MarketplaceDetailDialog";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import {
  getMarketplaceCopy,
  localizeMarketplaceItem,
  MARKETPLACE_CATEGORIES,
  type MarketplaceLanguage,
} from "@/components/marketplace/marketplaceCopy";
import { DASHBOARD_ROUTE } from "@/lib/platform/workspaceRoutes";
import type {
  MarketplaceCatalogErrorResponse,
  MarketplaceCatalogResponse,
  MarketplaceItem,
} from "@/lib/platform/marketplace/types";
import { Search, Store } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LoadState = "loading" | "ready" | "auth" | "error";
type ReleaseFilter = "all" | MarketplaceItem["releaseStatus"];
type StatusFilter =
  | "all"
  | MarketplaceItem["accessStatus"]
  | NonNullable<MarketplaceItem["installStatus"]>
  | NonNullable<MarketplaceItem["connectionStatus"]>;

const STATUS_FILTERS: StatusFilter[] = [
  "all",
  "included",
  "upgrade_required",
  "unavailable",
  "available",
  "installed",
  "connect",
  "connected",
  "reconnect_required",
  "setup_required",
  "configuration_unavailable",
  "coming_soon",
];

function isCatalogResponse(
  value: unknown,
): value is MarketplaceCatalogResponse {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as MarketplaceCatalogResponse).ok === true &&
    Array.isArray((value as MarketplaceCatalogResponse).items),
  );
}

function labelForStatus(
  value: StatusFilter,
  copy: ReturnType<typeof getMarketplaceCopy>,
) {
  if (value === "all") return copy.all;
  const labels: Record<Exclude<StatusFilter, "all">, string> = {
    included: copy.included,
    upgrade_required: copy.upgrade,
    unavailable: copy.unavailable,
    available: copy.available,
    installed: copy.installed,
    connect: copy.connect,
    connected: copy.connected,
    reconnect_required: copy.reconnect,
    setup_required: copy.requiresSetup,
    configuration_unavailable: copy.configurationUnavailable,
    coming_soon: copy.comingSoon,
  };
  return labels[value];
}

function actionForItem(
  item: MarketplaceItem,
  copy: ReturnType<typeof getMarketplaceCopy>,
): MarketplaceCardAction {
  if (item.releaseStatus === "coming_soon") return null;
  if (item.itemType === "internal_module") {
    if (item.accessStatus !== "included") return null;
    if (item.installStatus === "available")
      return { kind: "install", label: copy.install };
    if (item.route) return { kind: "open", label: copy.open, href: item.route };
    return null;
  }

  if (item.connectionStatus === "connect") {
    const routes: Record<string, string> = {
      google_workspace: "/api/oauth/google/start?returnTo=%2Fmarketplace",
      stripe: "/api/oauth/stripe/start?returnTo=%2Fmarketplace",
    };
    const href = item.providerKey ? routes[item.providerKey] : undefined;
    return href ? { kind: "connect", label: copy.connect, href } : null;
  }
  if (
    (item.providerKey === "google_workspace" ||
      item.providerKey === "stripe") &&
    item.connectionStatus === "connected"
  ) {
    return { kind: "disconnect", label: copy.disconnect };
  }
  if (item.connectionStatus === "reconnect_required") {
    const routes: Record<string, string> = {
      google_workspace: "/api/oauth/google/start?returnTo=%2Fmarketplace",
      stripe: "/api/oauth/stripe/start?returnTo=%2Fmarketplace",
    };
    const href = item.providerKey ? routes[item.providerKey] : undefined;
    return href ? { kind: "connect", label: copy.reconnect, href } : null;
  }
  if (item.connectionStatus === "setup_required") {
    return {
      kind: "open",
      label: copy.requiresSetup,
      href: "/voice-connections",
    };
  }
  return null;
}

export default function MarketplacePage() {
  const [catalog, setCatalog] = useState<MarketplaceCatalogResponse | null>(
    null,
  );
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<MarketplaceLanguage>("en");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | MarketplaceItem["category"]>(
    "all",
  );
  const [release, setRelease] = useState<ReleaseFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(
    null,
  );
  const [mutatingKey, setMutatingKey] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const copy = getMarketplaceCopy(language);

  function updateLanguage(next: AlmaShellLanguage) {
    setLanguage(next);
  }

  const loadCatalog = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState("loading");
    setError(null);

    try {
      const [catalogResponse, languageResponse] = await Promise.all([
        fetch("/api/marketplace/catalog", {
          signal: controller.signal,
          cache: "no-store",
        }),
        fetch("/api/settings/language", {
          signal: controller.signal,
          cache: "no-store",
        }),
      ]);
      const payload: unknown = await catalogResponse.json();
      if (catalogResponse.status === 401) {
        if (!controller.signal.aborted) {
          setCatalog(null);
          setState("auth");
          setError(null);
        }
        return;
      }
      if (!catalogResponse.ok || !isCatalogResponse(payload)) {
        const responseError = payload as MarketplaceCatalogErrorResponse;
        throw new Error(responseError.error?.message ?? "catalog_unavailable");
      }
      if (!controller.signal.aborted) {
        setCatalog(payload);
        setState("ready");
      }
      if (languageResponse.ok && !controller.signal.aborted) {
        const languagePayload = await languageResponse.json();
        setLanguage(languagePayload.language === "es" ? "es" : "en");
      }
    } catch (loadError) {
      if (controller.signal.aborted) return;
      setState("error");
      setError(
        loadError instanceof Error ? loadError.message : "catalog_unavailable",
      );
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadCatalog();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      requestRef.current?.abort();
    };
  }, [loadCatalog]);

  const installModule = useCallback(
    async (item: MarketplaceItem) => {
      if (mutatingKey || item.installStatus !== "available") return;
      setMutatingKey(item.key);
      setError(null);
      try {
        const response = await fetch("/api/modules/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleKey: item.key === "images" ? "image_generator" : item.key,
          }),
        });
        if (!response.ok) throw new Error("install_failed");
        await loadCatalog();
      } catch {
        setError(copy.installFailed);
      } finally {
        setMutatingKey(null);
      }
    },
    [copy.installFailed, loadCatalog, mutatingKey],
  );

  const disconnectConnection = useCallback(
    async (item: MarketplaceItem) => {
      const disconnectRoutes: Record<string, string> = {
        google_workspace: "/api/oauth/google/disconnect",
        stripe: "/api/oauth/stripe/disconnect",
      };
      const route = item.providerKey
        ? disconnectRoutes[item.providerKey]
        : undefined;
      if (mutatingKey || !route) return;
      setMutatingKey(item.key);
      setError(null);
      try {
        const response = await fetch(route, { method: "POST" });
        if (!response.ok) throw new Error("disconnect_failed");
        await loadCatalog();
      } catch {
        setError(copy.unavailable);
      } finally {
        setMutatingKey(null);
      }
    },
    [copy.unavailable, loadCatalog, mutatingKey],
  );

  const localizedItems = useMemo(
    () =>
      (catalog?.items ?? []).map((item) =>
        localizeMarketplaceItem(item, language),
      ),
    [catalog, language],
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return localizedItems.filter((item) => {
      const searchable =
        `${item.name} ${item.description} ${item.category}`.toLocaleLowerCase();
      const matchesSearch =
        !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesCategory = category === "all" || item.category === category;
      const matchesRelease =
        release === "all" || item.releaseStatus === release;
      const matchesStatus =
        status === "all" ||
        item.accessStatus === status ||
        item.installStatus === status ||
        item.connectionStatus === status;
      return (
        matchesSearch && matchesCategory && matchesRelease && matchesStatus
      );
    });
  }, [category, localizedItems, release, search, status]);

  const modules = filteredItems.filter(
    (item) => item.itemType === "internal_module",
  );
  const connections = filteredItems.filter(
    (item) => item.itemType === "external_connection",
  );
  const selectedAction = selectedItem
    ? actionForItem(selectedItem, copy)
    : null;

  return (
    <AlmaShell
      language={language}
      activeWorkspace="marketplace"
      title={copy.eyebrow}
      onLanguageChange={updateLanguage}
    >
      <div className="px-6 py-10 text-[#111111]">
        <div className="mx-auto max-w-7xl">
          <a
            href={DASHBOARD_ROUTE}
            className="text-sm text-[#6B7280] hover:text-black"
          >
            &larr; {copy.back}
          </a>

          <div className="mt-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
              <Store className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#6B7280]">
              {copy.eyebrow}
            </p>
            <h1 className="max-w-4xl text-4xl font-medium tracking-tight md:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-[#6B7280]">
              {copy.description}
            </p>
          </div>

          <section
            className="mt-10 rounded-[1.5rem] border border-[#E5E7EB] bg-white p-4"
            aria-label={copy.search}
          >
            <div className="grid gap-3 md:grid-cols-4">
              <label className="relative block md:col-span-2">
                <span className="sr-only">{copy.search}</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]"
                  aria-hidden="true"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={copy.search}
                  className="w-full rounded-xl border border-[#E5E7EB] py-3 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </label>
              <label>
                <span className="sr-only">{copy.category}</span>
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as typeof category)
                  }
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="all">
                    {copy.category}: {copy.all}
                  </option>
                  {MARKETPLACE_CATEGORIES.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="sr-only">{copy.release}</span>
                <select
                  value={release}
                  onChange={(event) =>
                    setRelease(event.target.value as ReleaseFilter)
                  }
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="all">
                    {copy.release}: {copy.all}
                  </option>
                  <option value="active">{copy.active}</option>
                  <option value="beta">{copy.beta}</option>
                  <option value="coming_soon">{copy.comingSoon}</option>
                </select>
              </label>
              <label>
                <span className="sr-only">{copy.status}</span>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as StatusFilter)
                  }
                  className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {STATUS_FILTERS.map((entry) => (
                    <option key={entry} value={entry}>
                      {copy.status}: {labelForStatus(entry, copy)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {state === "loading" ? (
            <p className="mt-12 text-sm text-[#6B7280]" role="status">
              {copy.loading}
            </p>
          ) : null}
          {state === "auth" || state === "error" ? (
            <section className="mt-12 rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
              <p className="text-sm text-[#6B7280]">
                {state === "auth" ? copy.auth : error || copy.unavailable}
              </p>
              {state === "error" ? (
                <button
                  type="button"
                  onClick={() => void loadCatalog()}
                  className="mt-4 rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white"
                >
                  {copy.retry}
                </button>
              ) : null}
            </section>
          ) : null}
          {state === "ready" ? (
            <>
              <section className="mt-12" aria-labelledby="alma-modules-heading">
                <h2
                  id="alma-modules-heading"
                  className="text-2xl font-medium tracking-tight"
                >
                  {copy.modules}
                </h2>
                {modules.length ? (
                  <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {modules.map((item) => (
                      <MarketplaceCatalogCard
                        key={item.key}
                        item={item}
                        copy={copy}
                        action={actionForItem(item, copy)}
                        isMutating={mutatingKey === item.key}
                        onInstall={(target) => void installModule(target)}
                        onDisconnect={(target) =>
                          void disconnectConnection(target)
                        }
                        onDetails={setSelectedItem}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-[#6B7280]">{copy.empty}</p>
                )}
              </section>
              <section
                className="mt-12 pb-10"
                aria-labelledby="connections-heading"
              >
                <h2
                  id="connections-heading"
                  className="text-2xl font-medium tracking-tight"
                >
                  {copy.connections}
                </h2>
                {connections.length ? (
                  <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {connections.map((item) => (
                      <MarketplaceCatalogCard
                        key={item.key}
                        item={item}
                        copy={copy}
                        action={actionForItem(item, copy)}
                        isMutating={false}
                        onInstall={(target) => void installModule(target)}
                        onDisconnect={(target) =>
                          void disconnectConnection(target)
                        }
                        onDetails={setSelectedItem}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-[#6B7280]">{copy.empty}</p>
                )}
              </section>
            </>
          ) : null}
        </div>
        <MarketplaceDetailDialog
          item={selectedItem}
          copy={copy}
          action={selectedAction}
          isMutating={selectedItem?.key === mutatingKey}
          onClose={() => setSelectedItem(null)}
          onInstall={(target) => void installModule(target)}
          onDisconnect={(target) => void disconnectConnection(target)}
        />
      </div>
    </AlmaShell>
  );
}
