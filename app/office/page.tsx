"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Calculator,
  DollarSign,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import BilingualComposer from "@/components/communications/BilingualComposer";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

type Tab = "overview" | "customers" | "estimates" | "invoices" | "priceBook";
type LoadState = "loading" | "ready" | "auth" | "error";

type OfficeOverview = {
  services: number;
  estimates: number;
  unpaidInvoices: number;
  customers: number;
};

type OfficeService = {
  id: string;
  name: string;
  unit_type: string;
  standard_rate: number;
  minimum_charge: number;
  default_deposit_percentage: number;
  taxable: boolean;
  active: boolean;
};

type OfficeEstimate = {
  id: string;
  estimate_number: string;
  status: string;
  total: number;
  deposit_amount: number;
  currency: string;
  created_at?: string | null;
};

type CustomerPayload = {
  contacts?: Array<{ id: string; name: string; email?: string | null }>;
  companies?: Array<{ id: string; name: string }>;
};

const COPY = {
  en: {
    title: "Alma Office",
    subtitle:
      "Customers, price book, estimates, approvals, and invoice handoff.",
    loading: "Loading Office...",
    auth: "Sign in to use Alma Office.",
    error: "Alma Office is temporarily unavailable.",
    retry: "Retry",
    overview: "Overview",
    customers: "Customers",
    estimates: "Estimates",
    invoices: "Invoices",
    priceBook: "Price Book",
    addService: "Add service",
    emptyServices: "No price-book services yet.",
    emptyCustomers: "No customers yet.",
    emptyEstimates: "No estimates yet.",
    openInvoices: "Open Invoices",
    createEstimate: "Create estimate",
    addCustomer: "Add customer",
    deliveryHelper: "Estimate delivery helper",
    deliveryDraft: "Write the customer message for this estimate here.",
    commandCenter: "Office command center",
    operationalPulse: "Operational pulse",
    estimatePipeline: "Estimate pipeline",
    noPipeline: "Create an estimate to start the pipeline.",
    money: "Money",
    connectPayments: "Connect payments",
    newInvoice: "Open invoicing",
    activeRecords: "Active office records",
  },
  es: {
    title: "Alma Office",
    subtitle: "Clientes, precios, estimados, aprobaciones y paso a facturas.",
    loading: "Cargando Office...",
    auth: "Inicia sesion para usar Alma Office.",
    error: "Alma Office no esta disponible temporalmente.",
    retry: "Reintentar",
    overview: "Resumen",
    customers: "Clientes",
    estimates: "Estimados",
    invoices: "Facturas",
    priceBook: "Precios",
    addService: "Agregar servicio",
    emptyServices: "Aun no hay servicios guardados.",
    emptyCustomers: "Aun no hay clientes.",
    emptyEstimates: "Aun no hay estimados.",
    openInvoices: "Abrir Facturas",
    createEstimate: "Crear estimado",
    addCustomer: "Agregar cliente",
    deliveryHelper: "Ayuda para enviar estimado",
    deliveryDraft: "Escribe aqui el mensaje del estimado para el cliente.",
    commandCenter: "Centro de control de Office",
    operationalPulse: "Pulso operativo",
    estimatePipeline: "Flujo de estimados",
    noPipeline: "Crea un estimado para iniciar el flujo.",
    money: "Dinero",
    connectPayments: "Conectar pagos",
    newInvoice: "Abrir facturación",
    activeRecords: "Registros activos de la oficina",
  },
} as const;

export default function OfficePage() {
  const { locale: language } = useAlmaLocale();
  const [state, setState] = useState<LoadState>("loading");
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<OfficeOverview | null>(null);
  const [services, setServices] = useState<OfficeService[]>([]);
  const [estimates, setEstimates] = useState<OfficeEstimate[]>([]);
  const [customers, setCustomers] = useState<CustomerPayload>({});
  const [serviceName, setServiceName] = useState("");
  const [serviceRate, setServiceRate] = useState("");
  const copy = COPY[language];

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [
        overviewResponse,
        servicesResponse,
        estimatesResponse,
        customersResponse,
      ] = await Promise.all([
        fetch("/api/office/overview", { cache: "no-store" }),
        fetch("/api/office/services", { cache: "no-store" }),
        fetch("/api/office/estimates", { cache: "no-store" }),
        fetch("/api/office/customers", { cache: "no-store" }),
      ]);
      if (overviewResponse.status === 401) {
        setState("auth");
        return;
      }
      if (!overviewResponse.ok) throw new Error("office_unavailable");
      const overviewPayload = await overviewResponse.json();
      const servicesPayload = await servicesResponse.json();
      const estimatesPayload = await estimatesResponse.json();
      const customersPayload = await customersResponse.json();
      setOverview(overviewPayload.overview ?? null);
      setServices(servicesPayload.services ?? []);
      setEstimates(estimatesPayload.estimates ?? []);
      setCustomers(customersPayload.customers ?? {});
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const metrics = useMemo(
    () => [
      { label: copy.customers, value: overview?.customers ?? 0, icon: Users },
      {
        label: copy.estimates,
        value: overview?.estimates ?? 0,
        icon: FileText,
      },
      {
        label: copy.priceBook,
        value: overview?.services ?? 0,
        icon: Calculator,
      },
      {
        label: copy.invoices,
        value: overview?.unpaidInvoices ?? 0,
        icon: BriefcaseBusiness,
      },
    ],
    [copy, overview],
  );

  async function addService() {
    if (!serviceName.trim()) return;
    const response = await fetch("/api/office/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: serviceName,
        standardRate: Number(serviceRate) || 0,
        unitType: "each",
      }),
    });
    if (response.ok) {
      setServiceName("");
      setServiceRate("");
      await load();
      setTab("priceBook");
    }
  }

  return (
    <AlmaShell language={language} activeWorkspace="apps" title={copy.title}>
      <div className="min-h-full px-4 pb-24 pt-6 text-[#111111] md:px-8 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-6">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280] md:text-base">
              {copy.subtitle}
            </p>
          </header>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {(
              [
                "overview",
                "customers",
                "estimates",
                "invoices",
                "priceBook",
              ] as Tab[]
            ).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setTab(entry)}
                className={`h-10 shrink-0 rounded-xl border px-3 text-sm font-medium ${
                  tab === entry
                    ? "border-black bg-black text-white"
                    : "border-[#E5E7EB] bg-white text-black"
                }`}
              >
                {copy[entry]}
              </button>
            ))}
          </div>

          {state === "loading" ? (
            <StateCard icon={Loader2} text={copy.loading} spinning />
          ) : null}
          {state === "auth" || state === "error" ? (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <p className="text-sm text-[#6B7280]">
                {state === "auth" ? copy.auth : copy.error}
              </p>
              {state === "error" ? (
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-black px-3 text-sm font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  {copy.retry}
                </button>
              ) : null}
            </div>
          ) : null}

          {state === "ready" ? (
            <div className="space-y-4">
              {tab === "overview" ? (
                <>
                  <section className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-[#080B12] p-5 text-white shadow-[0_20px_70px_rgba(15,23,42,0.16)] md:p-7">
                    <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
                    <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
                    <div className="relative">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            {copy.commandCenter}
                          </p>
                          <h2 className="mt-2 text-2xl font-semibold">
                            {copy.operationalPulse}
                          </h2>
                        </div>
                        <Link
                          href="/money"
                          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
                        >
                          <DollarSign className="h-4 w-4" />
                          {copy.money}
                        </Link>
                      </div>
                      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {metrics.map((metric, index) => {
                          const Icon = metric.icon;
                          return (
                            <article
                              key={metric.label}
                              className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur"
                            >
                              <div className="flex items-center justify-between">
                                <Icon
                                  className={`h-4 w-4 ${
                                    [
                                      "text-cyan-300",
                                      "text-violet-300",
                                      "text-amber-300",
                                      "text-emerald-300",
                                    ][index]
                                  }`}
                                />
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                              </div>
                              <p className="mt-5 text-3xl font-semibold">
                                {metric.value}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {metric.label}
                              </p>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]">
                    <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-5">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-cyan-600" />
                        <h2 className="font-semibold">{copy.activeRecords}</h2>
                      </div>
                      <OfficePulseBars metrics={metrics} />
                    </section>
                    <section className="rounded-[24px] border border-[#E5E7EB] bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-violet-600" />
                        <h2 className="font-semibold">
                          {copy.estimatePipeline}
                        </h2>
                      </div>
                      <EstimatePipeline
                        estimates={estimates}
                        emptyLabel={copy.noPipeline}
                      />
                    </section>
                  </div>

                  <section className="grid gap-3 sm:grid-cols-3">
                    <Link
                      href="/invoicing"
                      className="group rounded-2xl border border-[#E5E7EB] bg-white p-4 transition hover:border-cyan-500"
                    >
                      <FileText className="h-4 w-4 text-cyan-600" />
                      <p className="mt-6 text-sm font-medium">
                        {copy.newInvoice}
                      </p>
                      <ArrowRight className="mt-2 h-4 w-4 transition group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/connections?setup=payments"
                      className="group rounded-2xl border border-[#E5E7EB] bg-white p-4 transition hover:border-violet-500"
                    >
                      <DollarSign className="h-4 w-4 text-violet-600" />
                      <p className="mt-6 text-sm font-medium">
                        {copy.connectPayments}
                      </p>
                      <ArrowRight className="mt-2 h-4 w-4 transition group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/money"
                      className="group rounded-2xl border border-[#E5E7EB] bg-white p-4 transition hover:border-emerald-500"
                    >
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <p className="mt-6 text-sm font-medium">{copy.money}</p>
                      <ArrowRight className="mt-2 h-4 w-4 transition group-hover:translate-x-1" />
                    </Link>
                  </section>
                </>
              ) : null}

              {tab === "customers" ? (
                <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                  <h2 className="text-lg font-semibold">{copy.customers}</h2>
                  {[
                    ...(customers.contacts ?? []),
                    ...(customers.companies ?? []),
                  ].length ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {[
                        ...(customers.contacts ?? []),
                        ...(customers.companies ?? []),
                      ].map((customer) => (
                        <div
                          key={customer.id}
                          className="rounded-xl bg-[#F7F7F8] p-3"
                        >
                          <p className="text-sm font-medium">{customer.name}</p>
                          {"email" in customer && customer.email ? (
                            <p className="text-xs text-[#6B7280]">
                              {String(customer.email)}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text={copy.emptyCustomers} />
                  )}
                </section>
              ) : null}

              {tab === "estimates" ? (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                  <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                    <h2 className="text-lg font-semibold">{copy.estimates}</h2>
                    {estimates.length ? (
                      <div className="mt-3 divide-y divide-[#E5E7EB]">
                        {estimates.map((estimate) => (
                          <div
                            key={estimate.id}
                            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {estimate.estimate_number}
                              </p>
                              <p className="text-xs text-[#6B7280]">
                                {estimate.status}
                              </p>
                            </div>
                            <p className="text-sm font-semibold">
                              {estimate.total} {estimate.currency}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState text={copy.emptyEstimates} />
                    )}
                  </section>
                  <div className="min-w-0">
                    <BilingualComposer
                      channel="office"
                      initialText={copy.deliveryDraft}
                      language={language}
                    />
                  </div>
                </div>
              ) : null}

              {tab === "invoices" ? (
                <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                  <a
                    href="/invoicing"
                    className="inline-flex h-10 items-center rounded-xl bg-black px-3 text-sm font-medium text-white"
                  >
                    {copy.openInvoices}
                  </a>
                </section>
              ) : null}

              {tab === "priceBook" ? (
                <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={serviceName}
                      onChange={(event) => setServiceName(event.target.value)}
                      placeholder="Service name"
                      className="min-h-10 min-w-0 flex-1 rounded-xl border border-[#E5E7EB] px-3 text-sm outline-none focus:border-black"
                    />
                    <input
                      value={serviceRate}
                      onChange={(event) => setServiceRate(event.target.value)}
                      placeholder="Rate"
                      inputMode="decimal"
                      className="min-h-10 rounded-xl border border-[#E5E7EB] px-3 text-sm outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={() => void addService()}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-black px-3 text-sm font-medium text-white"
                    >
                      <Plus className="h-4 w-4" />
                      {copy.addService}
                    </button>
                  </div>
                  {services.length ? (
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {services.map((service) => (
                        <div
                          key={service.id}
                          className="rounded-xl bg-[#F7F7F8] p-3"
                        >
                          <p className="text-sm font-medium">{service.name}</p>
                          <p className="text-xs text-[#6B7280]">
                            {service.standard_rate} / {service.unit_type}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState text={copy.emptyServices} />
                  )}
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </AlmaShell>
  );
}

function StateCard({
  icon: Icon,
  spinning,
  text,
}: {
  icon: typeof Loader2;
  spinning?: boolean;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm text-[#6B7280]">
      <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
      {text}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="mt-3 rounded-xl bg-[#F7F7F8] p-3 text-sm text-[#6B7280]">
      {text}
    </p>
  );
}

function OfficePulseBars({
  metrics,
}: {
  metrics: Array<{
    label: string;
    value: number;
    icon: typeof Users;
  }>;
}) {
  const maximum = Math.max(1, ...metrics.map((metric) => metric.value));
  return (
    <div className="mt-5 space-y-4">
      {metrics.map((metric, index) => (
        <div key={metric.label}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span>{metric.label}</span>
            <span className="text-[#6B7280]">{metric.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#F2F4F7]">
            <div
              className={`h-full rounded-full ${
                [
                  "bg-cyan-500",
                  "bg-violet-500",
                  "bg-amber-400",
                  "bg-emerald-500",
                ][index]
              }`}
              style={{
                width: `${metric.value ? Math.max(6, (metric.value / maximum) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EstimatePipeline({
  emptyLabel,
  estimates,
}: {
  emptyLabel: string;
  estimates: OfficeEstimate[];
}) {
  const stages = ["draft", "sent", "viewed", "accepted", "declined"];
  if (!estimates.length)
    return <p className="mt-8 text-sm text-[#6B7280]">{emptyLabel}</p>;

  return (
    <div className="mt-5 grid grid-cols-5 gap-2">
      {stages.map((stage, index) => {
        const count = estimates.filter(
          (estimate) =>
            estimate.status === stage ||
            (stage === "accepted" && estimate.status === "approved"),
        ).length;
        return (
          <div key={stage} className="min-w-0 text-center">
            <div
              className={`mx-auto flex h-14 w-full items-center justify-center rounded-xl ${
                [
                  "bg-slate-100",
                  "bg-cyan-100",
                  "bg-blue-100",
                  "bg-emerald-100",
                  "bg-rose-100",
                ][index]
              }`}
            >
              <span className="text-lg font-semibold">{count}</span>
            </div>
            <p className="mt-2 truncate text-[10px] capitalize text-[#6B7280]">
              {stage}
            </p>
          </div>
        );
      })}
    </div>
  );
}
