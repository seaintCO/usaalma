"use client";

import Link from "next/link";
import {
  CalendarDays,
  CheckSquare2,
  ClipboardCheck,
  Clock3,
  NotebookPen,
} from "lucide-react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

const copy = {
  en: {
    title: "Work",
    subtitle:
      "See what needs attention, schedule the day, and keep customer work moving.",
    tasks: "Tasks",
    tasksBody: "Today, upcoming, overdue, recurring, and assigned work.",
    calendar: "Calendar & appointments",
    calendarBody: "Plan meetings, customer visits, and reminders.",
    projects: "Projects",
    projectsBody:
      "Use customer opportunities and task checklists as the focused project record.",
    notes: "Work notes",
    notesBody: "Keep decisions, checklists, and context beside the work.",
    open: "Open",
    promise: "What needs attention today?",
    promiseBody:
      "ALMA connects tasks to customers, appointments, estimates, invoices, and approvals without turning your office into enterprise project software.",
  },
  es: {
    title: "Trabajo",
    subtitle:
      "Ve lo que requiere atención, organiza el día y mantiene el trabajo del cliente en movimiento.",
    tasks: "Tareas",
    tasksBody: "Trabajo de hoy, próximo, vencido, recurrente y asignado.",
    calendar: "Calendario y citas",
    calendarBody: "Organiza reuniones, visitas a clientes y recordatorios.",
    projects: "Proyectos",
    projectsBody:
      "Usa oportunidades y listas de tareas como el registro enfocado del proyecto.",
    notes: "Notas de trabajo",
    notesBody: "Conserva decisiones, listas y contexto junto al trabajo.",
    open: "Abrir",
    promise: "¿Qué necesita atención hoy?",
    promiseBody:
      "ALMA conecta tareas con clientes, citas, estimados, facturas y aprobaciones sin convertir tu oficina en software empresarial complicado.",
  },
} as const;

export default function WorkPage() {
  const { locale, setLocale } = useAlmaLocale();
  const t = copy[locale];
  const cards = [
    { title: t.tasks, body: t.tasksBody, href: "/tasks", icon: CheckSquare2 },
    {
      title: t.calendar,
      body: t.calendarBody,
      href: "/planner",
      icon: CalendarDays,
    },
    {
      title: t.projects,
      body: t.projectsBody,
      href: "/crm",
      icon: ClipboardCheck,
    },
    { title: t.notes, body: t.notesBody, href: "/notes", icon: NotebookPen },
  ];
  return (
    <AlmaShell
      language={locale}
      activeWorkspace="work"
      title={t.title}
      onLanguageChange={setLocale}
    >
      <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8">
        <p className="max-w-3xl text-lg text-[#667085]">{t.subtitle}</p>
        <section className="mt-6 rounded-[28px] bg-[#111] p-6 text-white md:p-8">
          <Clock3 className="h-5 w-5 text-[#62D4B3]" />
          <h2 className="mt-5 text-2xl font-medium">{t.promise}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
            {t.promiseBody}
          </p>
        </section>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {cards.map(({ title, body, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="rounded-[24px] border border-[#E4E7EC] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <Icon className="h-5 w-5" />
              <h2 className="mt-6 text-xl font-medium">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#667085]">{body}</p>
              <span className="mt-5 inline-flex text-sm font-medium">
                {t.open} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AlmaShell>
  );
}
