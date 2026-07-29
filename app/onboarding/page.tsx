"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Landmark,
  Loader2,
  Mail,
  Mic2,
  ReceiptText,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

type Mode = "business" | "creator" | "both";
type SetupStatus = "ready" | "action_required" | "owner_action_required";
type Readiness = {
  profile: {
    status: SetupStatus;
    operatingMode: Mode;
    businessName: string;
    industry: string;
    completed: boolean;
  };
  money: { status: SetupStatus };
  connections: Record<
    "gmail" | "outlook" | "quickbooks" | "stripe" | "paypal" | "voice",
    SetupStatus
  >;
};

const copy = {
  en: {
    eyebrow: "ALMA business setup",
    title: "Open your office in a few minutes.",
    subtitle:
      "ALMA saves each step. Connect only what you use, skip optional tools, and return any time.",
    steps: ["Business", "Money", "Connections", "Voice & finish"],
    business: "Business",
    businessBody: "Customers, estimates, invoices, money, tasks, and a team.",
    creator: "Creator",
    creatorBody:
      "Audience, brand inquiries, sponsors, bookings, invoices, and expenses.",
    both: "Creator + Business",
    bothBody: "Operate a company and personal brand in one secure workspace.",
    businessName: "Business or brand name",
    industry: "Industry (optional)",
    saveContinue: "Save and continue",
    saving: "Saving...",
    saveError:
      "ALMA could not save this step. Your information is still on this screen—try again.",
    readinessError:
      "ALMA could not refresh setup status. Check your connection and try again.",
    retryReadiness: "Refresh setup",
    moneyTitle: "Your financial office",
    moneyBody:
      "Track income, expenses, receipts, estimates, invoices, payroll preparation, and accountant-ready reports.",
    moneyReady: "Money is ready",
    moneyWaiting:
      "Your financial office is being activated. You can finish the rest of setup now.",
    moneyFeatures: [
      "Income and expense tracking",
      "Receipts and bookkeeping review",
      "Estimates, invoices, and payment tracking",
      "Payroll and tax preparation reports",
    ],
    connectionsTitle: "Connect the tools you already use",
    connectionsBody:
      "Connections are optional. ALMA only shows a Connect button when the provider is configured safely.",
    gmail: "Gmail",
    gmailBody: "Send approved customer email from ALMA.",
    outlook: "Outlook",
    outlookBody: "Send approved customer email from Microsoft.",
    quickbooks: "QuickBooks",
    quickbooksBody: "Connect accounting data with a review-first sync.",
    stripe: "Stripe",
    stripeBody: "Accept and track customer payments.",
    paypal: "PayPal",
    paypalBody: "Accept PayPal payments and reconcile paid invoices.",
    connected: "Connected",
    connect: "Connect",
    ownerSetup: "Owner setup needed",
    optional: "Optional",
    connectionSuccess: "Connection saved. ALMA refreshed your setup.",
    connectionFailed:
      "That connection was not completed. Check the provider configuration and try again.",
    voiceTitle: "Add a voice agent when you are ready",
    voiceBody:
      "Use your own ElevenLabs account. ALMA encrypts the key, creates the agent, and can attach signed post-call transcripts to CRM contacts.",
    voiceConnected: "Voice account connected",
    voiceAction: "Set up voice agent",
    voiceLater: "You can do this later from Settings.",
    finish: "Finish setup",
    back: "Back",
    skip: "Skip for now",
    dashboard: "Go to dashboard",
    finishing: "Finishing...",
    privacy:
      "Provider secrets stay encrypted on the server. External sends and financial actions keep their approval controls.",
  },
  es: {
    eyebrow: "Configuración empresarial de ALMA",
    title: "Abre tu oficina en pocos minutos.",
    subtitle:
      "ALMA guarda cada paso. Conecta solo lo que usas, omite lo opcional y regresa cuando quieras.",
    steps: ["Negocio", "Dinero", "Conexiones", "Voz y finalizar"],
    business: "Negocio",
    businessBody: "Clientes, estimados, facturas, dinero, tareas y equipo.",
    creator: "Creador",
    creatorBody:
      "Audiencia, marcas, patrocinadores, reservas, facturas y gastos.",
    both: "Creador + Negocio",
    bothBody: "Opera una empresa y marca personal en un solo espacio seguro.",
    businessName: "Nombre del negocio o marca",
    industry: "Industria (opcional)",
    saveContinue: "Guardar y continuar",
    saving: "Guardando...",
    saveError:
      "ALMA no pudo guardar este paso. Tu información sigue en esta pantalla; inténtalo de nuevo.",
    readinessError:
      "ALMA no pudo actualizar el estado. Revisa tu conexión e inténtalo de nuevo.",
    retryReadiness: "Actualizar configuración",
    moneyTitle: "Tu oficina financiera",
    moneyBody:
      "Controla ingresos, gastos, recibos, estimados, facturas, preparación de nómina y reportes para tu contador.",
    moneyReady: "Dinero está listo",
    moneyWaiting:
      "Tu oficina financiera se está activando. Puedes terminar el resto de la configuración ahora.",
    moneyFeatures: [
      "Control de ingresos y gastos",
      "Recibos y revisión contable",
      "Estimados, facturas y control de pagos",
      "Reportes de preparación de nómina e impuestos",
    ],
    connectionsTitle: "Conecta las herramientas que ya usas",
    connectionsBody:
      "Las conexiones son opcionales. ALMA solo muestra Conectar cuando el proveedor está configurado de forma segura.",
    gmail: "Gmail",
    gmailBody: "Envía correos aprobados a clientes desde ALMA.",
    outlook: "Outlook",
    outlookBody: "Envía correos aprobados desde Microsoft.",
    quickbooks: "QuickBooks",
    quickbooksBody:
      "Conecta datos contables con sincronización revisada primero.",
    stripe: "Stripe",
    stripeBody: "Acepta y controla pagos de clientes.",
    paypal: "PayPal",
    paypalBody: "Acepta pagos de PayPal y concilia facturas pagadas.",
    connected: "Conectado",
    connect: "Conectar",
    ownerSetup: "Requiere configuración del propietario",
    optional: "Opcional",
    connectionSuccess: "Conexión guardada. ALMA actualizó tu configuración.",
    connectionFailed:
      "La conexión no terminó. Revisa la configuración del proveedor e intenta otra vez.",
    voiceTitle: "Agrega un agente de voz cuando estés listo",
    voiceBody:
      "Usa tu propia cuenta de ElevenLabs. ALMA cifra la clave, crea el agente y puede guardar transcripciones firmadas en los contactos del CRM.",
    voiceConnected: "Cuenta de voz conectada",
    voiceAction: "Configurar agente de voz",
    voiceLater: "Puedes hacerlo después desde Configuración.",
    finish: "Finalizar configuración",
    back: "Atrás",
    skip: "Omitir por ahora",
    dashboard: "Ir al panel",
    finishing: "Finalizando...",
    privacy:
      "Los secretos se cifran en el servidor. Los envíos externos y acciones financieras conservan sus aprobaciones.",
  },
} as const;

const emptyReadiness: Readiness = {
  profile: {
    status: "action_required",
    operatingMode: "business",
    businessName: "",
    industry: "",
    completed: false,
  },
  money: { status: "owner_action_required" },
  connections: {
    gmail: "owner_action_required",
    outlook: "owner_action_required",
    quickbooks: "owner_action_required",
    stripe: "owner_action_required",
    paypal: "action_required",
    voice: "owner_action_required",
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const { locale, setLocale } = useAlmaLocale();
  const t = copy[locale];
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>("business");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [readiness, setReadiness] = useState<Readiness>(emptyReadiness);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [readinessError, setReadinessError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setReadinessError("");
    try {
      const response = await fetch("/api/setup/readiness", {
        cache: "no-store",
      });
      if (response.status === 401) {
        router.push("/login?next=/onboarding");
        return;
      }
      if (!response.ok) throw new Error("readiness_failed");
      const payload = (await response.json()) as {
        setup?: Readiness;
      };
      if (payload.setup) {
        setReadiness(payload.setup);
        setMode(payload.setup.profile.operatingMode);
        setBusinessName(payload.setup.profile.businessName);
        setIndustry(payload.setup.profile.industry);
      }
    } catch {
      setReadinessError(t.readinessError);
    } finally {
      setLoading(false);
    }
  }, [router, t.readinessError]);

  useEffect(() => {
    void refresh().then(() => {
      const params = new URL(window.location.href).searchParams;
      if (
        params.get("connection") === "connected" ||
        params.get("stripe") === "connected"
      ) {
        setNotice(t.connectionSuccess);
        setStep(2);
      } else if (
        params.get("connection") === "connection_failed" ||
        params.get("stripe") === "connection_failed"
      ) {
        setNotice(t.connectionFailed);
        setStep(2);
      } else if (params.get("resume") === "money") {
        setStep(1);
      }
    });
  }, [refresh, t.connectionFailed, t.connectionSuccess]);

  const modes = useMemo(
    () => [
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
      {
        key: "both" as const,
        label: t.both,
        body: t.bothBody,
        icon: Sparkles,
      },
    ],
    [t],
  );

  async function saveProfile(completeOnboarding: boolean) {
    if (!businessName.trim()) return false;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/business-office/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operatingMode: mode,
          language: locale,
          businessName,
          industry,
          completeOnboarding,
        }),
      });
      if (!response.ok) throw new Error("save_failed");
      await refresh();
      return true;
    } catch {
      setError(t.saveError);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function nextFromBusiness() {
    if (await saveProfile(false)) setStep(1);
  }

  async function finish() {
    if (!(await saveProfile(true))) return;
    router.push("/dashboard?setup=complete");
  }

  function connector(
    key: "gmail" | "outlook" | "quickbooks" | "stripe" | "paypal",
    label: string,
    body: string,
    icon: typeof Mail,
  ) {
    const Icon = icon;
    const status = readiness.connections[key];
    const href =
      key === "stripe"
        ? "/api/oauth/stripe/start?returnTo=%2Fonboarding"
        : key === "paypal"
          ? "/connections?setup=paypal"
          : `/api/connectors/oauth/${key}/start?returnTo=%2Fonboarding`;
    return (
      <article
        key={key}
        className="rounded-[22px] border border-[#E4E7EC] bg-white p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Icon className="h-5 w-5" />
            <h3 className="mt-4 font-medium">{label}</h3>
            <p className="mt-1 text-sm leading-6 text-[#667085]">{body}</p>
          </div>
          <StatusPill status={status} copy={t} />
        </div>
        {status === "action_required" ? (
          <a
            href={href}
            className="mt-4 inline-flex rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
          >
            {t.connect}
          </a>
        ) : null}
      </article>
    );
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F7F7F8]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F8] px-4 py-6 text-black md:px-10 md:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#667085]">
              {t.eyebrow}
            </p>
            <p className="mt-1 text-sm text-[#667085]">
              {step + 1} / {t.steps.length}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void setLocale(locale === "en" ? "es" : "en")}
            className="rounded-full border border-[#D0D5DD] bg-white px-4 py-2 text-sm"
          >
            {locale === "en" ? "ES" : "EN"}
          </button>
        </header>

        <div
          className="mt-5 grid grid-cols-4 gap-2"
          aria-label="Setup progress"
        >
          {t.steps.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => index <= step && setStep(index)}
              className="text-left"
              aria-current={index === step ? "step" : undefined}
            >
              <span
                className={`block h-1 rounded-full ${
                  index <= step ? "bg-black" : "bg-[#D0D5DD]"
                }`}
              />
              <span className="mt-2 hidden text-xs text-[#667085] sm:block">
                {label}
              </span>
            </button>
          ))}
        </div>

        {notice ? (
          <p
            role="status"
            className="mt-5 rounded-2xl border border-[#D0D5DD] bg-white p-4 text-sm"
          >
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            {error}
          </p>
        ) : null}
        {readinessError ? (
          <div
            role="alert"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <span>{readinessError}</span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full bg-black px-4 py-2 text-white"
            >
              {t.retryReadiness}
            </button>
          </div>
        ) : null}

        {step === 0 ? (
          <section className="mt-8">
            <h1 className="max-w-3xl text-4xl font-medium tracking-tight md:text-6xl">
              {t.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#667085] md:text-lg">
              {t.subtitle}
            </p>
            <div className="mt-7 grid gap-3 md:grid-cols-3">
              {modes.map(({ key, label, body, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={`rounded-[24px] border p-5 text-left ${
                    mode === key
                      ? "border-black bg-black text-white"
                      : "border-[#D0D5DD] bg-white"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <h2 className="mt-7 text-lg font-medium">{label}</h2>
                  <p className="mt-2 text-sm leading-6 opacity-65">{body}</p>
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-3 rounded-[24px] border border-[#D0D5DD] bg-white p-5 md:grid-cols-2">
              <label className="text-sm font-medium">
                {t.businessName}
                <input
                  autoFocus
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  maxLength={120}
                  className="mt-2 w-full rounded-xl border border-[#D0D5DD] px-4 py-3 font-normal"
                />
              </label>
              <label className="text-sm font-medium">
                {t.industry}
                <input
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                  maxLength={120}
                  className="mt-2 w-full rounded-xl border border-[#D0D5DD] px-4 py-3 font-normal"
                />
              </label>
            </div>
            <PrimaryButton
              disabled={saving || !businessName.trim()}
              onClick={() => void nextFromBusiness()}
            >
              {saving ? t.saving : t.saveContinue}
              {!saving ? <ArrowRight className="h-4 w-4" /> : null}
            </PrimaryButton>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="mt-8">
            <SetupHeading
              title={t.moneyTitle}
              body={t.moneyBody}
              icon={CircleDollarSign}
            />
            <div
              className={`mt-6 rounded-[24px] border p-5 ${
                readiness.money.status === "ready"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {readiness.money.status === "ready" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                ) : (
                  <CircleAlert className="h-5 w-5 text-amber-700" />
                )}
                {readiness.money.status === "ready"
                  ? t.moneyReady
                  : t.moneyWaiting}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {t.moneyFeatures.map((feature, index) => {
                const Icon =
                  [ReceiptText, ReceiptText, CircleDollarSign, CalendarDays][
                    index
                  ] ?? ReceiptText;
                return (
                  <div
                    key={feature}
                    className="flex items-center gap-3 rounded-2xl border border-[#E4E7EC] bg-white p-4 text-sm"
                  >
                    <Icon className="h-4 w-4" />
                    {feature}
                  </div>
                );
              })}
            </div>
            <StepActions
              back={t.back}
              next={t.saveContinue}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
            />
          </section>
        ) : null}

        {step === 2 ? (
          <section className="mt-8">
            <SetupHeading
              title={t.connectionsTitle}
              body={t.connectionsBody}
              icon={Mail}
            />
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {connector("gmail", t.gmail, t.gmailBody, Mail)}
              {connector("outlook", t.outlook, t.outlookBody, Mail)}
              {connector(
                "quickbooks",
                t.quickbooks,
                t.quickbooksBody,
                Landmark,
              )}
              {connector("stripe", t.stripe, t.stripeBody, CircleDollarSign)}
              {connector("paypal", t.paypal, t.paypalBody, CircleDollarSign)}
            </div>
            <StepActions
              back={t.back}
              next={t.skip}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          </section>
        ) : null}

        {step === 3 ? (
          <section className="mt-8">
            <SetupHeading title={t.voiceTitle} body={t.voiceBody} icon={Mic2} />
            <div className="mt-6 rounded-[24px] border border-[#E4E7EC] bg-white p-6">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    <Bot className="h-5 w-5" />
                    {readiness.connections.voice === "ready"
                      ? t.voiceConnected
                      : t.voiceAction}
                  </div>
                  <p className="mt-2 text-sm text-[#667085]">{t.voiceLater}</p>
                </div>
                <a
                  href="/voice-agents"
                  className="inline-flex shrink-0 items-center justify-center rounded-full border border-black px-4 py-2 text-sm font-medium"
                >
                  {t.voiceAction}
                </a>
              </div>
            </div>
            <p className="mt-5 flex gap-2 text-xs leading-5 text-[#667085]">
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              {t.privacy}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D0D5DD] bg-white px-6 py-3 text-sm font-medium"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.back}
              </button>
              <PrimaryButton disabled={saving} onClick={() => void finish()}>
                {saving ? t.finishing : t.finish}
                {!saving ? <ArrowRight className="h-4 w-4" /> : null}
              </PrimaryButton>
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium text-[#667085]"
              >
                {t.dashboard}
              </a>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function StatusPill({
  status,
  copy: t,
}: {
  status: SetupStatus;
  copy: (typeof copy)["en"] | (typeof copy)["es"];
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        status === "ready"
          ? "bg-emerald-100 text-emerald-800"
          : status === "owner_action_required"
            ? "bg-amber-100 text-amber-800"
            : "bg-[#F2F4F7] text-[#475467]"
      }`}
    >
      {status === "ready"
        ? t.connected
        : status === "owner_action_required"
          ? t.ownerSetup
          : t.optional}
    </span>
  );
}

function SetupHeading({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: typeof Mail;
}) {
  return (
    <>
      <div className="grid h-11 w-11 place-items-center rounded-xl border border-[#D0D5DD] bg-white">
        <Icon className="h-5 w-5" />
      </div>
      <h1 className="mt-5 text-3xl font-medium tracking-tight md:text-5xl">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-[#667085]">
        {body}
      </p>
    </>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function StepActions({
  back,
  next,
  onBack,
  onNext,
}: {
  back: string;
  next: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D0D5DD] bg-white px-6 py-3 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        {back}
      </button>
      <button
        type="button"
        onClick={onNext}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white"
      >
        {next}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
