"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
import { useIsAlmaIosApp } from "@/lib/mobile/platform";

type Summary = {
  plan: "starter" | "business" | null;
  status: string;
  period: { start: string; end: string };
  limits: null | {
    modes: Record<string, number>;
    images: number;
    voiceSeconds: number;
    documentPages: number;
    builderJobs: number;
    dailyAiRequests: number;
  };
  used: Record<string, number>;
  dailyAiUsed: number;
  recent: Array<{
    id: string;
    feature: string;
    alma_mode: string | null;
    actual_units: number;
    provider_model: string | null;
    created_at: string;
  }>;
};

export default function UsagePage() {
  const isIosApp = useIsAlmaIosApp();
  const { locale } = useAlmaLocale();
  const es = locale === "es";
  const [usage, setUsage] = useState<Summary | null>(null);
  const [error, setError] = useState<"unavailable" | "unauthorized" | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/usage", { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (response.status === 401) {
        setError("unauthorized");
        return;
      }
      if (!response.ok || !body?.usage) {
        setError("unavailable");
        return;
      }
      setUsage(body.usage);
    } catch {
      setError("unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUsage(), 0);
    return () => window.clearTimeout(timer);
  }, [loadUsage]);
  const rows = usage?.limits
    ? ([
        [
          es ? "Instantáneo" : "Instant",
          usage.used.instant ?? 0,
          usage.limits.modes.instant,
        ],
        [
          es ? "Razonamiento" : "Thinking",
          usage.used.thinking ?? 0,
          usage.limits.modes.thinking,
        ],
        ["Pro", usage.used.pro ?? 0, usage.limits.modes.pro],
        [
          es ? "Imágenes" : "Images",
          usage.used.image_generation ?? 0,
          usage.limits.images,
        ],
        [
          es ? "Minutos de voz" : "Voice minutes",
          Math.ceil((usage.used.voice ?? 0) / 60),
          usage.limits.voiceSeconds / 60,
        ],
        [
          es ? "Páginas de documentos" : "Document pages",
          usage.used.document_analysis ?? 0,
          usage.limits.documentPages,
        ],
        [
          es ? "Compilaciones de Builder" : "Builder builds",
          usage.used.builder_build ?? 0,
          usage.limits.builderJobs,
        ],
      ] as const)
    : [];
  return (
    <AlmaShell
      activeWorkspace="home"
      language={locale}
      title={es ? "Uso" : "Usage"}
    >
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#6B7280]">
              {es ? "Uso" : "Usage"}
            </p>
            <h1 className="mt-1 text-3xl font-semibold">
              {es ? "Uso de ALMA" : "ALMA usage"}
            </h1>
            <p className="mt-2 text-sm text-[#6B7280]">
              {usage
                ? `${new Date(usage.period.start).toLocaleDateString()} – ${new Date(usage.period.end).toLocaleDateString()}`
                : loading
                  ? es
                    ? "Cargando período de facturación…"
                    : "Loading billing period…"
                  : es
                    ? "El período aparecerá cuando el seguimiento esté listo."
                    : "Your period will appear when usage tracking is ready."}
            </p>
          </div>
          {!isIosApp ? (
            <Link
              href="/billing"
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
            >
              {es ? "Mejorar plan" : "Upgrade plan"}
            </Link>
          ) : null}
        </div>
        {error ? (
          <section
            role="alert"
            className="mt-8 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">
                  {error === "unauthorized"
                    ? es
                      ? "Inicia sesión para ver el uso"
                      : "Sign in to view usage"
                    : es
                      ? "El seguimiento de uso necesita atención"
                      : "Usage tracking needs attention"}
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-[#6B7280]">
                  {error === "unauthorized"
                    ? es
                      ? "Tu información de uso es privada y requiere una sesión activa."
                      : "Your usage information is private and requires an active session."
                    : es
                      ? "ALMA no ejecutará solicitudes de IA sin poder medirlas correctamente. Reintenta después de activar la migración de control de uso."
                      : "ALMA will not run AI requests unless they can be measured correctly. Retry after the usage-control migration is active."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {error === "unauthorized" ? (
                    <Link
                      href="/login?next=/usage"
                      className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
                    >
                      {es ? "Iniciar sesión" : "Sign in"}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void loadUsage()}
                      className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {loading
                        ? es
                          ? "Comprobando…"
                          : "Checking…"
                        : es
                          ? "Reintentar"
                          : "Retry"}
                    </button>
                  )}
                  {!isIosApp ? (
                    <Link
                      href="/billing"
                      className="rounded-full border border-[#D8DCE2] bg-white px-4 py-2 text-sm font-medium"
                    >
                      {es ? "Ver plan" : "View plan"}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}
        {usage ? (
          <>
            <section className="mt-8 rounded-2xl border border-[#E5E7EB] p-5">
              <p className="text-sm text-[#6B7280]">
                {es ? "Plan actual" : "Current plan"}
              </p>
              <p className="mt-1 text-xl font-semibold">
                {usage.plan === "business"
                  ? es
                    ? "Autónomo"
                    : "Autonomous"
                  : es
                    ? "Esencial"
                    : "Essential"}
              </p>
              <p className="mt-2 text-sm">
                {es ? "Límite diario" : "Daily limit"}: {usage.dailyAiUsed} /{" "}
                {usage.limits?.dailyAiRequests ?? 0}
              </p>
            </section>
            <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map(([label, used, limit]) => {
                const percent =
                  limit > 0
                    ? Math.min(100, Math.round((used / limit) * 100))
                    : 100;
                const warning =
                  percent >= 100
                    ? "border-red-300"
                    : percent >= 90
                      ? "border-orange-300"
                      : percent >= 70
                        ? "border-amber-300"
                        : "border-[#E5E7EB]";
                const warningLabel =
                  percent >= 100
                    ? es
                      ? "Límite alcanzado"
                      : "Limit reached"
                    : percent >= 90
                      ? es
                        ? "Aviso: 90% usado"
                        : "Warning: 90% used"
                      : percent >= 70
                        ? es
                          ? "Aviso: 70% usado"
                          : "Warning: 70% used"
                        : null;
                return (
                  <article
                    key={label}
                    className={`rounded-2xl border p-4 ${warning}`}
                  >
                    <div className="flex justify-between gap-3">
                      <h2 className="font-medium">{label}</h2>
                      <span className="text-sm text-[#6B7280]">
                        {used} / {limit}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F0F1F2]">
                      <div
                        className="h-full bg-black"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[#6B7280]">
                      {limit > 0
                        ? `${Math.max(0, limit - used)} ${es ? "restantes" : "remaining"}`
                        : es
                          ? "No disponible en este plan"
                          : "Not available on this plan"}
                    </p>
                    {warningLabel ? (
                      <p className="mt-1 text-xs font-medium" role="status">
                        {warningLabel}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </section>
            <section className="mt-8">
              <h2 className="text-xl font-semibold">
                {es ? "Actividad reciente" : "Recent activity"}
              </h2>
              <div className="mt-3 overflow-hidden rounded-2xl border border-[#E5E7EB]">
                {usage.recent.length ? (
                  usage.recent.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap justify-between gap-2 border-b border-[#E5E7EB] p-4 last:border-0"
                    >
                      <span>{item.alma_mode ?? item.feature}</span>
                      <span className="text-sm text-[#6B7280]">
                        {item.actual_units} ·{" "}
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-sm text-[#6B7280]">
                    {es ? "Aún no hay actividad." : "No activity yet."}
                  </p>
                )}
              </div>
            </section>
            <p className="mt-6 text-sm text-[#6B7280]">
              {es
                ? "Research Pro es un complemento medido con costo adicional y requiere activación explícita."
                : "Research Pro is a metered add-on with additional cost and requires explicit activation."}
            </p>
          </>
        ) : null}
      </main>
    </AlmaShell>
  );
}
