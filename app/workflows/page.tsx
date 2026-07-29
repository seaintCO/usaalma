"use client";

import {
  AlertCircle,
  GitBranch,
  Play,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

type WorkflowStep = {
  id?: string;
  label: string;
};

type Workflow = {
  id: string;
  name: string;
  status: string;
  trigger_type: string;
  steps?: WorkflowStep[];
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => null)) as
    T | { error?: string; message?: string } | null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && ("message" in body || "error" in body)
        ? body.message || body.error
        : null;
    throw new Error(message || `Request failed (${response.status})`);
  }

  return body as T;
}

export default function WorkflowsPage() {
  const { locale } = useAlmaLocale();
  const es = locale === "es";
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [name, setName] = useState("");
  const [stepLabel, setStepLabel] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await requestJson<Workflow[]>("/api/workflows/list", {
        cache: "no-store",
      });
      setWorkflows(Array.isArray(body) ? body : []);
    } catch {
      setError(
        es
          ? "No se pudieron cargar las automatizaciones. Inténtalo de nuevo."
          : "Automations could not be loaded. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [es]);

  async function createWorkflow() {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const workflow = await requestJson<Workflow>("/api/workflows/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), triggerType: "manual" }),
      });
      setName("");
      setSelectedWorkflow(workflow.id);
      await loadWorkflows();
    } catch {
      setError(
        es
          ? "No se pudo crear la automatización. Revisa tu plan e inténtalo de nuevo."
          : "The automation could not be created. Check your plan and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function addStep() {
    if (!selectedWorkflow || !stepLabel.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestJson("/api/workflows/add-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: selectedWorkflow,
          type: "task",
          label: stepLabel.trim(),
        }),
      });
      setStepLabel("");
      await loadWorkflows();
    } catch {
      setError(
        es
          ? "No se pudo agregar el paso. Inténtalo de nuevo."
          : "The step could not be added. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createFollowUpTemplate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const workflow = await requestJson<Workflow>("/api/workflows/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: es ? "Seguimiento de clientes" : "Customer follow-up",
          triggerType: "manual",
        }),
      });

      const steps = es
        ? [
            "Crear tarea de seguimiento",
            "Preparar respuesta guardada",
            "Marcar para revisión del propietario",
          ]
        : [
            "Create a follow-up task",
            "Prepare a saved reply",
            "Flag for owner review",
          ];

      for (const label of steps) {
        await requestJson("/api/workflows/add-step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId: workflow.id,
            type: "task",
            label,
          }),
        });
      }

      setSelectedWorkflow(workflow.id);
      await loadWorkflows();
    } catch {
      setError(
        es
          ? "No se pudo instalar la plantilla. Revisa tu plan e inténtalo de nuevo."
          : "The template could not be installed. Check your plan and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runWorkflow(id: string) {
    setRunningId(id);
    setError(null);
    try {
      await requestJson("/api/workflows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: id }),
      });
      await loadWorkflows();
    } catch {
      setError(
        es
          ? "La automatización no se pudo ejecutar. No se completó ninguna acción."
          : "The automation could not run. No action was completed.",
      );
    } finally {
      setRunningId(null);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWorkflows(), 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkflows]);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <a
          href="/dashboard"
          className="text-sm text-[#6B7280] hover:text-black"
        >
          ← {es ? "Volver a ALMA" : "Back to ALMA"}
        </a>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/workflows/runs"
            className="inline-flex rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
          >
            {es ? "Ver ejecuciones" : "View runs"}
          </a>
          <a
            href="/approvals"
            className="inline-flex rounded-full border border-[#D8DCE2] bg-white px-5 py-3 text-sm font-medium"
          >
            {es ? "Abrir aprobaciones" : "Open approvals"}
          </a>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-lg shadow-cyan-100">
            <Zap className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            {es ? "Automatizaciones" : "Automations"}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            {es
              ? "Crea procesos repetibles. Las acciones sensibles siguen pasando por aprobación."
              : "Build repeatable processes. Sensitive actions still go through approval."}
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void loadWorkflows()}
                className="mt-2 font-semibold underline"
              >
                {es ? "Reintentar" : "Retry"}
              </button>
            </div>
          </div>
        ) : null}

        <section className="mt-8 overflow-hidden rounded-[2rem] bg-[#11131A] p-6 text-white md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                <Sparkles className="h-4 w-4" />
                {es ? "Inicio rápido" : "Quick start"}
              </div>
              <h2 className="mt-3 text-2xl font-medium">
                {es
                  ? "Instala un seguimiento seguro"
                  : "Install a safe follow-up workflow"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                {es
                  ? "Crea tres pasos listos para personalizar. No envía mensajes ni cambia datos financieros automáticamente."
                  : "Creates three ready-to-customize steps. It does not automatically send messages or change financial data."}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void createFollowUpTemplate()}
              className="shrink-0 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-[#11131A] disabled:opacity-50"
            >
              {busy
                ? es
                  ? "Instalando…"
                  : "Installing…"
                : es
                  ? "Usar plantilla"
                  : "Use template"}
            </button>
          </div>
        </section>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
            <h2 className="text-2xl font-medium">
              {es ? "Crear automatización" : "Create automation"}
            </h2>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                es ? "Nombre de la automatización" : "Automation name"
              }
              className="mt-5 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              disabled={!name.trim() || busy}
              onClick={() => void createWorkflow()}
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />{" "}
              {es ? "Crear automatización" : "Create automation"}
            </button>
          </div>

          <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
            <h2 className="text-2xl font-medium">
              {es ? "Agregar paso" : "Add step"}
            </h2>

            <select
              value={selectedWorkflow}
              onChange={(event) => setSelectedWorkflow(event.target.value)}
              className="mt-5 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none focus:border-cyan-500"
            >
              <option value="">
                {es ? "Selecciona una automatización" : "Select an automation"}
              </option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>

            <input
              value={stepLabel}
              onChange={(event) => setStepLabel(event.target.value)}
              placeholder={
                es
                  ? "Ej.: Crear tarea de seguimiento"
                  : "E.g. Create follow-up task"
              }
              className="mt-3 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none focus:border-cyan-500"
            />

            <button
              type="button"
              disabled={!selectedWorkflow || !stepLabel.trim() || busy}
              onClick={() => void addStep()}
              className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> {es ? "Agregar paso" : "Add step"}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 text-sm text-[#6B7280]">
              {es ? "Cargando automatizaciones…" : "Loading automations…"}
            </div>
          ) : workflows.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-[#C9CED7] bg-white p-6 text-sm text-[#6B7280]">
              <p className="font-medium text-black">
                {es ? "Aún no hay automatizaciones" : "No automations yet"}
              </p>
              <p className="mt-2">
                {es
                  ? "Usa la plantilla de inicio rápido o crea la primera arriba."
                  : "Use the quick-start template or create your first one above."}
              </p>
            </div>
          ) : (
            workflows.map((workflow) => {
              const steps = workflow.steps || [];
              return (
                <article
                  key={workflow.id}
                  className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6"
                >
                  <GitBranch className="mb-5 h-5 w-5 text-violet-500" />
                  <h2 className="text-lg font-medium">{workflow.name}</h2>
                  <p className="mt-2 text-sm text-[#6B7280]">
                    {es ? "Activador" : "Trigger"}: {workflow.trigger_type}
                  </p>

                  <div className="mt-4 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    {workflow.status}
                  </div>

                  <div className="mt-5 space-y-2">
                    {steps.length === 0 ? (
                      <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                        {es
                          ? "Agrega al menos un paso para poder ejecutar."
                          : "Add at least one step before running."}
                      </div>
                    ) : (
                      steps.map((step, index) => (
                        <div
                          key={step.id || index}
                          className="rounded-xl bg-[#F7F7F8] p-3 text-sm"
                        >
                          {index + 1}. {step.label}
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void runWorkflow(workflow.id)}
                    disabled={runningId === workflow.id || steps.length === 0}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
                  >
                    <Play className="h-4 w-4" />
                    {runningId === workflow.id
                      ? es
                        ? "Ejecutando…"
                        : "Running…"
                      : es
                        ? "Ejecutar"
                        : "Run"}
                  </button>
                </article>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
