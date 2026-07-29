"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";
import { DASHBOARD_ROUTE } from "@/lib/platform/workspaceRoutes";

type Invoice = {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email?: string;
  due_date?: string;
  status: string;
  total: number;
  currency: string;
  notes?: string;
  terms?: string;
  tax_amount?: number;
  discount_amount?: number;
  invoice_line_items?: Line[];
};
type Line = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};
type PaymentProvider = "stripe_connect" | "paypal_business";
type PaymentLink = {
  id: string;
  provider: PaymentProvider;
  provider_checkout_url: string;
  status: string;
  amount: number;
  currency: string;
  paid_at?: string | null;
};
const copy = {
  en: {
    title: "Invoicing",
    new: "New draft",
    search: "Search invoices",
    empty: "No invoices yet.",
    client: "Client",
    amount: "Amount",
    status: "Status",
    save: "Save draft",
    items: "Line items",
    add: "Add line",
    download: "Download PDF",
    email: "Email sending is unavailable until an email provider is connected.",
    retry: "Retry",
    delete: "Delete draft",
    duplicate: "Duplicate",
    send: "Send",
    markPaid: "Mark paid",
    deleteLine: "Delete line",
    loading: "Loading invoices…",
    error: "Invoices could not be loaded.",
    paymentLinks: "Customer payment links",
    paymentBody:
      "Connect your own Stripe or PayPal account. Paid links update this invoice and Money automatically.",
    createStripe: "Create Stripe link",
    createPayPal: "Create PayPal link",
    connectPayments: "Connect Stripe or PayPal",
    copyLink: "Copy link",
    openLink: "Open",
    paymentCreating: "Creating secure link…",
    paymentError: "The payment link could not be created.",
    paymentSuccess:
      "Payment completed. ALMA is reconciling the invoice and Money records.",
    paymentCancelled: "Payment was cancelled. The invoice was not changed.",
    paymentFailed:
      "The payment could not be confirmed. Review the provider activity before retrying.",
  },
  es: {
    title: "Facturación",
    new: "Nuevo borrador",
    search: "Buscar facturas",
    empty: "Aún no hay facturas.",
    client: "Cliente",
    amount: "Importe",
    status: "Estado",
    save: "Guardar borrador",
    items: "Conceptos",
    add: "Agregar concepto",
    download: "Descargar PDF",
    email:
      "El envío de correo no está disponible hasta conectar un proveedor de email.",
    retry: "Reintentar",
    delete: "Eliminar borrador",
    duplicate: "Duplicar",
    send: "Enviar",
    markPaid: "Marcar como pagada",
    deleteLine: "Eliminar concepto",
    loading: "Cargando facturas…",
    error: "No se pudieron cargar las facturas.",
    paymentLinks: "Enlaces de pago para clientes",
    paymentBody:
      "Conecta tu propia cuenta de Stripe o PayPal. Los pagos actualizan la factura y Dinero automáticamente.",
    createStripe: "Crear enlace de Stripe",
    createPayPal: "Crear enlace de PayPal",
    connectPayments: "Conectar Stripe o PayPal",
    copyLink: "Copiar enlace",
    openLink: "Abrir",
    paymentCreating: "Creando enlace seguro…",
    paymentError: "No se pudo crear el enlace de pago.",
    paymentSuccess:
      "Pago completado. ALMA está conciliando la factura y los registros de Dinero.",
    paymentCancelled: "El pago fue cancelado. La factura no cambió.",
    paymentFailed:
      "No se pudo confirmar el pago. Revisa la actividad del proveedor antes de reintentar.",
  },
};
const newLine = (): Line => ({
  id: `line-${crypto.randomUUID()}`,
  description: "",
  quantity: 1,
  unit_price: 0,
  line_total: 0,
});
export default function InvoicingPage() {
  const { locale: lang, setLocale } = useAlmaLocale();
  const t = copy[lang];
  const [invoices, setInvoices] = useState<Invoice[]>([]),
    [selected, setSelected] = useState<Invoice | null>(null),
    [lines, setLines] = useState<Line[]>([]),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]),
    [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([]),
    [paymentBusy, setPaymentBusy] = useState<PaymentProvider | null>(null),
    [paymentError, setPaymentError] = useState(""),
    [paymentReturn, setPaymentReturn] = useState<
      "success" | "cancelled" | "failed" | ""
    >("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (status) params.set("status", status);
      const r = await fetch(`/api/invoices?${params}`);
      if (!r.ok) throw new Error();
      const data = await r.json();
      setInvoices(data.items ?? []);
      setError("");
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [query, status, t.error]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void fetch("/api/connections", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const providers = (payload?.connections ?? [])
          .filter(
            (connection: { provider?: string; status?: string }) =>
              (connection.provider === "stripe_connect" ||
                connection.provider === "paypal_business") &&
              connection.status === "connected",
          )
          .map(
            (connection: { provider: PaymentProvider }) => connection.provider,
          );
        setPaymentProviders(providers);
      });
  }, []);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const result = new URL(window.location.href).searchParams.get("payment");
      if (
        result === "success" ||
        result === "cancelled" ||
        result === "failed"
      ) {
        setPaymentReturn(result);
        if (result === "success") void load();
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);
  const loadPaymentLinks = async (invoiceId: string) => {
    const response = await fetch(`/api/invoices/${invoiceId}/payment-link`, {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = await response.json();
      setPaymentLinks(payload.links ?? []);
    } else {
      setPaymentLinks([]);
    }
  };
  const open = async (id: string) => {
    const r = await fetch(`/api/invoices/${id}`);
    if (!r.ok) return;
    const invoice = await r.json();
    setSelected(invoice);
    setLines(invoice.invoice_line_items ?? []);
    setPaymentError("");
    await loadPaymentLinks(id);
  };
  const createPaymentLink = async (provider: PaymentProvider) => {
    if (!selected) return;
    setPaymentBusy(provider);
    setPaymentError("");
    try {
      const response = await fetch(
        `/api/invoices/${selected.id}/payment-link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
        },
      );
      if (!response.ok) throw new Error("payment_link_failed");
      await loadPaymentLinks(selected.id);
    } catch {
      setPaymentError(t.paymentError);
    } finally {
      setPaymentBusy(null);
    }
  };
  const create = async () => {
    const r = await fetch("/api/invoices/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName: lang === "es" ? "Nuevo cliente" : "New client",
        items: [],
      }),
    });
    if (r.ok) {
      await load();
      await open((await r.json()).id);
    }
  };
  const save = async () => {
    if (!selected) return;
    const r = await fetch(`/api/invoices/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: selected.client_name,
        client_email: selected.client_email,
        due_date: selected.due_date,
        notes: selected.notes,
        terms: selected.terms,
      }),
    });
    if (r.ok) {
      setSelected(await r.json());
      await load();
    }
  };
  const addLine = async () => {
    if (!selected) return;
    const pending = lines.find((x) => x.id.startsWith("line-"));
    if (!pending || !pending.description) return;
    const r = await fetch(`/api/invoices/${selected.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...pending, idempotencyKey: pending.id }),
    });
    if (r.ok) await open(selected.id);
  };
  const updateLine = async (line: Line) => {
    if (!selected || line.id.startsWith("line-")) return;
    const r = await fetch(`/api/invoices/${selected.id}/items/${line.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(line),
    });
    if (r.ok) await open(selected.id);
  };
  const deleteLine = async (line: Line) => {
    if (!selected) return;
    if (line.id.startsWith("line-")) {
      setLines((v) => v.filter((x) => x.id !== line.id));
      return;
    }
    const r = await fetch(`/api/invoices/${selected.id}/items/${line.id}`, {
      method: "DELETE",
    });
    if (r.ok) await open(selected.id);
  };
  const lifecycle = async (next: string) => {
    if (!selected) return;
    const r = await fetch(`/api/invoices/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (r.ok) {
      setSelected(await r.json());
      await load();
    }
  };
  const remove = async () => {
    if (!selected) return;
    const r = await fetch(`/api/invoices/${selected.id}`, { method: "DELETE" });
    if (r.ok) {
      setSelected(null);
      setLines([]);
      await load();
    }
  };
  const duplicate = async () => {
    if (!selected) return;
    const r = await fetch(`/api/invoices/${selected.id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
    });
    if (r.ok) {
      await load();
      await open((await r.json()).id);
    }
  };
  return (
    <AlmaShell
      language={lang}
      activeWorkspace="invoicing"
      title={t.title}
      onLanguageChange={setLocale}
    >
      <div className="p-4 text-[#111111] md:p-8">
        <div className="mx-auto max-w-7xl">
          <a href={DASHBOARD_ROUTE} className="text-sm text-[#6B7280]">
            ← ALMA
          </a>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-medium md:text-4xl">{t.title}</h1>
              <p className="mt-1 text-sm text-[#6B7280]">{t.email}</p>
            </div>
            <button
              onClick={create}
              className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm text-white"
            >
              <Plus className="h-4 w-4" />
              {t.new}
            </button>
          </div>
          {paymentReturn ? (
            <div
              role="status"
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                paymentReturn === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : paymentReturn === "cancelled"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              {paymentReturn === "success"
                ? t.paymentSuccess
                : paymentReturn === "cancelled"
                  ? t.paymentCancelled
                  : t.paymentFailed}
            </div>
          ) : null}
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,1.1fr)]">
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.search}
                  className="min-w-0 flex-1 rounded-xl bg-[#F7F7F8] p-3 text-sm"
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="rounded-xl bg-[#F7F7F8] p-3 text-sm"
                >
                  <option value="">{t.status}</option>
                  {[
                    "draft",
                    "sent",
                    "viewed",
                    "paid",
                    "overdue",
                    "cancelled",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <button
                  aria-label={t.retry}
                  onClick={() => void load()}
                  className="rounded-xl p-3"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              {loading ? (
                <p className="p-5 text-sm text-[#6B7280]">{t.loading}</p>
              ) : error ? (
                <p className="p-5 text-sm text-red-600">{error}</p>
              ) : invoices.length === 0 ? (
                <p className="p-5 text-sm text-[#6B7280]">{t.empty}</p>
              ) : (
                <div className="mt-3 divide-y">
                  {invoices.map((invoice) => (
                    <button
                      key={invoice.id}
                      onClick={() => void open(invoice.id)}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left"
                    >
                      <span className="min-w-0">
                        <b className="block truncate">{invoice.client_name}</b>
                        <span className="block truncate text-xs text-[#6B7280]">
                          {invoice.invoice_number} · {invoice.status}
                        </span>
                      </span>
                      <span className="whitespace-nowrap text-sm">
                        {Number(invoice.total).toFixed(2)} {invoice.currency}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              {!selected ? (
                <div className="flex min-h-72 items-center justify-center text-sm text-[#6B7280]">
                  {t.empty}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-medium">{selected.invoice_number}</h2>
                    <span className="rounded-full bg-[#F7F7F8] px-3 py-1 text-xs">
                      {selected.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <input
                      value={selected.client_name ?? ""}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          client_name: e.target.value,
                        })
                      }
                      placeholder={t.client}
                      className="rounded-xl bg-[#F7F7F8] p-3"
                    />
                    <input
                      value={selected.client_email ?? ""}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          client_email: e.target.value,
                        })
                      }
                      placeholder="Email"
                      className="rounded-xl bg-[#F7F7F8] p-3"
                    />
                    <input
                      type="date"
                      value={selected.due_date ?? ""}
                      onChange={(e) =>
                        setSelected({ ...selected, due_date: e.target.value })
                      }
                      className="rounded-xl bg-[#F7F7F8] p-3"
                    />
                    <input
                      value={selected.currency ?? "USD"}
                      onChange={(e) =>
                        setSelected({ ...selected, currency: e.target.value })
                      }
                      className="rounded-xl bg-[#F7F7F8] p-3"
                    />
                  </div>
                  <h3 className="mt-5 font-medium">{t.items}</h3>
                  <div className="mt-2 space-y-2">
                    {lines.map((line, index) => (
                      <div
                        key={line.id}
                        className="grid grid-cols-[1fr_64px_84px_auto] gap-2"
                      >
                        <input
                          value={line.description}
                          onChange={(e) =>
                            setLines((v) =>
                              v.map((x, i) =>
                                i === index
                                  ? { ...x, description: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          onBlur={() => void updateLine(lines[index])}
                          className="min-w-0 rounded-lg bg-[#F7F7F8] p-2 text-sm"
                        />
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={(e) =>
                            setLines((v) =>
                              v.map((x, i) =>
                                i === index
                                  ? { ...x, quantity: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                          onBlur={() => void updateLine(lines[index])}
                          className="rounded-lg bg-[#F7F7F8] p-2 text-sm"
                        />
                        <input
                          type="number"
                          value={line.unit_price}
                          onChange={(e) =>
                            setLines((v) =>
                              v.map((x, i) =>
                                i === index
                                  ? { ...x, unit_price: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                          onBlur={() => void updateLine(lines[index])}
                          className="rounded-lg bg-[#F7F7F8] p-2 text-sm"
                        />
                        <button
                          aria-label={t.deleteLine}
                          onClick={() => void deleteLine(line)}
                          className="p-2 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setLines((v) => [...v, newLine()]);
                    }}
                    className="mt-2 text-sm underline"
                  >
                    {t.add}
                  </button>
                  <button
                    onClick={() => void addLine()}
                    className="ml-3 mt-2 text-sm underline"
                  >
                    {t.save}
                  </button>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => void save()}
                      className="rounded-full bg-black px-4 py-2 text-sm text-white"
                    >
                      {t.save}
                    </button>
                    {selected.status === "draft" && (
                      <>
                        <button
                          onClick={() => void lifecycle("sent")}
                          className="rounded-full border px-4 py-2 text-sm"
                        >
                          {t.send}
                        </button>
                        <button
                          onClick={() => void remove()}
                          className="rounded-full border px-4 py-2 text-sm"
                        >
                          {t.delete}
                        </button>
                      </>
                    )}
                    {["sent", "viewed", "overdue"].includes(
                      selected.status,
                    ) && (
                      <button
                        onClick={() => void lifecycle("paid")}
                        className="rounded-full border px-4 py-2 text-sm"
                      >
                        {t.markPaid}
                      </button>
                    )}
                    <button
                      onClick={() => void duplicate()}
                      className="rounded-full border px-4 py-2 text-sm"
                    >
                      {t.duplicate}
                    </button>
                    <a
                      href={`/api/invoices/${selected.id}/pdf`}
                      className="flex items-center gap-1 rounded-full border px-4 py-2 text-sm"
                    >
                      <Download className="h-4 w-4" />
                      {t.download}
                    </a>
                  </div>
                  <section className="mt-6 rounded-2xl border border-[#DDE4EE] bg-gradient-to-br from-[#F6FAFF] via-white to-[#F4F0FF] p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-[#111827] p-2 text-white">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{t.paymentLinks}</h3>
                        <p className="mt-1 text-sm leading-6 text-[#667085]">
                          {t.paymentBody}
                        </p>
                      </div>
                    </div>
                    {paymentProviders.length === 0 ? (
                      <a
                        href="/connections?setup=payments"
                        className="mt-4 inline-flex rounded-xl bg-black px-4 py-2 text-sm text-white"
                      >
                        {t.connectPayments}
                      </a>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {paymentProviders.includes("stripe_connect") ? (
                          <button
                            type="button"
                            onClick={() =>
                              void createPaymentLink("stripe_connect")
                            }
                            disabled={Boolean(paymentBusy)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#635BFF] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                          >
                            {paymentBusy === "stripe_connect" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : null}
                            {t.createStripe}
                          </button>
                        ) : null}
                        {paymentProviders.includes("paypal_business") ? (
                          <button
                            type="button"
                            onClick={() =>
                              void createPaymentLink("paypal_business")
                            }
                            disabled={Boolean(paymentBusy)}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#0070BA] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                          >
                            {paymentBusy === "paypal_business" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : null}
                            {t.createPayPal}
                          </button>
                        ) : null}
                      </div>
                    )}
                    {paymentBusy ? (
                      <p className="mt-3 text-xs text-[#667085]">
                        {t.paymentCreating}
                      </p>
                    ) : null}
                    {paymentError ? (
                      <p className="mt-3 text-sm text-red-600">
                        {paymentError}
                      </p>
                    ) : null}
                    {paymentLinks.length ? (
                      <div className="mt-4 space-y-2">
                        {paymentLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white bg-white/80 p-3 shadow-sm"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {link.provider === "stripe_connect"
                                  ? "Stripe"
                                  : "PayPal"}{" "}
                                · {link.status}
                              </p>
                              <p className="text-xs text-[#667085]">
                                {Number(link.amount).toFixed(2)} {link.currency}
                              </p>
                            </div>
                            {link.provider_checkout_url ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  aria-label={t.copyLink}
                                  onClick={() =>
                                    void navigator.clipboard.writeText(
                                      link.provider_checkout_url,
                                    )
                                  }
                                  className="rounded-lg border p-2"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <a
                                  href={link.provider_checkout_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={t.openLink}
                                  className="rounded-lg border p-2"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </section>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </AlmaShell>
  );
}
