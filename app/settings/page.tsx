"use client";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import { DASHBOARD_ROUTE } from "@/lib/platform/workspaceRoutes";

type Settings = {
  timezone: string;
  theme: string;
  preferredAiModel: string;
  preferredImageModel: string;
  notificationEmailEnabled: boolean;
  notificationInAppEnabled: boolean;
};
type Profile = {
  email: string;
  language: "auto" | "en" | "es";
  almaMode: "auto" | "fast" | "deep";
};
type Connection = {
  key: string;
  name: string;
  providerKey?: string;
  connectionStatus?:
    | "connect"
    | "connected"
    | "reconnect_required"
    | "setup_required"
    | "coming_soon";
};
const fallback: Settings = {
  timezone: "America/Chicago",
  theme: "light",
  preferredAiModel: "gpt-4.1-mini",
  preferredImageModel: "gpt-image-2",
  notificationEmailEnabled: true,
  notificationInAppEnabled: true,
};
const copy = {
  en: {
    back: "Back to ALMA",
    title: "Settings",
    profile: "Profile",
    email: "Email",
    language: "Language",
    chat: "ALMA preferences",
    mode: "ALMA mode",
    timezone: "Timezone",
    theme: "Theme",
    models: "Model preferences",
    text: "Text model",
    image: "Image model",
    memory: "Memory",
    memoryText:
      "Long-term memory is stored securely with your ALMA agent. Memory editing controls are coming soon.",
    notifications: "Notifications",
    inbox: "Recent notifications",
    none: "No notifications yet.",
    apps: "Connected Apps",
    connect: "Connect",
    reconnect: "Reconnect",
    disconnect: "Disconnect",
    connected: "Connected",
    setup: "Requires Setup",
    soon: "Coming Soon",
    security: "Security",
    securityText:
      "Provider credentials are encrypted server-side and are never displayed here.",
    export: "Data export",
    exportText: "Coming Soon — an export workflow is not available yet.",
    deletion: "Account deletion",
    deletionText:
      "Requires Setup — no self-service deletion workflow is available yet.",
    save: "Save preferences",
    saving: "Saving…",
    saved: "Saved",
    failed: "Could not save preferences.",
    loading: "Loading settings…",
    light: "Light",
    dark: "Dark",
    system: "System",
    auto: "Automatic",
    fast: "Fast",
    deep: "Deep",
    es: "Spanish",
    en: "English",
  },
  es: {
    back: "Volver a ALMA",
    title: "Configuración",
    profile: "Perfil",
    email: "Correo electrónico",
    language: "Idioma",
    chat: "Preferencias de ALMA",
    mode: "Modo de ALMA",
    timezone: "Zona horaria",
    theme: "Tema",
    models: "Preferencias de modelo",
    text: "Modelo de texto",
    image: "Modelo de imagen",
    memory: "Memoria",
    memoryText:
      "La memoria a largo plazo se guarda de forma segura con tu agente ALMA. Los controles de edición estarán disponibles próximamente.",
    notifications: "Notificaciones",
    inbox: "Notificaciones recientes",
    none: "Aún no hay notificaciones.",
    apps: "Aplicaciones conectadas",
    connect: "Conectar",
    reconnect: "Reconectar",
    disconnect: "Desconectar",
    connected: "Conectado",
    setup: "Requiere configuración",
    soon: "Próximamente",
    security: "Seguridad",
    securityText:
      "Las credenciales de proveedores se cifran en el servidor y nunca se muestran aquí.",
    export: "Exportación de datos",
    exportText: "Próximamente: aún no hay un flujo de exportación disponible.",
    deletion: "Eliminación de cuenta",
    deletionText:
      "Requiere configuración: no hay eliminación autoservicio disponible todavía.",
    save: "Guardar preferencias",
    saving: "Guardando…",
    saved: "Guardado",
    failed: "No se pudieron guardar las preferencias.",
    loading: "Cargando configuración…",
    light: "Claro",
    dark: "Oscuro",
    system: "Sistema",
    auto: "Automático",
    fast: "Rápido",
    deep: "Profundo",
    es: "Español",
    en: "Inglés",
  },
} as const;
export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings>(fallback);
  const [textModels, setTextModels] = useState<string[]>([
    fallback.preferredAiModel,
  ]);
  const [imageModels, setImageModels] = useState<string[]>([
    fallback.preferredImageModel,
  ]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [notifications, setNotifications] = useState<
    {
      id: string;
      title: string;
      body: string;
      read: boolean;
      created_at: string;
    }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const language = profile?.language === "es" ? "es" : "en";
  const t = copy[language];
  function updateLanguage(next: AlmaShellLanguage) {
    setProfile((current) =>
      current ? { ...current, language: next } : current,
    );
  }
  const load = useCallback(async () => {
    const [settingsRes, catalogRes, notificationsRes] = await Promise.all([
      fetch("/api/settings", { cache: "no-store" }),
      fetch("/api/marketplace/catalog", { cache: "no-store" }),
      fetch("/api/settings/notifications", { cache: "no-store" }),
    ]);
    const data = await settingsRes.json();
    if (data.ok) {
      setProfile(data.profile);
      setSettings(data.settings);
      setTextModels(data.modelChoices.text);
      setImageModels(data.modelChoices.image);
    }
    if (catalogRes.ok) {
      const catalog = await catalogRes.json();
      setConnections(
        (catalog.items ?? []).filter(
          (item: Connection) =>
            item.providerKey === "google_workspace" ||
            item.providerKey === "stripe",
        ),
      );
    }
    if (notificationsRes.ok) {
      const data = await notificationsRes.json();
      setNotifications(data.notifications ?? []);
    }
  }, []);
  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);
  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          language: profile.language,
          almaMode: profile.almaMode,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProfile(data.profile);
      setSettings(data.settings);
      setMessage(t.saved);
    } catch {
      setMessage(t.failed);
    } finally {
      setSaving(false);
    }
  };
  const connectionAction = async (item: Connection) => {
    if (item.connectionStatus === "connected") {
      const route =
        item.providerKey === "stripe"
          ? "/api/oauth/stripe/disconnect"
          : "/api/oauth/google/disconnect";
      await fetch(route, { method: "POST" });
      await load();
      return;
    }
    const route =
      item.providerKey === "stripe"
        ? "/api/oauth/stripe/start?returnTo=%2Fmarketplace"
        : "/api/oauth/google/start?returnTo=%2Fmarketplace";
    window.location.assign(route);
  };
  if (!profile)
    return (
      <AlmaShell language="en" activeWorkspace="settings" title={copy.en.title}>
        <div className="p-8 text-gray-500">{copy.en.loading}</div>
      </AlmaShell>
    );
  const field = (label: string, child: React.ReactNode) => (
    <label className="block text-sm font-medium text-gray-700">
      <span>{label}</span>
      <div className="mt-2">{child}</div>
    </label>
  );
  return (
    <AlmaShell
      language={language}
      activeWorkspace="settings"
      title={t.title}
      onLanguageChange={updateLanguage}
    >
      <div className="px-4 py-8 text-black md:px-10">
        <div className="mx-auto max-w-5xl">
          <Link
            href={DASHBOARD_ROUTE}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Link>
          <header className="mt-8">
            <p className="text-xs uppercase tracking-[.35em] text-gray-500">
              ALMA
            </p>
            <h1 className="mt-3 text-4xl font-medium">{t.title}</h1>
          </header>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-[2rem] border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-medium">{t.profile}</h2>
              <div className="mt-5 space-y-5">
                {field(
                  t.email,
                  <p className="rounded-xl bg-[#F7F7F8] px-3 py-3 text-gray-600">
                    {profile.email}
                  </p>,
                )}
                {field(
                  t.language,
                  <select
                    value={profile.language}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        language: e.target.value as Profile["language"],
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white p-3"
                  >
                    <option value="auto">{t.auto}</option>
                    <option value="en">{t.en}</option>
                    <option value="es">{t.es}</option>
                  </select>,
                )}
              </div>
            </section>
            <section className="rounded-[2rem] border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-medium">{t.chat}</h2>
              <div className="mt-5 space-y-5">
                {field(
                  t.mode,
                  <select
                    value={profile.almaMode}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        almaMode: e.target.value as Profile["almaMode"],
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white p-3"
                  >
                    {["auto", "fast", "deep"].map((v) => (
                      <option key={v} value={v}>
                        {t[v as "auto" | "fast" | "deep"]}
                      </option>
                    ))}
                  </select>,
                )}
                {field(
                  t.timezone,
                  <input
                    value={settings.timezone}
                    onChange={(e) =>
                      setSettings({ ...settings, timezone: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 p-3"
                  />,
                )}
                {field(
                  t.theme,
                  <select
                    value={settings.theme}
                    onChange={(e) =>
                      setSettings({ ...settings, theme: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white p-3"
                  >
                    {["light", "dark", "system"].map((v) => (
                      <option key={v} value={v}>
                        {t[v as "light" | "dark" | "system"]}
                      </option>
                    ))}
                  </select>,
                )}
              </div>
            </section>
            <section className="rounded-[2rem] border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-medium">{t.models}</h2>
              <div className="mt-5 space-y-5">
                {field(
                  t.text,
                  <select
                    value={settings.preferredAiModel}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        preferredAiModel: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white p-3"
                  >
                    {textModels.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>,
                )}
                {field(
                  t.image,
                  <select
                    value={settings.preferredImageModel}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        preferredImageModel: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white p-3"
                  >
                    {imageModels.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>,
                )}
              </div>
            </section>
            <section className="rounded-[2rem] border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-medium">{t.notifications}</h2>
              <div className="mt-5 space-y-4">
                {field(
                  "Email",
                  <input
                    type="checkbox"
                    checked={settings.notificationEmailEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notificationEmailEnabled: e.target.checked,
                      })
                    }
                  />,
                )}
                {field(
                  "In-app",
                  <input
                    type="checkbox"
                    checked={settings.notificationInAppEnabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notificationInAppEnabled: e.target.checked,
                      })
                    }
                  />,
                )}
                <h3 className="pt-2 font-medium">{t.inbox}</h3>
                {notifications.length ? (
                  notifications.slice(0, 3).map((n) => (
                    <p
                      key={n.id}
                      className="rounded-xl bg-[#F7F7F8] p-3 text-sm"
                    >
                      <b>{n.title}</b>
                      <br />
                      {n.body}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">{t.none}</p>
                )}
              </div>
            </section>
          </div>
          <button
            disabled={saving}
            onClick={() => void save()}
            className="mt-6 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? t.saving : t.save}
          </button>
          {message ? (
            <span className="ml-3 text-sm text-gray-600">{message}</span>
          ) : null}
          <section className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-medium">{t.apps}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {connections.map((item) => {
                const status = item.connectionStatus;
                const label =
                  status === "connected"
                    ? t.connected
                    : status === "reconnect_required"
                      ? t.reconnect
                      : status === "setup_required"
                        ? t.setup
                        : status === "coming_soon"
                          ? t.soon
                          : t.connect;
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-xl bg-[#F7F7F8] p-4"
                  >
                    <span>
                      {item.name}
                      <small className="block text-gray-500">{label}</small>
                    </span>
                    {status !== "coming_soon" && status !== "setup_required" ? (
                      <button
                        onClick={() => void connectionAction(item)}
                        className="rounded-lg bg-black px-3 py-2 text-sm text-white"
                      >
                        {status === "connected" ? t.disconnect : label}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <section className="rounded-[2rem] border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-medium">{t.memory}</h2>
              <p className="mt-3 text-sm text-gray-500">{t.memoryText}</p>
            </section>
            <section className="rounded-[2rem] border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-medium">{t.export}</h2>
              <p className="mt-3 text-sm text-gray-500">{t.exportText}</p>
            </section>
            <section className="rounded-[2rem] border border-gray-200 bg-white p-6">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="mt-3 text-xl font-medium">{t.security}</h2>
              <p className="mt-3 text-sm text-gray-500">{t.securityText}</p>
              <p className="mt-3 text-sm text-gray-500">{t.deletionText}</p>
            </section>
          </div>
        </div>
      </div>
    </AlmaShell>
  );
}
