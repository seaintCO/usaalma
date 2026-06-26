"use client";

import { GitBranch, Plus, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [name, setName] = useState("");

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
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <Zap className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Workflows</h1>
          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Crea automatizaciones para que ALMA ejecute procesos repetibles.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-[2rem] border border-[#E5E7EB] bg-white p-6 md:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del workflow"
            className="flex-1 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-3 outline-none"
          />
          <button onClick={createWorkflow} className="flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Crear workflow
          </button>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
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
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
