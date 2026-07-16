"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, Plus, RefreshCw, Trash2 } from "lucide-react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import { pick } from "@/lib/i18n/appLanguage";
import { DASHBOARD_ROUTE } from "@/lib/platform/workspaceRoutes";

function readStoredLanguage(): AlmaShellLanguage {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("alma_language");
  return saved === "en" || saved === "es" ? saved : "en";
}

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
    loading: "Loading invoices…",
    error: "Invoices could not be loaded.",
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
    loading: "Cargando facturas…",
    error: "No se pudieron cargar las facturas.",
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
  const [lang, setLang] = useState<AlmaShellLanguage>(readStoredLanguage);
  const t = pick(lang, copy.en, copy.es);
  const [invoices, setInvoices] = useState<Invoice[]>([]),
    [selected, setSelected] = useState<Invoice | null>(null),
    [lines, setLines] = useState<Line[]>([]),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
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
  function updateLanguage(next: AlmaShellLanguage) {
    setLang(next);
    localStorage.setItem("alma_language", next);
  }
  const open = async (id: string) => {
    const r = await fetch(`/api/invoices/${id}`);
    if (!r.ok) return;
    const invoice = await r.json();
    setSelected(invoice);
    setLines(invoice.invoice_line_items ?? []);
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
      onLanguageChange={updateLanguage}
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
                          aria-label="Delete line"
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
                          Send
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
                        Mark paid
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
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </AlmaShell>
  );
}
