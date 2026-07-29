"use client";

import {
  AlertCircle,
  ArrowRight,
  BadgeDollarSign,
  BookOpenCheck,
  ClipboardCheck,
  Loader2,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
import type { BusinessOfficeOverview } from "@/lib/business-office/types";

const copy = {
  en: {
    title: "Reports",
    subtitle:
      "Real operational summaries from your owned records—ready to review, export, or share with your accountant.",
    loading: "Loading reports...",
    error:
      "Reports need the Business Office migration and an authenticated workspace.",
    sales: "Sales & collections",
    salesBody: "Collected, invoiced, and outstanding amounts for the period.",
    customers: "Customers & pipeline",
    customersBody: "Open leads and follow-up work tied to customer records.",
    bookkeeping: "Bookkeeping preparation",
    bookkeepingBody: "Income, expenses, review status, and missing receipts.",
    payroll: "Payroll preparation",
    payrollBody:
      "Pay-period review, employee and contractor records, and export handoff.",
    tax: "Tax readiness",
    taxBody:
      "Checklist completion, uncategorized transactions, receipts, and accountant package preparation.",
    invoices: "Invoice aging",
    invoicesBody: "Outstanding and overdue invoices requiring attention.",
    disclaimer:
      "Reports are organizational records, not tax filings, audited financial statements, or licensed accounting advice.",
    open: "Open source records",
    score: "readiness",
  },
  es: {
    title: "Reportes",
    subtitle:
      "Resúmenes operativos reales de tus registros, listos para revisar, exportar o compartir con tu contador.",
    loading: "Cargando reportes...",
    error:
      "Los reportes requieren la migración de Oficina Empresarial y una sesión autenticada.",
    sales: "Ventas y cobros",
    salesBody: "Cantidades cobradas, facturadas y pendientes del período.",
    customers: "Clientes y pipeline",
    customersBody: "Prospectos abiertos y seguimientos ligados a clientes.",
    bookkeeping: "Preparación contable",
    bookkeepingBody: "Ingresos, gastos, revisión y recibos faltantes.",
    payroll: "Preparación de nómina",
    payrollBody:
      "Revisión del período, empleados, contratistas y entrega al proveedor.",
    tax: "Preparación de impuestos",
    taxBody:
      "Lista de control, transacciones sin categoría, recibos y paquete para el contador.",
    invoices: "Antigüedad de facturas",
    invoicesBody: "Facturas pendientes y vencidas que requieren atención.",
    disclaimer:
      "Los reportes son registros organizativos, no declaraciones fiscales, estados auditados ni asesoría contable profesional.",
    open: "Abrir registros fuente",
    score: "de preparación",
  },
} as const;

function currency(value: number, locale: "en" | "es") {
  return new Intl.NumberFormat(locale === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ReportsPage() {
  const { locale, setLocale } = useAlmaLocale();
  const t = copy[locale];
  const [overview, setOverview] = useState<BusinessOfficeOverview | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/business-office/overview", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.overview) throw new Error("unavailable");
        setOverview(payload.overview);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  const cards = overview
    ? [
        {
          title: t.sales,
          body: t.salesBody,
          value: currency(overview.money.collected, locale),
          href: "/money",
          icon: BadgeDollarSign,
        },
        {
          title: t.customers,
          body: t.customersBody,
          value: String(overview.attention.newLeads),
          href: "/customers",
          icon: UsersRound,
        },
        {
          title: t.bookkeeping,
          body: t.bookkeepingBody,
          value: String(overview.attention.transactionsToReview),
          href: "/money",
          icon: BookOpenCheck,
        },
        {
          title: t.payroll,
          body: t.payrollBody,
          value: "Prep",
          href: "/money",
          icon: ClipboardCheck,
        },
        {
          title: t.tax,
          body: t.taxBody,
          value: `${overview.taxReadiness.score}% ${t.score}`,
          href: "/money",
          icon: ReceiptText,
        },
        {
          title: t.invoices,
          body: t.invoicesBody,
          value: String(overview.attention.overdueInvoices),
          href: "/invoicing",
          icon: AlertCircle,
        },
      ]
    : [];

  return (
    <AlmaShell
      language={locale}
      activeWorkspace="reports"
      title={t.title}
      onLanguageChange={setLocale}
    >
      <div className="mx-auto max-w-7xl p-4 pb-24 md:p-8">
        <p className="max-w-3xl text-lg text-[#667085]">{t.subtitle}</p>
        {!overview && !failed ? (
          <p className="mt-6 rounded-2xl bg-white p-6 text-sm text-[#667085]">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            {t.loading}
          </p>
        ) : null}
        {failed ? (
          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            {t.error}
          </p>
        ) : null}
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ title, body, value, href, icon: Icon }) => (
            <a
              key={title}
              href={href}
              className="rounded-[24px] border border-[#E4E7EC] bg-white p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <Icon className="h-5 w-5" />
                <span className="text-xl font-medium">{value}</span>
              </div>
              <h2 className="mt-8 text-lg font-medium">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#667085]">{body}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
                {t.open}
                <ArrowRight className="h-4 w-4" />
              </span>
            </a>
          ))}
        </div>
        <p className="mt-6 text-xs leading-5 text-[#667085]">{t.disclaimer}</p>
      </div>
    </AlmaShell>
  );
}
