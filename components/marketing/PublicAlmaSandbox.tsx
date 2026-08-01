"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Check,
  CircleDollarSign,
  Inbox,
  Languages,
  Play,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
import { useIsAlmaIosApp } from "@/lib/mobile/platform";

type WorkflowKey = "customers" | "inbox" | "work" | "money" | "alma";
type DemoState = "ready" | "working" | "complete";

const workflows = {
  customers: {
    icon: Users,
    en: {
      name: "Customers",
      prompt: "Show the leads that need a follow-up today.",
      result: "3 leads need attention",
      rows: [
        "Rivera Home · estimate viewed · follow up today",
        "Luna Bakery · new website inquiry · assign owner",
        "Martinez HVAC · no reply for 4 days · draft reminder",
      ],
    },
    es: {
      name: "Clientes",
      prompt: "Muestra los prospectos que necesitan seguimiento hoy.",
      result: "3 prospectos requieren atención",
      rows: [
        "Hogar Rivera · estimado visto · seguimiento hoy",
        "Panadería Luna · consulta nueva · asignar responsable",
        "Martinez HVAC · 4 días sin respuesta · preparar recordatorio",
      ],
    },
  },
  inbox: {
    icon: Inbox,
    en: {
      name: "Inbox",
      prompt: "Prepare replies for the messages waiting on me.",
      result: "2 reply drafts prepared",
      rows: [
        "Email · availability request · English reply drafted",
        "WhatsApp · estimate question · Spanish reply drafted",
        "Protected action · nothing will be sent without approval",
      ],
    },
    es: {
      name: "Bandeja",
      prompt: "Prepara respuestas para los mensajes que esperan por mí.",
      result: "2 respuestas preparadas",
      rows: [
        "Correo · solicitud de disponibilidad · respuesta en inglés",
        "WhatsApp · pregunta de estimado · respuesta en español",
        "Acción protegida · nada se enviará sin aprobación",
      ],
    },
  },
  work: {
    icon: BriefcaseBusiness,
    en: {
      name: "Work",
      prompt: "Organize today around appointments and overdue tasks.",
      result: "Today is organized",
      rows: [
        "8:30 · review overdue invoices",
        "10:00 · customer appointment · Rivera Home",
        "13:30 · estimate follow-up block",
        "16:00 · payroll preparation review",
      ],
    },
    es: {
      name: "Trabajo",
      prompt: "Organiza hoy alrededor de citas y tareas vencidas.",
      result: "El día está organizado",
      rows: [
        "8:30 · revisar facturas vencidas",
        "10:00 · cita con cliente · Hogar Rivera",
        "13:30 · bloque de seguimiento de estimados",
        "16:00 · revisión de preparación de nómina",
      ],
    },
  },
  money: {
    icon: CircleDollarSign,
    en: {
      name: "Money",
      prompt: "Explain this month's cash flow without counting transfers.",
      result: "Bookkeeping preparation summary",
      rows: [
        "Posted operating income · $18,420",
        "Operating expenses · $11,280",
        "Estimated operating profit · $7,140",
        "4 transactions and 2 receipts need review",
      ],
    },
    es: {
      name: "Dinero",
      prompt: "Explica el flujo de caja del mes sin contar transferencias.",
      result: "Resumen de preparación contable",
      rows: [
        "Ingresos operativos registrados · $18,420",
        "Gastos operativos · $11,280",
        "Ganancia operativa estimada · $7,140",
        "4 transacciones y 2 recibos requieren revisión",
      ],
    },
  },
  alma: {
    icon: Bot,
    en: {
      name: "ALMA",
      prompt: "Give me the morning business briefing.",
      result: "Morning briefing prepared",
      rows: [
        "3 leads need a response",
        "2 appointments are scheduled today",
        "1 invoice is overdue",
        "1 protected action is waiting for approval",
      ],
    },
    es: {
      name: "ALMA",
      prompt: "Dame el resumen empresarial de la mañana.",
      result: "Resumen de la mañana preparado",
      rows: [
        "3 prospectos necesitan respuesta",
        "2 citas están programadas hoy",
        "1 factura está vencida",
        "1 acción protegida espera aprobación",
      ],
    },
  },
} as const;

const copy = {
  en: {
    nav: ["Experience", "What it manages", "Control", "Pricing"],
    login: "Log in",
    create: "Create account",
    eyebrow: "AUTONOMOUS BUSINESS OFFICE",
    title: "Run the business. Keep the control.",
    subtitle:
      "Manage customers, conversations, money, tasks, invoices, documents, and daily operations—with AI only when you choose it.",
    primary: "Create my ALMA",
    pricing: "View pricing",
    demoLabel: "Interactive product sandbox",
    demoSafe:
      "This public demo is deterministic. It makes no provider calls, changes no records, and sends nothing.",
    command: "Command ALMA",
    run: "Run demo",
    replay: "Replay",
    ready: "Ready for a business request",
    working: "ALMA is organizing the workspace…",
    result: "Result",
    activity: "Business activity",
    attention: "Requires attention",
    attentionItems: [
      "3 customer replies",
      "1 overdue invoice",
      "4 transactions to review",
    ],
    promise: "One office. Four jobs.",
    promiseBody:
      "Talk to customers. Manage the work. Track the money. Let ALMA assist or automate only what you authorize.",
    customers: "Talk to customers",
    customersBody:
      "Contacts, companies, leads, pipeline, a unified inbox, saved replies, follow-ups, and human takeover.",
    operations: "Manage the work",
    operationsBody:
      "Tasks, appointments, estimates, invoices, documents, approvals, and recurring rules.",
    money: "Track the money",
    moneyBody:
      "Income, expenses, receipts, payments, reports, payroll preparation, tax readiness, and QuickBooks.",
    assist: "Let ALMA assist",
    assistBody:
      "A metered business assistant grounded in your workspace with permissions, usage limits, and audit history.",
    control: "Autonomy without surrendering control.",
    controlBody:
      "Manual, Draft, Assisted, and Autonomous modes let you decide exactly what ALMA may do. Messages, financial changes, exports, and destructive actions remain protected.",
    bilingual: "English and Spanish, everywhere.",
    bilingualBody:
      "The workspace, customer records, documents, billing, errors, and assistant respect the language you choose.",
    priceTitle: "Choose your office",
    office: "ALMA Office",
    ai: "ALMA AI",
    perMonth: "/month",
    buy: "Start",
    officeBody: "A complete business operating system without generative AI.",
    aiBody:
      "The complete office plus measured AI assistance and approval-controlled autonomy.",
    officeItems: [
      "CRM, Inbox, Work, Money, Reports",
      "Estimates, invoices, receipts, and payments",
      "Payroll and tax preparation",
      "Rule-based automations",
    ],
    aiItems: [
      "Everything in ALMA Office",
      "Business assistant and drafting",
      "Extraction, summaries, and suggestions",
      "Usage limits and approval controls",
    ],
    disclaimer:
      "ALMA prepares business and bookkeeping records. It is not a bank, payroll processor, tax filing service, law firm, or licensed accountant.",
    final: "Your business should feel organized before the day starts.",
    finalBody:
      "Start with the sandbox. Create a real workspace when you are ready.",
  },
  es: {
    nav: ["Experiencia", "Qué administra", "Control", "Precios"],
    login: "Iniciar sesión",
    create: "Crear cuenta",
    eyebrow: "OFICINA EMPRESARIAL AUTÓNOMA",
    title: "Opera el negocio. Conserva el control.",
    subtitle:
      "Administra clientes, conversaciones, dinero, tareas, facturas, documentos y operaciones diarias, con IA solo cuando tú la eliges.",
    primary: "Crear mi ALMA",
    pricing: "Ver precios",
    demoLabel: "Sandbox interactivo del producto",
    demoSafe:
      "Esta demo pública es determinista. No llama proveedores, no cambia registros y no envía nada.",
    command: "Indica qué debe hacer ALMA",
    run: "Ejecutar demo",
    replay: "Repetir",
    ready: "Lista para una solicitud empresarial",
    working: "ALMA está organizando el espacio…",
    result: "Resultado",
    activity: "Actividad empresarial",
    attention: "Requiere atención",
    attentionItems: [
      "3 respuestas a clientes",
      "1 factura vencida",
      "4 transacciones por revisar",
    ],
    promise: "Una oficina. Cuatro trabajos.",
    promiseBody:
      "Habla con clientes. Administra el trabajo. Controla el dinero. Permite que ALMA asista o automatice solo lo que autorizas.",
    customers: "Habla con clientes",
    customersBody:
      "Contactos, empresas, prospectos, pipeline, bandeja unificada, respuestas, seguimientos y control humano.",
    operations: "Administra el trabajo",
    operationsBody:
      "Tareas, citas, estimados, facturas, documentos, aprobaciones y reglas recurrentes.",
    money: "Controla el dinero",
    moneyBody:
      "Ingresos, gastos, recibos, pagos, reportes, preparación de nómina, impuestos y QuickBooks.",
    assist: "Deja que ALMA asista",
    assistBody:
      "Un asistente empresarial medido, basado en tu espacio, con permisos, límites y auditoría.",
    control: "Autonomía sin entregar el control.",
    controlBody:
      "Los modos Manual, Borrador, Asistido y Autónomo determinan exactamente qué puede hacer ALMA. Mensajes, cambios financieros, exportaciones y eliminaciones permanecen protegidos.",
    bilingual: "Inglés y español, en todas partes.",
    bilingualBody:
      "El espacio, clientes, documentos, facturación, errores y asistente respetan el idioma elegido.",
    priceTitle: "Elige tu oficina",
    office: "ALMA Office",
    ai: "ALMA AI",
    perMonth: "/mes",
    buy: "Comenzar",
    officeBody: "Un sistema operativo empresarial completo sin IA generativa.",
    aiBody:
      "La oficina completa más asistencia medida y autonomía con aprobación.",
    officeItems: [
      "CRM, Bandeja, Trabajo, Dinero y Reportes",
      "Estimados, facturas, recibos y pagos",
      "Preparación de nómina e impuestos",
      "Automatizaciones por reglas",
    ],
    aiItems: [
      "Todo en ALMA Office",
      "Asistente empresarial y redacción",
      "Extracción, resúmenes y sugerencias",
      "Límites de uso y aprobaciones",
    ],
    disclaimer:
      "ALMA prepara registros empresariales y contables. No es banco, procesador de nómina, servicio fiscal, bufete ni contador profesional.",
    final: "Tu negocio debe sentirse organizado antes de comenzar el día.",
    finalBody:
      "Comienza con el sandbox. Crea un espacio real cuando estés listo.",
  },
} as const;

export default function PublicAlmaSandbox() {
  const isIosApp = useIsAlmaIosApp();
  const { locale, setLocale } = useAlmaLocale();
  const t = copy[locale];
  const [workflow, setWorkflow] = useState<WorkflowKey>("alma");
  const [state, setState] = useState<DemoState>("ready");
  const [command, setCommand] = useState<string>(workflows.alma[locale].prompt);
  const timer = useRef<number | null>(null);
  const keys = Object.keys(workflows) as WorkflowKey[];
  const current = workflows[workflow][locale];

  useEffect(() => {
    // Keep the deterministic demo command aligned to its selected workflow.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCommand(workflows[workflow][locale].prompt);
    setState("ready");
  }, [locale, workflow]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  function run() {
    if (!command.trim() || state === "working") return;
    setState("working");
    timer.current = window.setTimeout(() => setState("complete"), 650);
  }

  function choose(key: WorkflowKey) {
    if (timer.current) window.clearTimeout(timer.current);
    setWorkflow(key);
  }

  return (
    <main className="min-h-screen bg-white text-[#111]">
      <header className="sticky top-0 z-50 border-b border-[#E4E7EC] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 md:px-8">
          <Link href="/" className="font-medium tracking-tight">
            ALMA
            <span className="ml-2 text-[10px] font-normal text-[#667085]">
              BY SEAINT
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-[#667085] lg:flex">
            {(isIosApp
              ? ["experience", "office", "control"]
              : ["experience", "office", "control", "pricing"]
            ).map((id, index) => (
              <a key={id} href={`#${id}`} className="hover:text-black">
                {t.nav[index]}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void setLocale(locale === "en" ? "es" : "en")}
              className="rounded-full border border-[#D0D5DD] px-3 py-2 text-xs"
            >
              {locale === "en" ? "ES" : "EN"}
            </button>
            <Link
              href="/login"
              className="hidden rounded-full border border-[#D0D5DD] px-4 py-2 text-sm sm:block"
            >
              {t.login}
            </Link>
            <Link
              href={isIosApp ? "/login" : "/signup"}
              className="rounded-full bg-black px-4 py-2 text-sm text-white"
            >
              {isIosApp ? t.login : t.create}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1440px] items-center gap-10 px-5 py-16 md:px-8 md:py-24 xl:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-xs font-medium tracking-[0.25em] text-[#667085]">
            {t.eyebrow}
          </p>
          <h1 className="mt-5 max-w-2xl text-5xl font-medium leading-[0.96] tracking-[-0.055em] md:text-7xl">
            {t.title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#667085]">
            {t.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={isIosApp ? "/login" : "/signup"}
              className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
            >
              {isIosApp ? t.login : t.primary}
            </Link>
            {!isIosApp ? (
              <Link
                href="/pricing"
                className="rounded-full border border-[#D0D5DD] px-6 py-3 text-sm font-medium"
              >
                {t.pricing}
              </Link>
            ) : null}
          </div>
        </div>

        <div
          id="experience"
          className="overflow-hidden rounded-[28px] border border-[#D0D5DD] bg-[#F7F7F8] shadow-2xl shadow-black/10"
        >
          <div className="flex items-center justify-between border-b border-[#E4E7EC] bg-white p-4">
            <div>
              <p className="text-sm font-medium">{t.demoLabel}</p>
              <p className="mt-1 text-xs text-[#667085]">{t.demoSafe}</p>
            </div>
            <span className="h-2.5 w-2.5 rounded-full bg-[#62D4B3]" />
          </div>
          <div className="grid min-h-[580px] md:grid-cols-[180px_1fr]">
            <aside className="border-b border-[#E4E7EC] bg-white p-3 md:border-b-0 md:border-r">
              <div className="flex gap-2 overflow-x-auto md:block">
                {keys.map((key) => {
                  const Icon = workflows[key].icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => choose(key)}
                      aria-pressed={workflow === key}
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm md:mb-1 md:w-full ${
                        workflow === key
                          ? "bg-black text-white"
                          : "text-[#667085] hover:bg-[#F7F7F8]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {workflows[key][locale].name}
                    </button>
                  );
                })}
              </div>
            </aside>
            <div className="grid gap-4 p-4 xl:grid-cols-[1fr_230px]">
              <section className="rounded-[20px] border border-[#E4E7EC] bg-white p-5">
                <label htmlFor="alma-demo" className="text-sm font-medium">
                  {t.command}
                </label>
                <textarea
                  id="alma-demo"
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-[#D0D5DD] bg-[#F9FAFB] p-4 text-sm outline-none focus:border-black"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={run}
                    disabled={state === "working" || !command.trim()}
                    className="motion-safe:transition inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm text-white motion-safe:hover:-translate-y-0.5 disabled:opacity-40"
                  >
                    <Play className="h-4 w-4" />
                    {t.run}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCommand(current.prompt);
                      setState("ready");
                    }}
                    className="rounded-full border border-[#D0D5DD] p-2.5"
                    title={t.replay}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <div aria-live="polite" className="mt-6">
                  <p className="text-xs text-[#667085]">
                    {state === "ready"
                      ? t.ready
                      : state === "working"
                        ? t.working
                        : current.result}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EAECF0]">
                    <div
                      className="h-full rounded-full bg-black transition-all"
                      style={{
                        width:
                          state === "ready"
                            ? "8%"
                            : state === "working"
                              ? "58%"
                              : "100%",
                      }}
                    />
                  </div>
                  {state === "complete" ? (
                    <div className="mt-5 space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#667085]">
                        {t.result}
                      </p>
                      {current.rows.map((row) => (
                        <div
                          key={row}
                          className="flex gap-2 rounded-xl bg-[#F7F7F8] p-3 text-sm"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0" />
                          {row}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
              <aside className="rounded-[20px] border border-[#E4E7EC] bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#667085]">
                  {t.attention}
                </p>
                <div className="mt-4 space-y-2">
                  {t.attentionItems.map((item, index) => (
                    <div
                      key={item}
                      className="rounded-xl border border-[#EAECF0] p-3 text-sm"
                    >
                      <span className="mr-2 text-[#667085]">0{index + 1}</span>
                      {item}
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section
        id="office"
        className="border-y border-[#E4E7EC] bg-[#F7F7F8] px-5 py-20 md:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="max-w-3xl text-4xl font-medium tracking-tight md:text-6xl">
            {t.promise}
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#667085]">
            {t.promiseBody}
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              {
                Icon: Users,
                title: t.customers,
                body: t.customersBody,
              },
              {
                Icon: BriefcaseBusiness,
                title: t.operations,
                body: t.operationsBody,
              },
              {
                Icon: CircleDollarSign,
                title: t.money,
                body: t.moneyBody,
              },
              { Icon: Bot, title: t.assist, body: t.assistBody },
            ].map(({ Icon, title, body }) => (
              <article
                key={String(title)}
                className="rounded-[24px] border border-[#E4E7EC] bg-white p-7"
              >
                <Icon className="h-5 w-5" />
                <h3 className="mt-8 text-2xl font-medium">{title}</h3>
                <p className="mt-3 leading-7 text-[#667085]">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="control"
        className="mx-auto grid max-w-6xl gap-5 px-5 py-20 md:grid-cols-2 md:px-8"
      >
        <article className="rounded-[28px] bg-black p-8 text-white">
          <ShieldCheck className="h-6 w-6 text-[#62D4B3]" />
          <h2 className="mt-10 text-3xl font-medium">{t.control}</h2>
          <p className="mt-4 leading-7 text-white/65">{t.controlBody}</p>
        </article>
        <article className="rounded-[28px] border border-[#D0D5DD] p-8">
          <Languages className="h-6 w-6" />
          <h2 className="mt-10 text-3xl font-medium">{t.bilingual}</h2>
          <p className="mt-4 leading-7 text-[#667085]">{t.bilingualBody}</p>
        </article>
      </section>

      {!isIosApp ? (
        <section
          id="pricing"
          className="border-y border-[#E4E7EC] bg-[#F7F7F8] px-5 py-20 md:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-4xl font-medium md:text-6xl">
              {t.priceTitle}
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {[
                {
                  name: t.office,
                  price: "$39",
                  body: t.officeBody,
                  items: t.officeItems,
                  plan: "office",
                  dark: false,
                },
                {
                  name: t.ai,
                  price: "$199",
                  body: t.aiBody,
                  items: t.aiItems,
                  plan: "ai",
                  dark: true,
                },
              ].map((plan) => (
                <article
                  key={plan.plan}
                  className={`rounded-[28px] border p-7 ${
                    plan.dark
                      ? "border-black bg-black text-white"
                      : "border-[#D0D5DD] bg-white"
                  }`}
                >
                  <h3 className="text-2xl font-medium">{plan.name}</h3>
                  <p className="mt-5 text-5xl font-medium">
                    {plan.price}
                    <span className="ml-1 text-sm font-normal opacity-60">
                      {t.perMonth}
                    </span>
                  </p>
                  <p className="mt-5 leading-7 opacity-65">{plan.body}</p>
                  <ul className="mt-6 space-y-3">
                    {plan.items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm">
                        <Check className="h-4 w-4 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/signup?checkout=${plan.plan}`}
                    className={`mt-8 flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium ${
                      plan.dark ? "bg-white text-black" : "bg-black text-white"
                    }`}
                  >
                    {t.buy}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
            <p className="mt-7 text-center text-xs leading-5 text-[#667085]">
              {t.disclaimer}
            </p>
          </div>
        </section>
      ) : null}

      <section className="px-5 py-24 text-center md:px-8">
        <h2 className="mx-auto max-w-4xl text-4xl font-medium md:text-6xl">
          {t.final}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[#667085]">{t.finalBody}</p>
        <Link
          href={isIosApp ? "/login" : "/signup"}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
        >
          {isIosApp ? t.login : t.primary}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}
