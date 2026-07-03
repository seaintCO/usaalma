"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";

export default function OnboardingPage() {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);

  async function finishOnboarding() {
    if (!businessName.trim()) return;

    setLoading(true);

    const res = await fetch("/api/onboarding/save", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        businessName,
        businessType,
        goal,
      }),
    });

    if (res.ok) {
      window.location.href = "/dashboard";
    } else {
      setLoading(false);
      alert("No se pudo completar onboarding.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center">
        <div className="w-full rounded-[2rem] border border-[#E5E7EB] bg-white p-6 shadow-sm md:p-10">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8]">
            <Sparkles className="h-5 w-5" />
          </div>

          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#6B7280]">
            Bienvenido a ALMA
          </p>

          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Vamos a configurar tu espacio.
          </h1>

          <p className="mt-4 text-lg text-[#6B7280]">
            ALMA creará un workspace, documento base y primeras tareas automáticamente.
          </p>

          <div className="mt-8 grid gap-4">
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Nombre de tu negocio"
              className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-4 outline-none"
            />

            <input
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="Tipo de negocio: roofing, real estate, agency..."
              className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] px-4 py-4 outline-none"
            />

            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="¿Cuál es tu meta principal?"
              className="min-h-32 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 outline-none"
            />
          </div>

          <button
            onClick={finishOnboarding}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-4 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Configurando..." : "Configurar mi ALMA"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
