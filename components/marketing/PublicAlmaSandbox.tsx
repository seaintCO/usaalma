"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleDollarSign,
  Inbox,
  Menu,
  MessageCircle,
  Mic,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
import { useIsAlmaIosApp } from "@/lib/mobile/platform";

type DemoKey = "alma" | "customers" | "inbox" | "work" | "money";
type DemoState = "ready" | "working" | "done";

const demoContent = {
  alma: {
    icon: Sparkles,
    en: {
      label: "Today",
      prompt: "Give me my morning business briefing.",
      result: "Your office is ready",
      rows: [
        "3 leads need a reply",
        "2 appointments today",
        "1 approval waiting",
      ],
    },
    es: {
      label: "Hoy",
      prompt: "Dame el resumen de mi negocio esta mañana.",
      result: "Tu oficina está lista",
      rows: [
        "3 prospectos necesitan respuesta",
        "2 citas hoy",
        "1 aprobación pendiente",
      ],
    },
  },
  customers: {
    icon: Users,
    en: {
      label: "Customers",
      prompt: "Who should I follow up with today?",
      result: "3 relationships need attention",
      rows: [
        "Rivera Home · estimate viewed",
        "Luna Bakery · new lead",
        "Martinez HVAC · 4 days quiet",
      ],
    },
    es: {
      label: "Clientes",
      prompt: "¿Con quién debo dar seguimiento hoy?",
      result: "3 relaciones requieren atención",
      rows: [
        "Hogar Rivera · estimado visto",
        "Panadería Luna · prospecto nuevo",
        "Martinez HVAC · 4 días sin respuesta",
      ],
    },
  },
  inbox: {
    icon: Inbox,
    en: {
      label: "Inbox",
      prompt: "Organize the messages waiting on me.",
      result: "2 drafts are ready for review",
      rows: [
        "Availability request · reply drafted",
        "Estimate question · Spanish draft",
        "Nothing sends without approval",
      ],
    },
    es: {
      label: "Bandeja",
      prompt: "Organiza los mensajes que esperan por mí.",
      result: "2 borradores listos para revisar",
      rows: [
        "Solicitud de disponibilidad · borrador",
        "Pregunta de estimado · respuesta",
        "Nada se envía sin aprobación",
      ],
    },
  },
  work: {
    icon: BriefcaseBusiness,
    en: {
      label: "Work",
      prompt: "Organize my work around today’s appointments.",
      result: "Today is organized",
      rows: [
        "8:30 · review overdue invoices",
        "10:00 · Rivera Home appointment",
        "1:30 · estimate follow-up block",
      ],
    },
    es: {
      label: "Trabajo",
      prompt: "Organiza mi trabajo alrededor de las citas de hoy.",
      result: "El día está organizado",
      rows: [
        "8:30 · revisar facturas vencidas",
        "10:00 · cita con Hogar Rivera",
        "1:30 · bloque de seguimientos",
      ],
    },
  },
  money: {
    icon: CircleDollarSign,
    en: {
      label: "Money",
      prompt: "What needs attention in my money?",
      result: "Cash flow looks healthy",
      rows: [
        "$18,420 operating income",
        "$11,280 operating expenses",
        "4 transactions need review",
      ],
    },
    es: {
      label: "Dinero",
      prompt: "¿Qué necesita atención en mi dinero?",
      result: "El flujo de caja se ve saludable",
      rows: [
        "$18,420 de ingresos operativos",
        "$11,280 de gastos",
        "4 transacciones por revisar",
      ],
    },
  },
} as const;

const copy = {
  en: {
    signIn: "Sign in",
    create: "Start free",
    eyebrow: "THE CALM BUSINESS OPERATING SYSTEM",
    titleA: "Run your business.",
    titleB: "Just ask ALMA.",
    subtitle:
      "Customers, messages, work, and money in one simple conversation—with powerful automation behind it.",
    primary: "Create my ALMA",
    demo: "Try the live preview",
    trusted: "Built for real work",
    safe: "Approval protected",
    bilingual: "English + Spanish",
    phoneGreeting: "Good morning, Luis",
    phoneBody: "What would you like to handle today?",
    placeholder: "Ask ALMA anything about your business…",
    run: "Run preview",
    working: "ALMA is organizing your office…",
    preview: "Interactive product preview",
    previewNote: "No account, provider call, or record change.",
    oneChat: "One conversation. Your whole office.",
    oneChatBody:
      "Start with a question. Open the details only when you need them.",
    stepAsk: "Ask naturally",
    stepAskBody: "No training required. Say what you need in plain language.",
    stepReview: "Review the plan",
    stepReviewBody: "ALMA organizes context and shows what needs approval.",
    stepDone: "Stay in control",
    stepDoneBody: "Track activity, outcomes, and every protected action.",
    power: "Powerful underneath. Simple on purpose.",
    powerBody:
      "CRM, inbox, tasks, invoices, documents, voice, live camera, and automation stay connected behind one calm interface.",
    control: "Autonomy with guardrails",
    controlBody:
      "Choose manual, draft, assisted, or autonomous behavior. Sensitive actions remain approval protected.",
    pricing: "Simple plans",
    office: "ALMA Office",
    ai: "ALMA AI",
    officeBody: "Your complete business workspace without paid generative AI.",
    aiBody:
      "Everything in Office plus metered chat, voice, vision, documents, and autonomous assistance.",
    month: "/month",
    start: "Get started",
    final: "A calmer way to run the business starts here.",
    finalBody: "One place to ask, review, approve, and move forward.",
  },
  es: {
    signIn: "Iniciar sesión",
    create: "Comenzar gratis",
    eyebrow: "EL SISTEMA OPERATIVO EMPRESARIAL TRANQUILO",
    titleA: "Opera tu negocio.",
    titleB: "Solo pídeselo a ALMA.",
    subtitle:
      "Clientes, mensajes, trabajo y dinero en una conversación simple, con automatización potente detrás.",
    primary: "Crear mi ALMA",
    demo: "Probar vista interactiva",
    trusted: "Hecho para trabajo real",
    safe: "Protegido por aprobación",
    bilingual: "Inglés + Español",
    phoneGreeting: "Buenos días, Luis",
    phoneBody: "¿Qué quieres resolver hoy?",
    placeholder: "Pregúntale a ALMA sobre tu negocio…",
    run: "Ejecutar vista",
    working: "ALMA está organizando tu oficina…",
    preview: "Vista interactiva del producto",
    previewNote: "Sin cuenta, llamadas externas ni cambios de datos.",
    oneChat: "Una conversación. Toda tu oficina.",
    oneChatBody:
      "Empieza con una pregunta. Abre los detalles solo cuando los necesites.",
    stepAsk: "Pregunta naturalmente",
    stepAskBody: "Sin capacitación. Di lo que necesitas en lenguaje sencillo.",
    stepReview: "Revisa el plan",
    stepReviewBody:
      "ALMA organiza el contexto y muestra lo que requiere aprobación.",
    stepDone: "Mantén el control",
    stepDoneBody: "Sigue la actividad, los resultados y cada acción protegida.",
    power: "Potente por dentro. Simple a propósito.",
    powerBody:
      "CRM, bandeja, tareas, facturas, documentos, voz, cámara en vivo y automatización conectados detrás de una interfaz tranquila.",
    control: "Autonomía con límites",
    controlBody:
      "Elige manual, borrador, asistido o autónomo. Las acciones sensibles siguen protegidas por aprobación.",
    pricing: "Planes simples",
    office: "ALMA Office",
    ai: "ALMA AI",
    officeBody: "Tu espacio empresarial completo sin IA generativa pagada.",
    aiBody:
      "Todo en Office más chat, voz, visión, documentos y asistencia autónoma medida.",
    month: "/mes",
    start: "Comenzar",
    final: "Una manera más tranquila de operar empieza aquí.",
    finalBody: "Un lugar para pedir, revisar, aprobar y avanzar.",
  },
} as const;

function PhoneDemo({ locale }: { locale: "en" | "es" }) {
  const t = copy[locale];
  const [active, setActive] = useState<DemoKey>("alma");
  const [state, setState] = useState<DemoState>("ready");
  const timer = useRef<number | null>(null);
  const current = demoContent[active][locale];

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  function choose(key: DemoKey) {
    if (timer.current) window.clearTimeout(timer.current);
    setActive(key);
    setState("ready");
  }

  function run() {
    if (state === "working") return;
    setState("working");
    timer.current = window.setTimeout(() => setState("done"), 720);
  }

  return (
    <div className="relative mx-auto w-full max-w-[390px]" id="preview">
      <div className="alma-phone-glow" />
      <div className="alma-phone-shell">
        <div className="alma-phone-reflection" />
        <div className="relative z-10 flex items-center justify-between px-5 pb-3 pt-5 text-[11px] text-white/55">
          <span>9:41</span>
          <span className="h-5 w-20 rounded-full bg-black/80" />
          <span>● ● ●</span>
        </div>
        <div className="relative z-10 border-y border-white/8 px-5 py-3">
          <div className="flex items-center justify-between">
            <button type="button" className="rounded-xl p-2 text-white/70">
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold tracking-[0.18em]">
              ALMA
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5">
              <Sparkles className="h-4 w-4 text-cyan-200" />
            </span>
          </div>
        </div>
        <div className="relative z-10 px-5 pb-6 pt-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-1 text-[10px] text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" />{" "}
            Office ready
          </span>
          <h3 className="mt-5 text-[26px] font-medium tracking-[-0.04em] text-white">
            {t.phoneGreeting}
          </h3>
          <p className="mt-2 text-sm text-white/48">{t.phoneBody}</p>

          <div className="mt-5 grid grid-cols-5 gap-1.5">
            {(Object.keys(demoContent) as DemoKey[]).map((key) => {
              const item = demoContent[key];
              const Icon = item.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => choose(key)}
                  className={`motion-safe:transition rounded-2xl border px-1 py-3 ${active === key ? "border-cyan-300/30 bg-cyan-300/10 text-white shadow-[0_0_30px_rgba(49,213,236,.12)]" : "border-white/7 bg-white/[.035] text-white/48"}`}
                >
                  <Icon className="mx-auto h-4 w-4" />
                  <span className="mt-2 block truncate text-[9px]">
                    {demoContent[key][locale].label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-[22px] border border-white/10 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.07)]">
            <p className="text-sm leading-6 text-white/80">{current.prompt}</p>
            <button
              type="button"
              onClick={run}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black"
            >
              <Play className="h-3.5 w-3.5" /> {t.run}
            </button>
          </div>

          <div
            aria-live="polite"
            className="mt-4 min-h-[128px] rounded-[22px] border border-white/8 bg-white/[.035] p-4"
          >
            {state === "ready" ? (
              <div className="flex h-24 items-center justify-center text-center text-xs text-white/35">
                {t.placeholder}
              </div>
            ) : state === "working" ? (
              <div className="flex h-24 flex-col items-center justify-center">
                <span className="alma-demo-orb" />
                <p className="mt-3 text-xs text-white/55">{t.working}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-cyan-200">
                  {current.result}
                </p>
                <div className="mt-3 space-y-2">
                  {current.rows.map((row) => (
                    <div
                      key={row}
                      className="flex items-center gap-2 text-[11px] text-white/60"
                    >
                      <Check className="h-3 w-3 shrink-0 text-emerald-300" />
                      {row}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-5 text-center">
        <p className="text-xs font-medium text-white/60">{t.preview}</p>
        <p className="mt-1 text-[10px] text-white/30">{t.previewNote}</p>
      </div>
    </div>
  );
}

export default function PublicAlmaSandbox() {
  const isIosApp = useIsAlmaIosApp();
  const { locale, setLocale } = useAlmaLocale();
  const t = copy[locale];

  return (
    <main className="alma-saas min-h-screen overflow-hidden bg-[#05070c] text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/7 bg-[#05070c]/72 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/12 bg-white/[.055] text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
              A
            </span>
            <span className="text-sm font-semibold tracking-[0.14em]">
              ALMA
            </span>
            <span className="hidden text-[9px] text-white/30 sm:inline">
              BY SEAINT
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void setLocale(locale === "en" ? "es" : "en")}
              className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/5"
            >
              {locale === "en" ? "ES" : "EN"}
            </button>
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-xs text-white/60 hover:text-white sm:block"
            >
              {t.signIn}
            </Link>
            <Link
              href={isIosApp ? "/login" : "/signup"}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black"
            >
              {isIosApp ? t.signIn : t.create}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative px-5 pb-20 pt-32 lg:px-8 lg:pb-28 lg:pt-40">
        <div className="alma-saas-orb alma-saas-orb--one" />
        <div className="alma-saas-orb alma-saas-orb--two" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.08fr_.92fr]">
          <div className="max-w-2xl text-center lg:text-left">
            <p className="text-[11px] font-semibold tracking-[0.24em] text-cyan-200/70">
              {t.eyebrow}
            </p>
            <h1 className="mt-6 text-[clamp(3rem,8vw,6.7rem)] font-medium leading-[.9] tracking-[-0.07em]">
              {t.titleA}
              <br />
              <span className="alma-saas-gradient">{t.titleB}</span>
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-white/50 sm:text-lg lg:mx-0">
              {t.subtitle}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href={isIosApp ? "/login" : "/signup"}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black"
              >
                {t.primary}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#preview"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[.035] px-6 py-3.5 text-sm text-white/72 backdrop-blur-xl"
              >
                {t.demo}
                <Play className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-9 flex flex-wrap justify-center gap-x-5 gap-y-3 text-[11px] text-white/35 lg:justify-start">
              {[t.trusted, t.safe, t.bilingual].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <PhoneDemo locale={locale} />
        </div>
      </section>

      <section className="border-y border-white/7 bg-white/[.018] px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold tracking-[.22em] text-violet-200/60">
              HOW IT FEELS
            </p>
            <h2 className="mt-5 text-3xl font-medium tracking-[-.045em] sm:text-5xl">
              {t.oneChat}
            </h2>
            <p className="mt-4 text-white/45">{t.oneChatBody}</p>
          </div>
          <div className="mt-12 grid gap-3 md:grid-cols-3">
            {[
              [MessageCircle, "01", t.stepAsk, t.stepAskBody],
              [Bot, "02", t.stepReview, t.stepReviewBody],
              [ShieldCheck, "03", t.stepDone, t.stepDoneBody],
            ].map(([Icon, number, title, body]) => {
              const StepIcon = Icon as typeof MessageCircle;
              return (
                <article
                  key={String(title)}
                  className="alma-saas-card group rounded-[26px] p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5">
                      <StepIcon className="h-4 w-4 text-cyan-200" />
                    </span>
                    <span className="text-xs text-white/20">
                      {String(number)}
                    </span>
                  </div>
                  <h3 className="mt-12 text-xl font-medium">{String(title)}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/42">
                    {String(body)}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <article className="alma-saas-card relative min-h-[430px] overflow-hidden rounded-[32px] p-7 sm:p-10">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/20 blur-[80px]" />
            <p className="relative text-[11px] font-semibold tracking-[.22em] text-cyan-200/60">
              ALMA WORKSPACE
            </p>
            <h2 className="relative mt-5 max-w-xl text-3xl font-medium tracking-[-.045em] sm:text-5xl">
              {t.power}
            </h2>
            <p className="relative mt-5 max-w-xl text-sm leading-7 text-white/45 sm:text-base">
              {t.powerBody}
            </p>
            <div className="relative mt-10 flex flex-wrap gap-2">
              {[
                Users,
                Inbox,
                BriefcaseBusiness,
                CircleDollarSign,
                Mic,
                Video,
              ].map((Icon, index) => (
                <span
                  key={index}
                  className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[.04]"
                >
                  <Icon className="h-5 w-5 text-white/55" />
                </span>
              ))}
            </div>
          </article>
          <article className="alma-saas-card rounded-[32px] p-7 sm:p-10">
            <ShieldCheck className="h-6 w-6 text-emerald-300" />
            <h2 className="mt-14 text-3xl font-medium tracking-[-.04em]">
              {t.control}
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/45">
              {t.controlBody}
            </p>
            <div className="mt-10 space-y-2">
              {["Manual", "Draft", "Assisted", "Autonomous"].map(
                (mode, index) => (
                  <div
                    key={mode}
                    className="flex items-center justify-between rounded-2xl border border-white/7 bg-white/[.025] px-4 py-3 text-sm text-white/55"
                  >
                    <span>{mode}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${index === 2 ? "bg-cyan-300 shadow-[0_0_12px_#67e8f9]" : "bg-white/15"}`}
                    />
                  </div>
                ),
              )}
            </div>
          </article>
        </div>
      </section>

      {!isIosApp ? (
        <section
          id="pricing"
          className="border-y border-white/7 bg-white/[.018] px-5 py-20 lg:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-medium tracking-[-.04em] sm:text-5xl">
              {t.pricing}
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {[
                {
                  name: t.office,
                  price: "$39",
                  body: t.officeBody,
                  plan: "office",
                  featured: false,
                },
                {
                  name: t.ai,
                  price: "$199",
                  body: t.aiBody,
                  plan: "ai",
                  featured: true,
                },
              ].map((plan) => (
                <article
                  key={plan.plan}
                  className={`rounded-[28px] border p-7 ${plan.featured ? "border-violet-300/20 bg-violet-400/[.07] shadow-[0_0_70px_rgba(124,92,255,.12)]" : "border-white/8 bg-white/[.025]"}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-medium">{plan.name}</h3>
                    {plan.featured ? (
                      <Sparkles className="h-4 w-4 text-violet-200" />
                    ) : null}
                  </div>
                  <p className="mt-7 text-4xl font-medium">
                    {plan.price}
                    <span className="ml-1 text-xs font-normal text-white/35">
                      {t.month}
                    </span>
                  </p>
                  <p className="mt-4 min-h-14 text-sm leading-6 text-white/42">
                    {plan.body}
                  </p>
                  <Link
                    href={`/signup?checkout=${plan.plan}`}
                    className="mt-7 flex items-center justify-between rounded-full bg-white px-5 py-3 text-sm font-semibold text-black"
                  >
                    {t.start}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-5 py-24 text-center lg:px-8">
        <h2 className="mx-auto max-w-3xl text-4xl font-medium tracking-[-.05em] sm:text-6xl">
          {t.final}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-white/42">{t.finalBody}</p>
        <Link
          href={isIosApp ? "/login" : "/signup"}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black"
        >
          {isIosApp ? t.signIn : t.primary}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-white/7 px-5 py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[11px] text-white/28">
          <span>ALMA BY SEAINT</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </main>
  );
}
