"use client";

import { Activity, BarChart3, Bot, FileText, MessageSquare, ReceiptText, Store, Users } from "lucide-react";
import { useEffect, useState } from "react";

const cards = [
  ["Conversaciones", "conversations", MessageSquare],
  ["Mensajes", "messages", Bot],
  ["Tareas", "tasks", Activity],
  ["Notas", "notes", FileText],
  ["Contactos", "contacts", Users],
  ["Facturas", "invoices", ReceiptText],
  ["Módulos instalados", "installedModules", Store],
  ["Acciones ejecutadas", "toolRuns", BarChart3],
];

export default function AdminPage() {
  const [stats, setStats] = useState<any>({});
  const [error, setError] = useState("");

  async function loadStats() {
    const res = await fetch("/api/admin/stats");
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "No autorizado");
      return;
    }

    setStats(data);
  }

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8">
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            ALMA Admin
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Panel interno para monitorear actividad, módulos y acciones.
          </p>
        </div>

        {error ? (
          <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {cards.map(([label, key, Icon]: any) => (
              <div key={key} className="rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-sm text-[#6B7280]">{label}</div>
                <div className="mt-2 text-3xl font-medium">{stats[key] ?? 0}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
