"use client";

import {
  ArrowUpRight,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import { WORKSPACE_ROUTES } from "@/lib/platform/workspaceRoutes";

type DocumentItem = {
  id: string;
  title: string;
  status?: string | null;
  updated_at?: string | null;
};

type LoadState = "loading" | "ready" | "auth" | "storage" | "error";

const COPY = {
  en: {
    title: "Files",
    subtitle: "Your saved ALMA documents and file workspace.",
    loading: "Loading files...",
    unavailable: "Files are temporarily unavailable.",
    auth: "Sign in to view your ALMA files.",
    storage: "File storage is not available in this environment.",
    retry: "Retry",
    empty: "No documents saved yet.",
    openDocuments: "Open Documents",
    documents: "Documents",
    updated: "Updated",
    unknown: "Unknown",
  },
  es: {
    title: "Archivos",
    subtitle: "Tus documentos y archivos guardados en ALMA.",
    loading: "Cargando archivos...",
    unavailable: "Archivos no esta disponible temporalmente.",
    auth: "Inicia sesion para ver tus archivos de ALMA.",
    storage:
      "El almacenamiento de archivos no esta disponible en este entorno.",
    retry: "Reintentar",
    empty: "Aun no hay documentos guardados.",
    openDocuments: "Abrir Documentos",
    documents: "Documentos",
    updated: "Actualizado",
    unknown: "Desconocido",
  },
} as const;

export default function FilesPage() {
  const [language, setLanguage] = useState<AlmaShellLanguage>("en");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const copy = COPY[language];

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [documentsResponse, languageResponse] = await Promise.all([
        fetch("/api/documents/list", { cache: "no-store" }),
        fetch("/api/settings/language", { cache: "no-store" }),
      ]);
      const payload = (await documentsResponse.json()) as {
        ok?: boolean;
        documents?: DocumentItem[];
        error?: { code?: string };
      };
      if (documentsResponse.status === 401) {
        setDocuments([]);
        setState("auth");
      } else if (!documentsResponse.ok || payload.ok === false) {
        setDocuments([]);
        setState(
          payload.error?.code === "storage_unavailable" ? "storage" : "error",
        );
      } else {
        setDocuments(payload.documents ?? []);
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
      activeWorkspace="files"
      title={copy.title}
      onLanguageChange={setLanguage}
    >
      <div className="min-h-full px-4 pb-24 pt-6 text-[#111111] md:px-8 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white">
              <FolderOpen className="h-5 w-5" />
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
            <a
              href={WORKSPACE_ROUTES.documents}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-3 text-sm font-medium text-white"
            >
              {copy.openDocuments}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </header>

          {state === "loading" ? (
            <div className="flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {copy.loading}
            </div>
          ) : null}

          {state === "auth" || state === "storage" || state === "error" ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <p className="text-sm text-[#6B7280]">
                {state === "auth"
                  ? copy.auth
                  : state === "storage"
                    ? copy.storage
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
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <h2 className="text-sm font-semibold">{copy.documents}</h2>
              </div>
              {documents.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {documents.map((document) => (
                    <a
                      key={document.id}
                      href={WORKSPACE_ROUTES.documents}
                      className="min-w-0 rounded-xl bg-[#F7F7F8] p-3"
                    >
                      <p className="truncate text-sm font-semibold">
                        {document.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-[#6B7280]">
                        {document.updated_at
                          ? `${copy.updated} ${formatShortDate(
                              document.updated_at,
                              language,
                            )}`
                          : document.status || copy.unknown}
                      </p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-[#F7F7F8] p-3 text-sm text-[#6B7280]">
                  {copy.empty}
                </p>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </AlmaShell>
  );
}

function formatShortDate(value: string, language: AlmaShellLanguage) {
  return new Intl.DateTimeFormat(language === "es" ? "es" : "en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
