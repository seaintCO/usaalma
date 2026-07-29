"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Check, Sparkles, UserRound } from "lucide-react";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

type Mode = "business" | "creator" | "both";

const copy = {
  en: {
    eyebrow: "Welcome to ALMA",
    title: "Set up your business office.",
    subtitle:
      "Choose how you operate. The same secure workspace adapts its labels, dashboard, and setup checklist.",
    business: "Business",
    businessBody: "Customers, estimates, invoices, money, tasks, and a team.",
    creator: "Creator",
    creatorBody:
      "Audience, brand inquiries, sponsors, bookings, offers, invoices, and expenses.",
    both: "Creator + Business",
    bothBody:
      "Separate identities and reporting with shared contacts where you choose.",
    next: "Continue setup",
    later: "Go to dashboard",
    saving: "Saving...",
    saveError: "ALMA could not save this setup. Try again.",
    checklist: [
      "Add business or brand information",
      "Choose what you want to manage",
      "Connect email and calendar when ready",
      "Create your first customer, task, estimate, or invoice",
    ],
  },
  es: {
    eyebrow: "Bienvenido a ALMA",
    title: "Configura tu oficina empresarial.",
    subtitle:
      "Elige cómo operas. El mismo espacio seguro adapta sus etiquetas, panel y lista de configuración.",
    business: "Negocio",
    businessBody: "Clientes, estimados, facturas, dinero, tareas y equipo.",
    creator: "Creador",
    creatorBody:
      "Audiencia, marcas, patrocinadores, reservas, ofertas, facturas y gastos.",
    both: "Creador + Negocio",
    bothBody:
      "Identidades y reportes separados con contactos compartidos cuando lo decidas.",
    next: "Continuar configuración",
    later: "Ir al panel",
    saving: "Guardando...",
    saveError: "ALMA no pudo guardar la configuración. Intenta de nuevo.",
    checklist: [
      "Agrega información del negocio o marca",
      "Elige lo que quieres administrar",
      "Conecta correo y calendario cuando estés listo",
      "Crea tu primer cliente, tarea, estimado o factura",
    ],
  },
} as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { locale, setLocale } = useAlmaLocale();
  const [mode, setMode] = useState<Mode>("business");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const t = copy[locale];
  const modes = [
    {
      key: "business" as const,
      label: t.business,
      body: t.businessBody,
      icon: BriefcaseBusiness,
    },
    {
      key: "creator" as const,
      label: t.creator,
      body: t.creatorBody,
      icon: UserRound,
    },
    { key: "both" as const, label: t.both, body: t.bothBody, icon: Sparkles },
  ];

  async function continueSetup() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/business-office/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operatingMode: mode,
          language: locale,
          completeOnboarding: false,
        }),
      });
      if (!response.ok) throw new Error("save_failed");
      router.push(`/settings?setup=${mode}`);
    } catch {
      setError(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-8 text-black md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void setLocale(locale === "en" ? "es" : "en")}
            className="rounded-full border border-[#D0D5DD] bg-white px-4 py-2 text-sm"
          >
            {locale === "en" ? "ES" : "EN"}
          </button>
        </div>
        <p className="mt-10 text-xs font-medium uppercase tracking-[0.2em] text-[#667085]">
          {t.eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-medium tracking-tight md:text-7xl">
          {t.title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#667085]">
          {t.subtitle}
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {modes.map(({ key, label, body, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`rounded-[24px] border p-6 text-left ${
                mode === key
                  ? "border-black bg-black text-white"
                  : "border-[#D0D5DD] bg-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              <h2 className="mt-8 text-xl font-medium">{label}</h2>
              <p className="mt-2 text-sm leading-6 opacity-65">{body}</p>
            </button>
          ))}
        </div>
        <div className="mt-6 rounded-[24px] border border-[#D0D5DD] bg-white p-6">
          <ul className="grid gap-3 md:grid-cols-2">
            {t.checklist.map((item) => (
              <li key={item} className="flex gap-3 text-sm">
                <Check className="h-4 w-4 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void continueSetup()}
            disabled={saving}
            className="rounded-full bg-black px-6 py-3 text-center text-sm font-medium text-white"
          >
            {saving ? t.saving : t.next}
          </button>
          <a
            href="/dashboard"
            className="rounded-full border border-[#D0D5DD] bg-white px-6 py-3 text-center text-sm font-medium"
          >
            {t.later}
          </a>
        </div>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
