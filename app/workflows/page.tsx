"use client";

import { GitBranch, Play, Plus, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [stepLabel, setStepLabel] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);

  async function loadWorkflows() {
    const res = await fetch("/api/workflows/list");
    const data = await res.json();
    if (Array.isArray(data)) setWorkflows(data);
  }

  async function createWorkflow() {
    if (!name.trim()) return;

    await fetch("/api/workflows/create", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ name, triggerType:"manual" }),
    });

    setName("");
    loadWorkflows();
  }

  async function addStep() {
    if (!selectedWorkflow || !stepLabel.trim()) return;

    await fetch("/api/workflows/add-step", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        workflowId:selectedWorkflow,
        type:"task",
        label:stepLabel,
      }),
    });

    setStepLabel("");
    loadWorkflows();
  }

  async function runWorkflow(id:string) {
    setRunningId(id);

    await fetch("/api/workflows/run", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ workflowId:id }),
    });

    setRunningId(null);
    loadWorkflows();
  }

  useEffect(() => {
    loadWorkflows();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8">
          <a href="/workflows/runs" className="inline-flex rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
            Ver ejecuciones
          </a>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <Zap className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Workflows</h1>
          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Crea automatizaciones para que ALMA ejecute procesos repetibles.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
            <h2 className="text-2xl font-medium">Crear workflow</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del workflow"
              className="mt-5 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none"
            />
            <button onClick={createWorkflow} className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> Crear workflow
            </button>
          </div>

          <div className="rounded-[2rem] border border-[#E5E7EB] bg-white p-6">
            <h2 className="text-2xl font-medium">Agregar paso</h2>

            <select
              value={selectedWorkflow}
              onChange={(e) => setSelectedWorkflow(e.target.value)}
              className="mt-5 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none"
            >
              <option value="">Selecciona workflow</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>

            <input
              value={stepLabel}
              onChange={(e) => setStepLabel(e.target.value)}
              placeholder="Ej: Crear tarea de seguimiento"
              className="mt-3 w-full rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none"
            />

            <button onClick={addStep} className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> Agregar paso
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {workflows.length === 0 ? (
            <div className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 text-sm text-[#6B7280]">
              No tienes workflows todavía.
            </div>
          ) : (
            workflows.map((workflow) => (
              <div key={workflow.id} className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
                <GitBranch className="mb-5 h-5 w-5 text-[#6B7280]" />
                <h2 className="text-lg font-medium">{workflow.name}</h2>
                <p className="mt-2 text-sm text-[#6B7280]">Trigger: {workflow.trigger_type}</p>

                <div className="mt-4 inline-block rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                  {workflow.status}
                </div>

                <div className="mt-5 space-y-2">
                  {(workflow.steps || []).length === 0 ? (
                    <p className="text-xs text-[#6B7280]">Sin pasos todavía.</p>
                  ) : (
                    (workflow.steps || []).map((step:any, index:number) => (
                      <div key={step.id || index} className="rounded-xl bg-[#F7F7F8] p-3 text-sm">
                        {index + 1}. {step.label}
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => runWorkflow(workflow.id)}
                  disabled={runningId === workflow.id || (workflow.steps || []).length === 0}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
                >
                  <Play className="h-4 w-4" />
                  {runningId === workflow.id ? "Ejecutando..." : "Ejecutar workflow"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

