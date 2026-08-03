"use client";

import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarPlus,
  Check,
  ChevronRight,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

type Contact = {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  company_id?: string | null;
  job_title?: string | null;
  notes?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Company = {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
};

type Opportunity = {
  id: string;
  title: string;
  stage: string;
  value?: number | null;
  company_id?: string | null;
  primary_contact_id?: string | null;
  expected_close_at?: string | null;
  notes?: string | null;
};

type CrmActivity = {
  id: string;
  contact_id?: string | null;
  company_id?: string | null;
  opportunity_id?: string | null;
  activity_type?: string | null;
  content: string;
  occurred_at?: string | null;
};

type CrmData = {
  contacts: Contact[];
  companies: Company[];
  opportunities: Opportunity[];
  activities: CrmActivity[];
};

type ContactDraft = {
  name: string;
  email: string;
  phone: string;
  company: string;
  company_id: string;
  job_title: string;
  status: string;
  notes: string;
};

const blankContact: ContactDraft = {
  name: "",
  email: "",
  phone: "",
  company: "",
  company_id: "",
  job_title: "",
  status: "prospect",
  notes: "",
};

const stages = [
  "lead",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

const copy = {
  en: {
    title: "Customers",
    eyebrow: "Relationship operating system",
    subtitle:
      "Know every customer, remember the context, and move the relationship forward.",
    search: "Search customers, companies, or email…",
    addCustomer: "Add customer",
    contacts: "Customers",
    companies: "Companies",
    pipeline: "Pipeline",
    openValue: "Open value",
    empty: "No customers match this view.",
    loading: "Loading relationship workspace…",
    error: "The customer workspace could not be loaded.",
    retry: "Retry",
    relationshipBrief: "Relationship brief",
    freeBrief: "No-token smart brief",
    profileComplete: "Profile complete",
    lastTouch: "Last touch",
    nextMove: "Recommended next move",
    noActivity: "No activity recorded yet",
    addContactDetails:
      "Add an email or phone number so your team can follow up.",
    logFirstTouch:
      "Log the first conversation and capture what matters to this customer.",
    createOpportunity:
      "Create an opportunity so the next commercial step is visible.",
    followOpportunity:
      "Move the open opportunity forward or record why it is paused.",
    relationshipHealthy:
      "The relationship record is healthy. Schedule the next meaningful touch.",
    details: "Customer details",
    notes: "Internal notes",
    save: "Save profile",
    saved: "Saved",
    delete: "Delete customer",
    activity: "Relationship activity",
    activityPlaceholder:
      "Log a call, meeting, preference, concern, or decision…",
    logActivity: "Log activity",
    followUp: "Create follow-up",
    followUpTitle: "Follow-up title",
    dueDate: "Due date",
    createTask: "Create task",
    opportunity: "New opportunity",
    opportunityTitle: "Opportunity name",
    value: "Value",
    addOpportunity: "Add to pipeline",
    company: "New company",
    companyName: "Company name",
    addCompany: "Save company",
    name: "Full name",
    email: "Email",
    phone: "Phone",
    companyField: "Company",
    jobTitle: "Job title",
    status: "Relationship status",
    cancel: "Cancel",
    create: "Create customer",
    created: "Customer created",
    taskCreated: "Follow-up created",
    activityCreated: "Activity recorded",
    opportunityCreated: "Opportunity created",
    companyCreated: "Company created",
    recent: "Recent activity",
    selectCustomer: "Select a customer to open their relationship card.",
  },
  es: {
    title: "Clientes",
    eyebrow: "Sistema operativo de relaciones",
    subtitle:
      "Conoce a cada cliente, recuerda el contexto y mueve la relación hacia adelante.",
    search: "Buscar clientes, empresas o correo…",
    addCustomer: "Agregar cliente",
    contacts: "Clientes",
    companies: "Empresas",
    pipeline: "Pipeline",
    openValue: "Valor abierto",
    empty: "No hay clientes en esta vista.",
    loading: "Cargando espacio de relaciones…",
    error: "No se pudo cargar el espacio de clientes.",
    retry: "Reintentar",
    relationshipBrief: "Resumen de relación",
    freeBrief: "Resumen inteligente sin tokens",
    profileComplete: "Perfil completo",
    lastTouch: "Último contacto",
    nextMove: "Próximo paso recomendado",
    noActivity: "Aún no hay actividad registrada",
    addContactDetails:
      "Agrega correo o teléfono para que tu equipo pueda dar seguimiento.",
    logFirstTouch:
      "Registra la primera conversación y lo que importa para este cliente.",
    createOpportunity:
      "Crea una oportunidad para mostrar el siguiente paso comercial.",
    followOpportunity:
      "Mueve la oportunidad abierta o registra por qué está pausada.",
    relationshipHealthy:
      "La relación está bien documentada. Programa el próximo contacto importante.",
    details: "Detalles del cliente",
    notes: "Notas internas",
    save: "Guardar perfil",
    saved: "Guardado",
    delete: "Eliminar cliente",
    activity: "Actividad de relación",
    activityPlaceholder:
      "Registra llamada, reunión, preferencia, preocupación o decisión…",
    logActivity: "Registrar actividad",
    followUp: "Crear seguimiento",
    followUpTitle: "Título del seguimiento",
    dueDate: "Fecha límite",
    createTask: "Crear tarea",
    opportunity: "Nueva oportunidad",
    opportunityTitle: "Nombre de oportunidad",
    value: "Valor",
    addOpportunity: "Agregar al pipeline",
    company: "Nueva empresa",
    companyName: "Nombre de empresa",
    addCompany: "Guardar empresa",
    name: "Nombre completo",
    email: "Correo",
    phone: "Teléfono",
    companyField: "Empresa",
    jobTitle: "Puesto",
    status: "Estado de relación",
    cancel: "Cancelar",
    create: "Crear cliente",
    created: "Cliente creado",
    taskCreated: "Seguimiento creado",
    activityCreated: "Actividad registrada",
    opportunityCreated: "Oportunidad creada",
    companyCreated: "Empresa creada",
    recent: "Actividad reciente",
    selectCustomer: "Selecciona un cliente para abrir su tarjeta de relación.",
  },
} as const;

function contactDraft(contact: Contact): ContactDraft {
  return {
    name: contact.name ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    company: contact.company ?? "",
    company_id: contact.company_id ?? "",
    job_title: contact.job_title ?? "",
    status: contact.status ?? "prospect",
    notes: contact.notes ?? "",
  };
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "C"
  );
}

async function requestJson(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof payload.error === "string" ? payload.error : "request_failed",
    );
  return payload;
}

export default function CRMPage() {
  const { locale, setLocale } = useAlmaLocale();
  const t = copy[locale];
  const [data, setData] = useState<CrmData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContactDraft>(blankContact);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newContact, setNewContact] = useState<ContactDraft>(blankContact);
  const [activityText, setActivityText] = useState("");
  const [activityType, setActivityType] = useState("note");
  const [followTitle, setFollowTitle] = useState("");
  const [followDue, setFollowDue] = useState("");
  const [opportunityTitle, setOpportunityTitle] = useState("");
  const [opportunityValue, setOpportunityValue] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/crm/summary", { cache: "no-store" });
      if (!response.ok) throw new Error("load_failed");
      const payload = (await response.json()) as CrmData;
      setData(payload);
      setError("");
      setSelectedId((current) =>
        current && payload.contacts.some((contact) => contact.id === current)
          ? current
          : (payload.contacts[0]?.id ?? null),
      );
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => {
    // Initial server-state synchronization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const selected =
    data?.contacts.find((contact) => contact.id === selectedId) ?? null;
  useEffect(() => {
    if (!selected) return;
    const frame = window.requestAnimationFrame(() =>
      setDraft(contactDraft(selected)),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [selected]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!data) return [];
    if (!normalized) return data.contacts;
    return data.contacts.filter((contact) =>
      [
        contact.name,
        contact.email,
        contact.phone,
        contact.company,
        contact.job_title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [data, query]);

  const selectedActivities = useMemo(
    () =>
      data?.activities.filter((entry) => entry.contact_id === selectedId) ?? [],
    [data, selectedId],
  );
  const selectedOpportunities = useMemo(
    () =>
      data?.opportunities.filter(
        (entry) => entry.primary_contact_id === selectedId,
      ) ?? [],
    [data, selectedId],
  );

  const profileScore = selected
    ? Math.round(
        ([
          selected.name,
          selected.email,
          selected.phone,
          selected.company || selected.company_id,
          selected.job_title,
          selected.notes,
        ].filter(Boolean).length /
          6) *
          100,
      )
    : 0;
  const activeOpportunity = selectedOpportunities.find(
    (entry) => !["won", "lost"].includes(entry.stage),
  );
  const recommendation = !selected
    ? ""
    : !selected.email && !selected.phone
      ? t.addContactDetails
      : selectedActivities.length === 0
        ? t.logFirstTouch
        : selectedOpportunities.length === 0
          ? t.createOpportunity
          : activeOpportunity
            ? t.followOpportunity
            : t.relationshipHealthy;

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  async function run(key: string, task: () => Promise<void>) {
    setBusy(key);
    setError("");
    try {
      await task();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t.error);
    } finally {
      setBusy("");
    }
  }

  const summaryValue =
    data?.opportunities
      .filter((entry) => !["won", "lost"].includes(entry.stage))
      .reduce((total, entry) => total + Number(entry.value ?? 0), 0) ?? 0;

  return (
    <AlmaShell
      language={locale}
      activeWorkspace="customers"
      title={t.title}
      onLanguageChange={setLocale}
    >
      <div className="p-4 pb-28 text-[#111111] md:p-8 md:pb-10">
        <div className="mx-auto max-w-[1480px]">
          <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
                {t.eyebrow}
              </p>
              <h1 className="alma-gradient-text mt-3 text-4xl font-medium tracking-[-0.05em] md:text-6xl">
                {t.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#667085] md:text-base">
                {t.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewOpen(true)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-semibold text-white shadow-[0_16px_55px_rgba(102,84,255,0.25)]"
            >
              <Plus className="h-4 w-4" />
              {t.addCustomer}
            </button>
          </header>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Metric
              icon={Users}
              label={t.contacts}
              value={data?.contacts.length ?? 0}
            />
            <Metric
              icon={Building2}
              label={t.companies}
              value={data?.companies.length ?? 0}
            />
            <Metric
              icon={BriefcaseBusiness}
              label={t.openValue}
              value={money(summaryValue)}
            />
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-950/30 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="fixed right-5 top-5 z-[90] flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-[#0c2a25]/95 px-4 py-3 text-sm text-emerald-100 shadow-2xl backdrop-blur-xl">
              <Check className="h-4 w-4" />
              {notice}
            </div>
          ) : null}

          <div className="mt-6 grid min-h-[680px] gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
            <aside className="alma-glass-card rounded-[28px] p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.search}
                  className="w-full rounded-2xl border px-10 py-3 text-sm outline-none"
                />
              </div>
              <div className="mt-3 space-y-2">
                {loading ? (
                  <p className="p-4 text-sm text-[#667085]">{t.loading}</p>
                ) : null}
                {!loading && filtered.length === 0 ? (
                  <p className="p-4 text-sm text-[#667085]">{t.empty}</p>
                ) : null}
                {filtered.map((contact) => {
                  const active = contact.id === selectedId;
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => setSelectedId(contact.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${active ? "border-violet-400/35 bg-violet-500/12 shadow-[0_0_30px_rgba(109,82,255,0.16)]" : "border-transparent hover:border-white/10 hover:bg-white/5"}`}
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-400/20 text-sm font-semibold text-cyan-100">
                        {initials(contact.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {contact.name}
                        </span>
                        <span className="mt-1 block truncate text-xs text-[#667085]">
                          {contact.company ||
                            contact.email ||
                            contact.phone ||
                            contact.status ||
                            "Customer"}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#667085]" />
                    </button>
                  );
                })}
              </div>
            </aside>

            {selected ? (
              <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
                <div className="space-y-5">
                  <section className="alma-glass-card rounded-[28px] p-5 md:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-gradient-to-br from-violet-500/35 to-cyan-400/25 text-xl font-semibold text-cyan-50 shadow-[0_0_42px_rgba(80,198,255,0.16)]">
                          {initials(selected.name)}
                        </span>
                        <div className="min-w-0">
                          <h2 className="truncate text-2xl font-medium tracking-tight">
                            {selected.name}
                          </h2>
                          <p className="mt-1 truncate text-sm text-[#667085]">
                            {selected.job_title ||
                              selected.status ||
                              "Customer"}
                            {selected.company ? ` · ${selected.company}` : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        title={t.delete}
                        onClick={() => {
                          if (window.confirm(t.delete))
                            void run("delete", async () => {
                              await requestJson(
                                `/api/crm/contacts/${selected.id}`,
                                "DELETE",
                              );
                              await load();
                            });
                        }}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-red-400/20 text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <Field
                        label={t.name}
                        value={draft.name}
                        onChange={(value) =>
                          setDraft({ ...draft, name: value })
                        }
                        icon={UserRound}
                      />
                      <Field
                        label={t.jobTitle}
                        value={draft.job_title}
                        onChange={(value) =>
                          setDraft({ ...draft, job_title: value })
                        }
                        icon={BriefcaseBusiness}
                      />
                      <Field
                        label={t.email}
                        value={draft.email}
                        onChange={(value) =>
                          setDraft({ ...draft, email: value })
                        }
                        icon={Mail}
                        type="email"
                      />
                      <Field
                        label={t.phone}
                        value={draft.phone}
                        onChange={(value) =>
                          setDraft({ ...draft, phone: value })
                        }
                        icon={Phone}
                        type="tel"
                      />
                      <Field
                        label={t.companyField}
                        value={draft.company}
                        onChange={(value) =>
                          setDraft({ ...draft, company: value })
                        }
                        icon={Building2}
                      />
                      <label className="text-xs font-medium text-[#667085]">
                        {t.status}
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            setDraft({ ...draft, status: event.target.value })
                          }
                          className="mt-2 min-h-11 w-full rounded-xl border px-3 text-sm outline-none"
                        >
                          <option value="prospect">Prospect</option>
                          <option value="active">Active</option>
                          <option value="client">Client</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </label>
                    </div>
                    <label className="mt-4 block text-xs font-medium text-[#667085]">
                      {t.notes}
                      <textarea
                        value={draft.notes}
                        onChange={(event) =>
                          setDraft({ ...draft, notes: event.target.value })
                        }
                        rows={5}
                        className="mt-2 w-full resize-y rounded-2xl border p-3 text-sm leading-6 outline-none"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy === "save" || !draft.name.trim()}
                      onClick={() =>
                        void run("save", async () => {
                          await requestJson(
                            `/api/crm/contacts/${selected.id}`,
                            "PATCH",
                            { ...draft, company_id: draft.company_id || null },
                          );
                          await load();
                          flash(t.saved);
                        })
                      }
                      className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {t.save}
                    </button>
                  </section>

                  <section className="alma-glass-card rounded-[28px] p-5 md:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-400">
                          {t.recent}
                        </p>
                        <h2 className="mt-2 text-xl font-medium">
                          {t.activity}
                        </h2>
                      </div>
                      <Activity className="h-5 w-5 text-violet-300" />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <select
                        value={activityType}
                        onChange={(event) =>
                          setActivityType(event.target.value)
                        }
                        className="rounded-xl border px-3 text-sm"
                      >
                        <option value="note">Note</option>
                        <option value="call">Call</option>
                        <option value="meeting">Meeting</option>
                        <option value="email">Email</option>
                      </select>
                      <input
                        value={activityText}
                        onChange={(event) =>
                          setActivityText(event.target.value)
                        }
                        placeholder={t.activityPlaceholder}
                        className="min-w-0 flex-1 rounded-xl border px-3 py-3 text-sm outline-none"
                      />
                      <button
                        type="button"
                        disabled={!activityText.trim() || busy === "activity"}
                        onClick={() =>
                          void run("activity", async () => {
                            await requestJson("/api/crm/activities", "POST", {
                              contactId: selected.id,
                              type: activityType,
                              content: activityText.trim(),
                            });
                            setActivityText("");
                            await load();
                            flash(t.activityCreated);
                          })
                        }
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-black text-white disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-5 space-y-3">
                      {selectedActivities.length ? (
                        selectedActivities.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex gap-3 rounded-2xl border border-white/8 bg-black/10 p-4"
                          >
                            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-400/12 text-violet-200">
                              <MessageSquareText className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="text-sm leading-6">
                                {entry.content}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-wide text-[#667085]">
                                {entry.activity_type || "activity"}
                                {entry.occurred_at
                                  ? ` · ${new Date(entry.occurred_at).toLocaleDateString()}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="py-6 text-center text-sm text-[#667085]">
                          {t.noActivity}
                        </p>
                      )}
                    </div>
                  </section>
                </div>

                <div className="space-y-5">
                  <section className="alma-glass-card rounded-[28px] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                          {t.freeBrief}
                        </p>
                        <h2 className="mt-2 text-xl font-medium">
                          {t.relationshipBrief}
                        </h2>
                      </div>
                      <Sparkles className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <BriefStat
                        label={t.profileComplete}
                        value={`${profileScore}%`}
                      />
                      <BriefStat
                        label={t.lastTouch}
                        value={
                          selectedActivities[0]?.occurred_at
                            ? new Date(
                                selectedActivities[0].occurred_at!,
                              ).toLocaleDateString()
                            : "—"
                        }
                      />
                    </div>
                    <div className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/8 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-300">
                        {t.nextMove}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#667085]">
                        {recommendation}
                      </p>
                    </div>
                  </section>

                  <section className="alma-glass-card rounded-[28px] p-5">
                    <div className="flex items-center gap-2">
                      <CalendarPlus className="h-5 w-5 text-cyan-300" />
                      <h2 className="font-medium">{t.followUp}</h2>
                    </div>
                    <input
                      value={followTitle}
                      onChange={(event) => setFollowTitle(event.target.value)}
                      placeholder={t.followUpTitle}
                      className="mt-4 w-full rounded-xl border px-3 py-3 text-sm"
                    />
                    <input
                      type="date"
                      value={followDue}
                      onChange={(event) => setFollowDue(event.target.value)}
                      aria-label={t.dueDate}
                      className="mt-2 w-full rounded-xl border px-3 py-3 text-sm"
                    />
                    <button
                      type="button"
                      disabled={!followTitle.trim() || busy === "follow"}
                      onClick={() =>
                        void run("follow", async () => {
                          await requestJson("/api/crm/follow-up", "POST", {
                            title: followTitle.trim(),
                            description: `${selected.name}: ${selected.notes || "Customer follow-up"}`,
                            dueAt: followDue
                              ? new Date(`${followDue}T17:00:00`).toISOString()
                              : null,
                          });
                          setFollowTitle("");
                          setFollowDue("");
                          flash(t.taskCreated);
                        })
                      }
                      className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {t.createTask}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </section>

                  <section className="alma-glass-card rounded-[28px] p-5">
                    <div className="flex items-center gap-2">
                      <BriefcaseBusiness className="h-5 w-5 text-violet-300" />
                      <h2 className="font-medium">{t.pipeline}</h2>
                    </div>
                    <div className="mt-4 space-y-2">
                      {selectedOpportunities.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-white/8 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">
                              {entry.title}
                            </span>
                            <span className="text-xs text-cyan-300">
                              {entry.value ? money(Number(entry.value)) : "—"}
                            </span>
                          </div>
                          <select
                            value={entry.stage}
                            onChange={(event) =>
                              void run(`stage-${entry.id}`, async () => {
                                await requestJson(
                                  `/api/crm/opportunities/${entry.id}`,
                                  "PATCH",
                                  { stage: event.target.value },
                                );
                                await load();
                              })
                            }
                            className="mt-2 w-full rounded-xl border px-2 py-2 text-xs"
                          >
                            {stages.map((stage) => (
                              <option key={stage} value={stage}>
                                {stage}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-[1fr_110px] gap-2">
                      <input
                        value={opportunityTitle}
                        onChange={(event) =>
                          setOpportunityTitle(event.target.value)
                        }
                        placeholder={t.opportunityTitle}
                        className="min-w-0 rounded-xl border px-3 py-3 text-sm"
                      />
                      <input
                        type="number"
                        min="0"
                        value={opportunityValue}
                        onChange={(event) =>
                          setOpportunityValue(event.target.value)
                        }
                        placeholder={t.value}
                        className="min-w-0 rounded-xl border px-3 py-3 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={
                        !opportunityTitle.trim() || busy === "opportunity"
                      }
                      onClick={() =>
                        void run("opportunity", async () => {
                          await requestJson("/api/crm/opportunities", "POST", {
                            title: opportunityTitle.trim(),
                            contactId: selected.id,
                            companyId: selected.company_id || null,
                            value: opportunityValue
                              ? Number(opportunityValue)
                              : null,
                          });
                          setOpportunityTitle("");
                          setOpportunityValue("");
                          await load();
                          flash(t.opportunityCreated);
                        })
                      }
                      className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 text-sm font-semibold text-violet-100 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                      {t.addOpportunity}
                    </button>
                  </section>

                  <section className="alma-glass-card rounded-[28px] p-5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-cyan-300" />
                      <h2 className="font-medium">{t.companies}</h2>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {data?.companies.slice(0, 8).map((company) => (
                        <span
                          key={company.id}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-[#667085]"
                        >
                          {company.name}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <input
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        placeholder={t.companyName}
                        className="min-w-0 flex-1 rounded-xl border px-3 py-3 text-sm"
                      />
                      <button
                        type="button"
                        disabled={!companyName.trim() || busy === "company"}
                        onClick={() =>
                          void run("company", async () => {
                            await requestJson("/api/crm/companies", "POST", {
                              name: companyName.trim(),
                            });
                            setCompanyName("");
                            await load();
                            flash(t.companyCreated);
                          })
                        }
                        className="grid h-12 w-12 place-items-center rounded-xl bg-black text-white disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="alma-glass-card grid min-h-[480px] place-items-center rounded-[28px] p-8 text-center">
                <div>
                  <UserRound className="mx-auto h-10 w-10 text-[#667085]" />
                  <p className="mt-4 text-sm text-[#667085]">
                    {t.selectCustomer}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {newOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/65 p-4 backdrop-blur-lg">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run("create", async () => {
                const created = (await requestJson("/api/crm/create", "POST", {
                  ...newContact,
                  company_id: newContact.company_id || null,
                })) as Contact;
                setNewContact(blankContact);
                setNewOpen(false);
                await load();
                setSelectedId(created.id);
                flash(t.created);
              });
            }}
            className="alma-glass-card max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[30px] p-5 md:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  {t.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-medium">{t.addCustomer}</h2>
              </div>
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label={t.name}
                value={newContact.name}
                onChange={(value) =>
                  setNewContact({ ...newContact, name: value })
                }
                icon={UserRound}
                required
              />
              <Field
                label={t.jobTitle}
                value={newContact.job_title}
                onChange={(value) =>
                  setNewContact({ ...newContact, job_title: value })
                }
                icon={BriefcaseBusiness}
              />
              <Field
                label={t.email}
                value={newContact.email}
                onChange={(value) =>
                  setNewContact({ ...newContact, email: value })
                }
                icon={Mail}
                type="email"
              />
              <Field
                label={t.phone}
                value={newContact.phone}
                onChange={(value) =>
                  setNewContact({ ...newContact, phone: value })
                }
                icon={Phone}
                type="tel"
              />
              <Field
                label={t.companyField}
                value={newContact.company}
                onChange={(value) =>
                  setNewContact({ ...newContact, company: value })
                }
                icon={Building2}
              />
              <label className="text-xs font-medium text-[#667085]">
                {t.status}
                <select
                  value={newContact.status}
                  onChange={(event) =>
                    setNewContact({ ...newContact, status: event.target.value })
                  }
                  className="mt-2 min-h-11 w-full rounded-xl border px-3 text-sm"
                >
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                  <option value="client">Client</option>
                </select>
              </label>
            </div>
            <label className="mt-4 block text-xs font-medium text-[#667085]">
              {t.notes}
              <textarea
                value={newContact.notes}
                onChange={(event) =>
                  setNewContact({ ...newContact, notes: event.target.value })
                }
                rows={4}
                className="mt-2 w-full rounded-2xl border p-3 text-sm"
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={!newContact.name.trim() || busy === "create"}
                className="rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {t.create}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </AlmaShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="alma-glass-card alma-glass-card--interactive rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/12 text-violet-200">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-2xl font-medium tracking-tight">{value}</span>
      </div>
      <p className="mt-5 text-xs text-[#667085]">{label}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  icon: Icon,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: typeof UserRound;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs font-medium text-[#667085]">
      {label}
      <span className="relative mt-2 block">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
        <input
          type={type}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 w-full rounded-xl border py-2 pl-10 pr-3 text-sm outline-none"
        />
      </span>
    </label>
  );
}

function BriefStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#667085]">
        {label}
      </p>
      <p className="mt-2 text-lg font-medium">{value}</p>
    </div>
  );
}
