"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bot,
  Copy,
  Database,
  History,
  Link2,
  Pause,
  Play,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type AgentStatus = "draft" | "active" | "paused";
type ApprovalMode = "always_ask" | "ask_for_sensitive" | "trusted_tools_only";

type Agent = {
  id: string;
  name: string;
  slug: string;
  status: AgentStatus;
  role: string;
  description: string;
  instructions: string;
  language: "auto" | "en" | "es";
  approvalMode: ApprovalMode;
  memoryEnabled: boolean;
  voiceEnabled: boolean;
  voiceProvider: string | null;
  voiceId: string | null;
  updatedAt: string;
};

type AgentTemplate = {
  key: string;
  name: string;
  role: string;
  description: string;
  recommendedTools: readonly string[];
};

type BuilderTool = {
  name: string;
  label: string;
  group: string;
  provider?: string;
  sensitive?: boolean;
  beta?: boolean;
  available?: boolean;
  requiresConnection?: boolean;
  description: string;
};

type AgentTool = { name: string; effect: string };
type Connection = { id: string; provider: string; label: string };
type Memory = {
  id: string;
  category: string;
  memory_key: string;
  memory_value: unknown;
  importance: number;
  updated_at: string;
};
type Activity = {
  executions?: {
    id: string;
    status: string;
    goal: string;
    created_at: string;
  }[];
  logs?: {
    id: string;
    event_type: string;
    summary: string;
    created_at: string;
  }[];
  approvals?: {
    id: string;
    status: string;
    action_summary: string;
    tool_name: string | null;
    requested_at: string;
  }[];
};
type AgentDetail = {
  agent: Agent;
  tools: AgentTool[];
  connections: Connection[];
  memories: Memory[];
  activity: Activity;
};

type ApiResponse<T> = T & {
  ok: boolean;
  error?: { code: string; message: string };
};

type AgentForm = {
  name: string;
  role: string;
  description: string;
  instructions: string;
  language: string;
  approvalMode: string;
  memoryEnabled: boolean;
  voiceEnabled: boolean;
  voiceProvider: string;
  voiceId: string;
};

const TEXT = {
  en: {
    title: "Agent Builder",
    search: "Search agents",
    newAgent: "New Agent",
    templates: "Templates",
    profile: "Profile",
    tools: "Tools",
    connections: "Connections",
    memory: "Memory",
    activity: "Activity",
    test: "Test Agent",
    save: "Save",
    activate: "Activate",
    pause: "Pause",
    duplicate: "Duplicate",
    delete: "Delete",
    assign: "Save assignments",
    empty: "No agents yet.",
    loading: "Loading Agent Builder...",
    prompt: "Ask this agent to do something safe.",
    run: "Run test",
  },
  es: {
    title: "Agent Builder",
    search: "Buscar agentes",
    newAgent: "Nuevo agente",
    templates: "Plantillas",
    profile: "Perfil",
    tools: "Herramientas",
    connections: "Conexiones",
    memory: "Memoria",
    activity: "Actividad",
    test: "Probar agente",
    save: "Guardar",
    activate: "Activar",
    pause: "Pausar",
    duplicate: "Duplicar",
    delete: "Eliminar",
    assign: "Guardar permisos",
    empty: "Todavia no hay agentes.",
    loading: "Cargando Agent Builder...",
    prompt: "Pidele algo seguro a este agente.",
    run: "Probar",
  },
} as const;

const EMPTY_FORM = {
  name: "",
  role: "",
  description: "",
  instructions: "",
  language: "auto",
  approvalMode: "ask_for_sensitive",
  memoryEnabled: true,
  voiceEnabled: false,
  voiceProvider: "",
  voiceId: "",
} satisfies AgentForm;

const FIELD_CLASS =
  "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm outline-none focus:border-black";

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return (await response.json()) as ApiResponse<T>;
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

export default function AgentsPage() {
  const [language, setLanguage] = useState<AlmaShellLanguage>(() => {
    if (typeof window === "undefined") return "es";
    const saved = window.localStorage.getItem("alma_language");
    return saved === "en" || saved === "es" ? saved : "es";
  });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [tools, setTools] = useState<BuilderTool[]>([]);
  const [verifiedConnections, setVerifiedConnections] = useState<Connection[]>(
    [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [form, setForm] = useState<AgentForm>({ ...EMPTY_FORM });
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AgentStatus>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testPrompt, setTestPrompt] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const t = TEXT[language];

  function updateLanguage(next: AlmaShellLanguage) {
    setLanguage(next);
    localStorage.setItem("alma_language", next);
  }

  async function loadDetail(agentId: string) {
    const next = await api<AgentDetail>(`/api/agents/${agentId}`);
    if (!next.ok || !next.agent) {
      setError(next.error?.message ?? "Agent unavailable.");
      return;
    }
    setDetail(next);
    setForm({
      name: next.agent.name,
      role: next.agent.role,
      description: next.agent.description,
      instructions: next.agent.instructions,
      language: next.agent.language,
      approvalMode: next.agent.approvalMode,
      memoryEnabled: next.agent.memoryEnabled,
      voiceEnabled: next.agent.voiceEnabled,
      voiceProvider: next.agent.voiceProvider ?? "",
      voiceId: next.agent.voiceId ?? "",
    });
    setSelectedTools(next.tools.map((tool) => tool.name));
    setSelectedConnections(next.connections.map((connection) => connection.id));
  }

  async function load() {
    setLoading(true);
    setError(null);
    const [agentResponse, optionsResponse] = await Promise.all([
      api<{ agents: Agent[] }>("/api/agents"),
      api<{
        templates: AgentTemplate[];
        availableTools: BuilderTool[];
        verifiedConnections: Connection[];
      }>("/api/agents/options"),
    ]);
    if (!agentResponse.ok || !optionsResponse.ok) {
      setError(
        agentResponse.error?.message ??
          optionsResponse.error?.message ??
          "Agent Builder is unavailable.",
      );
      setLoading(false);
      return;
    }
    setAgents(agentResponse.agents ?? []);
    setTemplates(optionsResponse.templates ?? []);
    setTools(optionsResponse.availableTools ?? []);
    setVerifiedConnections(optionsResponse.verifiedConnections ?? []);
    const nextSelected = selectedId ?? agentResponse.agents?.[0]?.id ?? null;
    setSelectedId(nextSelected);
    if (nextSelected) await loadDetail(nextSelected);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredAgents = useMemo(
    () =>
      agents.filter((agent) => {
        const matchesStatus =
          statusFilter === "all" || agent.status === statusFilter;
        const text = `${agent.name} ${agent.role} ${agent.description}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesStatus && text;
      }),
    [agents, query, statusFilter],
  );

  const toolsByGroup = useMemo(() => {
    return tools.reduce<Record<string, BuilderTool[]>>((groups, tool) => {
      groups[tool.group] = [...(groups[tool.group] ?? []), tool];
      return groups;
    }, {});
  }, [tools]);

  async function refreshSelected(agentId = selectedId) {
    const response = await api<{ agents: Agent[] }>("/api/agents");
    if (response.ok) setAgents(response.agents ?? []);
    if (agentId) await loadDetail(agentId);
  }

  async function createFromTemplate(templateKey?: string) {
    setSaving(true);
    const response = await api<{ agent: Agent }>("/api/agents", {
      method: "POST",
      body: JSON.stringify(
        templateKey ? { templateKey } : { name: "New Agent" },
      ),
    });
    setSaving(false);
    if (!response.ok || !response.agent) {
      setError(response.error?.message ?? "Agent could not be created.");
      return;
    }
    setSelectedId(response.agent.id);
    await refreshSelected(response.agent.id);
  }

  async function saveProfile() {
    if (!selectedId) return;
    setSaving(true);
    const response = await api<{ agent: Agent }>(`/api/agents/${selectedId}`, {
      method: "PATCH",
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!response.ok) {
      setError(response.error?.message ?? "Agent could not be saved.");
      return;
    }
    await refreshSelected(selectedId);
  }

  async function setStatus(action: "activate" | "pause" | "delete") {
    if (!selectedId) return;
    const path =
      action === "delete"
        ? `/api/agents/${selectedId}`
        : `/api/agents/${selectedId}/${action}`;
    const method = action === "delete" ? "DELETE" : "POST";
    const response = await api<{ agent: Agent }>(path, { method });
    if (!response.ok) {
      setError(response.error?.message ?? "Status could not be changed.");
      return;
    }
    if (action === "delete") {
      setSelectedId(null);
      setDetail(null);
    }
    await load();
  }

  async function duplicateAgent() {
    if (!selectedId) return;
    const response = await api<{ agent: Agent }>(
      `/api/agents/${selectedId}/duplicate`,
      {
        method: "POST",
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      },
    );
    if (response.ok && response.agent) {
      setSelectedId(response.agent.id);
      await refreshSelected(response.agent.id);
    } else {
      setError(response.error?.message ?? "Agent could not be duplicated.");
    }
  }

  async function saveAssignments() {
    if (!selectedId) return;
    setSaving(true);
    const [toolResponse, connectionResponse] = await Promise.all([
      api(`/api/agents/${selectedId}/tools`, {
        method: "PUT",
        body: JSON.stringify({ tools: selectedTools }),
      }),
      api(`/api/agents/${selectedId}/connections`, {
        method: "PUT",
        body: JSON.stringify({ connections: selectedConnections }),
      }),
    ]);
    setSaving(false);
    if (!toolResponse.ok || !connectionResponse.ok) {
      setError(
        toolResponse.error?.message ??
          connectionResponse.error?.message ??
          "Assignments could not be saved.",
      );
      return;
    }
    await loadDetail(selectedId);
  }

  async function clearMemory(memoryId?: string) {
    if (!selectedId) return;
    const response = await api(
      memoryId
        ? `/api/agents/${selectedId}/memory/${memoryId}`
        : `/api/agents/${selectedId}/memory`,
      {
        method: "DELETE",
        body: JSON.stringify({ confirm: true }),
      },
    );
    if (response.ok) await loadDetail(selectedId);
  }

  async function runTest() {
    if (!selectedId) return;
    setTestResult(null);
    const response = await api<{ result: { message: string; status: string } }>(
      `/api/agents/${selectedId}/test`,
      {
        method: "POST",
        body: JSON.stringify({ prompt: testPrompt }),
      },
    );
    if (!response.ok) {
      setTestResult(response.error?.message ?? "Test failed safely.");
      return;
    }
    setTestResult(
      response.result?.message ?? response.result?.status ?? "Done.",
    );
    await loadDetail(selectedId);
  }

  return (
    <AlmaShell
      language={language}
      activeWorkspace="agents"
      title={t.title}
      onLanguageChange={updateLanguage}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 md:p-6">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid min-h-[calc(100dvh-8rem)] gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-lg border border-[#E5E7EB] bg-white">
            <div className="border-b border-[#E5E7EB] p-4">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={saving}
                onClick={() => createFromTemplate()}
              >
                <Plus className="h-4 w-4" />
                {t.newAgent}
              </button>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2">
                <Search className="h-4 w-4 text-[#6B7280]" />
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder={t.search}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1 text-xs">
                {(["all", "draft", "active", "paused"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      className={`rounded-md px-2 py-1 ${
                        statusFilter === status
                          ? "bg-black text-white"
                          : "bg-[#F7F7F8] text-[#6B7280]"
                      }`}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="max-h-[40dvh] overflow-y-auto p-2 lg:max-h-none">
              {loading ? (
                <p className="p-3 text-sm text-[#6B7280]">{t.loading}</p>
              ) : filteredAgents.length ? (
                filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    className={`mb-1 w-full rounded-lg px-3 py-3 text-left ${
                      selectedId === agent.id
                        ? "bg-[#F0F2F4] text-black"
                        : "text-[#4B5563] hover:bg-[#F7F7F8]"
                    }`}
                    onClick={() => {
                      setSelectedId(agent.id);
                      void loadDetail(agent.id);
                    }}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium">{agent.name}</span>
                      <span className="text-[10px] uppercase text-[#6B7280]">
                        {agent.status}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-[#6B7280]">
                      {agent.role}
                    </span>
                  </button>
                ))
              ) : (
                <p className="p-3 text-sm text-[#6B7280]">{t.empty}</p>
              )}
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <h2 className="text-sm font-medium">{t.templates}</h2>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {templates.map((template) => (
                  <button
                    key={template.key}
                    className="rounded-lg border border-[#E5E7EB] p-3 text-left hover:bg-[#F7F7F8]"
                    disabled={saving}
                    onClick={() => createFromTemplate(template.key)}
                  >
                    <span className="text-sm font-medium">{template.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#6B7280]">
                      {template.description}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {detail ? (
              <>
                <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <h1 className="text-xl font-medium">
                          {detail.agent.name}
                        </h1>
                        <p className="text-sm text-[#6B7280]">
                          {detail.agent.status} / {detail.agent.slug}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <IconButton
                        icon={Save}
                        label={t.save}
                        onClick={saveProfile}
                      />
                      <IconButton
                        icon={detail.agent.status === "active" ? Pause : Play}
                        label={
                          detail.agent.status === "active"
                            ? t.pause
                            : t.activate
                        }
                        onClick={() =>
                          setStatus(
                            detail.agent.status === "active"
                              ? "pause"
                              : "activate",
                          )
                        }
                      />
                      <IconButton
                        icon={Copy}
                        label={t.duplicate}
                        onClick={duplicateAgent}
                      />
                      <IconButton
                        icon={Trash2}
                        label={t.delete}
                        danger
                        onClick={() => setStatus("delete")}
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field label="Name">
                      <input
                        className={FIELD_CLASS}
                        value={String(form.name)}
                        onChange={(event) =>
                          setForm({ ...form, name: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Role">
                      <input
                        className={FIELD_CLASS}
                        value={String(form.role)}
                        onChange={(event) =>
                          setForm({ ...form, role: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Description">
                      <textarea
                        className={`${FIELD_CLASS} min-h-24`}
                        value={String(form.description)}
                        onChange={(event) =>
                          setForm({ ...form, description: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="System instructions">
                      <textarea
                        className={`${FIELD_CLASS} min-h-24`}
                        value={String(form.instructions)}
                        onChange={(event) =>
                          setForm({ ...form, instructions: event.target.value })
                        }
                      />
                    </Field>
                    <Field label="Language">
                      <select
                        className={FIELD_CLASS}
                        value={String(form.language)}
                        onChange={(event) =>
                          setForm({ ...form, language: event.target.value })
                        }
                      >
                        <option value="auto">Auto</option>
                        <option value="en">EN</option>
                        <option value="es">ES</option>
                      </select>
                    </Field>
                    <Field label="Approval mode">
                      <select
                        className={FIELD_CLASS}
                        value={String(form.approvalMode)}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            approvalMode: event.target.value,
                          })
                        }
                      >
                        <option value="always_ask">Always ask</option>
                        <option value="ask_for_sensitive">
                          Ask for sensitive actions
                        </option>
                        <option value="trusted_tools_only">
                          Trusted tools only
                        </option>
                      </select>
                    </Field>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(form.memoryEnabled)}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            memoryEnabled: event.target.checked,
                          })
                        }
                      />
                      Memory enabled
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(form.voiceEnabled)}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            voiceEnabled: event.target.checked,
                          })
                        }
                      />
                      ElevenLabs voice enabled
                    </label>
                    {form.voiceEnabled ? (
                      <Field label="Voice id">
                        <input
                          className={FIELD_CLASS}
                          value={String(form.voiceId)}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              voiceProvider: "elevenlabs",
                              voiceId: event.target.value,
                            })
                          }
                        />
                      </Field>
                    ) : null}
                  </div>
                </section>

                <section className="grid gap-5 xl:grid-cols-2">
                  <Panel icon={Wrench} title={t.tools}>
                    <div className="space-y-4">
                      {Object.entries(toolsByGroup).map(
                        ([group, groupTools]) => (
                          <div key={group}>
                            <h3 className="mb-2 text-xs font-medium uppercase text-[#6B7280]">
                              {group}
                            </h3>
                            <div className="space-y-2">
                              {groupTools.map((tool) => (
                                <label
                                  key={tool.name}
                                  className={`flex gap-3 rounded-lg border p-3 text-sm ${
                                    tool.available
                                      ? "border-[#E5E7EB]"
                                      : "border-[#E5E7EB] bg-[#F7F7F8] opacity-60"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={!tool.available}
                                    checked={selectedTools.includes(tool.name)}
                                    onChange={(event) => {
                                      setSelectedTools((current) =>
                                        event.target.checked
                                          ? [...current, tool.name]
                                          : current.filter(
                                              (name) => name !== tool.name,
                                            ),
                                      );
                                    }}
                                  />
                                  <span>
                                    <span className="font-medium">
                                      {tool.label}
                                    </span>
                                    <span className="ml-2 text-xs text-[#6B7280]">
                                      {tool.sensitive ? "approval" : ""}
                                      {tool.beta ? " beta" : ""}
                                      {tool.requiresConnection
                                        ? " connection"
                                        : ""}
                                    </span>
                                    <span className="block text-xs leading-5 text-[#6B7280]">
                                      {tool.description}
                                    </span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                      <button
                        className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                        disabled={saving}
                        onClick={saveAssignments}
                      >
                        {t.assign}
                      </button>
                    </div>
                  </Panel>

                  <div className="space-y-5">
                    <Panel icon={Link2} title={t.connections}>
                      {verifiedConnections.length ? (
                        <div className="space-y-2">
                          {verifiedConnections.map((connection) => (
                            <label
                              key={connection.id}
                              className="flex items-center gap-3 rounded-lg border border-[#E5E7EB] p-3 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selectedConnections.includes(
                                  connection.id,
                                )}
                                onChange={(event) =>
                                  setSelectedConnections((current) =>
                                    event.target.checked
                                      ? [...current, connection.id]
                                      : current.filter(
                                          (id) => id !== connection.id,
                                        ),
                                  )
                                }
                              />
                              <span>
                                <span className="font-medium">
                                  {connection.label}
                                </span>
                                <span className="block text-xs text-[#6B7280]">
                                  {connection.provider}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#6B7280]">
                          No verified Marketplace connections.
                        </p>
                      )}
                    </Panel>

                    <Panel icon={ShieldCheck} title={t.test}>
                      <textarea
                        className={`${FIELD_CLASS} min-h-24`}
                        placeholder={t.prompt}
                        value={testPrompt}
                        onChange={(event) => setTestPrompt(event.target.value)}
                      />
                      <button
                        className="mt-3 rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
                        onClick={runTest}
                      >
                        {t.run}
                      </button>
                      {testResult ? (
                        <p className="mt-3 rounded-lg bg-[#F7F7F8] p-3 text-sm text-[#374151]">
                          {testResult}
                        </p>
                      ) : null}
                    </Panel>
                  </div>
                </section>

                <section className="grid gap-5 xl:grid-cols-2">
                  <Panel icon={Database} title={t.memory}>
                    <div className="mb-3 flex justify-end">
                      <button
                        className="text-xs font-medium text-red-600"
                        onClick={() => clearMemory()}
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-2">
                      {detail.memories.length ? (
                        detail.memories.map((memory) => (
                          <div
                            key={memory.id}
                            className="rounded-lg border border-[#E5E7EB] p-3 text-sm"
                          >
                            <div className="flex justify-between gap-3">
                              <span className="font-medium">
                                {memory.memory_key}
                              </span>
                              <button
                                className="text-xs text-red-600"
                                onClick={() => clearMemory(memory.id)}
                              >
                                Clear
                              </button>
                            </div>
                            <p className="mt-1 text-xs text-[#6B7280]">
                              {memory.category} / importance {memory.importance}
                            </p>
                            <p className="mt-2 text-sm text-[#374151]">
                              {formatValue(memory.memory_value)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[#6B7280]">
                          No memories stored for this agent.
                        </p>
                      )}
                    </div>
                  </Panel>

                  <Panel icon={History} title={t.activity}>
                    <div className="space-y-3">
                      {[...(detail.activity.logs ?? [])].map((log) => (
                        <ActivityRow
                          key={log.id}
                          title={log.summary}
                          meta={`${log.event_type} / ${new Date(log.created_at).toLocaleString()}`}
                        />
                      ))}
                      {[...(detail.activity.approvals ?? [])].map(
                        (approval) => (
                          <ActivityRow
                            key={approval.id}
                            title={approval.action_summary}
                            meta={`${approval.status} / ${approval.tool_name ?? "approval"} / ${new Date(approval.requested_at).toLocaleString()}`}
                          />
                        ),
                      )}
                      {[...(detail.activity.executions ?? [])].map(
                        (execution) => (
                          <ActivityRow
                            key={execution.id}
                            title={execution.goal}
                            meta={`${execution.status} / ${new Date(execution.created_at).toLocaleString()}`}
                          />
                        ),
                      )}
                    </div>
                  </Panel>
                </section>
              </>
            ) : (
              <section className="rounded-lg border border-[#E5E7EB] bg-white p-8 text-center text-sm text-[#6B7280]">
                {t.empty}
              </section>
            )}
          </div>
        </section>
      </div>
    </AlmaShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium uppercase text-[#6B7280]">
        {label}
      </span>
      {children}
    </label>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#E5E7EB] bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function IconButton({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-[#E5E7EB] text-[#374151] hover:bg-[#F7F7F8]"
      }`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ActivityRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] p-3">
      <p className="text-sm text-[#374151]">{title}</p>
      <p className="mt-1 text-xs text-[#6B7280]">{meta}</p>
    </div>
  );
}
