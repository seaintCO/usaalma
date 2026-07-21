"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleDot,
  FileCode2,
  Languages,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

type WorkflowKey =
  "office" | "communications" | "planner" | "creator" | "builder";
type DemoState = "ready" | "planning" | "complete";

const workflows = {
  office: {
    icon: ShieldCheck,
    en: {
      name: "ALMA Office",
      prompt: "Prepare an estimate for a kitchen remodel.",
      event: "Draft assembled — approval required before delivery",
      rows: [
        "Customer: Rivera Home",
        "Cabinet installation · 18 hours",
        "Estimate draft · $4,860",
        "Delivery is waiting for your approval",
      ],
    },
    es: {
      name: "Oficina ALMA",
      prompt: "Prepara un presupuesto para remodelar una cocina.",
      event: "Borrador preparado — requiere aprobación antes de entregarse",
      rows: [
        "Cliente: Hogar Rivera",
        "Instalación de gabinetes · 18 horas",
        "Borrador del presupuesto · $4,860",
        "La entrega espera tu aprobación",
      ],
    },
  },
  communications: {
    icon: MessageSquareText,
    en: {
      name: "Communications",
      prompt:
        "Correct this message, translate it to Spanish, and prepare it for WhatsApp.",
      event: "Channel preview ready — nothing was sent",
      rows: [
        "Grammar corrected",
        "Spanish translation prepared",
        "WhatsApp preview formatted",
        "Send requires your approval and a connection",
      ],
    },
    es: {
      name: "Comunicaciones",
      prompt:
        "Corrige este mensaje, tradúcelo al español y prepáralo para WhatsApp.",
      event: "Vista previa lista — no se envió nada",
      rows: [
        "Gramática corregida",
        "Traducción al español preparada",
        "Vista previa de WhatsApp formateada",
        "Enviar requiere tu aprobación y una conexión",
      ],
    },
  },
  planner: {
    icon: CircleDot,
    en: {
      name: "Planner",
      prompt: "Plan tomorrow around three customer appointments.",
      event: "Proposed schedule ready for confirmation",
      rows: [
        "8:30 · Review priorities",
        "10:00 · Customer appointment",
        "13:00 · Customer appointment",
        "16:00 · Customer appointment + follow-ups",
      ],
    },
    es: {
      name: "Planificador",
      prompt: "Planifica mañana alrededor de tres citas con clientes.",
      event: "Horario propuesto listo para confirmación",
      rows: [
        "8:30 · Revisar prioridades",
        "10:00 · Cita con cliente",
        "13:00 · Cita con cliente",
        "16:00 · Cita y seguimientos",
      ],
    },
  },
  creator: {
    icon: Sparkles,
    en: {
      name: "Creator",
      prompt:
        "Create a short bilingual video script for my construction company.",
      event: "Bilingual draft created locally for this demo",
      rows: [
        "Hook: Built right. Built to last.",
        "EN: See the craft behind every detail.",
        "ES: Conoce el oficio detrás de cada detalle.",
        "CTA: Request your project consultation",
      ],
    },
    es: {
      name: "Creador",
      prompt: "Crea un guion bilingüe corto para mi empresa de construcción.",
      event: "Borrador bilingüe creado localmente para esta demo",
      rows: [
        "Gancho: Bien hecho. Hecho para durar.",
        "EN: See the craft behind every detail.",
        "ES: Conoce el oficio detrás de cada detalle.",
        "CTA: Solicita una consulta para tu proyecto",
      ],
    },
  },
  builder: {
    icon: FileCode2,
    en: {
      name: "Builder",
      prompt: "Build a landing page for a local service business.",
      event: "Preview simulation ready — no code ran or deployed",
      rows: [
        "Plan · Define conversion path",
        "Files · page.tsx and styles.css",
        "Validation · responsive and accessible",
        "Preview ready · deployment not performed",
      ],
    },
    es: {
      name: "Constructor",
      prompt: "Crea una página de inicio para un negocio local de servicios.",
      event: "Simulación lista — no se ejecutó ni publicó código",
      rows: [
        "Plan · Definir ruta de conversión",
        "Archivos · page.tsx y styles.css",
        "Validación · adaptable y accesible",
        "Vista previa lista · no se realizó despliegue",
      ],
    },
  },
} as const;

const copy = {
  en: {
    nav: ["Experience", "Applications", "Control", "Pricing"],
    login: "Log in",
    create: "Create account",
    demo: "Interactive demo",
    safe: "Deterministic product demonstration — no provider calls or external actions",
    command: "Command ALMA",
    run: "Run demonstration",
    replay: "Replay demo",
    clear: "Clear demo",
    another: "Try another workflow",
    ready: "Ready for a command",
    planning: "ALMA is organizing the demonstration…",
    result: "Demonstration result",
    activity: "Activity",
    approval: "Human control stays in the loop",
    approvalBody:
      "ALMA prepares work, explains what will happen, and stops at protected actions until you approve.",
    bilingual: "Bilingual by design",
    bilingualBody:
      "Switch the entire experience instantly. Your choice persists across navigation and refresh.",
    apps: "One operating system. Focused applications.",
    appsBody:
      "Organize business records, communication, schedules, creative work, and software projects from one coherent workspace.",
    pricing: "Choose how ALMA works with you",
    essential: "Essential",
    autonomous: "Autonomous",
    month: "/ month",
    essentialBody:
      "Business organization and core tools without heavy autonomous AI usage.",
    autonomousBody:
      "Advanced automation, creation, voice, Builder, and approval-led workflows where configured.",
    buy: "Buy now",
    included: "Included",
    final: "Experience the workflow. Keep control of the outcome.",
    finalBody:
      "Start with the safe sandbox, then create your account when you are ready for a real workspace.",
    privacy: "Privacy",
    terms: "Terms",
    contact: "Contact",
    status: "Status",
    footer: "ALMA is a product by SEAINT.",
    essentialItems: [
      "Tasks, Planner, Notes, and Documents",
      "Basic CRM and invoicing",
      "Translator and Connections",
      "Provider-free organization workflows",
    ],
    autonomousItems: [
      "Everything in Essential",
      "ALMA Office and Approval Center",
      "Creator, Studio, voice, and Builder",
      "AI-assisted workflows where configured",
    ],
  },
  es: {
    nav: ["Experiencia", "Aplicaciones", "Control", "Precios"],
    login: "Iniciar sesión",
    create: "Crear cuenta",
    demo: "Demo interactiva",
    safe: "Demostración determinista — sin proveedores ni acciones externas",
    command: "Indica qué debe hacer ALMA",
    run: "Ejecutar demostración",
    replay: "Repetir demo",
    clear: "Limpiar demo",
    another: "Probar otro flujo",
    ready: "Lista para recibir una instrucción",
    planning: "ALMA está organizando la demostración…",
    result: "Resultado de la demostración",
    activity: "Actividad",
    approval: "El control humano permanece",
    approvalBody:
      "ALMA prepara el trabajo, explica qué ocurrirá y se detiene ante acciones protegidas hasta que las apruebes.",
    bilingual: "Bilingüe desde el diseño",
    bilingualBody:
      "Cambia toda la experiencia al instante. Tu selección persiste al navegar y actualizar.",
    apps: "Un sistema operativo. Aplicaciones enfocadas.",
    appsBody:
      "Organiza registros, comunicación, horarios, creatividad y proyectos de software desde un espacio coherente.",
    pricing: "Elige cómo trabaja ALMA contigo",
    essential: "Esencial",
    autonomous: "Autónomo",
    month: "/ mes",
    essentialBody:
      "Organización empresarial y herramientas centrales sin uso intensivo de IA autónoma.",
    autonomousBody:
      "Automatización avanzada, creación, voz, Constructor y flujos con aprobación donde estén configurados.",
    buy: "Comprar",
    included: "Incluido",
    final: "Experimenta el flujo. Conserva el control.",
    finalBody:
      "Comienza con la demo segura y crea tu cuenta cuando estés listo para un espacio real.",
    privacy: "Privacidad",
    terms: "Términos",
    contact: "Contacto",
    status: "Estado",
    footer: "ALMA es un producto de SEAINT.",
    essentialItems: [
      "Tareas, Planificador, Notas y Documentos",
      "CRM y facturación básicos",
      "Traductor y Conexiones",
      "Organización sin proveedores",
    ],
    autonomousItems: [
      "Todo lo incluido en Esencial",
      "Oficina ALMA y Centro de aprobaciones",
      "Creador, Estudio, voz y Constructor",
      "Flujos con IA donde estén configurados",
    ],
  },
} as const;

export default function PublicAlmaSandbox() {
  const { locale, setLocale } = useAlmaLocale();
  const t = copy[locale];
  const [workflow, setWorkflow] = useState<WorkflowKey>("office");
  const [state, setState] = useState<DemoState>("ready");
  const [command, setCommand] = useState<string>(
    workflows.office[locale].prompt,
  );
  const timer = useRef<number | null>(null);
  const current = workflows[workflow][locale];
  const workflowKeys = Object.keys(workflows) as WorkflowKey[];
  const progress = state === "complete" ? 100 : state === "planning" ? 58 : 8;
  const status =
    state === "ready"
      ? t.ready
      : state === "planning"
        ? t.planning
        : current.event;
  useEffect(() => {
    setCommand(workflows[workflow][locale].prompt);
    setState("ready");
  }, [locale, workflow]);
  const choose = (key: WorkflowKey) => {
    if (timer.current) window.clearTimeout(timer.current);
    setWorkflow(key);
    setCommand(workflows[key][locale].prompt);
    setState("ready");
  };
  const run = () => {
    if (!command.trim() || state === "planning") return;
    setState("planning");
    timer.current = window.setTimeout(() => setState("complete"), 650);
  };
  const reset = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setState("ready");
    setCommand(current.prompt);
  };
  const next = () =>
    choose(
      workflowKeys[(workflowKeys.indexOf(workflow) + 1) % workflowKeys.length],
    );
  const planCards = useMemo(
    () => [
      {
        key: "starter",
        name: t.essential,
        price: "$99",
        body: t.essentialBody,
        items: t.essentialItems,
      },
      {
        key: "business",
        name: t.autonomous,
        price: "$399",
        body: t.autonomousBody,
        items: t.autonomousItems,
      },
    ],
    [t],
  );

  return (
    <main className="min-h-screen bg-white text-[#111111]">
      <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 md:px-8">
          <Link href="/" className="font-medium tracking-tight">
            ALMA{" "}
            <span className="ml-2 text-[10px] font-normal text-[#6B7280]">
              BY SEAINT
            </span>
          </Link>
          <nav className="hidden gap-7 text-sm text-[#6B7280] lg:flex">
            {["experience", "applications", "control", "pricing"].map(
              (id, i) => (
                <a key={id} href={`#${id}`} className="hover:text-black">
                  {t.nav[i]}
                </a>
              ),
            )}
          </nav>
          <div className="flex items-center gap-2">
            <div
              className="flex rounded-full border p-1"
              aria-label={locale === "es" ? "Idioma" : "Language"}
            >
              {(["en", "es"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={locale === item}
                  onClick={() => void setLocale(item)}
                  className={`rounded-full px-2.5 py-1 text-xs ${locale === item ? "bg-black text-white" : "text-[#6B7280]"}`}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
            <Link
              href="/login"
              className="hidden rounded-full border px-4 py-2 text-sm sm:block"
            >
              {t.login}
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-black px-4 py-2 text-sm text-white"
            >
              {t.create}
            </Link>
          </div>
        </div>
      </header>
      <section
        id="experience"
        className="mx-auto max-w-[1500px] px-3 py-5 md:px-6 md:py-8"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-2">
          <div>
            <span className="rounded-full bg-[#EEF8F1] px-3 py-1 text-xs text-[#166534]">
              {t.demo}
            </span>
            <p className="mt-2 text-xs text-[#6B7280]">{t.safe}</p>
          </div>
          <Link
            href="/signup?plan=starter&next=/billing"
            className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm text-white"
          >
            {t.buy}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="overflow-hidden rounded-[1.75rem] border border-[#D1D5DB] bg-[#F7F7F8] shadow-2xl shadow-black/10">
          <div className="grid min-h-[650px] lg:grid-cols-[220px_1fr]">
            <aside className="border-b border-[#E5E7EB] bg-white p-3 lg:border-b-0 lg:border-r lg:p-4">
              <div className="mb-4 hidden px-3 pt-2 lg:block">
                <p className="text-lg font-medium">ALMA</p>
                <p className="text-xs text-[#6B7280]">Operating workspace</p>
              </div>
              <div className="flex gap-2 overflow-x-auto lg:block">
                {workflowKeys.map((key) => {
                  const Icon = workflows[key].icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => choose(key)}
                      aria-pressed={workflow === key}
                      className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm lg:mb-1 lg:w-full ${workflow === key ? "bg-black text-white" : "text-[#6B7280] hover:bg-[#F7F7F8]"}`}
                    >
                      <Icon className="h-4 w-4" />
                      {workflows[key][locale].name}
                    </button>
                  );
                })}
              </div>
            </aside>
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-3 md:px-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">
                    {t.demo}
                  </p>
                  <h1 className="mt-1 text-xl font-medium md:text-2xl">
                    {current.name}
                  </h1>
                </div>
                <span className="flex items-center gap-2 text-xs text-[#6B7280]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Local demo
                </span>
              </div>
              <div className="grid flex-1 gap-4 p-3 md:p-5 xl:grid-cols-[1fr_320px]">
                <section className="flex min-h-[430px] flex-col rounded-2xl border border-[#E5E7EB] bg-white p-4 md:p-6">
                  <label
                    className="text-sm font-medium"
                    htmlFor="alma-demo-command"
                  >
                    {t.command}
                  </label>
                  <textarea
                    id="alma-demo-command"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-[#D1D5DB] bg-[#FAFAFA] p-4 text-sm outline-none focus:border-black"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={run}
                      disabled={!command.trim() || state === "planning"}
                      className="rounded-full bg-black px-5 py-2.5 text-sm text-white disabled:opacity-40"
                    >
                      {t.run}
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {state === "complete" ? t.replay : t.clear}
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      className="rounded-full border px-4 py-2.5 text-sm"
                    >
                      {t.another}
                    </button>
                  </div>
                  <div className="mt-6" aria-live="polite">
                    <div className="flex items-center justify-between text-xs text-[#6B7280]">
                      <span>{status}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
                      <div
                        className="h-full rounded-full bg-black motion-safe:transition-[width] motion-safe:duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {state === "complete" ? (
                      <div className="mt-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">
                          {t.result}
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {current.rows.map((row) => (
                            <div
                              key={row}
                              className="flex items-start gap-2 rounded-xl bg-[#F7F7F8] p-3 text-sm"
                            >
                              <Check className="mt-0.5 h-4 w-4 shrink-0" />
                              {row}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
                <aside className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">
                    {t.activity}
                  </p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="rounded-xl bg-[#F7F7F8] p-3">
                      {current.prompt}
                    </div>
                    <div className="rounded-xl border p-3 text-[#6B7280]">
                      {status}
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                      {current.event}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section id="applications" className="border-y bg-[#F7F7F8] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.24em] text-[#6B7280]">
            ALMA OS
          </p>
          <h2 className="mt-4 max-w-3xl text-4xl font-medium tracking-tight md:text-6xl">
            {t.apps}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6B7280]">
            {t.appsBody}
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {workflowKeys.map((key) => (
              <button
                key={key}
                onClick={() => {
                  choose(key);
                  document
                    .getElementById("experience")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-2xl border bg-white p-5 text-left font-medium"
              >
                {workflows[key][locale].name}
                <ArrowRight className="mt-8 h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </section>
      <section
        id="control"
        className="mx-auto grid max-w-6xl gap-5 px-6 py-20 md:grid-cols-2"
      >
        <article className="rounded-3xl border p-7">
          <ShieldCheck className="h-7 w-7" />
          <h2 className="mt-8 text-3xl font-medium">{t.approval}</h2>
          <p className="mt-4 leading-7 text-[#6B7280]">{t.approvalBody}</p>
        </article>
        <article className="rounded-3xl border p-7">
          <Languages className="h-7 w-7" />
          <h2 className="mt-8 text-3xl font-medium">{t.bilingual}</h2>
          <p className="mt-4 leading-7 text-[#6B7280]">{t.bilingualBody}</p>
        </article>
      </section>
      <section id="pricing" className="border-y bg-[#F7F7F8] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-4xl font-medium tracking-tight md:text-5xl">
            {t.pricing}
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {planCards.map((plan) => (
              <article
                key={plan.key}
                className="rounded-3xl border bg-white p-7"
              >
                <p className="text-sm uppercase tracking-[0.2em] text-[#6B7280]">
                  {plan.name}
                </p>
                <p className="mt-4 text-5xl font-medium">
                  {plan.price}
                  <span className="text-base font-normal text-[#6B7280]">
                    {" "}
                    {t.month}
                  </span>
                </p>
                <p className="mt-4 min-h-12 text-[#6B7280]">{plan.body}</p>
                <ul className="mt-6 space-y-3">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm">
                      <Check className="h-4 w-4" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/signup?plan=${plan.key}&next=/billing`}
                  className="mt-7 block rounded-full bg-black px-5 py-3 text-center text-sm text-white"
                >
                  {t.buy} · {plan.name}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="px-6 py-24 text-center">
        <h2 className="mx-auto max-w-3xl text-4xl font-medium md:text-6xl">
          {t.final}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[#6B7280]">{t.finalBody}</p>
        <Link
          href="/signup"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-white"
        >
          {t.create}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
      <footer className="border-t px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 text-sm text-[#6B7280] sm:flex-row">
          <p>{t.footer}</p>
          <nav className="flex flex-wrap gap-5">
            <Link href="/privacy">{t.privacy}</Link>
            <Link href="/terms">{t.terms}</Link>
            <a href="mailto:support@seaint.co">{t.contact}</a>
            <Link href="/login">{t.login}</Link>
            <a href="https://status.seaint.co" rel="noreferrer">
              {t.status}
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
