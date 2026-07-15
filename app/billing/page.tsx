"use client";

import type {
  BillingInvoice,
  BillingPriceOption,
  BillingSubscription,
} from "@/lib/billing/types";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import { DASHBOARD_ROUTE } from "@/lib/platform/workspaceRoutes";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Language = "en" | "es";
type LoadState = "loading" | "ready" | "error";

type BillingPayload = {
  ok: boolean;
  subscription?: BillingSubscription;
  error?: string;
};

type PlansPayload = {
  ok: boolean;
  configured?: boolean;
  plans?: BillingPriceOption[];
};

type HistoryPayload = {
  ok: boolean;
  invoices?: BillingInvoice[];
};

const copy = {
  en: {
    back: "Back to dashboard",
    eyebrow: "Billing",
    title: "Your ALMA subscription",
    description:
      "View your subscription, manage your plan, and download available Stripe invoices.",
    currentPlan: "Current plan",
    status: "Status",
    renews: "Renews",
    ends: "Ends",
    noRenewal: "No renewal date is available yet.",
    manage: "Manage subscription",
    choose: "Choose a plan",
    checkout: "Continue to checkout",
    configured: "Subscription products are not configured yet.",
    history: "Payment history",
    noHistory: "No Stripe invoices are available for this account yet.",
    invoice: "Invoice",
    paid: "Paid",
    due: "Due",
    open: "Open invoice",
    download: "Download PDF",
    retry: "Try again",
    unavailable: "Billing is temporarily unavailable. Please try again.",
    processing: "Opening secure checkout…",
    portal: "Opening secure billing portal…",
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    business: "Business",
    active: "Active",
    trialing: "Trial",
    past_due: "Past due",
    unpaid: "Unpaid",
    canceled: "Canceled",
    incomplete: "Incomplete",
    incomplete_expired: "Expired",
    paused: "Paused",
    inactive: "Inactive",
  },
  es: {
    back: "Volver al panel",
    eyebrow: "Facturación",
    title: "Tu suscripción de ALMA",
    description:
      "Consulta tu suscripción, administra tu plan y descarga las facturas de Stripe disponibles.",
    currentPlan: "Plan actual",
    status: "Estado",
    renews: "Renueva",
    ends: "Finaliza",
    noRenewal: "Aún no hay una fecha de renovación disponible.",
    manage: "Administrar suscripción",
    choose: "Elige un plan",
    checkout: "Continuar al pago",
    configured: "Los productos de suscripción aún no están configurados.",
    history: "Historial de pagos",
    noHistory: "Aún no hay facturas de Stripe disponibles para esta cuenta.",
    invoice: "Factura",
    paid: "Pagado",
    due: "Pendiente",
    open: "Abrir factura",
    download: "Descargar PDF",
    retry: "Intentar de nuevo",
    unavailable:
      "La facturación no está disponible temporalmente. Inténtalo de nuevo.",
    processing: "Abriendo el pago seguro…",
    portal: "Abriendo el portal de facturación seguro…",
    free: "Gratis",
    starter: "Inicial",
    pro: "Pro",
    business: "Business",
    active: "Activa",
    trialing: "Prueba",
    past_due: "Vencida",
    unpaid: "Sin pagar",
    canceled: "Cancelada",
    incomplete: "Incompleta",
    incomplete_expired: "Vencida",
    paused: "En pausa",
    inactive: "Inactiva",
  },
} as const;

function isBillingPayload(value: unknown): value is BillingPayload {
  return Boolean(value && typeof value === "object" && "ok" in value);
}

function formatMoney(amount: number, currency: string, language: Language) {
  return new Intl.NumberFormat(language === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(value: string | null, language: Language) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-US", {
    dateStyle: "medium",
  }).format(date);
}

export default function BillingPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [state, setState] = useState<LoadState>("loading");
  const [subscription, setSubscription] = useState<BillingSubscription | null>(
    null,
  );
  const [plans, setPlans] = useState<BillingPriceOption[]>([]);
  const [plansConfigured, setPlansConfigured] = useState(false);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [action, setAction] = useState<"checkout" | "portal" | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const text = copy[language];
  const activeSubscription = subscription
    ? ["active", "trialing"].includes(subscription.status)
    : false;

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState("loading");
    try {
      const [
        billingResponse,
        plansResponse,
        historyResponse,
        languageResponse,
      ] = await Promise.all([
        fetch("/api/billing/status", {
          cache: "no-store",
          signal: controller.signal,
        }),
        fetch("/api/billing/plans", {
          cache: "no-store",
          signal: controller.signal,
        }),
        fetch("/api/billing/history", {
          cache: "no-store",
          signal: controller.signal,
        }),
        fetch("/api/settings/language", {
          cache: "no-store",
          signal: controller.signal,
        }),
      ]);
      const billingPayload: unknown = await billingResponse.json();
      if (
        !billingResponse.ok ||
        !isBillingPayload(billingPayload) ||
        !billingPayload.ok
      ) {
        throw new Error("billing_unavailable");
      }
      const plansPayload = (await plansResponse.json()) as PlansPayload;
      const historyPayload = (await historyResponse.json()) as HistoryPayload;
      if (controller.signal.aborted) return;
      setSubscription(billingPayload.subscription ?? null);
      setPlans(plansPayload.ok ? (plansPayload.plans ?? []) : []);
      setPlansConfigured(Boolean(plansPayload.ok && plansPayload.configured));
      setInvoices(historyPayload.ok ? (historyPayload.invoices ?? []) : []);
      if (languageResponse.ok) {
        const languagePayload = await languageResponse.json();
        setLanguage(languagePayload.language === "es" ? "es" : "en");
      }
      setState("ready");
    } catch {
      if (controller.signal.aborted) return;
      setState("error");
    }
  }, []);

  function updateLanguage(next: AlmaShellLanguage) {
    setLanguage(next);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      requestRef.current?.abort();
    };
  }, [load]);

  const planLabel = useMemo(() => {
    const plan = subscription?.plan?.toLowerCase() ?? "free";
    return text[plan as keyof typeof text] ?? subscription?.plan ?? text.free;
  }, [subscription?.plan, text]);
  const statusLabel = useMemo(() => {
    const status = subscription?.status?.toLowerCase() ?? "inactive";
    return (
      text[status as keyof typeof text] ?? subscription?.status ?? text.inactive
    );
  }, [subscription?.status, text]);

  const openCheckout = useCallback(
    async (plan: BillingPriceOption["plan"]) => {
      if (action) return;
      setAction("checkout");
      try {
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const payload = await response.json();
        if (!response.ok || typeof payload.url !== "string")
          throw new Error("checkout_failed");
        window.location.assign(payload.url);
      } catch {
        setAction(null);
      }
    },
    [action],
  );

  const openPortal = useCallback(async () => {
    if (action) return;
    setAction("portal");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || typeof payload.url !== "string")
        throw new Error("portal_failed");
      window.location.assign(payload.url);
    } catch {
      setAction(null);
    }
  }, [action]);

  const periodEnd = formatDate(
    subscription?.currentPeriodEnd ?? null,
    language,
  );
  const periodLabel = subscription?.cancelAtPeriodEnd ? text.ends : text.renews;

  return (
    <AlmaShell
      language={language}
      activeWorkspace="billing"
      title={text.eyebrow}
      onLanguageChange={updateLanguage}
    >
      <div className="px-4 py-8 text-black md:px-10">
        <div className="mx-auto max-w-5xl">
          <Link
            href={DASHBOARD_ROUTE}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {text.back}
          </Link>

          <section className="mt-8 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">
              {text.eyebrow}
            </p>
            <h1 className="mt-4 text-3xl font-medium tracking-tight md:text-4xl">
              {text.title}
            </h1>
            <p className="mt-4 max-w-2xl text-gray-500">{text.description}</p>

            {state === "loading" ? (
              <p className="mt-8 text-sm text-gray-500" role="status">
                …
              </p>
            ) : null}
            {state === "error" ? (
              <div className="mt-8 rounded-2xl bg-[#F7F7F8] p-5">
                <p className="text-sm text-gray-600">{text.unavailable}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-4 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white"
                >
                  {text.retry}
                </button>
              </div>
            ) : null}

            {state === "ready" && subscription ? (
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-[#F7F7F8] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    {text.currentPlan}
                  </p>
                  <p className="mt-2 text-xl font-medium">{planLabel}</p>
                </div>
                <div className="rounded-2xl bg-[#F7F7F8] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    {text.status}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-xl font-medium">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                    {statusLabel}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F7F7F8] p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                    {periodLabel}
                  </p>
                  <p className="mt-2 text-xl font-medium">
                    {periodEnd ?? text.noRenewal}
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          {state === "ready" && subscription?.stripeCustomerId ? (
            <section className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-medium">{text.choose}</h2>
              <p className="mt-2 text-sm text-gray-500">
                {activeSubscription ? text.manage : text.choose}
              </p>
              <button
                type="button"
                disabled={action !== null}
                onClick={() => void openPortal()}
                className="mt-5 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {action === "portal" ? text.portal : text.manage}
              </button>
            </section>
          ) : null}

          {state === "ready" && !subscription?.stripeCustomerId ? (
            <section className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-2xl font-medium">{text.choose}</h2>
              {!plansConfigured ? (
                <p className="mt-4 text-sm text-gray-500">{text.configured}</p>
              ) : null}
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {plans.map((plan) => (
                  <article
                    key={plan.plan}
                    className="rounded-2xl bg-[#F7F7F8] p-5"
                  >
                    <h3 className="text-lg font-medium">{text[plan.plan]}</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      {plan.amount !== null && plan.currency
                        ? formatMoney(plan.amount, plan.currency, language)
                        : "—"}
                      {plan.interval ? ` / ${plan.interval}` : ""}
                    </p>
                    <button
                      type="button"
                      disabled={action !== null}
                      onClick={() => void openCheckout(plan.plan)}
                      className="mt-5 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {action === "checkout" ? text.processing : text.checkout}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {state === "ready" ? (
            <section className="mt-6 rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center gap-3">
                <ReceiptText className="h-5 w-5" aria-hidden="true" />
                <h2 className="text-2xl font-medium">{text.history}</h2>
              </div>
              {!invoices.length ? (
                <p className="mt-5 text-sm text-gray-500">{text.noHistory}</p>
              ) : (
                <div className="mt-5 divide-y divide-gray-100">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex flex-col gap-3 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {text.invoice} {invoice.number ?? invoice.id}
                        </p>
                        <p className="mt-1 text-gray-500">
                          {formatDate(invoice.createdAt, language) ?? "—"} ·{" "}
                          {invoice.status ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>
                          {invoice.amountPaid
                            ? `${text.paid}: ${formatMoney(invoice.amountPaid, invoice.currency, language)}`
                            : `${text.due}: ${formatMoney(invoice.amountDue, invoice.currency, language)}`}
                        </span>
                        {invoice.hostedInvoiceUrl ? (
                          <a
                            href={invoice.hostedInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-gray-600 hover:text-black"
                          >
                            {text.open}
                            <ExternalLink
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </a>
                        ) : null}
                        {invoice.invoicePdfUrl ? (
                          <a
                            href={invoice.invoicePdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gray-600 hover:text-black"
                          >
                            {text.download}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </AlmaShell>
  );
}
