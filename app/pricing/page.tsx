"use client";

import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

const copy = {
  en: {
    back: "Back to ALMA",
    title: "A complete office. AI only when you choose it.",
    subtitle:
      "ALMA Office delivers real business operations without hidden AI calls. ALMA AI adds measured assistance and approval-controlled autonomy.",
    office: "ALMA Office",
    ai: "ALMA AI",
    officePrice: "$39",
    aiPrice: "$199",
    month: "/month",
    choose: "Choose plan",
    recommended: "AI included",
    officeItems: [
      "Customers, leads, vendors, and pipeline",
      "Unified inbox and saved replies",
      "Tasks, projects, calendar, and appointments",
      "Estimates, invoices, payments, expenses, and receipts",
      "Bookkeeping, payroll, and tax preparation",
      "Reports, exports, QuickBooks connection, and documents",
      "Rule-based automations in English and Spanish",
    ],
    aiItems: [
      "Everything in ALMA Office",
      "AI business assistant grounded in workspace data",
      "Reply drafting, summaries, extraction, and categorization suggestions",
      "Daily briefing and workflow generation",
      "Approval-controlled external actions",
      "Server-enforced monthly usage and cost controls",
    ],
    note: "ALMA prepares bookkeeping, payroll, and tax records. It is not a bank, payroll processor, tax filing service, or licensed accountant.",
  },
  es: {
    back: "Volver a ALMA",
    title: "Una oficina completa. IA solo cuando tú la eliges.",
    subtitle:
      "ALMA Office ofrece operaciones reales sin llamadas ocultas de IA. ALMA AI agrega asistencia medida y autonomía con aprobación.",
    office: "ALMA Office",
    ai: "ALMA AI",
    officePrice: "$39",
    aiPrice: "$199",
    month: "/mes",
    choose: "Elegir plan",
    recommended: "IA incluida",
    officeItems: [
      "Clientes, prospectos, proveedores y pipeline",
      "Bandeja unificada y respuestas guardadas",
      "Tareas, proyectos, calendario y citas",
      "Estimados, facturas, pagos, gastos y recibos",
      "Preparación contable, de nómina e impuestos",
      "Reportes, exportaciones, QuickBooks y documentos",
      "Automatizaciones por reglas en inglés y español",
    ],
    aiItems: [
      "Todo en ALMA Office",
      "Asistente empresarial basado en datos del espacio",
      "Redacción, resúmenes, extracción y sugerencias de categorías",
      "Resumen diario y generación de flujos",
      "Acciones externas controladas por aprobación",
      "Límites mensuales y control de costos en el servidor",
    ],
    note: "ALMA prepara registros contables, de nómina e impuestos. No es banco, procesador de nómina, servicio fiscal ni contador profesional.",
  },
} as const;

export default function PricingPage() {
  const { locale, setLocale } = useAlmaLocale();
  const t = copy[locale];
  const plans = [
    {
      name: t.office,
      price: t.officePrice,
      items: t.officeItems,
      plan: "office",
      dark: false,
    },
    {
      name: t.ai,
      price: t.aiPrice,
      items: t.aiItems,
      plan: "ai",
      dark: true,
    },
  ];
  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-black md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-[#667085]">
            ← {t.back}
          </Link>
          <button
            type="button"
            onClick={() => void setLocale(locale === "en" ? "es" : "en")}
            className="rounded-full border border-[#D0D5DD] bg-white px-4 py-2 text-sm"
          >
            {locale === "en" ? "ES" : "EN"}
          </button>
        </div>
        <h1 className="mt-14 max-w-4xl text-4xl font-medium tracking-tight md:text-7xl">
          {t.title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#667085]">
          {t.subtitle}
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {plans.map((plan) => (
            <section
              key={plan.plan}
              className={`rounded-[30px] border p-7 md:p-9 ${
                plan.dark
                  ? "border-black bg-black text-white"
                  : "border-[#D0D5DD] bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-medium">{plan.name}</h2>
                {plan.dark ? (
                  <span className="rounded-full bg-[#62D4B3] px-3 py-1 text-xs font-medium text-black">
                    {t.recommended}
                  </span>
                ) : null}
              </div>
              <p className="mt-5 text-5xl font-medium">
                {plan.price}
                <span className="ml-1 text-sm font-normal opacity-60">
                  {t.month}
                </span>
              </p>
              <ul className="mt-8 space-y-3">
                {plan.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6">
                    <Check className="mt-1 h-4 w-4 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={`/signup?checkout=${plan.plan}`}
                className={`mt-8 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-medium ${
                  plan.dark ? "bg-white text-black" : "bg-black text-white"
                }`}
              >
                {t.choose}
              </Link>
            </section>
          ))}
        </div>
        <p className="mt-8 flex gap-2 text-xs leading-5 text-[#667085]">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          {t.note}
        </p>
      </div>
    </main>
  );
}
