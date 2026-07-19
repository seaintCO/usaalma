"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  Play,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import type {
  BuilderCheckpoint,
  BuilderEvent,
  BuilderProject,
} from "@/lib/builder/types";
import { validateBuilderPreviewUrl } from "@/lib/builder/preview";
import { WORKSPACE_ROUTES } from "@/lib/platform/workspaceRoutes";

type LoadState = "loading" | "ready" | "auth" | "migration" | "error";
type MobileTab = "assistant" | "progress" | "preview";

const COPY = {
  en: {
    back: "Builder",
    loading: "Loading project...",
    auth: "Sign in to view this Builder project.",
    migration:
      "Builder storage is not available in this environment. Apply the Builder foundation migration.",
    error: "Builder project is temporarily unavailable.",
    retry: "Retry",
    start: "Start Builder session",
    starting: "Starting...",
    assistant: "Assistant",
    progress: "Progress",
    preview: "Preview",
    events: "Event history",
    checkpoints: "Checkpoints",
    noEvents: "No events yet.",
    noCheckpoints: "No checkpoints yet.",
    previewMissing: "Preview not available yet",
    previewBlocked:
      "A real allowlisted preview URL will appear here after a secure Builder Engine publishes one.",
    blocked: "Blocked",
    engineBlocked:
      "The isolated Builder Engine is not configured. No code execution was started.",
    approvals: "Protected actions will appear in Approvals before execution.",
  },
  es: {
    back: "Builder",
    loading: "Cargando proyecto...",
    auth: "Inicia sesion para ver este proyecto Builder.",
    migration:
      "El almacenamiento de Builder no esta disponible en este entorno. Aplica la migracion de Builder.",
    error: "El proyecto Builder no esta disponible temporalmente.",
    retry: "Reintentar",
    start: "Iniciar sesion Builder",
    starting: "Iniciando...",
    assistant: "Asistente",
    progress: "Progreso",
    preview: "Preview",
    events: "Historial de eventos",
    checkpoints: "Puntos de control",
    noEvents: "Aun no hay eventos.",
    noCheckpoints: "Aun no hay puntos de control.",
    previewMissing: "Preview no disponible todavia",
    previewBlocked:
      "Aqui aparecera una URL real y permitida cuando un Builder Engine seguro la publique.",
    blocked: "Bloqueado",
    engineBlocked:
      "El Builder Engine aislado no esta configurado. No se ejecuto codigo.",
    approvals:
      "Las acciones protegidas apareceran en Aprobaciones antes de ejecutarse.",
  },
} as const;

export default function BuilderProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [projectId, setProjectId] = useState("");
  const [language, setLanguage] = useState<AlmaShellLanguage>("en");
  const [state, setState] = useState<LoadState>("loading");
  const [project, setProject] = useState<BuilderProject | null>(null);
  const [events, setEvents] = useState<BuilderEvent[]>([]);
  const [checkpoints, setCheckpoints] = useState<BuilderCheckpoint[]>([]);
  const [tab, setTab] = useState<MobileTab>("assistant");
  const [starting, setStarting] = useState(false);
  const copy = COPY[language];

  useEffect(() => {
    void params.then((value) => setProjectId(value.projectId));
  }, [params]);

  const load = useCallback(async () => {
    if (!projectId) return;
    setState("loading");
    try {
      const [
        projectResponse,
        eventsResponse,
        checkpointsResponse,
        languageResponse,
      ] = await Promise.all([
        fetch(`/api/builder/projects/${projectId}`, { cache: "no-store" }),
        fetch(`/api/builder/projects/${projectId}/events`, {
          cache: "no-store",
        }),
        fetch(`/api/builder/projects/${projectId}/checkpoints`, {
          cache: "no-store",
        }),
        fetch("/api/settings/language", { cache: "no-store" }),
      ]);
      const payload = await projectResponse.json().catch(() => ({}));
      if (projectResponse.status === 401) {
        setState("auth");
        return;
      }
      if (!projectResponse.ok || payload.ok === false) {
        setState(
          payload.error?.code === "builder_schema_unavailable"
            ? "migration"
            : "error",
        );
        return;
      }
      const eventsPayload = eventsResponse.ok
        ? await eventsResponse.json()
        : { events: [] };
      const checkpointsPayload = checkpointsResponse.ok
        ? await checkpointsResponse.json()
        : { checkpoints: [] };
      setProject(payload.project ?? null);
      setEvents(eventsPayload.events ?? []);
      setCheckpoints(checkpointsPayload.checkpoints ?? []);
      if (languageResponse.ok) {
        const languagePayload = await languageResponse.json();
        setLanguage(languagePayload.language === "es" ? "es" : "en");
      }
      setState("ready");
    } catch {
      setState("error");
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const safePreview = useMemo(
    () => validateBuilderPreviewUrl(project?.preview_url),
    [project?.preview_url],
  );

  async function startSession() {
    if (!projectId) return;
    setStarting(true);
    try {
      await fetch(`/api/builder/projects/${projectId}/sessions`, {
        method: "POST",
      });
      await load();
    } finally {
      setStarting(false);
    }
  }

  return (
    <AlmaShell
      language={language}
      activeWorkspace="apps"
      title={project?.title ?? "ALMA Builder"}
      onLanguageChange={setLanguage}
    >
      <main className="min-h-full px-4 pb-24 pt-6 text-[#111111] md:px-8 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-7xl">
          <Link
            href={WORKSPACE_ROUTES.builder}
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#6B7280]"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Link>

          {state === "loading" ? (
            <StateCard text={copy.loading} />
          ) : state !== "ready" ? (
            <ErrorCard
              text={
                state === "auth"
                  ? copy.auth
                  : state === "migration"
                    ? copy.migration
                    : copy.error
              }
              retry={state === "auth" ? null : () => void load()}
              retryLabel={copy.retry}
            />
          ) : project ? (
            <>
              <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium uppercase tracking-wide text-[#6B7280]">
                    {project.lifecycle_status}
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">
                    {project.title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6B7280]">
                    {project.original_prompt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void startSession()}
                  disabled={starting || project.lifecycle_status === "archived"}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:bg-[#9CA3AF]"
                >
                  {starting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {starting ? copy.starting : copy.start}
                </button>
              </header>

              <div className="mb-4 grid grid-cols-3 rounded-xl border border-[#E5E7EB] bg-white p-1 md:hidden">
                {(["assistant", "progress", "preview"] as MobileTab[]).map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTab(item)}
                      className={`h-10 rounded-lg text-sm font-medium ${
                        tab === item ? "bg-black text-white" : "text-[#6B7280]"
                      }`}
                    >
                      {copy[item]}
                    </button>
                  ),
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_420px]">
                <section
                  className={`space-y-4 ${tab === "preview" ? "hidden md:block" : ""}`}
                >
                  <Panel title={copy.assistant} icon={CheckCircle2}>
                    {project.last_error_code ===
                    "BUILDER_ENGINE_NOT_CONFIGURED" ? (
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                        <p className="text-sm font-semibold">{copy.blocked}</p>
                        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                          {copy.engineBlocked}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm leading-6 text-[#6B7280]">
                        {copy.approvals}
                      </p>
                    )}
                  </Panel>

                  <Panel title={copy.events} icon={Clock3}>
                    {events.length ? (
                      <div className="space-y-3">
                        {events.map((event) => (
                          <div
                            key={event.id}
                            className="rounded-xl bg-[#F9FAFB] p-3"
                          >
                            <p className="text-sm font-medium">
                              {event.summary}
                            </p>
                            <p className="mt-1 text-xs text-[#6B7280]">
                              #{event.sequence} · {event.event_type}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#6B7280]">{copy.noEvents}</p>
                    )}
                  </Panel>
                </section>

                <aside
                  className={`space-y-4 ${tab === "assistant" || tab === "progress" ? "hidden md:block" : ""}`}
                >
                  <Panel title={copy.preview} icon={AlertCircle}>
                    {safePreview ? (
                      <iframe
                        title={`${project.title} preview`}
                        src={safePreview.url}
                        sandbox="allow-scripts allow-forms"
                        referrerPolicy="no-referrer"
                        className="h-[520px] w-full rounded-xl border border-[#E5E7EB] bg-white"
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-5">
                        <p className="text-sm font-semibold">
                          {copy.previewMissing}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                          {copy.previewBlocked}
                        </p>
                      </div>
                    )}
                  </Panel>

                  <Panel title={copy.checkpoints} icon={CheckCircle2}>
                    {checkpoints.length ? (
                      <div className="space-y-2">
                        {checkpoints.map((checkpoint) => (
                          <div
                            key={checkpoint.id}
                            className="rounded-xl bg-[#F9FAFB] p-3 text-sm"
                          >
                            {checkpoint.checkpoint_label}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#6B7280]">
                        {copy.noCheckpoints}
                      </p>
                    )}
                  </Panel>
                </aside>
              </div>
            </>
          ) : (
            <ErrorCard
              text={copy.error}
              retry={() => void load()}
              retryLabel={copy.retry}
            />
          )}
        </div>
      </main>
    </AlmaShell>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof CheckCircle2;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StateCard({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white p-4 text-sm text-[#6B7280]">
      <Loader2 className="h-4 w-4 animate-spin" />
      {text}
    </div>
  );
}

function ErrorCard({
  text,
  retry,
  retryLabel,
}: {
  text: string;
  retry: (() => void) | null;
  retryLabel: string;
}) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm leading-6 text-[#6B7280]">{text}</p>
      </div>
      {retry ? (
        <button
          type="button"
          onClick={retry}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-black px-3 text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
