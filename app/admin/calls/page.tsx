"use client";

import { PhoneCall } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminCallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [error, setError] = useState("");

  async function loadCalls() {
    const res = await fetch("/api/admin/calls");
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "No autorizado");
      return;
    }

    if (Array.isArray(data)) setCalls(data);
  }

  useEffect(() => {
    loadCalls();
  }, []);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <a href="/admin" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a Admin
        </a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <PhoneCall className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-medium tracking-tight">Call Logs</h1>
          <p className="mt-4 text-[#6B7280]">Llamadas y mensajes recibidos por Twilio.</p>
        </div>

        {error ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#E5E7EB] bg-white">
            {calls.length === 0 ? (
              <div className="p-6 text-sm text-[#6B7280]">No hay llamadas todavía.</div>
            ) : (
              calls.map((call) => (
                <div key={call.id} className="border-b border-[#E5E7EB] p-5 last:border-b-0">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">{call.phone_from || "Unknown"} → {call.phone_to || "Unknown"}</div>
                      <div className="mt-1 text-xs text-[#6B7280]">{new Date(call.created_at).toLocaleString()}</div>
                    </div>
                    <span className="rounded-full bg-[#F7F7F8] px-3 py-1 text-xs font-medium text-[#6B7280]">
                      {call.status}
                    </span>
                  </div>

                  {call.speech_result && (
                    <div className="mt-4 rounded-2xl bg-[#F7F7F8] p-4 text-sm text-[#374151]">
                      {call.speech_result}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
