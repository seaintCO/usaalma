"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  GitBranch,
  ShieldCheck,
  Zap,
} from "lucide-react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

const copy = {
  en: {
    title: "Automations",
    subtitle:
      "Build repeatable business rules. Office plans run deterministic rules; AI plans can add metered assistance.",
    rules: "Rule-based workflows",
    rulesBody:
      "Trigger tasks, reminders, labels, and internal updates without generative AI.",
    schedules: "Scheduled work",
    schedulesBody:
      "Run recurring reminders and operational checklists at a predictable time.",
    approvals: "Approval controls",
    approvalsBody:
      "External messages, invoices, financial changes, and destructive actions stop for review.",
    ai: "AI workflows",
    aiBody:
      "On ALMA AI, generate bounded workflows with usage limits, tool permissions, and audit logs.",
    open: "Open",
    modes: "Autonomy modes",
    modesBody:
      "Manual organizes only. Draft prepares every action. Assisted completes approved low-risk work. Autonomous acts only inside rules you explicitly authorize.",
  },
  es: {
    title: "Automatizaciones",
    subtitle:
      "Crea reglas repetibles. Office ejecuta reglas deterministas; AI puede agregar asistencia medida.",
    rules: "Flujos basados en reglas",
    rulesBody:
      "Activa tareas, recordatorios, etiquetas y cambios internos sin IA generativa.",
    schedules: "Trabajo programado",
    schedulesBody:
      "Ejecuta recordatorios y listas operativas en horarios predecibles.",
    approvals: "Controles de aprobación",
    approvalsBody:
      "Mensajes, facturas, cambios financieros y acciones destructivas se detienen para revisión.",
    ai: "Flujos con IA",
    aiBody:
      "Con ALMA AI, genera flujos limitados por uso, permisos de herramientas y auditoría.",
    open: "Abrir",
    modes: "Modos de autonomía",
    modesBody:
      "Manual solo organiza. Borrador prepara cada acción. Asistido completa trabajo aprobado de bajo riesgo. Autónomo actúa solo dentro de reglas que autorizas.",
  },
} as const;

export default function AutomationsPage() {
  const { locale, setLocale } = useAlmaLocale();
  const t = copy[locale];
  const cards = [
    { title: t.rules, body: t.rulesBody, href: "/workflows", icon: GitBranch },
    {
      title: t.schedules,
      body: t.schedulesBody,
      href: "/planner",
      icon: CalendarClock,
    },
    {
      title: t.approvals,
      body: t.approvalsBody,
      href: "/approvals",
      icon: ShieldCheck,
    },
    { title: t.ai, body: t.aiBody, href: "/usage", icon: Bot },
  ];
  return (
    <AlmaShell
      language={locale}
      activeWorkspace="automations"
      title={t.title}
      onLanguageChange={setLocale}
    >
      <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8">
        <p className="max-w-3xl text-lg text-[#667085]">{t.subtitle}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {cards.map(({ title, body, href, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              className="rounded-[24px] border border-[#E4E7EC] bg-white p-6"
            >
              <Icon className="h-5 w-5" />
              <h2 className="mt-6 text-xl font-medium">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#667085]">{body}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
                {t.open}
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
        <section className="mt-6 rounded-[24px] bg-[#111] p-6 text-white">
          <Zap className="h-5 w-5 text-[#62D4B3]" />
          <h2 className="mt-5 text-xl font-medium">{t.modes}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/65">
            {t.modesBody}
          </p>
        </section>
      </div>
    </AlmaShell>
  );
}
