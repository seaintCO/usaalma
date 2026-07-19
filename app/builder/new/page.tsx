"use client";

import { ArrowLeft, Code2, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import { WORKSPACE_ROUTES } from "@/lib/platform/workspaceRoutes";
import type { BuilderProjectType } from "@/lib/builder/types";

const PROJECT_TYPES: Array<{
  key: BuilderProjectType;
  en: string;
  es: string;
}> = [
  { key: "website", en: "Website or landing page", es: "Sitio o landing" },
  { key: "portal", en: "Client portal", es: "Portal de clientes" },
  {
    key: "internal_tool",
    en: "Internal business tool",
    es: "Herramienta interna",
  },
  {
    key: "booking",
    en: "Booking or lead-generation",
    es: "Reservas o prospectos",
  },
  { key: "custom_app", en: "Custom application", es: "Aplicacion a medida" },
];

const COPY = {
  en: {
    title: "New Builder project",
    subtitle:
      "Describe what you want in plain language. ALMA will create a draft and keep execution blocked until a secure Builder Engine is connected.",
    back: "Builder",
    question: "What do you want to build?",
    name: "Project name",
    language: "Language",
    description: "Detailed description",
    context: "Optional company context",
    create: "Create draft",
    creating: "Creating...",
    error: "Project draft could not be created.",
    required: "Add a project name and description first.",
  },
  es: {
    title: "Nuevo proyecto Builder",
    subtitle:
      "Describe lo que quieres en lenguaje natural. ALMA crea un borrador y mantiene la ejecucion bloqueada hasta conectar un Builder Engine seguro.",
    back: "Builder",
    question: "Que quieres crear?",
    name: "Nombre del proyecto",
    language: "Idioma",
    description: "Descripcion detallada",
    context: "Contexto opcional de la empresa",
    create: "Crear borrador",
    creating: "Creando...",
    error: "No se pudo crear el borrador.",
    required: "Agrega nombre y descripcion del proyecto primero.",
  },
} as const;

export default function NewBuilderProjectPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<AlmaShellLanguage>("en");
  const [projectType, setProjectType] = useState<BuilderProjectType>("website");
  const [preferredLanguage, setPreferredLanguage] =
    useState<AlmaShellLanguage>("en");
  const [title, setTitle] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [companyContext, setCompanyContext] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const copy = COPY[language];
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  async function createProject() {
    if (!title.trim() || !originalPrompt.trim()) {
      setError(copy.required);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/builder/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          originalPrompt,
          companyContext,
          preferredLanguage,
          projectType,
          idempotencyKey,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false || !payload.project?.id) {
        throw new Error(payload.error?.message ?? "builder_create_failed");
      }
      router.push(`${WORKSPACE_ROUTES.builder}/projects/${payload.project.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AlmaShell
      language={language}
      activeWorkspace="apps"
      title={copy.title}
      onLanguageChange={setLanguage}
    >
      <main className="min-h-full px-4 pb-24 pt-6 text-[#111111] md:px-8 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-4xl">
          <Link
            href={WORKSPACE_ROUTES.builder}
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#6B7280]"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Link>
          <header className="mb-8">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white">
              <Code2 className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6B7280] md:text-base">
              {copy.subtitle}
            </p>
          </header>

          <section className="rounded-xl border border-[#E5E7EB] bg-white p-4 md:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">{copy.question}</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {PROJECT_TYPES.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setProjectType(item.key)}
                    className={`min-h-12 rounded-xl border px-3 text-left text-sm font-medium ${
                      projectType === item.key
                        ? "border-black bg-black text-white"
                        : "border-[#D1D5DB] bg-white text-black"
                    }`}
                  >
                    {language === "es" ? item.es : item.en}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                {copy.name}
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-12 rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-3 text-base outline-none focus:border-black"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {copy.language}
                <select
                  value={preferredLanguage}
                  onChange={(event) =>
                    setPreferredLanguage(
                      event.target.value === "es" ? "es" : "en",
                    )
                  }
                  className="h-12 rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] px-3 text-base outline-none focus:border-black"
                >
                  <option value="en">English</option>
                  <option value="es">Espanol</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {copy.description}
                <textarea
                  value={originalPrompt}
                  onChange={(event) => setOriginalPrompt(event.target.value)}
                  rows={8}
                  className="min-h-48 resize-y rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] p-3 text-base leading-7 outline-none focus:border-black"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                {copy.context}
                <textarea
                  value={companyContext}
                  onChange={(event) => setCompanyContext(event.target.value)}
                  rows={4}
                  className="resize-y rounded-xl border border-[#D1D5DB] bg-[#F9FAFB] p-3 text-base leading-7 outline-none focus:border-black"
                />
              </label>
            </div>

            {error ? (
              <p className="mt-4 text-sm leading-6 text-red-600">{error}</p>
            ) : null}

            <button
              type="button"
              onClick={() => void createProject()}
              disabled={saving}
              className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:bg-[#9CA3AF]"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {saving ? copy.creating : copy.create}
            </button>
          </section>
        </div>
      </main>
    </AlmaShell>
  );
}
