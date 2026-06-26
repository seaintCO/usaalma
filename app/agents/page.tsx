"use client";

import { Bot, Brain, BriefcaseBusiness, Calendar, Cross, Phone, ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";

const iconMap:any = {
  planner: Calendar,
  sales: BriefcaseBusiness,
  finance: ReceiptText,
  receptionist: Phone,
  faith: Cross,
  general: Bot,
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);

  async function loadAgents() {
    const res = await fetch("/api/agents/list");
    const data = await res.json();
    if (Array.isArray(data)) setAgents(data);
  }

  useEffect(() => {
    loadAgents();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <Brain className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            ALMA Agents
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Agentes especializados que ayudan a ALMA a decidir, ejecutar y organizar mejor.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const Icon = iconMap[agent.key] || Bot;

            return (
              <div key={agent.key} className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8]">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-medium">{agent.name}</h2>
                <p className="mt-2 text-sm leading-6 text-[#6B7280]">{agent.description}</p>
                <div className="mt-5 rounded-full bg-[#F7F7F8] px-3 py-1 text-xs font-medium text-[#6B7280] inline-block">
                  {agent.key}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
