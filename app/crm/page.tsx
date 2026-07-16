"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import { pick } from "@/lib/i18n/appLanguage";
import { DASHBOARD_ROUTE } from "@/lib/platform/workspaceRoutes";

function readStoredLanguage(): AlmaShellLanguage {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("alma_language");
  return saved === "en" || saved === "es" ? saved : "en";
}

type Entity = {
  id: string;
  name?: string;
  title?: string;
  stage?: string;
  content?: string;
  email?: string;
};
type Data = {
  contacts: Entity[];
  companies: Entity[];
  opportunities: Entity[];
  activities: Entity[];
};
const text = {
  en: {
    title: "CRM",
    contacts: "Contacts",
    companies: "Companies",
    pipeline: "Pipeline",
    activity: "Activity",
    add: "Add",
    empty: "No records yet.",
    search: "Search",
    followUp: "Create follow-up",
    loading: "Loading CRM…",
    error: "CRM could not be loaded.",
  },
  es: {
    title: "CRM",
    contacts: "Contactos",
    companies: "Empresas",
    pipeline: "Pipeline",
    activity: "Actividad",
    add: "Agregar",
    empty: "Aún no hay registros.",
    search: "Buscar",
    followUp: "Crear seguimiento",
    loading: "Cargando CRM…",
    error: "No se pudo cargar CRM.",
  },
};
const stages = [
  "lead",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];
export default function CRM() {
  const [lang, setLang] = useState<AlmaShellLanguage>(readStoredLanguage);
  const t = pick(lang, text.en, text.es);
  const [data, setData] = useState<Data | null>(null),
    [contact, setContact] = useState(""),
    [company, setCompany] = useState(""),
    [opportunity, setOpportunity] = useState(""),
    [query, setQuery] = useState(""),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/crm/summary");
      if (!r.ok) throw new Error();
      setData(await r.json());
      setError("");
    } catch {
      setError(t.error);
    }
  }, [t.error]);
  useEffect(() => {
    void load();
  }, [load]);
  function updateLanguage(next: AlmaShellLanguage) {
    setLang(next);
    localStorage.setItem("alma_language", next);
  }
  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) void load();
    return r.ok;
  };
  const filtered = (items: Entity[]) =>
    items.filter((x) =>
      `${x.name ?? ""} ${x.title ?? ""} ${x.email ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  if (!data)
    return (
      <AlmaShell
        language={lang}
        activeWorkspace="crm"
        title={t.title}
        onLanguageChange={updateLanguage}
      >
        <div className="p-8 text-[#111111]">{error || t.loading}</div>
      </AlmaShell>
    );
  return (
    <AlmaShell
      language={lang}
      activeWorkspace="crm"
      title={t.title}
      onLanguageChange={updateLanguage}
    >
      <div className="p-4 text-[#111111] md:p-8">
        <div className="mx-auto max-w-7xl">
          <a href={DASHBOARD_ROUTE} className="text-sm text-[#6B7280]">
            ← ALMA
          </a>
          <h1 className="mt-5 text-3xl font-medium md:text-4xl">{t.title}</h1>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search}
            className="mt-4 w-full max-w-md rounded-xl border bg-white p-3 text-sm"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <EntityPanel
              title={t.contacts}
              value={contact}
              setValue={setContact}
              placeholder={
                lang === "es" ? "Nombre del contacto" : "Contact name"
              }
              onAdd={() =>
                post("/api/crm/create", { name: contact }).then(
                  (ok) => ok && setContact(""),
                )
              }
              items={filtered(data.contacts)}
              onDelete={(id) =>
                fetch(`/api/crm/contacts/${id}`, { method: "DELETE" }).then(
                  () => void load(),
                )
              }
            />
            <EntityPanel
              title={t.companies}
              value={company}
              setValue={setCompany}
              placeholder={lang === "es" ? "Nombre de empresa" : "Company name"}
              onAdd={() =>
                post("/api/crm/companies", { name: company }).then(
                  (ok) => ok && setCompany(""),
                )
              }
              items={filtered(data.companies)}
              onDelete={(id) =>
                fetch(`/api/crm/companies/${id}`, { method: "DELETE" }).then(
                  () => void load(),
                )
              }
            />
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
              <h2 className="font-medium">{t.pipeline}</h2>
              <div className="mt-3 flex gap-2">
                <input
                  value={opportunity}
                  onChange={(e) => setOpportunity(e.target.value)}
                  placeholder={lang === "es" ? "Oportunidad" : "Opportunity"}
                  className="min-w-0 flex-1 rounded-lg bg-[#F7F7F8] p-2 text-sm"
                />
                <button
                  onClick={() =>
                    post("/api/crm/opportunities", { title: opportunity }).then(
                      (ok) => ok && setOpportunity(""),
                    )
                  }
                  className="rounded-lg bg-black p-2 text-white"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {filtered(data.opportunities).map((item) => (
                  <div key={item.id} className="flex gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {item.title}
                    </span>
                    <select
                      value={item.stage}
                      onChange={(e) =>
                        fetch(`/api/crm/opportunities/${item.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ stage: e.target.value }),
                        }).then(() => void load())
                      }
                      className="rounded bg-[#F7F7F8] text-xs"
                    >
                      {stages.map((stage) => (
                        <option key={stage}>{stage}</option>
                      ))}
                    </select>
                    <button
                      aria-label="Delete opportunity"
                      onClick={() =>
                        fetch(`/api/crm/opportunities/${item.id}`, {
                          method: "DELETE",
                        }).then(() => void load())
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <section className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4">
            <h2 className="font-medium">{t.activity}</h2>
            {data.activities.length ? (
              data.activities.map((item) => (
                <p className="mt-2 text-sm" key={item.id}>
                  {item.content}
                </p>
              ))
            ) : (
              <p className="mt-3 text-sm text-[#6B7280]">{t.empty}</p>
            )}
          </section>
        </div>
      </div>
    </AlmaShell>
  );
}
function EntityPanel({
  title,
  value,
  setValue,
  placeholder,
  onAdd,
  items,
  onDelete,
}: {
  title: string;
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
  onAdd: () => void;
  items: Entity[];
  onDelete: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <h2 className="font-medium">{title}</h2>
      <div className="mt-3 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg bg-[#F7F7F8] p-2 text-sm"
        />
        <button onClick={onAdd} className="rounded-lg bg-black p-2 text-white">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
            <button
              aria-label={`Delete ${title}`}
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
