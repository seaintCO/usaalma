"use client";

import { Activity, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function WorkflowRunsPage() {
  const [runs, setRuns] = useState<any[]>([]);

  async function loadRuns() {
    const res = await fetch("/api/workflows/runs");
    const data = await res.json();
    if (Array.isArray(data)) setRuns(data);
  }

  useEffect(() => {
    loadRuns();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <a href="/workflows" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a Workflows
        </a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <Activity className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight">Workflow Runs</h1>
          <p className="mt-4 text-[#6B7280]">Historial de automatizaciones ejecutadas por ALMA.</p>
        </div>

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white">
          {runs.length === 0 ? (
            <div className="p-6 text-sm text-[#6B7280]">No hay ejecuciones todavía.</div>
          ) : (
            runs.map((run) => (
              <div key={run.id} className="border-b border-[#E5E7EB] p-5 last:border-b-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{run.workflows?.name || "Workflow"}</div>
                    <div className="mt-1 text-xs text-[#6B7280]">
                      {new Date(run.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {run.status}
                  </div>
                </div>

                <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#F7F7F8] p-4 text-xs text-[#6B7280]">
{JSON.stringify(run.result, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
