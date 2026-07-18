"use client";

import {
  AlertCircle,
  Check,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import BilingualComposer from "@/components/communications/BilingualComposer";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type ApprovalStatus =
  | "proposed"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "executing"
  | "completed"
  | "failed";

type UnifiedApproval = {
  id: string;
  kind: "action" | "agent";
  status: ApprovalStatus;
  sourceStatus: string;
  actionKey: string | null;
  actionSummary: string;
  requestedBy: string;
  requestedPayload: Record<string, unknown>;
  approvedPayload: Record<string, unknown> | null;
  resultPayload: Record<string, unknown> | null;
  errorMessage: string | null;
  requestedAt: string | null;
  updatedAt: string | null;
  editable: boolean;
  executable: boolean;
  audit: Array<Record<string, unknown>>;
};

type ApprovalFilter = "pending" | "completed" | "rejected" | "failed" | "all";
type LoadState = "loading" | "ready" | "auth" | "migration" | "error";

const COPY = {
  en: {
    title: "Approvals",
    subtitle: "Review external actions before ALMA executes them.",
    loading: "Loading approvals...",
    unavailable: "Approvals are temporarily unavailable.",
    auth: "Sign in to review approvals.",
    migration:
      "Approval storage is not available in this environment. Apply the platform foundation migration before using approvals.",
    retry: "Retry",
    empty: "No approvals in this view.",
    pending: "Pending",
    completed: "Completed",
    rejected: "Rejected",
    failed: "Failed",
    all: "All",
    approve: "Approve and execute",
    reject: "Reject",
    executing: "Executing",
    payload: "Request",
    audit: "Audit history",
    to: "To",
    subject: "Subject",
    body: "Body",
    readOnly: "This approval cannot be edited here.",
    composer: "Message helper",
  },
  es: {
    title: "Aprobaciones",
    subtitle: "Revisa acciones externas antes de que ALMA las ejecute.",
    loading: "Cargando aprobaciones...",
    unavailable: "Aprobaciones no esta disponible temporalmente.",
    auth: "Inicia sesion para revisar aprobaciones.",
    migration:
      "El almacenamiento de aprobaciones no esta disponible en este entorno. Aplica la migracion de plataforma antes de usar aprobaciones.",
    retry: "Reintentar",
    empty: "No hay aprobaciones en esta vista.",
    pending: "Pendientes",
    completed: "Completadas",
    rejected: "Rechazadas",
    failed: "Fallidas",
    all: "Todas",
    approve: "Aprobar y ejecutar",
    reject: "Rechazar",
    executing: "Ejecutando",
    payload: "Solicitud",
    audit: "Historial de auditoria",
    to: "Para",
    subject: "Asunto",
    body: "Cuerpo",
    readOnly: "Esta aprobacion no se puede editar aqui.",
    composer: "Ayuda para mensaje",
  },
} as const;

const FILTERS: ApprovalFilter[] = [
  "pending",
  "completed",
  "rejected",
  "failed",
  "all",
];

function isPending(status: ApprovalStatus) {
  return (
    status === "awaiting_approval" ||
    status === "approved" ||
    status === "executing"
  );
}

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function payloadLabel(payload: Record<string, unknown>) {
  const keys = Object.keys(payload);
  if (!keys.length) return "{}";
  return JSON.stringify(payload, null, 2);
}

export default function ApprovalsPage() {
  const [language, setLanguage] = useState<AlmaShellLanguage>("en");
  const [approvals, setApprovals] = useState<UnifiedApproval[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApprovalFilter>("pending");
  const [state, setState] = useState<LoadState>("loading");
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [draftPayload, setDraftPayload] = useState<Record<string, unknown>>({});
  const copy = COPY[language];

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [approvalResponse, languageResponse] = await Promise.all([
        fetch("/api/approvals", { cache: "no-store" }),
        fetch("/api/settings/language", { cache: "no-store" }),
      ]);
      const payload = (await approvalResponse.json()) as {
        ok?: boolean;
        approvals?: UnifiedApproval[];
        error?: { code?: string };
      };
      if (approvalResponse.status === 401) {
        setApprovals([]);
        setSelectedId(null);
        setState("auth");
      } else if (!approvalResponse.ok || payload.ok === false) {
        setApprovals([]);
        setSelectedId(null);
        setState(
          payload.error?.code === "approvals_schema_unavailable"
            ? "migration"
            : "error",
        );
      } else {
        const nextApprovals = payload.approvals ?? [];
        setApprovals(nextApprovals);
        setSelectedId((current) => current ?? nextApprovals[0]?.id ?? null);
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

  const filtered = useMemo(
    () =>
      approvals.filter((approval) => {
        if (filter === "all") return true;
        if (filter === "pending") return isPending(approval.status);
        return approval.status === filter;
      }),
    [approvals, filter],
  );

  const selected =
    approvals.find((approval) => approval.id === selectedId) ??
    filtered[0] ??
    null;

  useEffect(() => {
    if (!selected) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftPayload(selected.approvedPayload ?? selected.requestedPayload);
  }, [selected]);

  async function mutateApproval(
    approval: UnifiedApproval,
    action: "approve" | "reject",
  ) {
    setMutatingId(approval.id);
    try {
      const response = await fetch(`/api/approvals/${approval.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: approval.kind,
          action,
          editedPayload: action === "approve" ? draftPayload : undefined,
        }),
      });
      if (!response.ok) throw new Error("approval_update_failed");
      await load();
    } catch {
      setState("error");
    } finally {
      setMutatingId(null);
    }
  }

  return (
    <AlmaShell
      language={language}
      activeWorkspace="approvals"
      title={copy.title}
      onLanguageChange={setLanguage}
    >
      <div className="min-h-full px-4 pb-24 pt-6 text-[#111111] md:px-8 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white">
              <ShieldCheck className="h-5 w-5" />
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

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setFilter(entry)}
                className={`h-10 shrink-0 rounded-xl border px-3 text-sm font-medium ${
                  filter === entry
                    ? "border-black bg-black text-white"
                    : "border-[#E5E7EB] bg-white text-black"
                }`}
              >
                {copy[entry]}
              </button>
            ))}
          </div>

          {state === "loading" ? (
            <StateCard icon={Loader2} text={copy.loading} spinning />
          ) : null}

          {state === "auth" || state === "migration" || state === "error" ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <p className="text-sm text-[#6B7280]">
                {state === "auth"
                  ? copy.auth
                  : state === "migration"
                    ? copy.migration
                    : copy.unavailable}
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
            <section className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-2">
                {filtered.length ? (
                  filtered.map((approval) => (
                    <button
                      key={`${approval.kind}-${approval.id}`}
                      type="button"
                      onClick={() => setSelectedId(approval.id)}
                      className={`block w-full min-w-0 rounded-2xl border p-4 text-left ${
                        selected?.id === approval.id
                          ? "border-black bg-white"
                          : "border-[#E5E7EB] bg-white"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="rounded-full border border-[#E5E7EB] px-2 py-1 text-[11px] font-medium">
                          {approval.status}
                        </span>
                        <span className="truncate text-xs text-[#6B7280]">
                          {approval.actionKey || approval.kind}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm font-semibold">
                        {approval.actionSummary}
                      </p>
                    </button>
                  ))
                ) : (
                  <StateCard icon={AlertCircle} text={copy.empty} />
                )}
              </div>

              {selected ? (
                <article className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-4 md:p-5">
                  <div className="flex flex-col gap-3 border-b border-[#E5E7EB] pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase text-[#6B7280]">
                        {selected.requestedBy}
                      </p>
                      <h2 className="mt-1 text-xl font-semibold">
                        {selected.actionSummary}
                      </h2>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        {selected.actionKey || selected.kind}
                      </p>
                    </div>
                    {isPending(selected.status) ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void mutateApproval(selected, "reject")
                          }
                          disabled={mutatingId === selected.id}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 text-sm font-medium disabled:opacity-60"
                        >
                          <X className="h-4 w-4" />
                          {copy.reject}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void mutateApproval(selected, "approve")
                          }
                          disabled={
                            mutatingId === selected.id ||
                            selected.status === "executing"
                          }
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-3 text-sm font-medium text-white disabled:bg-[#9CA3AF]"
                        >
                          {mutatingId === selected.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          {selected.status === "executing"
                            ? copy.executing
                            : copy.approve}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    <section className="min-w-0">
                      <h3 className="mb-3 text-sm font-semibold">
                        {copy.payload}
                      </h3>
                      {selected.editable &&
                      (selected.actionKey === "gmail.send" ||
                        selected.actionKey === "office.estimate.deliver" ||
                        selected.actionKey === "whatsapp.message.send") ? (
                        <div className="space-y-3">
                          <Field
                            label={copy.to}
                            value={safeString(
                              draftPayload.to ??
                                draftPayload.recipient ??
                                draftPayload.toPhone,
                            )}
                            onChange={(value) =>
                              setDraftPayload((current) => ({
                                ...current,
                                ...(selected.actionKey === "gmail.send"
                                  ? { to: value }
                                  : selected.actionKey ===
                                      "whatsapp.message.send"
                                    ? { toPhone: value }
                                    : { recipient: value }),
                              }))
                            }
                          />
                          {selected.actionKey !== "whatsapp.message.send" ? (
                            <Field
                              label={copy.subject}
                              value={safeString(draftPayload.subject)}
                              onChange={(value) =>
                                setDraftPayload((current) => ({
                                  ...current,
                                  subject: value,
                                }))
                              }
                            />
                          ) : null}
                          <Field
                            label={copy.body}
                            value={safeString(
                              draftPayload.body ?? draftPayload.message,
                            )}
                            rows={8}
                            onChange={(value) =>
                              setDraftPayload((current) => ({
                                ...current,
                                ...(selected.actionKey === "gmail.send"
                                  ? { body: value }
                                  : selected.actionKey ===
                                      "whatsapp.message.send"
                                    ? { body: value }
                                    : { message: value }),
                              }))
                            }
                          />
                          <div>
                            <p className="mb-2 text-xs font-medium text-[#6B7280]">
                              {copy.composer}
                            </p>
                            <BilingualComposer
                              channel={
                                selected.actionKey === "office.estimate.deliver"
                                  ? "office"
                                  : "email"
                              }
                              initialText={safeString(
                                draftPayload.body ?? draftPayload.message,
                              )}
                              language={language}
                              onUse={(value) =>
                                setDraftPayload((current) => ({
                                  ...current,
                                  ...(selected.actionKey === "gmail.send"
                                    ? { body: value }
                                    : selected.actionKey ===
                                        "whatsapp.message.send"
                                      ? { body: value }
                                      : { message: value }),
                                }))
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <pre className="max-h-[420px] overflow-auto rounded-xl bg-[#F7F7F8] p-3 text-xs leading-5 text-[#374151]">
                          {payloadLabel(selected.requestedPayload)}
                        </pre>
                      )}
                      {!selected.editable ? (
                        <p className="mt-2 text-xs text-[#6B7280]">
                          {copy.readOnly}
                        </p>
                      ) : null}
                    </section>

                    <section className="min-w-0">
                      <h3 className="mb-3 text-sm font-semibold">
                        {copy.audit}
                      </h3>
                      {selected.audit.length ? (
                        <div className="space-y-2">
                          {selected.audit.map((event, index) => (
                            <div
                              key={`${selected.id}-${index}`}
                              className="rounded-xl bg-[#F7F7F8] p-3"
                            >
                              <div className="flex items-center gap-2">
                                <History className="h-4 w-4 shrink-0" />
                                <p className="truncate text-sm font-medium">
                                  {safeString(event.event_type) || "audit"}
                                </p>
                              </div>
                              <p className="mt-1 truncate text-xs text-[#6B7280]">
                                {safeString(event.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <StateCard icon={History} text={copy.empty} />
                      )}
                    </section>
                  </div>
                </article>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </AlmaShell>
  );
}

function Field({
  label,
  onChange,
  rows,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  rows?: number;
  value: string;
}) {
  const className =
    "w-full rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] px-3 py-3 text-sm outline-none focus:border-black";
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#6B7280]">
        {label}
      </span>
      {rows ? (
        <textarea
          value={value}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      )}
    </label>
  );
}

function StateCard({
  icon: Icon,
  spinning,
  text,
}: {
  icon: typeof AlertCircle;
  spinning?: boolean;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280]">
      <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
      {text}
    </div>
  );
}
