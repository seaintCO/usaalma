"use client";

import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  Receipt,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  BusinessReceipt,
  BusinessReportSnapshot,
  PayrollEntry,
  PayrollPeriod,
  PayrollPerson,
  TaxChecklist,
} from "@/lib/business-office/types";

type Language = "en" | "es";
type Section = "receipts" | "payroll" | "tax" | "reports";

const copy = {
  en: {
    receipts: "Receipts",
    payroll: "Payroll prep",
    tax: "Tax readiness",
    reports: "Reports & exports",
    addReceipt: "Upload or enter receipt",
    merchant: "Merchant",
    amount: "Amount",
    date: "Date",
    category: "Category",
    file: "PDF or image (optional)",
    saveReceipt: "Save receipt",
    noReceipts: "No receipts yet.",
    review: "Mark reviewed",
    addWorker: "Add worker",
    workerName: "Worker name",
    employee: "Employee",
    contractor: "Contractor",
    hourly: "Hourly",
    salary: "Salary reference",
    project: "Project",
    rate: "Rate",
    createPeriod: "Create pay period",
    start: "Period start",
    end: "Period end",
    payDate: "Pay date",
    noPayroll: "Add a worker and pay period to prepare payroll records.",
    addEntry: "Add pay entry",
    regularHours: "Regular hours",
    overtime: "Overtime hours",
    bonus: "Bonus",
    reimbursement: "Reimbursement",
    gross: "Prepared gross",
    approve: "Approve preparation",
    checklist: "Tax preparation checklist",
    saveChecklist: "Save checklist",
    taxDisclaimer:
      "ALMA organizes records for review. It does not file taxes or provide licensed tax advice.",
    operatingIncome: "Operating income",
    operatingExpenses: "Operating expenses",
    operatingProfit: "Estimated operating profit",
    invoiceAging: "Invoice aging",
    readiness: "Readiness items",
    exportTransactions: "Transactions CSV",
    exportPL: "P&L preparation CSV",
    exportContractors: "Contractor CSV",
    loading: "Loading bookkeeping workspace...",
    unavailable:
      "This bookkeeping section is unavailable until its migration is applied.",
    saving: "Saving...",
  },
  es: {
    receipts: "Recibos",
    payroll: "Preparación de nómina",
    tax: "Preparación fiscal",
    reports: "Reportes y exportaciones",
    addReceipt: "Subir o ingresar recibo",
    merchant: "Comercio",
    amount: "Cantidad",
    date: "Fecha",
    category: "Categoría",
    file: "PDF o imagen (opcional)",
    saveReceipt: "Guardar recibo",
    noReceipts: "Aún no hay recibos.",
    review: "Marcar revisado",
    addWorker: "Agregar trabajador",
    workerName: "Nombre",
    employee: "Empleado",
    contractor: "Contratista",
    hourly: "Por hora",
    salary: "Referencia salarial",
    project: "Proyecto",
    rate: "Tarifa",
    createPeriod: "Crear período",
    start: "Inicio",
    end: "Final",
    payDate: "Fecha de pago",
    noPayroll:
      "Agrega un trabajador y período para preparar registros de nómina.",
    addEntry: "Agregar entrada de pago",
    regularHours: "Horas regulares",
    overtime: "Horas extra",
    bonus: "Bono",
    reimbursement: "Reembolso",
    gross: "Bruto preparado",
    approve: "Aprobar preparación",
    checklist: "Lista de preparación fiscal",
    saveChecklist: "Guardar lista",
    taxDisclaimer:
      "ALMA organiza registros para revisión. No presenta impuestos ni ofrece asesoría fiscal profesional.",
    operatingIncome: "Ingresos operativos",
    operatingExpenses: "Gastos operativos",
    operatingProfit: "Ganancia operativa estimada",
    invoiceAging: "Antigüedad de facturas",
    readiness: "Pendientes de preparación",
    exportTransactions: "CSV de transacciones",
    exportPL: "CSV de preparación P&G",
    exportContractors: "CSV de contratistas",
    loading: "Cargando espacio contable...",
    unavailable:
      "Esta sección requiere que se aplique la migración correspondiente.",
    saving: "Guardando...",
  },
} as const;

const taxLabels: Record<
  string,
  {
    en: string;
    es: string;
  }
> = {
  transactions_reviewed: {
    en: "Transactions reviewed",
    es: "Transacciones revisadas",
  },
  receipts_attached: {
    en: "Receipts attached",
    es: "Recibos adjuntos",
  },
  income_reconciled: {
    en: "Income reconciled",
    es: "Ingresos conciliados",
  },
  expenses_categorized: {
    en: "Expenses categorized",
    es: "Gastos categorizados",
  },
  contractor_w9s: {
    en: "Contractor W-9s collected",
    es: "Formularios W-9 recopilados",
  },
  payroll_reviewed: {
    en: "Payroll preparation reviewed",
    es: "Preparación de nómina revisada",
  },
  invoices_reconciled: {
    en: "Invoices reconciled",
    es: "Facturas conciliadas",
  },
  accountant_package: {
    en: "Accountant package exported",
    es: "Paquete para el contador exportado",
  },
};

function currency(value: number | null | undefined, language: Language) {
  return new Intl.NumberFormat(language === "es" ? "es-US" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="min-w-0 rounded-xl border border-[#D0D5DD] bg-white px-3 py-2.5 text-sm outline-none focus:border-black"
    />
  );
}

export default function BookkeepingWorkspace({
  language,
}: {
  language: Language;
}) {
  const t = copy[language];
  const [section, setSection] = useState<Section>("receipts");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipts, setReceipts] = useState<BusinessReceipt[]>([]);
  const [people, setPeople] = useState<PayrollPerson[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [tax, setTax] = useState<TaxChecklist | null>(null);
  const [report, setReport] = useState<BusinessReportSnapshot | null>(null);
  const [receiptForm, setReceiptForm] = useState({
    merchant: "",
    amount: "",
    receiptDate: new Date().toISOString().slice(0, 10),
    category: "",
  });
  const [workerForm, setWorkerForm] = useState({
    displayName: "",
    workerType: "employee",
    payType: "hourly",
    rate: "",
  });
  const [periodForm, setPeriodForm] = useState({
    periodStart: "",
    periodEnd: "",
    payDate: "",
  });
  const [entryForm, setEntryForm] = useState({
    periodId: "",
    personId: "",
    regularHours: "",
    overtimeHours: "",
    bonuses: "",
    reimbursements: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [receiptResponse, payrollResponse, taxResponse, reportResponse] =
        await Promise.all([
          fetch("/api/business-office/receipts", { cache: "no-store" }),
          fetch("/api/business-office/payroll", { cache: "no-store" }),
          fetch("/api/business-office/tax", { cache: "no-store" }),
          fetch("/api/business-office/reports", { cache: "no-store" }),
        ]);
      const [receiptPayload, payrollPayload, taxPayload, reportPayload] =
        await Promise.all([
          receiptResponse.json(),
          payrollResponse.json(),
          taxResponse.json(),
          reportResponse.json(),
        ]);
      if (
        !receiptResponse.ok ||
        !payrollResponse.ok ||
        !taxResponse.ok ||
        !reportResponse.ok
      )
        throw new Error("unavailable");
      setReceipts(receiptPayload.receipts ?? []);
      setPeople(payrollPayload.people ?? []);
      setPeriods(payrollPayload.periods ?? []);
      setEntries(payrollPayload.entries ?? []);
      setTax(taxPayload.checklist ?? null);
      setReport(reportPayload.report ?? null);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createReceipt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    try {
      const response = await fetch("/api/business-office/receipts", {
        method: "POST",
        body: new FormData(form),
      });
      if (!response.ok) throw new Error("failed");
      setReceiptForm({
        merchant: "",
        amount: "",
        receiptDate: new Date().toISOString().slice(0, 10),
        category: "",
      });
      form.reset();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function payrollAction(body: Record<string, unknown>) {
    setSaving(true);
    try {
      const response = await fetch("/api/business-office/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("failed");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function saveTax(nextTax: TaxChecklist) {
    setSaving(true);
    try {
      const response = await fetch("/api/business-office/tax", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxYear: nextTax.tax_year,
          quarter: nextTax.quarter,
          checklist: nextTax.checklist,
          notes: nextTax.notes,
        }),
      });
      if (!response.ok) throw new Error("failed");
      await load();
    } finally {
      setSaving(false);
    }
  }

  const selectedPeriod = periods.find(
    (period) => period.id === entryForm.periodId,
  );
  const selectedPeriodEntries = useMemo(
    () =>
      selectedPeriod
        ? entries.filter((entry) => entry.period_id === selectedPeriod.id)
        : [],
    [entries, selectedPeriod],
  );

  return (
    <section className="mt-8 rounded-[28px] border border-[#E4E7EC] bg-[#F8F9FA] p-3 md:p-5">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {(
          [
            ["receipts", t.receipts, Receipt],
            ["payroll", t.payroll, Users],
            ["tax", t.tax, ShieldCheck],
            ["reports", t.reports, FileSpreadsheet],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSection(value)}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm ${
              section === value
                ? "bg-black text-white"
                : "border border-[#E4E7EC] bg-white"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="p-10 text-center text-sm text-[#667085]">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          {t.loading}
        </p>
      ) : failed ? (
        <p className="m-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          {t.unavailable}
        </p>
      ) : null}

      {!loading && !failed && section === "receipts" ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-[380px_1fr]">
          <form
            onSubmit={(event) => void createReceipt(event)}
            className="rounded-2xl border border-[#E4E7EC] bg-white p-5"
          >
            <h3 className="font-medium">{t.addReceipt}</h3>
            <div className="mt-4 grid gap-3">
              <Field
                name="merchant"
                placeholder={t.merchant}
                value={receiptForm.merchant}
                onChange={(event) =>
                  setReceiptForm((current) => ({
                    ...current,
                    merchant: event.target.value,
                  }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t.amount}
                  value={receiptForm.amount}
                  onChange={(event) =>
                    setReceiptForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
                <Field
                  name="receiptDate"
                  type="date"
                  value={receiptForm.receiptDate}
                  onChange={(event) =>
                    setReceiptForm((current) => ({
                      ...current,
                      receiptDate: event.target.value,
                    }))
                  }
                />
              </div>
              <Field
                name="category"
                placeholder={t.category}
                value={receiptForm.category}
                onChange={(event) =>
                  setReceiptForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
              />
              <label className="rounded-xl border border-dashed border-[#98A2B3] p-4 text-xs text-[#667085]">
                <Upload className="mr-2 inline h-4 w-4" />
                {t.file}
                <input
                  name="file"
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  className="mt-3 block w-full text-xs"
                />
              </label>
            </div>
            <button
              disabled={saving}
              className="mt-4 rounded-full bg-black px-5 py-2.5 text-sm text-white disabled:opacity-50"
            >
              {saving ? t.saving : t.saveReceipt}
            </button>
          </form>
          <div className="overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white">
            {receipts.length ? (
              <div className="divide-y divide-[#EAECF0]">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex flex-wrap items-center gap-3 p-4"
                  >
                    <Receipt className="h-4 w-4" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {receipt.merchant ||
                          receipt.original_filename ||
                          t.receipts}
                      </p>
                      <p className="text-xs text-[#667085]">
                        {receipt.receipt_date || "—"} ·{" "}
                        {receipt.category || t.category}
                      </p>
                    </div>
                    <span className="text-sm font-medium">
                      {currency(receipt.amount, language)}
                    </span>
                    {receipt.review_status === "needs_review" ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch(
                            `/api/business-office/receipts/${receipt.id}`,
                            {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                reviewStatus: "reviewed",
                                category: receipt.category,
                              }),
                            },
                          );
                          await load();
                        }}
                        className="rounded-full border px-3 py-1.5 text-xs"
                      >
                        {t.review}
                      </button>
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-10 text-center text-sm text-[#667085]">
                {t.noReceipts}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {!loading && !failed && section === "payroll" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#E4E7EC] bg-white p-5">
            <h3 className="font-medium">{t.addWorker}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field
                placeholder={t.workerName}
                value={workerForm.displayName}
                onChange={(event) =>
                  setWorkerForm((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
              <select
                value={workerForm.workerType}
                onChange={(event) =>
                  setWorkerForm((current) => ({
                    ...current,
                    workerType: event.target.value,
                  }))
                }
                className="rounded-xl border px-3 py-2.5 text-sm"
              >
                <option value="employee">{t.employee}</option>
                <option value="contractor">{t.contractor}</option>
              </select>
              <select
                value={workerForm.payType}
                onChange={(event) =>
                  setWorkerForm((current) => ({
                    ...current,
                    payType: event.target.value,
                  }))
                }
                className="rounded-xl border px-3 py-2.5 text-sm"
              >
                <option value="hourly">{t.hourly}</option>
                <option value="salary">{t.salary}</option>
                <option value="project">{t.project}</option>
              </select>
              <Field
                type="number"
                min="0"
                step="0.01"
                placeholder={t.rate}
                value={workerForm.rate}
                onChange={(event) =>
                  setWorkerForm((current) => ({
                    ...current,
                    rate: event.target.value,
                  }))
                }
              />
            </div>
            <button
              type="button"
              disabled={saving || !workerForm.displayName}
              onClick={() =>
                void payrollAction({ action: "create_person", ...workerForm })
              }
              className="mt-4 rounded-full bg-black px-4 py-2 text-sm text-white"
            >
              <Plus className="mr-1 inline h-4 w-4" /> {t.addWorker}
            </button>
            <div className="mt-5 divide-y">
              {people.map((person) => (
                <div
                  key={person.id}
                  className="flex justify-between py-3 text-sm"
                >
                  <span>
                    {person.display_name} ·{" "}
                    {person.worker_type === "contractor"
                      ? t.contractor
                      : t.employee}
                  </span>
                  <span>{currency(person.rate, language)}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-[#E4E7EC] bg-white p-5">
            <h3 className="font-medium">{t.createPeriod}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field
                type="date"
                aria-label={t.start}
                value={periodForm.periodStart}
                onChange={(event) =>
                  setPeriodForm((current) => ({
                    ...current,
                    periodStart: event.target.value,
                  }))
                }
              />
              <Field
                type="date"
                aria-label={t.end}
                value={periodForm.periodEnd}
                onChange={(event) =>
                  setPeriodForm((current) => ({
                    ...current,
                    periodEnd: event.target.value,
                  }))
                }
              />
              <Field
                type="date"
                aria-label={t.payDate}
                value={periodForm.payDate}
                onChange={(event) =>
                  setPeriodForm((current) => ({
                    ...current,
                    payDate: event.target.value,
                  }))
                }
              />
            </div>
            <button
              type="button"
              disabled={
                saving || !periodForm.periodStart || !periodForm.periodEnd
              }
              onClick={() =>
                void payrollAction({ action: "create_period", ...periodForm })
              }
              className="mt-4 rounded-full bg-black px-4 py-2 text-sm text-white"
            >
              {t.createPeriod}
            </button>
            <div className="mt-5 grid gap-2">
              {periods.map((period) => (
                <button
                  type="button"
                  key={period.id}
                  onClick={() =>
                    setEntryForm((current) => ({
                      ...current,
                      periodId: period.id,
                    }))
                  }
                  className={`rounded-xl border p-3 text-left text-sm ${
                    entryForm.periodId === period.id ? "border-black" : ""
                  }`}
                >
                  {period.period_start} – {period.period_end}
                  <span className="float-right">
                    {currency(period.gross_pay, language)}
                  </span>
                </button>
              ))}
            </div>
          </section>
          {selectedPeriod && people.length ? (
            <section className="rounded-2xl border border-[#E4E7EC] bg-white p-5 lg:col-span-2">
              <h3 className="font-medium">{t.addEntry}</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-6">
                <select
                  value={entryForm.personId}
                  onChange={(event) =>
                    setEntryForm((current) => ({
                      ...current,
                      personId: event.target.value,
                    }))
                  }
                  className="rounded-xl border px-3 py-2.5 text-sm"
                >
                  <option value="">{t.workerName}</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.display_name}
                    </option>
                  ))}
                </select>
                {(
                  [
                    ["regularHours", t.regularHours],
                    ["overtimeHours", t.overtime],
                    ["bonuses", t.bonus],
                    ["reimbursements", t.reimbursement],
                  ] as const
                ).map(([key, placeholder]) => (
                  <Field
                    key={key}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={placeholder}
                    value={entryForm[key]}
                    onChange={(event) =>
                      setEntryForm((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                  />
                ))}
                <button
                  type="button"
                  disabled={saving || !entryForm.personId}
                  onClick={() =>
                    void payrollAction({ action: "add_entry", ...entryForm })
                  }
                  className="rounded-xl bg-black px-3 py-2.5 text-sm text-white"
                >
                  {t.addEntry}
                </button>
              </div>
              <div className="mt-5 divide-y">
                {selectedPeriodEntries.map((entry) => {
                  const person = people.find(
                    (item) => item.id === entry.person_id,
                  );
                  return (
                    <div
                      key={entry.id}
                      className="flex justify-between py-3 text-sm"
                    >
                      <span>{person?.display_name ?? t.workerName}</span>
                      <span>
                        {t.gross}:{" "}
                        {currency(entry.calculated_gross_pay, language)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {selectedPeriod.status !== "approved" ? (
                <button
                  type="button"
                  onClick={() =>
                    void payrollAction({
                      action: "update_period",
                      periodId: selectedPeriod.id,
                      status: "approved",
                    })
                  }
                  className="mt-4 rounded-full border border-black px-4 py-2 text-sm"
                >
                  {t.approve}
                </button>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}

      {!loading && !failed && section === "tax" && tax ? (
        <section className="mt-4 rounded-2xl border border-[#E4E7EC] bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{t.checklist}</h3>
            <strong>
              {tax.completed_items}/{tax.total_items}
            </strong>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {tax.checklist.map((item, index) => (
              <label
                key={item.key}
                className="flex items-center gap-3 rounded-xl border p-4 text-sm"
              >
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(event) =>
                    setTax((current) =>
                      current
                        ? {
                            ...current,
                            checklist: current.checklist.map(
                              (entry, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...entry,
                                      completed: event.target.checked,
                                    }
                                  : entry,
                            ),
                          }
                        : current,
                    )
                  }
                />
                {taxLabels[item.key]?.[language] ?? item.label}
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveTax(tax)}
            className="mt-5 rounded-full bg-black px-5 py-2.5 text-sm text-white"
          >
            {saving ? t.saving : t.saveChecklist}
          </button>
          <p className="mt-5 text-xs leading-5 text-[#667085]">
            {t.taxDisclaimer}
          </p>
        </section>
      ) : null}

      {!loading && !failed && section === "reports" && report ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {[
            [t.operatingIncome, report.profitLoss.operatingIncome],
            [t.operatingExpenses, report.profitLoss.operatingExpenses],
            [t.operatingProfit, report.profitLoss.estimatedOperatingProfit],
          ].map(([label, value]) => (
            <section
              key={String(label)}
              className="rounded-2xl border border-[#E4E7EC] bg-white p-5"
            >
              <p className="text-sm text-[#667085]">{label}</p>
              <p className="mt-2 text-2xl font-medium">
                {currency(Number(value), language)}
              </p>
            </section>
          ))}
          <section className="rounded-2xl border border-[#E4E7EC] bg-white p-5 lg:col-span-2">
            <h3 className="font-medium">{t.invoiceAging}</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {Object.entries(report.invoiceAging).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#F9FAFB] p-3">
                  <p className="text-xs text-[#667085]">{label}</p>
                  <p className="mt-1 font-medium">
                    {currency(value, language)}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-[#E4E7EC] bg-white p-5">
            <h3 className="font-medium">{t.readiness}</h3>
            <ul className="mt-4 space-y-2 text-sm text-[#667085]">
              <li>{report.readiness.transactionsToReview} transactions</li>
              <li>{report.readiness.missingReceipts} receipts</li>
              <li>{report.readiness.contractorsMissingW9} contractor W-9s</li>
              <li>{report.readiness.taxScore}% tax readiness</li>
            </ul>
          </section>
          <section className="rounded-2xl border border-[#E4E7EC] bg-white p-5 lg:col-span-3">
            <div className="flex flex-wrap gap-3">
              {[
                ["transactions", t.exportTransactions],
                ["profit-loss", t.exportPL],
                ["contractors", t.exportContractors],
              ].map(([type, label]) => (
                <a
                  key={type}
                  href={`/api/business-office/reports?format=csv&type=${type}`}
                  className="inline-flex items-center gap-2 rounded-full border border-black px-4 py-2 text-sm"
                >
                  <Download className="h-4 w-4" />
                  {label}
                </a>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
