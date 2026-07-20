"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clock3,
  Code2,
  ExternalLink,
  History,
  Laptop,
  Loader2,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  RefreshCw,
  Send,
  Smartphone,
  Square,
  Tablet,
  WandSparkles,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BuilderCheckpoint,
  BuilderEvent,
  BuilderProject,
} from "@/lib/builder/types";
import { validateBuilderPreviewUrl } from "@/lib/builder/preview";
import { WORKSPACE_ROUTES } from "@/lib/platform/workspaceRoutes";
import type { AlmaLocale } from "@/lib/i18n/locale";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

type Mode = "preview" | "design" | "code" | "activity";
type Viewport = "desktop" | "tablet" | "mobile";
type LoadState = "loading" | "ready" | "auth" | "migration" | "error";
const ACTIVE = new Set(["provisioning", "building", "validating"]);
const VIEWPORT_WIDTH: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};
const BUILDER_MODE_LABELS: Record<AlmaLocale, Record<Mode, string>> = {
  en: {
    preview: "Preview",
    design: "Design",
    code: "Code",
    activity: "Activity",
  },
  es: {
    preview: "Vista previa",
    design: "Diseño",
    code: "Código",
    activity: "Actividad",
  },
};
const BUILDER_STAGE_ES: Record<string, string> = {
  project_created: "Proyecto creado",
  project_updated: "Proyecto actualizado",
  session_requested: "Solicitud aceptada",
  provisioning_started: "Preparando entorno aislado",
  provider_blocked: "Proveedor bloqueado",
  build_started: "Compilación iniciada",
  command_started: "Validación iniciada",
  command_completed: "Validación completada",
  validation_started: "Verificando proyecto",
  validation_completed: "Verificación completada",
  checkpoint_created: "Version guardada",
  approval_requested: "Aprobación requerida",
  preview_ready: "Vista previa lista",
  build_failed: "Compilación fallida",
  build_cancelled: "Compilación cancelada",
};
function builderStageLabel(value: string, locale: AlmaLocale) {
  return locale === "es"
    ? (BUILDER_STAGE_ES[value] ?? value.replaceAll("_", " "))
    : value.replaceAll("_", " ");
}

export default function BuilderProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { locale, setLocale } = useAlmaLocale();
  const modeLabels = BUILDER_MODE_LABELS[locale];
  const [projectId, setProjectId] = useState("");
  const [state, setState] = useState<LoadState>("loading");
  const [project, setProject] = useState<BuilderProject | null>(null);
  const [events, setEvents] = useState<BuilderEvent[]>([]);
  const [checkpoints, setCheckpoints] = useState<BuilderCheckpoint[]>([]);
  const [mode, setMode] = useState<Mode>("preview");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    void params.then(({ projectId: id }) => setProjectId(id));
  }, [params]);
  const load = useCallback(
    async (quiet = false) => {
      if (!projectId) return;
      if (!quiet) setState("loading");
      try {
        const [projectResponse, eventsResponse, checkpointsResponse] =
          await Promise.all([
            fetch(`/api/builder/projects/${projectId}`, { cache: "no-store" }),
            fetch(`/api/builder/projects/${projectId}/events`, {
              cache: "no-store",
            }),
            fetch(`/api/builder/projects/${projectId}/checkpoints`, {
              cache: "no-store",
            }),
          ]);
        const payload = await projectResponse.json().catch(() => ({}));
        if (projectResponse.status === 401) return setState("auth");
        if (!projectResponse.ok)
          return setState(
            payload.error?.code === "builder_schema_unavailable"
              ? "migration"
              : "error",
          );
        setProject(payload.project);
        if (eventsResponse.ok)
          setEvents((await eventsResponse.json()).events ?? []);
        if (checkpointsResponse.ok)
          setCheckpoints((await checkpointsResponse.json()).checkpoints ?? []);
        setState("ready");
      } catch {
        if (!quiet) setState("error");
      }
    },
    [projectId],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!project || !ACTIVE.has(project.lifecycle_status)) return;
    const timer = window.setInterval(() => void load(true), 4000);
    return () => window.clearInterval(timer);
  }, [load, project]);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const safePreview = useMemo(
    () => validateBuilderPreviewUrl(project?.preview_url),
    [project?.preview_url],
  );
  const previewExpired = Boolean(
    project?.preview_expires_at &&
    now >= new Date(project.preview_expires_at).getTime(),
  );
  const active = Boolean(project && ACTIVE.has(project.lifecycle_status));

  async function submitRevision() {
    if (!projectId || !prompt.trim() || submitting || active) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/builder/projects/${projectId}/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            starterKey: project?.starter_key ?? project?.metadata?.starterKey,
            revisionPrompt: prompt.trim(),
          }),
        },
      );
      if (response.ok) setPrompt("");
      await load(true);
    } finally {
      setSubmitting(false);
    }
  }
  async function cancel() {
    setCancelling(true);
    try {
      await fetch(`/api/builder/projects/${projectId}/cancel`, {
        method: "POST",
      });
      await load(true);
    } finally {
      setCancelling(false);
    }
  }
  function openPreview() {
    if (safePreview && !previewExpired)
      window.open(safePreview.url, "_blank", "noopener,noreferrer");
  }

  if (state !== "ready" || !project)
    return <LoadingState state={state} retry={() => void load()} />;

  return (
    <main className="flex h-[100dvh] min-h-[680px] flex-col overflow-hidden bg-[#0b0d0f] text-[#f4f6f8]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-[#101316] px-3">
        <Link
          href={WORKSPACE_ROUTES.builder}
          aria-label="Back to Builder projects"
          className="tool"
        >
          <ArrowLeft />
        </Link>
        <div className="min-w-0 border-l border-white/10 pl-3">
          <p className="max-w-52 truncate text-sm font-semibold">
            {project.title}
          </p>
          <p className="flex items-center gap-1 text-[11px] text-[#8d969f]">
            {active ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            {active ? "Working" : "Saved"}
          </p>
        </div>
        <div className="ml-2 hidden items-center rounded-md border border-white/10 bg-black/20 p-0.5 lg:flex">
          {(["preview", "design", "code", "activity"] as Mode[]).map((item) => (
            <button
              key={item}
              onClick={() => setMode(item)}
              className={`mode ${mode === item ? "bg-white/10 text-white" : "text-[#8d969f]"}`}
            >
              {item === "preview" ? (
                <Play />
              ) : item === "design" ? (
                <WandSparkles />
              ) : item === "code" ? (
                <Code2 />
              ) : (
                <Clock3 />
              )}
              {modeLabels[item]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            className="tool hidden md:inline-flex"
            onClick={() => setHistoryOpen((value) => !value)}
            aria-label="Checkpoint history"
          >
            <History />
          </button>
          <div className="hidden items-center rounded-md border border-white/10 p-0.5 sm:flex">
            {(["desktop", "tablet", "mobile"] as Viewport[]).map((item) => (
              <button
                key={item}
                onClick={() => setViewport(item)}
                aria-label={`${item} viewport`}
                className={`tool h-8 w-8 ${viewport === item ? "bg-white/10 text-white" : "text-[#8d969f]"}`}
              >
                {item === "desktop" ? (
                  <Monitor />
                ) : item === "tablet" ? (
                  <Tablet />
                ) : (
                  <Smartphone />
                )}
              </button>
            ))}
          </div>
          <button
            className="tool"
            onClick={() => setPreviewKey((value) => value + 1)}
            disabled={!safePreview || previewExpired}
            aria-label="Refresh preview"
          >
            <RefreshCw />
          </button>
          <button
            className="tool"
            onClick={openPreview}
            disabled={!safePreview || previewExpired}
            aria-label="Open safe preview"
          >
            <ExternalLink />
          </button>
          <button
            className="tool"
            onClick={() => setAssistantOpen((value) => !value)}
            aria-label="Toggle assistant panel"
          >
            {assistantOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </button>
          <button
            className="tool w-auto px-2 text-[11px] font-semibold"
            onClick={() => void setLocale(locale === "en" ? "es" : "en")}
            aria-label={
              locale === "en"
                ? "Cambiar interfaz a español"
                : "Switch interface to English"
            }
            title={locale === "en" ? "Español" : "English"}
          >
            {locale.toUpperCase()}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {assistantOpen ? (
          <aside className="flex w-full shrink-0 flex-col border-r border-white/10 bg-[#111417] md:w-[400px]">
            <div className="border-b border-white/10 p-4">
              <div className="flex items-center justify-between">
                <h1 className="text-sm font-semibold">ALMA Builder</h1>
                <Status status={project.lifecycle_status} locale={locale} />
              </div>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#8d969f]">
                {project.original_prompt}
              </p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              {project.safe_error_summary ? (
                <Notice
                  tone="error"
                  title={project.last_error_code ?? "Build failed"}
                >
                  {project.safe_error_summary}
                </Notice>
              ) : null}
              {events.length ? (
                [...events]
                  .reverse()
                  .map((event) => (
                    <EventCard key={event.id} event={event} locale={locale} />
                  ))
              ) : (
                <Notice title="No activity yet">
                  Submit a revision to create a real Builder session and job.
                </Notice>
              )}
            </div>
            <div className="border-t border-white/10 p-3">
              {active ? (
                <button
                  onClick={() => void cancel()}
                  disabled={cancelling}
                  className="mb-2 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-red-400/30 text-xs text-red-300"
                >
                  <Square className="h-3 w-3" />
                  {cancelling ? "Cancelling…" : "Stop current build"}
                </button>
              ) : null}
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter")
                    void submitRevision();
                }}
                placeholder="Ask ALMA to revise this project…"
                className="min-h-24 w-full resize-none rounded-lg border border-white/10 bg-[#090b0d] p-3 text-sm outline-none placeholder:text-[#59616a] focus:border-[#53cfc5]/60"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-[#68717a]">
                  Ctrl/⌘ + Enter
                </span>
                <button
                  onClick={() => void submitRevision()}
                  disabled={!prompt.trim() || active || submitting}
                  className="flex h-9 items-center gap-2 rounded-md bg-[#e9f3f2] px-3 text-xs font-semibold text-[#0b0d0f] disabled:opacity-40"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : <Send />}
                  Submit
                </button>
              </div>
            </div>
          </aside>
        ) : null}

        <section className="relative hidden min-w-0 flex-1 flex-col bg-[#080a0c] md:flex">
          <div className="flex h-10 shrink-0 items-center border-b border-white/10 px-3 text-xs text-[#8d969f]">
            <Laptop className="mr-2 h-3.5 w-3.5" />
            {mode === "preview"
              ? "Live preview"
              : mode === "design"
                ? "Design request"
                : mode === "code"
                  ? "Source artifacts"
                  : "Build activity"}
            <span className="ml-auto">
              {viewport} · {project.preview_status}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4 lg:p-7">
            {mode === "preview" ? (
              <PreviewCanvas
                project={project}
                safeUrl={safePreview?.url ?? null}
                expired={previewExpired}
                previewKey={previewKey}
                width={VIEWPORT_WIDTH[viewport]}
                onRetry={() => void load(true)}
              />
            ) : null}
            {mode === "design" ? (
              <UnavailablePanel
                title="Design through a revision"
                icon={<WandSparkles />}
              >
                Direct visual source mutation is not enabled. Describe color,
                typography, spacing, radius, section visibility, or responsive
                changes in the Builder composer; ALMA will create a validated
                revision and checkpoint.
              </UnavailablePanel>
            ) : null}
            {mode === "code" ? (
              <UnavailablePanel
                title="Source viewer unavailable for this checkpoint"
                icon={<Code2 />}
              >
                No safe artifact-file API is available for this project yet.
                ALMA will not expose arbitrary paths, environment files,
                dependencies, caches, or worker credentials.
              </UnavailablePanel>
            ) : null}
            {mode === "activity" ? <Activity events={events} /> : null}
          </div>
          {historyOpen ? (
            <HistoryPanel
              checkpoints={checkpoints}
              close={() => setHistoryOpen(false)}
            />
          ) : null}
        </section>

        <section className="flex min-w-0 flex-1 flex-col bg-[#080a0c] md:hidden">
          <div className="grid grid-cols-4 border-b border-white/10">
            {(["preview", "design", "code", "activity"] as Mode[]).map(
              (item) => (
                <button
                  key={item}
                  onClick={() => setMode(item)}
                  className={`h-11 text-xs capitalize ${mode === item ? "border-b-2 border-[#53cfc5] text-white" : "text-[#8d969f]"}`}
                >
                  {modeLabels[item]}
                </button>
              ),
            )}
          </div>
          <div className="p-4">
            <Notice title="Mobile project view">
              Preview, status, revisions, and cancellation are available here.
              Advanced Design and Code inspection require desktop.
            </Notice>
          </div>
        </section>
      </div>
      <style jsx global>{`
        .tool {
          display: inline-flex;
          height: 2.25rem;
          width: 2.25rem;
          align-items: center;
          justify-content: center;
          border-radius: 0.375rem;
          color: #8d969f;
        }
        .tool:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          color: white;
        }
        .tool:focus-visible,
        .mode:focus-visible {
          outline: 2px solid #53cfc5;
          outline-offset: 2px;
        }
        .tool:disabled {
          opacity: 0.3;
        }
        .tool svg,
        .mode svg,
        button svg {
          width: 1rem;
          height: 1rem;
        }
        .mode {
          display: flex;
          height: 2rem;
          align-items: center;
          gap: 0.35rem;
          border-radius: 0.3rem;
          padding: 0 0.6rem;
          font-size: 0.7rem;
          text-transform: capitalize;
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            scroll-behavior: auto !important;
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}

function PreviewCanvas({
  project,
  safeUrl,
  expired,
  previewKey,
  width,
  onRetry,
}: {
  project: BuilderProject;
  safeUrl: string | null;
  expired: boolean;
  previewKey: number;
  width: string;
  onRetry: () => void;
}) {
  if (expired)
    return (
      <UnavailablePanel title="Preview expired" icon={<Clock3 />}>
        This isolated preview has expired. Start a real rebuild to request
        another preview.
      </UnavailablePanel>
    );
  if (!safeUrl)
    return (
      <UnavailablePanel
        title={
          project.lifecycle_status === "failed"
            ? "Build failed"
            : "Preview not ready"
        }
        icon={<AlertTriangle />}
      >
        {project.safe_error_summary ??
          "A preview appears only after the worker validates the build, health-checks it, and returns an allowlisted URL."}
        <button
          onClick={onRetry}
          className="mt-4 flex h-9 items-center gap-2 rounded-md border border-white/15 px-3 text-xs"
        >
          <RefreshCw />
          Refresh status
        </button>
      </UnavailablePanel>
    );
  return (
    <div
      className="mx-auto h-full min-h-[560px] overflow-hidden rounded-lg border border-white/10 bg-white shadow-2xl"
      style={{ width, maxWidth: "100%" }}
    >
      <iframe
        key={previewKey}
        title={`${project.title} preview`}
        src={safeUrl}
        sandbox="allow-scripts allow-forms"
        referrerPolicy="no-referrer"
        className="h-full min-h-[560px] w-full bg-white"
      />
    </div>
  );
}
function EventCard({
  event,
  locale,
}: {
  event: BuilderEvent;
  locale: AlmaLocale;
}) {
  return (
    <article className="rounded-lg border border-white/8 bg-white/[.025] p-3">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#53cfc5]" />
        <div>
          <p className="text-xs font-medium leading-5">{event.summary}</p>
          <p className="mt-1 text-[10px] text-[#68717a]">
            {builderStageLabel(event.event_type, locale)} ·{" "}
            {new Date(event.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </article>
  );
}
function Status({ status, locale }: { status: string; locale: AlmaLocale }) {
  const working = ACTIVE.has(status);
  return (
    <span
      className={`flex items-center gap-1 rounded border px-2 py-1 text-[10px] ${working ? "border-[#53cfc5]/30 text-[#69ddd4]" : status === "failed" ? "border-red-400/30 text-red-300" : "border-white/10 text-[#9aa3ac]"}`}
    >
      {working ? (
        <Loader2 className="animate-spin" />
      ) : status === "failed" ? (
        <XCircle />
      ) : (
        <Check />
      )}
      {builderStageLabel(status, locale)}
    </span>
  );
}
function Notice({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${tone === "error" ? "border-red-400/20 bg-red-400/5" : "border-white/10 bg-white/[.025]"}`}
    >
      <p className="text-xs font-semibold">{title}</p>
      <div className="mt-1 text-xs leading-5 text-[#8d969f]">{children}</div>
    </div>
  );
}
function UnavailablePanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[420px] max-w-xl flex-col items-center justify-center text-center">
      <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-[#8d969f]">
        {icon}
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-2 text-sm leading-6 text-[#8d969f]">{children}</div>
    </div>
  );
}
function Activity({ events }: { events: BuilderEvent[] }) {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-lg border border-white/10 bg-[#0d1012] font-mono">
      <div className="border-b border-white/10 px-4 py-3 text-xs text-[#8d969f]">
        Safe Builder events · raw credentials and unrestricted logs are never
        shown
      </div>
      {events.length ? (
        events.map((event) => (
          <div
            key={event.id}
            className="grid grid-cols-[56px_150px_1fr] gap-3 border-b border-white/5 px-4 py-3 text-xs"
          >
            <span className="text-[#59616a]">#{event.sequence}</span>
            <span className="text-[#69ddd4]">{event.event_type}</span>
            <span>{event.summary}</span>
          </div>
        ))
      ) : (
        <p className="p-4 text-xs text-[#8d969f]">No persisted events.</p>
      )}
    </div>
  );
}
function HistoryPanel({
  checkpoints,
  close,
}: {
  checkpoints: BuilderCheckpoint[];
  close: () => void;
}) {
  return (
    <aside className="absolute inset-y-0 right-0 z-20 w-80 border-l border-white/10 bg-[#111417] shadow-2xl">
      <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
        <h2 className="text-sm font-semibold">Checkpoints</h2>
        <button className="tool" onClick={close}>
          <XCircle />
        </button>
      </div>
      <div className="space-y-2 p-3">
        {checkpoints.length ? (
          checkpoints.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-white/10 p-3"
            >
              <p className="text-xs font-medium">{item.checkpoint_label}</p>
              <p className="mt-1 text-[10px] text-[#68717a]">
                {item.status} · {new Date(item.created_at).toLocaleString()}
              </p>
              <p className="mt-2 text-[11px] text-[#8d969f]">
                Restore is unavailable here until the protected restore executor
                is connected.
              </p>
            </div>
          ))
        ) : (
          <Notice title="No checkpoints">
            Validated versions will appear here.
          </Notice>
        )}
      </div>
    </aside>
  );
}
function LoadingState({
  state,
  retry,
}: {
  state: LoadState;
  retry: () => void;
}) {
  const text =
    state === "loading"
      ? "Loading Builder project…"
      : state === "auth"
        ? "Sign in to view this project."
        : state === "migration"
          ? "Builder storage is unavailable in this environment."
          : "Builder project is temporarily unavailable.";
  return (
    <main className="flex h-[100dvh] items-center justify-center bg-[#0b0d0f] text-white">
      <div className="text-center">
        {state === "loading" ? (
          <Loader2 className="mx-auto mb-3 animate-spin" />
        ) : (
          <AlertTriangle className="mx-auto mb-3" />
        )}
        <p className="text-sm text-[#9aa3ac]">{text}</p>
        {state !== "loading" && state !== "auth" ? (
          <button
            onClick={retry}
            className="mt-4 rounded-md border border-white/15 px-3 py-2 text-xs"
          >
            Retry
          </button>
        ) : null}
      </div>
    </main>
  );
}
