"use client";

import {
  Bot,
  Calendar,
  CheckCircle2,
  FileText,
  Globe,
  Mail,
  MessageSquareText,
  ReceiptText,
  Store,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

const iconMap:any = {
  planner: Calendar,
  tasks: CheckCircle2,
  notes: FileText,
  crm: Users,
  invoicing: ReceiptText,
  documents: FileText,
  ai_receptionist: Bot,
  automations: Zap,
  email_marketing: Mail,
  sms: MessageSquareText,
  website_builder: Globe,
};

export default function MarketplacePage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function loadModules() {
    const res = await fetch("/api/modules/list");
    const data = await res.json();
    if (Array.isArray(data)) setModules(data);
  }

  async function installModule(moduleKey:string) {
    setLoadingKey(moduleKey);

    await fetch("/api/modules/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleKey }),
    });

    await loadModules();
    setLoadingKey(null);
  }

  useEffect(() => {
    loadModules();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-6 py-10 text-[#111111]">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
              <Store className="h-5 w-5" />
            </div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#6B7280]">
              Marketplace
            </p>
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
              Instala solo lo que necesitas.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
              Activa módulos personales, herramientas de negocio y automatizaciones
              cuando las necesites.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280]">
            <div className="font-medium text-black">Planes principales</div>
            <div>Personal: $25/mes</div>
            <div>Business Pro: $100/mes</div>
          </div>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const Icon = iconMap[module.module_key] || Store;

            return (
              <div
                key={module.module_key}
                className="flex flex-col rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-black/5 transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8]">
                    <Icon className="h-5 w-5" />
                  </div>

                  <span className="rounded-full bg-[#F7F7F8] px-3 py-1 text-xs font-medium text-[#6B7280]">
                    {module.price}
                  </span>
                </div>

                <h2 className="text-lg font-medium tracking-tight">{module.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-[#6B7280]">
                  {module.description}
                </p>

                <button
                  onClick={() => installModule(module.module_key)}
                  disabled={module.installed || loadingKey === module.module_key}
                  className={
                    module.installed
                      ? "mt-6 rounded-2xl bg-green-50 py-3 text-sm font-medium text-green-700"
                      : "mt-6 rounded-2xl bg-black py-3 text-sm font-medium text-white hover:bg-gray-800"
                  }
                >
                  {loadingKey === module.module_key
                    ? "Instalando..."
                    : module.installed
                    ? "Instalado"
                    : "Instalar módulo"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
