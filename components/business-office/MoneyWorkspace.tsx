"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  FileWarning,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  Receipt,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BusinessOfficeOverview,
  BusinessTransactionDirection,
} from "@/lib/business-office/types";
import BookkeepingWorkspace from "./BookkeepingWorkspace";

type Language = "en" | "es";
type State = "loading" | "ready" | "auth" | "migration" | "error";

const copy = {
  en: {
    subtitle:
      "Organize income, expenses, receipts, invoices, payroll preparation, and accountant-ready records.",
    collected: "Collected this month",
    income: "Posted income",
    expenses: "Expenses",
    profit: "Estimated operating profit",
    outstanding: "Outstanding invoices",
    review: "Transactions to review",
    transactions: "Recent transactions",
    add: "Add transaction",
    incomeDirection: "Income",
    expenseDirection: "Expense",
    description: "Description",
    merchant: "Merchant",
    amount: "Amount",
    category: "Category",
    save: "Save transaction",
    saving: "Saving...",
    empty: "No transactions have been entered for this month.",
    markReviewed: "Mark reviewed",
    setup:
      "Your financial office needs one owner setup step before Money can open.",
    finishSetup: "Finish setup",
    unavailable: "Money is temporarily unavailable.",
    signIn: "Sign in to view business finances.",
    retry: "Retry",
    invoices: "Invoices",
    estimates: "Estimates",
    receipts: "Receipts",
    payroll: "Payroll preparation",
    tax: "Tax preparation",
    quickbooks: "QuickBooks",
    connected: "Connected",
    disconnected: "Not connected",
    disclaimer:
      "ALMA organizes bookkeeping records. It does not file taxes or provide licensed accounting advice.",
  },
  es: {
    subtitle:
      "Organiza ingresos, gastos, recibos, facturas, preparación de nómina y registros para tu contador.",
    collected: "Cobrado este mes",
    income: "Ingresos registrados",
    expenses: "Gastos",
    profit: "Ganancia operativa estimada",
    outstanding: "Facturas pendientes",
    review: "Transacciones por revisar",
    transactions: "Transacciones recientes",
    add: "Agregar transacción",
    incomeDirection: "Ingreso",
    expenseDirection: "Gasto",
    description: "Descripción",
    merchant: "Comercio",
    amount: "Cantidad",
    category: "Categoría",
    save: "Guardar transacción",
    saving: "Guardando...",
    empty: "No hay transacciones registradas para este mes.",
    markReviewed: "Marcar revisada",
    setup:
      "Tu oficina financiera necesita un paso de configuración del propietario antes de abrir Dinero.",
    finishSetup: "Finalizar configuración",
    unavailable: "Dinero no está disponible temporalmente.",
    signIn: "Inicia sesión para ver las finanzas del negocio.",
    retry: "Reintentar",
    invoices: "Facturas",
    estimates: "Estimados",
    receipts: "Recibos",
    payroll: "Preparación de nómina",
    tax: "Preparación de impuestos",
    quickbooks: "QuickBooks",
    connected: "Conectado",
    disconnected: "Sin conexión",
    disclaimer:
      "ALMA organiza registros contables. No presenta impuestos ni ofrece asesoría contable profesional.",
  },
} as const;

function money(value: number, language: Language) {
  return new Intl.NumberFormat(language === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function MoneyWorkspace({ language }: { language: Language }) {
  const t = copy[language];
  const [state, setState] = useState<State>("loading");
  const [overview, setOverview] = useState<BusinessOfficeOverview | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    direction: "expense" as BusinessTransactionDirection,
    description: "",
    merchant: "",
    amount: "",
    category: "",
  });

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/business-office/overview", {
        cache: "no-store",
      });
      const payload = await response.json();
      if (response.status === 401) setState("auth");
      else if (
        response.status === 503 &&
        payload?.error?.code === "business_office_schema_unavailable"
      )
        setState("migration");
      else if (!response.ok || !payload?.overview) setState("error");
      else {
        setOverview(payload.overview);
        setState("ready");
      }
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTransaction() {
    if (!form.description.trim() || !Number.isFinite(Number(form.amount)))
      return;
    setSaving(true);
    try {
      const response = await fetch("/api/business-office/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
          transactionType: "operating",
        }),
      });
      if (!response.ok) throw new Error("save_failed");
      setForm({
        direction: "expense",
        description: "",
        merchant: "",
        amount: "",
        category: "",
      });
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function markReviewed(id: string) {
    const response = await fetch(`/api/business-office/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus: "reviewed" }),
    });
    if (response.ok) await load();
  }

  const cards = useMemo(
    () =>
      overview
        ? [
            [t.collected, overview.money.collected],
            [t.income, overview.money.postedIncome],
            [t.expenses, overview.money.expenses],
            [t.profit, overview.money.estimatedOperatingProfit],
          ]
        : [],
    [overview, t],
  );

  if (state !== "ready" || !overview) {
    const message =
      state === "auth"
        ? t.signIn
        : state === "migration"
          ? t.setup
          : state === "error"
            ? t.unavailable
            : null;
    return (
      <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8">
        <div className="rounded-[24px] border border-[#E4E7EC] bg-white p-8 text-sm text-[#667085]">
          {state === "loading" ? (
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          ) : (
            <AlertCircle className="mr-2 inline h-4 w-4" />
          )}
          {message}
          {state === "migration" ? (
            <Link
              href="/onboarding?resume=money"
              className="ml-4 inline-flex rounded-full bg-black px-4 py-2 text-white"
            >
              {t.finishSetup}
            </Link>
          ) : state !== "loading" ? (
            <button
              type="button"
              onClick={() => void load()}
              className="ml-4 rounded-full bg-black px-4 py-2 text-white"
            >
              {t.retry}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 pb-24 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <p className="max-w-3xl text-[#667085]">{t.subtitle}</p>
        <button
          type="button"
          onClick={() => setShowForm((shown) => !shown)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          {t.add}
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <section
            key={String(label)}
            className="rounded-[22px] border border-[#E4E7EC] bg-white p-5"
          >
            <p className="text-sm text-[#667085]">{label}</p>
            <p className="mt-2 text-2xl font-medium">
              {money(Number(value), language)}
            </p>
          </section>
        ))}
      </div>

      {showForm ? (
        <section className="mt-5 rounded-[24px] border border-[#D0D5DD] bg-white p-5">
          <div className="grid gap-3 md:grid-cols-5">
            <select
              value={form.direction}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  direction: event.target.value as BusinessTransactionDirection,
                }))
              }
              className="rounded-xl border border-[#D0D5DD] px-3 py-2.5"
            >
              <option value="expense">{t.expenseDirection}</option>
              <option value="income">{t.incomeDirection}</option>
            </select>
            {(["description", "merchant", "amount", "category"] as const).map(
              (field) => (
                <input
                  key={field}
                  value={form[field]}
                  type={field === "amount" ? "number" : "text"}
                  min={field === "amount" ? "0" : undefined}
                  step={field === "amount" ? "0.01" : undefined}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  placeholder={t[field]}
                  className="rounded-xl border border-[#D0D5DD] px-3 py-2.5"
                />
              ),
            )}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void createTransaction()}
            className="mt-4 rounded-full bg-black px-5 py-2.5 text-sm text-white disabled:opacity-50"
          >
            {saving ? t.saving : t.save}
          </button>
        </section>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          { label: t.invoices, href: "/invoicing", Icon: WalletCards },
          { label: t.estimates, href: "/office", Icon: FileWarning },
          { label: t.receipts, href: "/money#receipts", Icon: Receipt },
          { label: t.payroll, href: "/reports#payroll", Icon: Landmark },
          { label: t.tax, href: "/reports#tax", Icon: FileWarning },
          { label: t.quickbooks, href: "/connections", Icon: RefreshCw },
        ].map(({ label, href, Icon }) => (
          <Link
            key={label}
            href={href}
            className="rounded-[18px] border border-[#E4E7EC] bg-white p-4 text-sm font-medium transition hover:border-black"
          >
            <Icon className="mb-5 h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      <section className="mt-6 rounded-[24px] border border-[#E4E7EC] bg-white">
        <div className="flex items-center justify-between border-b border-[#E4E7EC] p-5">
          <div>
            <h2 className="text-lg font-medium">{t.transactions}</h2>
            <p className="mt-1 text-xs text-[#667085]">
              {overview.attention.transactionsToReview} {t.review.toLowerCase()}
            </p>
          </div>
          <p className="text-sm">
            {t.quickbooks}:{" "}
            <span
              className={
                overview.quickBooks.status === "connected"
                  ? "text-emerald-700"
                  : "text-[#667085]"
              }
            >
              {overview.quickBooks.status === "connected"
                ? t.connected
                : t.disconnected}
            </span>
          </p>
        </div>
        {overview.transactions.length ? (
          <div className="divide-y divide-[#EAECF0]">
            {overview.transactions.slice(0, 25).map((transaction) => (
              <div key={transaction.id} className="flex items-center gap-3 p-4">
                <span className="rounded-xl bg-[#F2F4F7] p-2">
                  {transaction.direction === "income" ? (
                    <ArrowDownLeft className="h-4 w-4 text-emerald-700" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-rose-700" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-[#667085]">
                    {transaction.transaction_date} ·{" "}
                    {transaction.category || t.review}
                  </p>
                </div>
                <p className="text-sm font-medium">
                  {transaction.direction === "expense" ? "−" : "+"}
                  {money(transaction.amount, language)}
                </p>
                {transaction.review_status === "needs_review" ? (
                  <button
                    type="button"
                    onClick={() => void markReviewed(transaction.id)}
                    title={t.markReviewed}
                    className="rounded-full border border-[#D0D5DD] p-2 hover:bg-[#F9FAFB]"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-[#667085]">{t.empty}</p>
        )}
      </section>
      <BookkeepingWorkspace language={language} />
      <p className="mt-5 text-xs leading-5 text-[#667085]">{t.disclaimer}</p>
    </div>
  );
}
