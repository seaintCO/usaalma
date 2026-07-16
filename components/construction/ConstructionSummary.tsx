"use client";

import {
  AlertCircle,
  BarChart3,
  Download,
  FileText,
  Loader2,
  RefreshCcw,
} from "lucide-react";
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

type ConstructionExportRecord = {
  id: string;
  filename?: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  idempotency_key?: string | null;
  generated_at?: string | null;
  created_at?: string | null;
  error_message?: string | null;
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
  generatePdf: string;
  generatingPdf: string;
  downloadPdf: string;
  exportHistory: string;
  exportReady: string;
  exportFailed: string;
  exportLoadError: string;
  exportGenerateError: string;
  exportDownloadError: string;
  noExports: string;
};

export function ConstructionSummary({
  projectId,
  text,
}: {
  projectId: string;
  text: ConstructionSummaryText;
}) {
  const [summary, setSummary] = useState<ConstructionSummaryData | null>(null);
  const [exports, setExports] = useState<ConstructionExportRecord[]>([]);
  const [state, setState] = useState<RequestState>("idle");
  const [mutation, setMutation] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setState("loading");
    setMessage("");
    try {
      const [summaryResponse, exportsResponse] = await Promise.all([
        fetch(`/api/construction/projects/${projectId}/summary`),
        fetch(`/api/construction/projects/${projectId}/exports`),
      ]);
      const response = summaryResponse;
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(text.loadError);
      setSummary(data.summary ?? null);
      const exportsData = await exportsResponse.json();
      if (!exportsResponse.ok || !exportsData.ok) {
        throw new Error(text.exportLoadError);
      }
      setExports(Array.isArray(exportsData.exports) ? exportsData.exports : []);
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
  const latestCompleted = exports.find(
    (record) => record.status === "completed",
  );

  async function generatePdf() {
    if (mutation) return;
    setMutation("generate");
    setMessage("");
    try {
      const response = await fetch(
        `/api/construction/projects/${projectId}/exports/pdf`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idempotencyKey: `construction-${projectId}-${new Date()
              .toISOString()
              .slice(0, 10)}`,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(text.exportGenerateError);
      setMessage(text.exportReady);
      await load();
    } catch {
      setMessage(text.exportGenerateError);
    } finally {
      setMutation(null);
    }
  }

  async function downloadExport(record: ConstructionExportRecord) {
    if (mutation) return;
    setMutation(`download-${record.id}`);
    setMessage("");
    try {
      const response = await fetch(
        `/api/construction/projects/${projectId}/exports/${record.id}/download`,
      );
      const data = await response.json();
      if (!response.ok || !data.ok || !data.url) {
        throw new Error(text.exportDownloadError);
      }
      window.location.href = data.url;
    } catch {
      setMessage(text.exportDownloadError);
    } finally {
      setMutation(null);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
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
        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            disabled={mutation === "generate"}
            onClick={() => void generatePdf()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-medium text-white disabled:bg-[#9CA3AF]"
          >
            {mutation === "generate" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {mutation === "generate" ? text.generatingPdf : text.generatePdf}
          </button>
          {latestCompleted ? (
            <button
              type="button"
              disabled={mutation === `download-${latestCompleted.id}`}
              onClick={() => void downloadExport(latestCompleted)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#D1D5DB] px-5 text-sm font-medium disabled:text-[#9CA3AF]"
            >
              {mutation === `download-${latestCompleted.id}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {text.downloadPdf}
            </button>
          ) : null}
        </div>
        {message ? (
          <p className="mt-4 rounded-2xl bg-[#F7F7F8] p-3 text-sm leading-6 text-[#374151]">
            {message}
          </p>
        ) : null}
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
      </div>
      <aside className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
        <h3 className="font-medium">{text.exportHistory}</h3>
        {exports.length ? (
          <div className="mt-4 grid gap-2">
            {exports.map((record) => (
              <article
                key={record.id}
                className="rounded-2xl border border-[#E5E7EB] p-3 text-sm"
              >
                <p className="break-words font-medium">
                  {record.filename || "construction-summary.pdf"}
                </p>
                <p className="mt-1 text-[#6B7280]">
                  {record.status === "completed"
                    ? text.exportReady
                    : record.status === "failed"
                      ? text.exportFailed
                      : record.status}
                </p>
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  {formatDate(record.generated_at ?? record.created_at)}
                </p>
                {record.status === "completed" ? (
                  <button
                    type="button"
                    disabled={mutation === `download-${record.id}`}
                    onClick={() => void downloadExport(record)}
                    className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#D1D5DB] px-4 text-sm font-medium disabled:text-[#9CA3AF]"
                  >
                    <Download className="h-4 w-4" />
                    {text.downloadPdf}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-[#F7F7F8] p-3 text-sm leading-6 text-[#6B7280]">
            {text.noExports}
          </p>
        )}
      </aside>
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

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
