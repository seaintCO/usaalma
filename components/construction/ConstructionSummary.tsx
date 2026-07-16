"use client";

import { AlertCircle, BarChart3, Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { displayMaterialQuantity } from "@/lib/construction/materials";

type RequestState = "idle" | "loading" | "success" | "error";

type ConstructionSummaryData = {
  counts?: {
    files?: number;
    measurements?: number;
    materials?: number;
    scopeSections?: number;
    crewInstructions?: number;
    annotations?: number;
  };
  materialTotals?: Record<string, number>;
};

export type ConstructionSummaryText = {
  preview: string;
  summaryCounts: string;
  filesCount: string;
  measurementsCount: string;
  materialsCount: string;
  scopeCount: string;
  crewCount: string;
  annotationsCount: string;
  materialDisclaimer: string;
  retry: string;
  loadError: string;
};

export function ConstructionSummary({
  projectId,
  text,
}: {
  projectId: string;
  text: ConstructionSummaryText;
}) {
  const [summary, setSummary] = useState<ConstructionSummaryData | null>(null);
  const [state, setState] = useState<RequestState>("idle");

  async function load() {
    setState("loading");
    try {
      const response = await fetch(
        `/api/construction/projects/${projectId}/summary`,
      );
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(text.loadError);
      setSummary(data.summary ?? null);
      setState("success");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const materialTotals = Object.entries(summary?.materialTotals ?? {});

  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F7F8]">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-medium">{text.summaryCounts}</h3>
          <p className="mt-1 text-sm leading-6 text-[#6B7280]">
            {text.materialDisclaimer}
          </p>
        </div>
      </div>
      {state === "loading" ? (
        <div className="mt-4 flex min-h-32 items-center justify-center rounded-3xl bg-[#F7F7F8] p-5 text-[#6B7280]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {text.preview}
        </div>
      ) : state === "error" ? (
        <div className="mt-4 rounded-3xl border border-[#FCA5A5] p-4">
          <p className="flex items-start gap-2 text-sm leading-6 text-[#991B1B]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {text.loadError}
          </p>
          <button
            type="button"
            onClick={load}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#D1D5DB] px-4 text-sm font-medium"
          >
            <RefreshCcw className="h-4 w-4" />
            {text.retry}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <CountCard
              label={text.filesCount}
              value={summary?.counts?.files ?? 0}
            />
            <CountCard
              label={text.measurementsCount}
              value={summary?.counts?.measurements ?? 0}
            />
            <CountCard
              label={text.materialsCount}
              value={summary?.counts?.materials ?? 0}
            />
            <CountCard
              label={text.scopeCount}
              value={summary?.counts?.scopeSections ?? 0}
            />
            <CountCard
              label={text.crewCount}
              value={summary?.counts?.crewInstructions ?? 0}
            />
            <CountCard
              label={text.annotationsCount}
              value={summary?.counts?.annotations ?? 0}
            />
          </div>
          {materialTotals.length ? (
            <div className="mt-4 rounded-3xl bg-[#F7F7F8] p-4">
              <h4 className="font-medium">{text.materialsCount}</h4>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {materialTotals.map(([unit, quantity]) => (
                  <p
                    key={unit}
                    className="rounded-2xl bg-white p-3 text-sm font-medium"
                  >
                    {displayMaterialQuantity(quantity)} {unit}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#F7F7F8] p-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#9CA3AF]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-medium">{value}</p>
    </div>
  );
}
