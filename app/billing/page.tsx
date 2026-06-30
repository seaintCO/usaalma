"use client";

import { CheckCircle2, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";

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

export default function BillingPage() {
  const [subscription, setSubscription] = useState<any>(null);

  async function loadStatus() {
    const res = await fetch("/api/billing/status");
    const data = await res.json();
    setSubscription(data);
  }

  async function checkout(plan:string) {
    const res = await fetch("/api/billing/checkout", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ plan }),
    });

    const data = await res.json();

    if (res.status === 401) {
      window.location.href = "/login?redirect=/billing";
      return;
    }

    if (data.url) window.location.href = data.url;
    else alert(data.error || "No se pudo iniciar checkout.");
  }

  async function openPortal() {
    const res = await fetch("/api/billing/portal", { method:"POST" });
    const data = await res.json();

    if (data.url) window.location.href = data.url;
    else alert(data.error || "No se pudo abrir el portal.");
  }

  useEffect(() => {
    loadStatus();
  }, []);

  const active = subscription && ["active", "trialing"].includes(subscription.status);

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-[#111111] md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <a href="/" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white">
            <CreditCard className="h-5 w-5" />
          </div>

          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Planes simples para usar ALMA.
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">
            Personal para individuos. Business Pro para negocios.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-[#E5E7EB] bg-white p-5">
          <div className="text-sm text-[#6B7280]">Estado actual</div>
          <div className="mt-1 text-xl font-medium">
            {active ? `${subscription.plan} — ${subscription.status}` : "Sin suscripción activa"}
          </div>

          {active && (
            <button
              onClick={openPortal}
              className="mt-4 rounded-full border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-medium hover:bg-[#F7F7F8]"
            >
              Administrar suscripción
            </button>
          )}
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
              <h2 className="text-2xl font-medium">{plan.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">{plan.description}</p>

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
                Elegir {plan.name}
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
      </div>
    </main>
  );
}

