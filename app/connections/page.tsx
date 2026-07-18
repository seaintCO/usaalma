"use client";

import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  PlugZap,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import type { ConnectorSummary, ConnectorStatus } from "@/lib/connectors/types";

type LoadState = "loading" | "ready" | "auth" | "error";

const COPY = {
  en: {
    title: "Connections",
    subtitle: "Connect the accounts ALMA can use after owner approval.",
    loading: "Loading connections...",
    unavailable: "Connections are temporarily unavailable.",
    auth: "Sign in to view your ALMA connections.",
    retry: "Retry",
    connect: "Connect",
    reconnect: "Reconnect",
    disconnect: "Disconnect",
    connectedAccount: "Connected account",
    noAccount: "No account connected",
    lastUse: "Last use",
    neverUsed: "Not used yet",
    configurationRequired: "Server configuration required.",
    states: {
      not_connected: "Not connected",
      connecting: "Connecting",
      connected: "Connected",
      expired: "Expired",
      reauthorization_required: "Reauthorization required",
      configuration_required: "Configuration required",
      error: "Error",
      disconnected: "Not connected",
    } satisfies Record<ConnectorStatus, string>,
  },
  es: {
    title: "Conexiones",
    subtitle: "Conecta las cuentas que ALMA puede usar con tu aprobacion.",
    loading: "Cargando conexiones...",
    unavailable: "Conexiones no esta disponible temporalmente.",
    auth: "Inicia sesion para ver tus conexiones de ALMA.",
    retry: "Reintentar",
    connect: "Conectar",
    reconnect: "Reconectar",
    disconnect: "Desconectar",
    connectedAccount: "Cuenta conectada",
    noAccount: "No hay cuenta conectada",
    lastUse: "Ultimo uso",
    neverUsed: "Sin uso todavia",
    configurationRequired: "Configuracion del servidor requerida.",
    states: {
      not_connected: "No conectada",
      connecting: "Conectando",
      connected: "Conectada",
      expired: "Expirada",
      reauthorization_required: "Reautorizacion requerida",
      configuration_required: "Configuracion requerida",
      error: "Error",
      disconnected: "No conectada",
    } satisfies Record<ConnectorStatus, string>,
  },
} as const;

const ACTIVE_PROVIDERS = new Set(["gmail", "outlook", "whatsapp_business"]);

export default function ConnectionsPage() {
  const [language, setLanguage] = useState<AlmaShellLanguage>("en");
  const [connections, setConnections] = useState<ConnectorSummary[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [mutatingProvider, setMutatingProvider] = useState<string | null>(null);
  const copy = COPY[language];

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [connectionsResponse, languageResponse] = await Promise.all([
        fetch("/api/connections", { cache: "no-store" }),
        fetch("/api/settings/language", { cache: "no-store" }),
      ]);
      if (connectionsResponse.status === 401) {
        setState("auth");
      } else if (!connectionsResponse.ok) {
        setState("error");
      } else {
        const payload = await connectionsResponse.json();
        setConnections(payload.connections ?? []);
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

  async function disconnect(provider: string) {
    setMutatingProvider(provider);
    try {
      const response = await fetch(
        provider === "whatsapp_business"
          ? "/api/connectors/whatsapp/disconnect"
          : `/api/connectors/oauth/${provider}/disconnect`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("disconnect_failed");
      await load();
    } catch {
      setState("error");
    } finally {
      setMutatingProvider(null);
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
        <div className="mx-auto max-w-5xl">
          <header className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white">
              <KeyRound className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280] md:text-base">
              {copy.subtitle}
            </p>
          </header>

          {state === "loading" ? (
            <StateCard text={copy.loading} spinning />
          ) : null}

          {state === "auth" || state === "error" ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <p className="text-sm text-[#6B7280]">
                {state === "auth" ? copy.auth : copy.unavailable}
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

          {state === "ready" ? (
            <section className="grid gap-3 md:grid-cols-2">
              {connections
                .filter((connection) =>
                  ACTIVE_PROVIDERS.has(connection.provider),
                )
                .map((connection) => {
                  const connected = connection.status === "connected";
                  const needsReconnect =
                    connection.status === "expired" ||
                    connection.status === "reauthorization_required" ||
                    connection.status === "error";
                  const blocked =
                    connection.status === "configuration_required" ||
                    !connection.canConnect;
                  return (
                    <article
                      key={connection.provider}
                      className="rounded-2xl border border-[#E5E7EB] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <h2 className="truncate text-base font-semibold">
                              {connection.name}
                            </h2>
                          </div>
                          <p className="mt-3 text-sm text-[#6B7280]">
                            {copy.connectedAccount}
                          </p>
                          <p className="mt-1 truncate text-sm font-medium">
                            {connection.connectedEmail ?? copy.noAccount}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-[#E5E7EB] px-2 py-1 text-[11px] font-medium">
                          {copy.states[connection.status]}
                        </span>
                      </div>

                      <div className="mt-4 rounded-xl bg-[#F7F7F8] p-3 text-sm text-[#6B7280]">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{copy.lastUse}</span>
                        </div>
                        <p className="mt-1 text-black">
                          {connection.lastSuccessfulUse
                            ? new Date(
                                connection.lastSuccessfulUse,
                              ).toLocaleString()
                            : copy.neverUsed}
                        </p>
                        {blocked ? (
                          <p className="mt-2 text-xs">
                            {connection.lastErrorMessage ??
                              copy.configurationRequired}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {connected ? (
                          <button
                            type="button"
                            onClick={() => void disconnect(connection.provider)}
                            disabled={mutatingProvider === connection.provider}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-sm font-medium disabled:opacity-60"
                          >
                            {mutatingProvider === connection.provider ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Unplug className="h-4 w-4" />
                            )}
                            {copy.disconnect}
                          </button>
                        ) : null}
                        {!connected && !blocked ? (
                          <a
                            href={
                              connection.provider === "whatsapp_business"
                                ? "/api/connectors/whatsapp/start?returnTo=%2Fconnections"
                                : `/api/connectors/oauth/${connection.provider}/start?returnTo=%2Fconnections`
                            }
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-3 text-sm font-medium text-white"
                          >
                            <PlugZap className="h-4 w-4" />
                            {needsReconnect ? copy.reconnect : copy.connect}
                          </a>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
            </section>
          ) : null}
        </div>
      </div>
    </AlmaShell>
  );
}

function StateCard({ spinning, text }: { spinning?: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280]">
      <Loader2 className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
      {text}
    </div>
  );
}
