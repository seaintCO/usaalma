"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

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
  const { locale } = useAlmaLocale();
  const es = locale === "es";
  const [usage, setUsage] = useState<Summary | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    void fetch("/api/usage", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("usage");
        return response.json();
      })
      .then((body) => setUsage(body.usage))
      .catch(() => setError(true));
  }, []);
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
                : es
                  ? "Cargando período de facturación…"
                  : "Loading billing period…"}
            </p>
          </div>
          <Link
            href="/billing"
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
          >
            {es ? "Mejorar plan" : "Upgrade plan"}
          </Link>
        </div>
        {error ? (
          <p
            role="alert"
            className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            {es
              ? "El uso no está disponible temporalmente."
              : "Usage is temporarily unavailable."}
          </p>
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
