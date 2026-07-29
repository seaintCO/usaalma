"use client";

import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Landmark,
  Loader2,
  Plus,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  businessLaunchCopy,
  entityTypeCopy,
  stageCopy,
  taskCopy,
} from "@/lib/business-launch/copy";
import {
  BUSINESS_ENTITY_TYPES,
  BUSINESS_LAUNCH_OFFICIAL_RESOURCES,
  US_STATES,
} from "@/lib/business-launch/officialResources";
import type {
  BusinessComplianceDeadline,
  BusinessLaunchPayload,
  BusinessLaunchProject,
  BusinessLaunchStage,
  BusinessLaunchTask,
  BusinessLaunchTaskStatus,
} from "@/lib/business-launch/types";

type Language = "en" | "es";
type LoadState = "loading" | "ready" | "auth" | "migration" | "error";
type ProjectSummary = BusinessLaunchProject;

const STAGES: BusinessLaunchStage[] = [
  "foundation",
  "registration",
  "tax",
  "operations",
  "compliance",
];

const STATUS_COPY = {
  en: {
    not_started: "Not started",
    in_progress: "In progress",
    completed: "Completed",
    not_applicable: "Not applicable",
    undecided: "Undecided",
    self: "I will serve",
    third_party: "Third-party service",
    confirmed: "Confirmed",
    submitted: "Submitted",
    approved: "Approved",
    rejected: "Rejected",
    received: "Received",
    not_required: "Not required",
    opened: "Opened",
    ready: "Ready",
    not_reviewed: "Not reviewed",
    complete: "Complete",
    covered: "Covered",
    planning: "Planning",
    filing: "Filing",
    operating: "Operating",
    paused: "Paused",
    one_time: "One time",
    monthly: "Monthly",
    quarterly: "Quarterly",
    annual: "Annual",
    custom: "Custom",
    upcoming: "Upcoming",
    dismissed: "Dismissed",
  },
  es: {
    not_started: "No iniciado",
    in_progress: "En proceso",
    completed: "Completado",
    not_applicable: "No aplica",
    undecided: "Sin decidir",
    self: "Yo seré el agente",
    third_party: "Servicio de terceros",
    confirmed: "Confirmado",
    submitted: "Enviado",
    approved: "Aprobado",
    rejected: "Rechazado",
    received: "Recibido",
    not_required: "No requerido",
    opened: "Abierta",
    ready: "Lista",
    not_reviewed: "Sin revisar",
    complete: "Completo",
    covered: "Cubierto",
    planning: "Planificación",
    filing: "Presentación",
    operating: "Operando",
    paused: "Pausado",
    one_time: "Una vez",
    monthly: "Mensual",
    quarterly: "Trimestral",
    annual: "Anual",
    custom: "Personalizado",
    upcoming: "Próximo",
    dismissed: "Descartado",
  },
} as const;

const taskStatuses: BusinessLaunchTaskStatus[] = [
  "not_started",
  "in_progress",
  "completed",
  "not_applicable",
];

function statusLabel(language: Language, value: string) {
  return (
    STATUS_COPY[language][value as keyof (typeof STATUS_COPY)[Language]] ?? value
  );
}

function stateName(code: string) {
  return US_STATES.find(([stateCode]) => stateCode === code)?.[1] ?? code;
}

function progress(tasks: BusinessLaunchTask[]) {
  const applicable = tasks.filter((task) => task.status !== "not_applicable");
  if (!applicable.length) return 0;
  return Math.round(
    (applicable.filter((task) => task.status === "completed").length /
      applicable.length) *
      100,
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-[#667085]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-[#D0D5DD] bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-black"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number" | "url";
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-[#667085]">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-[#D0D5DD] bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-black"
      />
    </label>
  );
}

export default function BusinessLaunchWorkspace({
  language,
}: {
  language: Language;
}) {
  const t = businessLaunchCopy[language];
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [launch, setLaunch] = useState<BusinessLaunchPayload | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeStage, setActiveStage] =
    useState<BusinessLaunchStage>("foundation");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [createForm, setCreateForm] = useState({
    formationState: "TN",
    entityType: "undecided",
    desiredName: "",
    ownerCount: "1",
    city: "",
    industry: "",
    businessPurpose: "",
    acknowledged: false,
  });
  const [details, setDetails] = useState({
    entityType: "undecided",
    legalName: "",
    registeredAgentStatus: "undecided",
    stateFilingStatus: "not_started",
    stateFilingNumber: "",
    formationDate: "",
    einStatus: "not_started",
    einLastFour: "",
    bankStatus: "not_started",
    accountingStatus: "not_started",
    licensesStatus: "not_reviewed",
    insuranceStatus: "not_reviewed",
    launchStatus: "planning",
  });
  const [deadlineForm, setDeadlineForm] = useState({
    name: "",
    dueDate: "",
    cadence: "annual",
    officialUrl: "",
    notes: "",
  });

  const load = useCallback(async (projectId?: string) => {
    setLoadState("loading");
    setMessage("");
    try {
      const query = projectId
        ? `?projectId=${encodeURIComponent(projectId)}`
        : "";
      const response = await fetch(`/api/business-launch${query}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (response.status === 401) setLoadState("auth");
      else if (
        response.status === 503 &&
        payload?.error?.code === "business_launch_schema_unavailable"
      )
        setLoadState("migration");
      else if (!response.ok) setLoadState("error");
      else {
        setProjects(payload.projects ?? []);
        setLaunch(payload.launch ?? null);
        setLoadState("ready");
      }
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!launch) return;
    const project = launch.project;
    setDetails({
      entityType: project.entity_type,
      legalName: project.legal_name ?? "",
      registeredAgentStatus: project.registered_agent_status,
      stateFilingStatus: project.state_filing_status,
      stateFilingNumber: project.state_filing_number ?? "",
      formationDate: project.formation_date ?? "",
      einStatus: project.ein_status,
      einLastFour: project.ein_last_four ?? "",
      bankStatus: project.bank_status,
      accountingStatus: project.accounting_status,
      licensesStatus: project.licenses_status,
      insuranceStatus: project.insurance_status,
      launchStatus: project.launch_status,
    });
  }, [launch]);

  const percent = useMemo(() => progress(launch?.tasks ?? []), [launch]);
  const stageTasks = useMemo(
    () =>
      (launch?.tasks ?? []).filter((task) => task.stage === activeStage),
    [activeStage, launch],
  );

  async function createProject() {
    if (
      !createForm.desiredName.trim() ||
      !createForm.acknowledged ||
      !Number.isInteger(Number(createForm.ownerCount)) ||
      Number(createForm.ownerCount) < 1
    )
      return;
    setCreating(true);
    setMessage("");
    try {
      const response = await fetch("/api/business-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          ownerCount: Number(createForm.ownerCount),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.project)
        throw new Error(payload?.error?.code ?? "create_failed");
      await load(payload.project.id);
    } catch {
      setMessage(t.saveFailed);
    } finally {
      setCreating(false);
    }
  }

  async function updateTask(
    task: BusinessLaunchTask,
    status: BusinessLaunchTaskStatus,
  ) {
    if (!launch) return;
    const previous = launch;
    setLaunch({
      ...launch,
      tasks: launch.tasks.map((candidate) =>
        candidate.id === task.id ? { ...candidate, status } : candidate,
      ),
    });
    const response = await fetch("/api/business-launch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "task",
        projectId: launch.project.id,
        taskId: task.id,
        status,
      }),
    });
    if (!response.ok) {
      setLaunch(previous);
      setMessage(t.saveFailed);
    }
  }

  async function saveProject() {
    if (!launch) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/business-launch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "project",
          projectId: launch.project.id,
          ...details,
        }),
      });
      if (!response.ok) throw new Error("save_failed");
      const payload = await response.json();
      setLaunch({ ...launch, project: payload.project });
      setMessage(t.saved);
    } catch {
      setMessage(t.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function createDeadline() {
    if (!launch || !deadlineForm.name.trim() || !deadlineForm.dueDate) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/business-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_deadline",
          projectId: launch.project.id,
          ...deadlineForm,
        }),
      });
      if (!response.ok) throw new Error("deadline_failed");
      const payload = await response.json();
      setLaunch({
        ...launch,
        deadlines: [...launch.deadlines, payload.deadline].sort((a, b) =>
          a.due_date.localeCompare(b.due_date),
        ),
      });
      setDeadlineForm({
        name: "",
        dueDate: "",
        cadence: "annual",
        officialUrl: "",
        notes: "",
      });
    } catch {
      setMessage(t.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function completeDeadline(deadline: BusinessComplianceDeadline) {
    if (!launch) return;
    const response = await fetch("/api/business-launch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "deadline",
        projectId: launch.project.id,
        deadlineId: deadline.id,
        status: "completed",
      }),
    });
    if (response.ok) {
      setLaunch({
        ...launch,
        deadlines: launch.deadlines.map((candidate) =>
          candidate.id === deadline.id
            ? { ...candidate, status: "completed" }
            : candidate,
        ),
      });
    } else {
      setMessage(t.saveFailed);
    }
  }

  if (loadState !== "ready") {
    const body =
      loadState === "auth"
        ? t.signIn
        : loadState === "migration"
          ? t.migration
          : loadState === "error"
            ? t.unavailable
            : null;
    return (
      <div className="mx-auto max-w-7xl p-4 pb-24 md:p-8">
        <div className="rounded-[24px] border border-[#E4E7EC] bg-white p-8 text-sm text-[#667085]">
          {loadState === "loading" ? (
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          ) : (
            <AlertTriangle className="mr-2 inline h-4 w-4" />
          )}
          {body}
          {loadState !== "loading" ? (
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

  if (!launch) {
    return (
      <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#667085]">
          {t.eyebrow}
        </p>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-[#667085]">
          {t.subtitle}
        </p>
        <div className="mt-6 rounded-[28px] border border-[#E4E7EC] bg-white p-5 md:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-medium">{t.newTitle}</h2>
              <p className="mt-1 text-sm text-[#667085]">{t.newBody}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <SelectField
              label={t.state}
              value={createForm.formationState}
              onChange={(value) =>
                setCreateForm({ ...createForm, formationState: value })
              }
              options={US_STATES.map(([value, label]) => ({ value, label }))}
            />
            <SelectField
              label={t.entity}
              value={createForm.entityType}
              onChange={(value) =>
                setCreateForm({ ...createForm, entityType: value })
              }
              options={BUSINESS_ENTITY_TYPES.map((value) => ({
                value,
                label: entityTypeCopy[language][value],
              }))}
            />
            <TextField
              label={t.name}
              value={createForm.desiredName}
              onChange={(value) =>
                setCreateForm({ ...createForm, desiredName: value })
              }
            />
            <TextField
              label={t.ownerCount}
              type="number"
              value={createForm.ownerCount}
              onChange={(value) =>
                setCreateForm({ ...createForm, ownerCount: value })
              }
            />
            <TextField
              label={t.city}
              value={createForm.city}
              onChange={(value) =>
                setCreateForm({ ...createForm, city: value })
              }
            />
            <TextField
              label={t.industry}
              value={createForm.industry}
              onChange={(value) =>
                setCreateForm({ ...createForm, industry: value })
              }
            />
            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="text-[#667085]">{t.purpose}</span>
              <textarea
                value={createForm.businessPurpose}
                onChange={(event) =>
                  setCreateForm({
                    ...createForm,
                    businessPurpose: event.target.value,
                  })
                }
                rows={3}
                className="rounded-2xl border border-[#D0D5DD] bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </label>
          </div>
          <label className="mt-5 flex items-start gap-3 rounded-2xl bg-[#F9FAFB] p-4 text-sm">
            <input
              type="checkbox"
              checked={createForm.acknowledged}
              onChange={(event) =>
                setCreateForm({
                  ...createForm,
                  acknowledged: event.target.checked,
                })
              }
              className="mt-0.5 h-4 w-4"
            />
            {t.acknowledge}
          </label>
          <button
            type="button"
            onClick={() => void createProject()}
            disabled={
              creating ||
              !createForm.acknowledged ||
              !createForm.desiredName.trim()
            }
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {creating ? t.creating : t.start}
          </button>
          {message ? (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {message}
            </p>
          ) : null}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            <ShieldCheck className="mb-3 h-5 w-5" />
            {t.disclaimer}
          </div>
          <div className="rounded-[22px] border border-[#E4E7EC] bg-white p-5 text-sm leading-6 text-[#667085]">
            <Landmark className="mb-3 h-5 w-5 text-black" />
            {t.safety}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 pb-28 print:p-0 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#667085]">
            {t.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight md:text-5xl">
            {launch.project.legal_name || launch.project.desired_name}
          </h1>
          <p className="mt-2 text-sm text-[#667085]">
            {entityTypeCopy[language][launch.project.entity_type]} ·{" "}
            {stateName(launch.project.formation_state)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {projects.length > 1 ? (
            <select
              value={launch.project.id}
              onChange={(event) => void load(event.target.value)}
              className="rounded-full border border-[#D0D5DD] bg-white px-4 py-2 text-sm"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.legal_name || project.desired_name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full border border-[#D0D5DD] bg-white px-4 py-2 text-sm"
          >
            <Printer className="h-4 w-4" />
            {t.print}
          </button>
          <button
            type="button"
            onClick={() => setLaunch(null)}
            className="inline-flex items-center gap-2 rounded-full border border-[#D0D5DD] bg-white px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            {t.addAnother}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-[#E4E7EC] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t.progress}</p>
            <p className="mt-1 text-xs text-[#667085]">
              {percent}% {t.completed}
            </p>
          </div>
          <span className="rounded-full bg-[#F2F4F7] px-3 py-1 text-xs">
            {statusLabel(language, launch.project.launch_status)}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#EAECF0]">
          <div
            className="h-full rounded-full bg-black transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <nav className="space-y-2 print:hidden">
          {STAGES.map((stage) => {
            const stageItems = launch.tasks.filter(
              (task) => task.stage === stage,
            );
            const done = stageItems.filter(
              (task) =>
                task.status === "completed" ||
                task.status === "not_applicable",
            ).length;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setActiveStage(stage)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm ${
                  activeStage === stage
                    ? "border-black bg-black text-white"
                    : "border-[#E4E7EC] bg-white"
                }`}
              >
                <span>{stageCopy[language][stage]}</span>
                <span className="text-xs opacity-65">
                  {done}/{stageItems.length}
                </span>
              </button>
            );
          })}
        </nav>

        <section className="rounded-[28px] border border-[#E4E7EC] bg-white p-5 md:p-7">
          <h2 className="text-xl font-medium">
            {stageCopy[language][activeStage]}
          </h2>
          <div className="mt-5 divide-y divide-[#EAECF0]">
            {stageTasks.map((task) => {
              const taskText = taskCopy[language][task.code];
              return (
                <article
                  key={task.id}
                  className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_180px]"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                          task.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-[#F2F4F7]"
                        }`}
                      >
                        {task.status === "completed" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-current opacity-40" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">
                          {task.title || taskText.title}
                        </h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
                          {taskText.body}
                        </p>
                        {task.official_url ? (
                          <a
                            href={task.official_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
                          >
                            {t.official}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <label className="grid content-start gap-2 text-xs text-[#667085] print:hidden">
                    {t.taskStatus}
                    <select
                      value={task.status}
                      onChange={(event) =>
                        void updateTask(
                          task,
                          event.target.value as BusinessLaunchTaskStatus,
                        )
                      }
                      className="rounded-xl border border-[#D0D5DD] bg-white px-3 py-2 text-sm text-black"
                    >
                      {taskStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(language, status)}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-[28px] border border-[#E4E7EC] bg-white p-5 md:p-7">
        <div className="flex items-start gap-3">
          <FileCheck2 className="mt-0.5 h-5 w-5" />
          <div>
            <h2 className="text-xl font-medium">{t.details}</h2>
            <p className="mt-1 text-sm text-[#667085]">{t.detailsHelp}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SelectField
            label={t.entity}
            value={details.entityType}
            onChange={(value) => setDetails({ ...details, entityType: value })}
            options={BUSINESS_ENTITY_TYPES.map((value) => ({
              value,
              label: entityTypeCopy[language][value],
            }))}
          />
          <TextField
            label={t.legalName}
            value={details.legalName}
            onChange={(value) => setDetails({ ...details, legalName: value })}
          />
          <SelectField
            label={t.registeredAgent}
            value={details.registeredAgentStatus}
            onChange={(value) =>
              setDetails({ ...details, registeredAgentStatus: value })
            }
            options={[
              "undecided",
              "self",
              "third_party",
              "confirmed",
            ].map((value) => ({
              value,
              label: statusLabel(language, value),
            }))}
          />
          <SelectField
            label={t.filingStatus}
            value={details.stateFilingStatus}
            onChange={(value) =>
              setDetails({ ...details, stateFilingStatus: value })
            }
            options={[
              "not_started",
              "in_progress",
              "submitted",
              "approved",
              "rejected",
            ].map((value) => ({
              value,
              label: statusLabel(language, value),
            }))}
          />
          <TextField
            label={t.filingNumber}
            value={details.stateFilingNumber}
            onChange={(value) =>
              setDetails({ ...details, stateFilingNumber: value })
            }
          />
          <TextField
            label={t.formationDate}
            type="date"
            value={details.formationDate}
            onChange={(value) =>
              setDetails({ ...details, formationDate: value })
            }
          />
          <SelectField
            label={t.einStatus}
            value={details.einStatus}
            onChange={(value) => setDetails({ ...details, einStatus: value })}
            options={[
              "not_started",
              "in_progress",
              "received",
              "not_required",
            ].map((value) => ({
              value,
              label: statusLabel(language, value),
            }))}
          />
          <TextField
            label={t.einLastFour}
            value={details.einLastFour}
            onChange={(value) =>
              setDetails({
                ...details,
                einLastFour: value.replace(/\D/g, "").slice(0, 4),
              })
            }
          />
          <SelectField
            label={t.bankStatus}
            value={details.bankStatus}
            onChange={(value) => setDetails({ ...details, bankStatus: value })}
            options={["not_started", "in_progress", "opened"].map((value) => ({
              value,
              label: statusLabel(language, value),
            }))}
          />
          <SelectField
            label={t.accountingStatus}
            value={details.accountingStatus}
            onChange={(value) =>
              setDetails({ ...details, accountingStatus: value })
            }
            options={["not_started", "in_progress", "ready"].map((value) => ({
              value,
              label: statusLabel(language, value),
            }))}
          />
          <SelectField
            label={t.licensesStatus}
            value={details.licensesStatus}
            onChange={(value) =>
              setDetails({ ...details, licensesStatus: value })
            }
            options={[
              "not_reviewed",
              "in_progress",
              "complete",
              "not_required",
            ].map((value) => ({
              value,
              label: statusLabel(language, value),
            }))}
          />
          <SelectField
            label={t.insuranceStatus}
            value={details.insuranceStatus}
            onChange={(value) =>
              setDetails({ ...details, insuranceStatus: value })
            }
            options={[
              "not_reviewed",
              "in_progress",
              "covered",
              "not_required",
            ].map((value) => ({
              value,
              label: statusLabel(language, value),
            }))}
          />
          <SelectField
            label={t.launchStatus}
            value={details.launchStatus}
            onChange={(value) =>
              setDetails({ ...details, launchStatus: value })
            }
            options={["planning", "filing", "operating", "paused"].map(
              (value) => ({
                value,
                label: statusLabel(language, value),
              }),
            )}
          />
        </div>
        <button
          type="button"
          onClick={() => void saveProject()}
          disabled={saving}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-medium text-white print:hidden"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? t.saving : t.save}
        </button>
        {message ? (
          <span
            role={message === t.saved ? "status" : "alert"}
            className={`ml-3 text-sm ${
              message === t.saved ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {message}
          </span>
        ) : null}
      </section>

      <section className="mt-5 rounded-[28px] border border-[#E4E7EC] bg-white p-5 md:p-7">
        <h2 className="text-xl font-medium">{t.deadlines}</h2>
        <p className="mt-1 text-sm text-[#667085]">{t.deadlinesBody}</p>
        <div className="mt-5 grid gap-3">
          {launch.deadlines.length ? (
            launch.deadlines.map((deadline) => (
              <div
                key={deadline.id}
                className="flex flex-col gap-3 rounded-2xl bg-[#F9FAFB] p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{deadline.name}</p>
                  <p className="mt-1 text-sm text-[#667085]">
                    {new Intl.DateTimeFormat(
                      language === "es" ? "es-US" : "en-US",
                      { dateStyle: "medium" },
                    ).format(new Date(`${deadline.due_date}T12:00:00`))}
                    {" · "}
                    {statusLabel(language, deadline.cadence)}
                    {" · "}
                    {statusLabel(language, deadline.status)}
                  </p>
                </div>
                {deadline.official_url ? (
                  <a
                    href={deadline.official_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t.official}
                    className="rounded-full border border-[#D0D5DD] bg-white p-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
                {deadline.status !== "completed" ? (
                  <button
                    type="button"
                    onClick={() => void completeDeadline(deadline)}
                    className="rounded-full bg-black px-4 py-2 text-sm text-white print:hidden"
                  >
                    {t.markDone}
                  </button>
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                )}
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-[#F9FAFB] p-4 text-sm text-[#667085]">
              {t.noDeadlines}
            </p>
          )}
        </div>
        <div className="mt-5 grid gap-3 border-t border-[#EAECF0] pt-5 md:grid-cols-2 xl:grid-cols-4 print:hidden">
          <TextField
            label={t.deadlineName}
            value={deadlineForm.name}
            onChange={(value) =>
              setDeadlineForm({ ...deadlineForm, name: value })
            }
          />
          <TextField
            label={t.deadlineDate}
            type="date"
            value={deadlineForm.dueDate}
            onChange={(value) =>
              setDeadlineForm({ ...deadlineForm, dueDate: value })
            }
          />
          <SelectField
            label={t.deadlineCadence}
            value={deadlineForm.cadence}
            onChange={(value) =>
              setDeadlineForm({ ...deadlineForm, cadence: value })
            }
            options={[
              "one_time",
              "monthly",
              "quarterly",
              "annual",
              "custom",
            ].map((value) => ({
              value,
              label: statusLabel(language, value),
            }))}
          />
          <TextField
            label={t.deadlineLink}
            type="url"
            value={deadlineForm.officialUrl}
            placeholder="https://agency.gov/..."
            onChange={(value) =>
              setDeadlineForm({ ...deadlineForm, officialUrl: value })
            }
          />
        </div>
        <button
          type="button"
          onClick={() => void createDeadline()}
          disabled={saving || !deadlineForm.name || !deadlineForm.dueDate}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D0D5DD] bg-white px-5 py-3 text-sm font-medium disabled:opacity-40 print:hidden"
        >
          <Plus className="h-4 w-4" />
          {t.addDeadline}
        </button>
      </section>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <a
          href={BUSINESS_LAUNCH_OFFICIAL_RESOURCES.boi}
          target="_blank"
          rel="noreferrer"
          className="rounded-[22px] border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950"
        >
          <ShieldCheck className="mb-3 h-5 w-5" />
          <strong className="block">{t.boiTitle}</strong>
          <span className="mt-1 block">{t.boiBody}</span>
        </a>
        <a
          href={BUSINESS_LAUNCH_OFFICIAL_RESOURCES.ein}
          target="_blank"
          rel="noreferrer"
          className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950"
        >
          <Landmark className="mb-3 h-5 w-5" />
          {t.einNotice}
        </a>
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          <AlertTriangle className="mb-3 h-5 w-5" />
          <strong className="block">{t.dataGuard}</strong>
          <span className="mt-1 block">{t.dataGuardBody}</span>
        </div>
      </div>
      <div className="mt-5 rounded-[22px] border border-[#E4E7EC] bg-white p-5 text-sm leading-6 text-[#667085]">
        <RotateCcw className="mr-2 inline h-4 w-4" />
        {t.notFiled} {t.disclaimer}
      </div>
    </div>
  );
}
