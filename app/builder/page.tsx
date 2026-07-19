"use client";

import {
  AlertCircle,
  ArrowRight,
  Code2,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import { WORKSPACE_ROUTES } from "@/lib/platform/workspaceRoutes";
import type { BuilderProject } from "@/lib/builder/types";

type LoadState =
  "loading" | "ready" | "auth" | "blocked" | "migration" | "error";

const COPY = {
  en: {
    title: "ALMA Builder",
    subtitle:
      "Describe a website, portal, internal tool, or lightweight app. ALMA will prepare the project foundation and wait for an isolated Builder Engine before running code.",
    primary: "Build something",
    loading: "Loading Builder...",
    auth: "Sign in to use ALMA Builder.",
    blocked: "Builder is not included for this account.",
    migration:
      "Builder storage is not available in this environment. Apply the Builder foundation migration before creating projects.",
    error: "Builder is temporarily unavailable.",
    retry: "Retry",
    recent: "Recent projects",
    empty:
      "No Builder projects yet. Start with a plain-language description in English or Spanish.",
    open: "Open",
    previewBlocked: "Engine not configured",
  },
  es: {
    title: "ALMA Builder",
    subtitle:
      "Describe un sitio, portal, herramienta interna o app ligera. ALMA prepara la base y espera un Builder Engine aislado antes de ejecutar codigo.",
    primary: "Crear algo",
    loading: "Cargando Builder...",
    auth: "Inicia sesion para usar ALMA Builder.",
    blocked: "Builder no esta incluido en esta cuenta.",
    migration:
      "El almacenamiento de Builder no esta disponible en este entorno. Aplica la migracion de Builder antes de crear proyectos.",
    error: "Builder no esta disponible temporalmente.",
    retry: "Reintentar",
    recent: "Proyectos recientes",
    empty:
      "Aun no hay proyectos Builder. Empieza con una descripcion en ingles o espanol.",
    open: "Abrir",
    previewBlocked: "Engine sin configurar",
  },
} as const;

export default function BuilderPage() {
  const [language, setLanguage] = useState<AlmaShellLanguage>("en");
  const [state, setState] = useState<LoadState>("loading");
  const [projects, setProjects] = useState<BuilderProject[]>([]);
  const copy = COPY[language];

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [projectsResponse, languageResponse] = await Promise.all([
        fetch("/api/builder/projects", { cache: "no-store" }),
        fetch("/api/settings/language", { cache: "no-store" }),
      ]);
      const payload = await projectsResponse.json().catch(() => ({}));
      if (projectsResponse.status === 401) {
        setProjects([]);
        setState("auth");
      } else if (!projectsResponse.ok || payload.ok === false) {
        setProjects([]);
        setState(
          payload.error?.code === "builder_entitlement_required"
            ? "blocked"
            : payload.error?.code === "builder_schema_unavailable"
              ? "migration"
              : "error",
        );
      } else {
        setProjects(payload.projects ?? []);
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

  return (
    <AlmaShell
      language={language}
      activeWorkspace="apps"
      title={copy.title}
      onLanguageChange={setLanguage}
    >
      <main className="min-h-full px-4 pb-24 pt-6 text-[#111111] md:px-8 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white">
              <Code2 className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                  {copy.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6B7280] md:text-base">
                  {copy.subtitle}
                </p>
              </div>
              <Link
                href={`${WORKSPACE_ROUTES.builder}/new`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" />
                {copy.primary}
              </Link>
            </div>
          </header>

          {state === "loading" ? (
            <StateCard icon={Loader2} text={copy.loading} spinning />
          ) : null}

          {["auth", "blocked", "migration", "error"].includes(state) ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm leading-6 text-[#6B7280]">
                  {state === "auth"
                    ? copy.auth
                    : state === "blocked"
                      ? copy.blocked
                      : state === "migration"
                        ? copy.migration
                        : copy.error}
                </p>
              </div>
              {state !== "auth" ? (
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-black px-3 text-sm font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  {copy.retry}
                </button>
              ) : null}
            </div>
          ) : null}

          {state === "ready" ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold">{copy.recent}</h2>
              {projects.length ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {projects.map((project) => (
                    <article
                      key={project.id}
                      className="min-w-0 rounded-xl border border-[#E5E7EB] bg-white p-4"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold">
                            {project.title}
                          </h3>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#6B7280]">
                            {project.original_prompt}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-[#E5E7EB] px-2 py-1 text-[11px] font-medium text-[#6B7280]">
                          {project.lifecycle_status}
                        </span>
                      </div>
                      {project.last_error_code ===
                      "BUILDER_ENGINE_NOT_CONFIGURED" ? (
                        <p className="mt-3 text-xs text-[#6B7280]">
                          {copy.previewBlocked}
                        </p>
                      ) : null}
                      <Link
                        href={`${WORKSPACE_ROUTES.builder}/projects/${project.id}`}
                        className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-3 text-sm font-medium text-white"
                      >
                        {copy.open}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-white p-6 text-sm leading-6 text-[#6B7280]">
                  {copy.empty}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </main>
    </AlmaShell>
  );
}

function StateCard({
  icon: Icon,
  text,
  spinning = false,
}: {
  icon: typeof Loader2;
  text: string;
  spinning?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white p-4 text-sm text-[#6B7280]">
      <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
      {text}
    </div>
  );
}
