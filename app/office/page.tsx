"use client";

import {
  BriefcaseBusiness,
  Calculator,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
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
                <section className="grid gap-3 md:grid-cols-4">
                  {metrics.map((metric) => {
                    const Icon = metric.icon;
                    return (
                      <article
                        key={metric.label}
                        className="rounded-2xl border border-[#E5E7EB] bg-white p-4"
                      >
                        <Icon className="h-4 w-4" />
                        <p className="mt-3 text-2xl font-semibold">
                          {metric.value}
                        </p>
                        <p className="text-sm text-[#6B7280]">{metric.label}</p>
                      </article>
                    );
                  })}
                </section>
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
