"use client";

import {
  CheckCircle2,
  CreditCard,
  GitBranch,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  PlugZap,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
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
    paypalTitle: "Connect PayPal Business",
    paypalBody:
      "Use a PayPal REST app from your business account. ALMA validates and encrypts both values on the server.",
    paypalSteps:
      "In PayPal Developer, open Apps & Credentials, create a REST app, then copy its Client ID and Secret here.",
    openPayPal: "Open PayPal Developer",
    clientId: "PayPal client ID",
    clientSecret: "PayPal client secret",
    environment: "Environment",
    sandbox: "Sandbox (testing)",
    live: "Live payments",
    cancel: "Cancel",
    saveConnection: "Validate and connect",
    connectionFailed: "PayPal could not be connected. Check the credentials.",
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
    paypalTitle: "Conectar PayPal Business",
    paypalBody:
      "Usa una aplicación REST de tu cuenta empresarial. ALMA valida y cifra ambos valores en el servidor.",
    paypalSteps:
      "En PayPal Developer, abre Apps & Credentials, crea una aplicación REST y copia aquí el Client ID y Secret.",
    openPayPal: "Abrir PayPal Developer",
    clientId: "ID de cliente de PayPal",
    clientSecret: "Secreto de cliente de PayPal",
    environment: "Entorno",
    sandbox: "Sandbox (pruebas)",
    live: "Pagos reales",
    cancel: "Cancelar",
    saveConnection: "Validar y conectar",
    connectionFailed: "No se pudo conectar PayPal. Revisa las credenciales.",
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

const ACTIVE_PROVIDERS = new Set([
  "gmail",
  "outlook",
  "quickbooks",
  "stripe_connect",
  "paypal_business",
  "whatsapp_business",
  "github_app",
]);

export default function ConnectionsPage() {
  const { locale: language } = useAlmaLocale();
  const [connections, setConnections] = useState<ConnectorSummary[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [mutatingProvider, setMutatingProvider] = useState<string | null>(null);
  const [paypalOpen, setPaypalOpen] = useState(false);
  const [paypalError, setPaypalError] = useState("");
  const [paypalForm, setPaypalForm] = useState({
    clientId: "",
    clientSecret: "",
    environment: "sandbox",
  });
  const copy = COPY[language];

  const load = useCallback(async () => {
    setState("loading");
    try {
      const connectionsResponse = await fetch("/api/connections", {
        cache: "no-store",
      });
      if (connectionsResponse.status === 401) {
        setState("auth");
      } else if (!connectionsResponse.ok) {
        setState("error");
      } else {
        const payload = await connectionsResponse.json();
        setConnections(payload.connections ?? []);
        setState("ready");
      }
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    const setup = new URL(window.location.href).searchParams.get("setup");
    if (setup === "paypal") {
      window.setTimeout(() => setPaypalOpen(true), 0);
    } else if (setup === "payments") {
      window.setTimeout(() => {
        document
          .querySelector('[data-provider="stripe_connect"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
    }
  }, []);

  async function disconnect(provider: string) {
    setMutatingProvider(provider);
    try {
      const response = await fetch(
        provider === "paypal_business"
          ? "/api/connectors/paypal/disconnect"
          : provider === "stripe_connect"
            ? "/api/oauth/stripe/disconnect"
            : provider === "whatsapp_business"
              ? "/api/connectors/whatsapp/disconnect"
              : provider === "github_app"
                ? "/api/connectors/github/disconnect"
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

  async function connectPayPal() {
    setMutatingProvider("paypal_business");
    setPaypalError("");
    try {
      const response = await fetch("/api/connectors/paypal/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paypalForm),
      });
      if (!response.ok) throw new Error("connect_failed");
      setPaypalForm({
        clientId: "",
        clientSecret: "",
        environment: "sandbox",
      });
      setPaypalOpen(false);
      await load();
    } catch {
      setPaypalError(copy.connectionFailed);
    } finally {
      setMutatingProvider(null);
    }
  }

  return (
    <AlmaShell
      language={language}
      activeWorkspace="connections"
      title={copy.title}
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
                      data-provider={connection.provider}
                      className="rounded-2xl border border-[#E5E7EB] bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {connection.provider === "github_app" ? (
                              <GitBranch className="h-4 w-4" />
                            ) : connection.provider === "stripe_connect" ||
                              connection.provider === "paypal_business" ? (
                              <CreditCard className="h-4 w-4" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                            <h2 className="truncate text-base font-semibold">
                              {connection.name}
                            </h2>
                          </div>
                          <p className="mt-3 text-sm text-[#6B7280]">
                            {copy.connectedAccount}
                          </p>
                          <p className="mt-1 truncate text-sm font-medium">
                            {connection.connectedEmail ||
                              connection.connectedName ||
                              copy.noAccount}
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
                        {!connected &&
                        !blocked &&
                        connection.provider === "paypal_business" ? (
                          <button
                            type="button"
                            onClick={() => setPaypalOpen(true)}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-3 text-sm font-medium text-white"
                          >
                            <PlugZap className="h-4 w-4" />
                            {needsReconnect ? copy.reconnect : copy.connect}
                          </button>
                        ) : !connected && !blocked ? (
                          <a
                            href={
                              connection.provider === "stripe_connect"
                                ? "/api/oauth/stripe/start?returnTo=%2Fconnections"
                                : connection.provider === "whatsapp_business"
                                  ? "/api/connectors/whatsapp/start?returnTo=%2Fconnections"
                                  : connection.provider === "github_app"
                                    ? "/api/connectors/github/start?returnTo=%2Fconnections"
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

          {paypalOpen ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="paypal-dialog-title"
              className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
            >
              <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[#E8F5FF] p-3 text-[#0070BA]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2
                      id="paypal-dialog-title"
                      className="text-xl font-semibold"
                    >
                      {copy.paypalTitle}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                      {copy.paypalBody}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#667085]">
                      {copy.paypalSteps}
                    </p>
                    <a
                      href="https://developer.paypal.com/dashboard/applications/"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-xs font-medium text-[#0070BA] underline underline-offset-4"
                    >
                      {copy.openPayPal}
                    </a>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  <input
                    type="text"
                    autoComplete="off"
                    value={paypalForm.clientId}
                    onChange={(event) =>
                      setPaypalForm((current) => ({
                        ...current,
                        clientId: event.target.value,
                      }))
                    }
                    placeholder={copy.clientId}
                    className="rounded-xl border border-[#D0D5DD] px-4 py-3"
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={paypalForm.clientSecret}
                    onChange={(event) =>
                      setPaypalForm((current) => ({
                        ...current,
                        clientSecret: event.target.value,
                      }))
                    }
                    placeholder={copy.clientSecret}
                    className="rounded-xl border border-[#D0D5DD] px-4 py-3"
                  />
                  <label className="text-sm font-medium">
                    {copy.environment}
                    <select
                      value={paypalForm.environment}
                      onChange={(event) =>
                        setPaypalForm((current) => ({
                          ...current,
                          environment: event.target.value,
                        }))
                      }
                      className="mt-2 block w-full rounded-xl border border-[#D0D5DD] px-4 py-3"
                    >
                      <option value="sandbox">{copy.sandbox}</option>
                      <option value="live">{copy.live}</option>
                    </select>
                  </label>
                  {paypalError ? (
                    <p className="text-sm text-red-600">{paypalError}</p>
                  ) : null}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPaypalOpen(false)}
                    className="rounded-xl border border-[#D0D5DD] px-4 py-2 text-sm"
                  >
                    {copy.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={() => void connectPayPal()}
                    disabled={
                      mutatingProvider === "paypal_business" ||
                      !paypalForm.clientId ||
                      !paypalForm.clientSecret
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {mutatingProvider === "paypal_business" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {copy.saveConnection}
                  </button>
                </div>
              </div>
            </div>
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
