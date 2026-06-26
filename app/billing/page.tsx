"use client";

import { CheckCircle2, CreditCard } from "lucide-react";

const plans = [
  {
    name: "Personal",
    price: "$25",
    plan: "personal",
    description: "Para individuos que quieren ALMA como asistente personal.",
    features: ["Chat", "Tasks", "Notes", "Documents", "Memory", "Marketplace"],
    featured: false,
  },
  {
    name: "Business Pro",
    price: "$100",
    plan: "business",
    description: "Para negocios que quieren CRM, facturación, workflows y recepcionista IA.",
    features: ["Todo Personal", "CRM", "Facturación", "Workflows", "Recepcionista IA", "Integraciones"],
    featured: true,
  },
];

const addons = [
  ["Recepcionista IA", "+ $99/mes"],
  ["Automatizaciones", "+ $49/mes"],
  ["Email Marketing", "+ $29/mes"],
  ["SMS", "Uso Twilio"],
];

export default function BillingPage() {
  async function openPortal() {
    const res = await fetch("/api/billing/portal", {
      method:"POST",
    });

    const data = await res.json();

    if (data.url) window.location.href = data.url;
    else alert(data.error || "No se pudo abrir el portal.");
  }
  async function checkout(plan:string) {
    const res = await fetch("/api/billing/checkout", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ plan }),
    });

    const data = await res.json();

    if (data.url) window.location.href = data.url;
    else alert(data.error || "No se pudo iniciar checkout.");
  }

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <CreditCard className="h-5 w-5" />
          </div>

          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#6B7280]">
            Billing
          </p>

          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Planes simples para usar ALMA.
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Cobraremos por acceso base y módulos premium según el uso del negocio.
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={openPortal}
            className="rounded-full border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-medium hover:bg-[#F7F7F8]"
          >
            Administrar suscripción
          </button>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.featured
                  ? "rounded-[2rem] border border-[#2563EB] bg-white p-8 shadow-lg shadow-blue-100"
                  : "rounded-[2rem] border border-[#E5E7EB] bg-white p-8"
              }
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-medium">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#6B7280]">{plan.description}</p>
                </div>

                {plan.featured && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#2563EB]">
                    Popular
                  </span>
                )}
              </div>

              <div className="mt-8 flex items-end gap-2">
                <span className="text-5xl font-medium tracking-tight">{plan.price}</span>
                <span className="pb-2 text-[#6B7280]">/mes</span>
              </div>

              <button
                onClick={() => checkout(plan.plan)}
                className={
                  plan.featured
                    ? "mt-8 w-full rounded-2xl bg-[#2563EB] py-4 font-medium text-white"
                    : "mt-8 w-full rounded-2xl bg-black py-4 font-medium text-white"
                }
              >
                Elegir plan
              </button>

              <div className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-[2rem] border border-[#E5E7EB] bg-white p-8">
          <h2 className="text-2xl font-medium">Add-ons</h2>
          <p className="mt-2 text-sm text-[#6B7280]">
            Módulos premium que pueden venderse aparte.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {addons.map(([name, price]) => (
              <div key={name} className="rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-5">
                <div className="font-medium">{name}</div>
                <div className="mt-2 text-sm text-[#6B7280]">{price}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

