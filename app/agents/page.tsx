"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  Copy,
  Database,
  FileText,
  History,
  Link2,
  Loader2,
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
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

type AgentStatus = "draft" | "active" | "paused";
type ApprovalMode = "always_ask" | "ask_for_sensitive" | "trusted_tools_only";
type MobileSection = "agents" | "templates" | "detail" | "test" | "activity";

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
type ActivityStep = {
  id: string;
  execution_id: string;
  kind: string;
  status: string;
  tool_name: string | null;
  error: string | null;
  created_at: string;
};
type ActivityFeed = {
  executions?: {
    id: string;
    status: string;
    trigger_type: string;
    goal: string;
    result?: { requestedTool?: string; final?: string; message?: string };
    error?: string | null;
    created_at: string;
    completed_at?: string | null;
  }[];
  steps?: ActivityStep[];
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
  activity: ActivityFeed;
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
  "w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-3 text-sm text-black outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-[#F7F7F8]";

const TEXT = {
  en: {
    title: "Agent Builder",
    beta: "Beta",
    subtitle:
      "Create persisted ALMA agents with scoped tools, verified connections, memory, approvals, and safe test runs.",
    sections: {
      agents: "Agents",
      templates: "Templates",
      detail: "Agent Detail",
      test: "Test",
      activity: "Activity",
    },
    newAgent: "New Agent",
    search: "Search agents",
    all: "All",
    draft: "Draft",
    active: "Active",
    paused: "Paused",
    emptyAgents: "No agents yet.",
    emptySelect: "Select or create an agent to configure it.",
    loading: "Loading Agent Builder...",
    profile: "Profile",
    name: "Name",
    role: "Role",
    description: "Description",
    instructions: "Instructions",
    language: "Language",
    approvalMode: "Approval mode",
    memoryEnabled: "Memory enabled",
    voiceEnabled: "ElevenLabs voice enabled",
    voiceId: "Voice ID",
    save: "Save profile",
    activate: "Activate",
    pause: "Pause",
    duplicate: "Duplicate",
    delete: "Delete",
    confirmDelete: "Click again to archive",
    createFromTemplate: "Create agent",
    templateTools: "Recommended tools",
    tools: "Tools",
    connections: "Connections",
    assignments: "Save assignments",
    requiresApproval: "approval",
    betaTool: "beta",
    connectionNeeded: "connection required",
    unavailableTool: "Unavailable until module or connection is ready.",
    noConnections: "No verified Marketplace connections.",
    noTools: "No tools are available for this account yet.",
    noSecrets:
      "Only connection references are stored here. Tokens and secrets are never shown.",
    memory: "Memory",
    clear: "Clear",
    clearAll: "Clear all",
    confirmClearAll: "Click again to clear all",
    noMemory: "No memories stored for this agent.",
    test: "Test Agent",
    prompt: "Ask this agent to do something safe.",
    run: "Run test",
    running: "Running safe test...",
    noActivity: "No activity yet.",
    executions: "Executions",
    approvals: "Approvals",
    steps: "Steps",
    logs: "Logs",
    limitations:
      "No schedules, multi-agent delegation, unrestricted external actions, payments, or trade execution in V1.",
    approvalLabels: {
      always_ask: "Always ask",
      ask_for_sensitive: "Ask for sensitive actions",
      trusted_tools_only: "Trusted tools only",
    },
    languageLabels: {
      auto: "Auto",
      en: "English",
      es: "Spanish",
    },
    groups: {
      Productivity: "Productivity",
      Business: "Business",
      Creative: "Creative",
      Finance: "Finance",
      Communication: "Communication",
      Developer: "Developer",
    },
  },
  es: {
    title: "Agent Builder",
    beta: "Beta",
    subtitle:
      "Crea agentes persistidos de ALMA con herramientas limitadas, conexiones verificadas, memoria, aprobaciones y pruebas seguras.",
    sections: {
      agents: "Agentes",
      templates: "Plantillas",
      detail: "Detalle",
      test: "Prueba",
      activity: "Actividad",
    },
    newAgent: "Nuevo agente",
    search: "Buscar agentes",
    all: "Todos",
    draft: "Borrador",
    active: "Activo",
    paused: "Pausado",
    emptyAgents: "Todavia no hay agentes.",
    emptySelect: "Selecciona o crea un agente para configurarlo.",
    loading: "Cargando Agent Builder...",
    profile: "Perfil",
    name: "Nombre",
    role: "Rol",
    description: "Descripcion",
    instructions: "Instrucciones",
    language: "Idioma",
    approvalMode: "Modo de aprobacion",
    memoryEnabled: "Memoria activada",
    voiceEnabled: "Voz ElevenLabs activada",
    voiceId: "ID de voz",
    save: "Guardar perfil",
    activate: "Activar",
    pause: "Pausar",
    duplicate: "Duplicar",
    delete: "Eliminar",
    confirmDelete: "Haz clic otra vez para archivar",
    createFromTemplate: "Crear agente",
    templateTools: "Herramientas recomendadas",
    tools: "Herramientas",
    connections: "Conexiones",
    assignments: "Guardar permisos",
    requiresApproval: "aprobacion",
    betaTool: "beta",
    connectionNeeded: "requiere conexion",
    unavailableTool: "No disponible hasta activar el modulo o la conexion.",
    noConnections: "No hay conexiones verificadas en Marketplace.",
    noTools: "Todavia no hay herramientas disponibles para esta cuenta.",
    noSecrets:
      "Aqui solo se guardan referencias de conexion. Nunca se muestran tokens ni secretos.",
    memory: "Memoria",
    clear: "Borrar",
    clearAll: "Borrar todo",
    confirmClearAll: "Haz clic otra vez para borrar todo",
    noMemory: "No hay memorias guardadas para este agente.",
    test: "Probar agente",
    prompt: "Pidele a este agente algo seguro.",
    run: "Probar",
    running: "Ejecutando prueba segura...",
    noActivity: "Todavia no hay actividad.",
    executions: "Ejecuciones",
    approvals: "Aprobaciones",
    steps: "Pasos",
    logs: "Registros",
    limitations:
      "V1 no incluye horarios, delegacion multiagente, acciones externas libres, pagos ni ejecucion de operaciones.",
    approvalLabels: {
      always_ask: "Preguntar siempre",
      ask_for_sensitive: "Preguntar en acciones sensibles",
      trusted_tools_only: "Solo herramientas confiables",
    },
    languageLabels: {
      auto: "Auto",
      en: "Ingles",
      es: "Espanol",
    },
    groups: {
      Productivity: "Productividad",
      Business: "Negocio",
      Creative: "Creativo",
      Finance: "Finanzas",
      Communication: "Comunicacion",
      Developer: "Desarrollo",
    },
  },
} as const;

const MOBILE_SECTIONS: MobileSection[] = [
  "agents",
  "templates",
  "detail",
  "test",
  "activity",
];

type AgentBuilderCopy = (typeof TEXT)[keyof typeof TEXT];

async function api<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const payload = (await response.json()) as ApiResponse<T>;
    if (!response.ok && !payload.error) {
      return {
        ...payload,
        ok: false,
        error: { code: "request_failed", message: "Request failed safely." },
      };
    }
    return payload;
  } catch {
    return {
      ok: false,
      error: { code: "network_error", message: "Agent Builder is offline." },
    } as ApiResponse<T>;
  }
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function AgentsPage() {
  const { locale: language } = useAlmaLocale();
  const [mobileSection, setMobileSection] = useState<MobileSection>("agents");
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
  const [mutation, setMutation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testPrompt, setTestPrompt] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const t = TEXT[language];
  const mutating = Boolean(mutation);

  function applyDetail(next: AgentDetail) {
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
    setConfirmDelete(false);
    setConfirmClearAll(false);
  }

  async function loadDetail(agentId: string) {
    const next = await api<AgentDetail>(`/api/agents/${agentId}`);
    if (!next.ok || !next.agent) {
      setError(next.error?.message ?? "Agent unavailable.");
      return;
    }
    applyDetail(next);
  }

  async function load(preferredId = selectedId) {
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
    const nextAgents = agentResponse.agents ?? [];
    setAgents(nextAgents);
    setTemplates(optionsResponse.templates ?? []);
    setTools(optionsResponse.availableTools ?? []);
    setVerifiedConnections(optionsResponse.verifiedConnections ?? []);
    const nextSelected =
      nextAgents.find((agent) => agent.id === preferredId)?.id ??
      nextAgents[0]?.id ??
      null;
    setSelectedId(nextSelected);
    if (nextSelected) {
      await loadDetail(nextSelected);
    } else {
      setDetail(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredAgents = useMemo(
    () =>
      agents.filter((agent) => {
        const matchesStatus =
          statusFilter === "all" || agent.status === statusFilter;
        const matchesQuery = `${agent.name} ${agent.role} ${agent.description}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesStatus && matchesQuery;
      }),
    [agents, query, statusFilter],
  );

  const toolsByGroup = useMemo(() => {
    return tools.reduce<Record<string, BuilderTool[]>>((groups, tool) => {
      groups[tool.group] = [...(groups[tool.group] ?? []), tool];
      return groups;
    }, {});
  }, [tools]);

  const statusCounts = useMemo(
    () => ({
      all: agents.length,
      draft: agents.filter((agent) => agent.status === "draft").length,
      active: agents.filter((agent) => agent.status === "active").length,
      paused: agents.filter((agent) => agent.status === "paused").length,
    }),
    [agents],
  );

  async function withMutation(name: string, action: () => Promise<void>) {
    if (mutation) return;
    setMutation(name);
    setError(null);
    try {
      await action();
    } finally {
      setMutation(null);
    }
  }

  async function refreshSelected(agentId = selectedId) {
    const response = await api<{ agents: Agent[] }>("/api/agents");
    if (response.ok) setAgents(response.agents ?? []);
    if (agentId) await loadDetail(agentId);
  }

  async function createFromTemplate(templateKey?: string) {
    await withMutation("create", async () => {
      const response = await api<{ agent: Agent }>("/api/agents", {
        method: "POST",
        body: JSON.stringify(
          templateKey ? { templateKey } : { name: "New Agent" },
        ),
      });
      if (!response.ok || !response.agent) {
        setError(response.error?.message ?? "Agent could not be created.");
        return;
      }
      setSelectedId(response.agent.id);
      setMobileSection("detail");
      await refreshSelected(response.agent.id);
    });
  }

  async function saveProfile() {
    if (!selectedId) return;
    await withMutation("save", async () => {
      const response = await api<{ agent: Agent }>(
        `/api/agents/${selectedId}`,
        {
          method: "PATCH",
          body: JSON.stringify(form),
        },
      );
      if (!response.ok) {
        setError(response.error?.message ?? "Agent could not be saved.");
        return;
      }
      await refreshSelected(selectedId);
    });
  }

  async function setStatus(action: "activate" | "pause" | "delete") {
    if (!selectedId) return;
    if (action === "delete" && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await withMutation(action, async () => {
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
        setMobileSection("agents");
      }
      await load(action === "delete" ? null : selectedId);
    });
  }

  async function duplicateAgent() {
    if (!selectedId) return;
    await withMutation("duplicate", async () => {
      const response = await api<{ agent: Agent }>(
        `/api/agents/${selectedId}/duplicate`,
        {
          method: "POST",
          body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
        },
      );
      if (!response.ok || !response.agent) {
        setError(response.error?.message ?? "Agent could not be duplicated.");
        return;
      }
      setSelectedId(response.agent.id);
      setMobileSection("detail");
      await refreshSelected(response.agent.id);
    });
  }

  async function saveAssignments() {
    if (!selectedId) return;
    await withMutation("assignments", async () => {
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
      if (!toolResponse.ok || !connectionResponse.ok) {
        setError(
          toolResponse.error?.message ??
            connectionResponse.error?.message ??
            "Assignments could not be saved.",
        );
        return;
      }
      await loadDetail(selectedId);
    });
  }

  async function clearMemory(memoryId?: string) {
    if (!selectedId) return;
    if (!memoryId && !confirmClearAll) {
      setConfirmClearAll(true);
      return;
    }
    await withMutation("memory", async () => {
      const response = await api(
        memoryId
          ? `/api/agents/${selectedId}/memory/${memoryId}`
          : `/api/agents/${selectedId}/memory`,
        {
          method: "DELETE",
          body: JSON.stringify({ confirm: true }),
        },
      );
      if (!response.ok) {
        setError(response.error?.message ?? "Memory could not be cleared.");
        return;
      }
      setConfirmClearAll(false);
      await loadDetail(selectedId);
    });
  }

  async function runTest() {
    if (!selectedId || !testPrompt.trim()) return;
    await withMutation("test", async () => {
      setTestResult(null);
      const response = await api<{
        result: { message: string; status: string; requestedTool?: string };
      }>(`/api/agents/${selectedId}/test`, {
        method: "POST",
        body: JSON.stringify({ prompt: testPrompt }),
      });
      if (!response.ok) {
        setTestResult(response.error?.message ?? "Test failed safely.");
        return;
      }
      setTestResult(
        response.result?.message ?? response.result?.status ?? "Done.",
      );
      await loadDetail(selectedId);
    });
  }

  return (
    <AlmaShell language={language} activeWorkspace="agents" title={t.title}>
      <main className="min-w-0 overflow-x-hidden bg-[#F7F7F8] px-3 py-4 text-black md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-4">
          <header className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
                    {t.title}
                  </h1>
                  <span className="rounded-full border border-black px-2.5 py-1 text-xs font-medium">
                    {t.beta}
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6B7280] md:text-base">
                  {t.subtitle}
                </p>
              </div>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50 md:w-auto"
                disabled={mutating}
                onClick={() => createFromTemplate()}
              >
                <Plus className="h-4 w-4" />
                {mutation === "create" ? t.loading : t.newAgent}
              </button>
            </div>
            <p className="mt-4 rounded-xl bg-[#F7F7F8] px-3 py-2 text-xs leading-5 text-[#4B5563]">
              {t.limitations}
            </p>
          </header>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <nav className="flex gap-2 overflow-x-auto pb-1 md:hidden">
            {MOBILE_SECTIONS.map((section) => (
              <button
                key={section}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${
                  mobileSection === section
                    ? "border-black bg-black text-white"
                    : "border-[#E5E7EB] bg-white text-[#374151]"
                }`}
                onClick={() => setMobileSection(section)}
              >
                {t.sections[section]}
              </button>
            ))}
          </nav>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
            <div
              className={`${mobileSection === "agents" ? "block" : "hidden"} min-w-0 xl:block`}
            >
              <AgentsPanel
                agents={filteredAgents}
                counts={statusCounts}
                loading={loading}
                query={query}
                selectedId={selectedId}
                statusFilter={statusFilter}
                text={t}
                onCreate={() => createFromTemplate()}
                onQuery={setQuery}
                onSelect={(agentId) => {
                  setSelectedId(agentId);
                  setMobileSection("detail");
                  void loadDetail(agentId);
                }}
                onStatusFilter={setStatusFilter}
              />
            </div>

            <div className="min-w-0 space-y-4">
              <div
                className={`${mobileSection === "templates" ? "block" : "hidden"} xl:block`}
              >
                <TemplatesPanel
                  templates={templates}
                  text={t}
                  disabled={mutating}
                  onCreate={createFromTemplate}
                />
              </div>
              <div
                className={`${mobileSection === "detail" ? "block" : "hidden"} xl:block`}
              >
                {detail ? (
                  <DetailPanel
                    detail={detail}
                    form={form}
                    mutating={mutating}
                    selectedConnections={selectedConnections}
                    selectedTools={selectedTools}
                    text={t}
                    toolsByGroup={toolsByGroup}
                    verifiedConnections={verifiedConnections}
                    confirmDelete={confirmDelete}
                    confirmClearAll={confirmClearAll}
                    onAssignmentSave={saveAssignments}
                    onClearMemory={clearMemory}
                    onDuplicate={duplicateAgent}
                    onForm={setForm}
                    onSave={saveProfile}
                    onSelectedConnections={setSelectedConnections}
                    onSelectedTools={setSelectedTools}
                    onStatus={setStatus}
                  />
                ) : (
                  <EmptyPanel text={t.emptySelect} />
                )}
              </div>
            </div>

            <div className="min-w-0 space-y-4">
              <div
                className={`${mobileSection === "test" ? "block" : "hidden"} xl:block`}
              >
                {detail ? (
                  <TestPanel
                    prompt={testPrompt}
                    result={testResult}
                    running={mutation === "test"}
                    text={t}
                    onPrompt={setTestPrompt}
                    onRun={runTest}
                  />
                ) : (
                  <EmptyPanel text={t.emptySelect} />
                )}
              </div>
              <div
                className={`${mobileSection === "activity" ? "block" : "hidden"} xl:block`}
              >
                {detail ? (
                  <ActivityPanel activity={detail.activity} text={t} />
                ) : (
                  <EmptyPanel text={t.emptySelect} />
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </AlmaShell>
  );
}

function AgentsPanel({
  agents,
  counts,
  loading,
  query,
  selectedId,
  statusFilter,
  text,
  onCreate,
  onQuery,
  onSelect,
  onStatusFilter,
}: {
  agents: Agent[];
  counts: Record<"all" | AgentStatus, number>;
  loading: boolean;
  query: string;
  selectedId: string | null;
  statusFilter: "all" | AgentStatus;
  text: AgentBuilderCopy;
  onCreate: () => void;
  onQuery: (query: string) => void;
  onSelect: (agentId: string) => void;
  onStatusFilter: (status: "all" | AgentStatus) => void;
}) {
  const statuses = ["all", "draft", "active", "paused"] as const;
  return (
    <Panel icon={Bot} title={text.sections.agents}>
      <button
        className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white"
        onClick={onCreate}
      >
        <Plus className="h-4 w-4" />
        {text.newAgent}
      </button>
      <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-[#6B7280]" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder={text.search}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {statuses.map((status) => (
          <button
            key={status}
            className={`rounded-xl border px-3 py-2 text-left text-xs font-medium ${
              statusFilter === status
                ? "border-black bg-black text-white"
                : "border-[#E5E7EB] bg-white text-[#4B5563]"
            }`}
            onClick={() => onStatusFilter(status)}
          >
            <span className="block">
              {status === "all" ? text.all : text[status]}
            </span>
            <span className="text-[11px] opacity-70">{counts[status]}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="rounded-xl bg-[#F7F7F8] p-3 text-sm text-[#6B7280]">
            {text.loading}
          </p>
        ) : agents.length ? (
          agents.map((agent) => (
            <button
              key={agent.id}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                selectedId === agent.id
                  ? "border-black bg-white shadow-sm"
                  : "border-[#E5E7EB] bg-white hover:border-[#A3A3A3]"
              }`}
              onClick={() => onSelect(agent.id)}
            >
              <span className="flex min-w-0 items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {agent.name}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[#6B7280]">
                    {agent.role}
                  </span>
                </span>
                <StatusBadge status={agent.status} text={text} />
              </span>
              {agent.description ? (
                <span className="mt-3 line-clamp-2 block text-xs leading-5 text-[#6B7280]">
                  {agent.description}
                </span>
              ) : null}
            </button>
          ))
        ) : (
          <p className="rounded-xl bg-[#F7F7F8] p-3 text-sm text-[#6B7280]">
            {text.emptyAgents}
          </p>
        )}
      </div>
    </Panel>
  );
}

function TemplatesPanel({
  templates,
  text,
  disabled,
  onCreate,
}: {
  templates: AgentTemplate[];
  text: AgentBuilderCopy;
  disabled: boolean;
  onCreate: (templateKey: string) => void;
}) {
  return (
    <Panel icon={Sparkles} title={text.sections.templates}>
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        {templates.map((template) => (
          <article
            key={template.key}
            className="flex min-w-0 flex-col rounded-2xl border border-[#E5E7EB] bg-white p-4"
          >
            <h2 className="truncate text-base font-semibold">
              {template.name}
            </h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-[#6B7280]">
              {template.description}
            </p>
            <p className="mt-3 text-xs font-medium uppercase text-[#6B7280]">
              {text.templateTools}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#4B5563]">
              {template.recommendedTools.join(", ")}
            </p>
            <button
              className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-black px-3 text-sm font-medium disabled:opacity-50"
              disabled={disabled}
              onClick={() => onCreate(template.key)}
            >
              <Plus className="h-4 w-4" />
              {text.createFromTemplate}
            </button>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function DetailPanel({
  detail,
  form,
  mutating,
  selectedConnections,
  selectedTools,
  text,
  toolsByGroup,
  verifiedConnections,
  confirmDelete,
  confirmClearAll,
  onAssignmentSave,
  onClearMemory,
  onDuplicate,
  onForm,
  onSave,
  onSelectedConnections,
  onSelectedTools,
  onStatus,
}: {
  detail: AgentDetail;
  form: AgentForm;
  mutating: boolean;
  selectedConnections: string[];
  selectedTools: string[];
  text: AgentBuilderCopy;
  toolsByGroup: Record<string, BuilderTool[]>;
  verifiedConnections: Connection[];
  confirmDelete: boolean;
  confirmClearAll: boolean;
  onAssignmentSave: () => void;
  onClearMemory: (memoryId?: string) => void;
  onDuplicate: () => void;
  onForm: (form: AgentForm) => void;
  onSave: () => void;
  onSelectedConnections: (connections: string[]) => void;
  onSelectedTools: (tools: string[]) => void;
  onStatus: (action: "activate" | "pause" | "delete") => void;
}) {
  return (
    <div className="space-y-4">
      <Panel icon={FileText} title={text.sections.detail}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold">
                {detail.agent.name}
              </h2>
              <StatusBadge status={detail.agent.status} text={text} />
            </div>
            <p className="mt-1 truncate text-xs text-[#6B7280]">
              {detail.agent.slug}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <ActionButton icon={Save} label={text.save} onClick={onSave} />
            <ActionButton
              icon={detail.agent.status === "active" ? Pause : Play}
              label={
                detail.agent.status === "active" ? text.pause : text.activate
              }
              onClick={() =>
                onStatus(
                  detail.agent.status === "active" ? "pause" : "activate",
                )
              }
            />
            <ActionButton
              icon={Copy}
              label={text.duplicate}
              onClick={onDuplicate}
            />
            <ActionButton
              icon={Trash2}
              label={confirmDelete ? text.confirmDelete : text.delete}
              danger
              onClick={() => onStatus("delete")}
            />
          </div>
        </div>

        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2">
          <Field label={text.name}>
            <input
              className={FIELD_CLASS}
              disabled={mutating}
              value={form.name}
              onChange={(event) =>
                onForm({ ...form, name: event.target.value })
              }
            />
          </Field>
          <Field label={text.role}>
            <input
              className={FIELD_CLASS}
              disabled={mutating}
              value={form.role}
              onChange={(event) =>
                onForm({ ...form, role: event.target.value })
              }
            />
          </Field>
          <Field label={text.description}>
            <textarea
              className={`${FIELD_CLASS} min-h-28 resize-y`}
              disabled={mutating}
              value={form.description}
              onChange={(event) =>
                onForm({ ...form, description: event.target.value })
              }
            />
          </Field>
          <Field label={text.instructions}>
            <textarea
              className={`${FIELD_CLASS} min-h-28 resize-y`}
              disabled={mutating}
              value={form.instructions}
              onChange={(event) =>
                onForm({ ...form, instructions: event.target.value })
              }
            />
          </Field>
          <Field label={text.language}>
            <select
              className={FIELD_CLASS}
              disabled={mutating}
              value={form.language}
              onChange={(event) =>
                onForm({ ...form, language: event.target.value })
              }
            >
              {(["auto", "en", "es"] as const).map((item) => (
                <option key={item} value={item}>
                  {text.languageLabels[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={text.approvalMode}>
            <select
              className={FIELD_CLASS}
              disabled={mutating}
              value={form.approvalMode}
              onChange={(event) =>
                onForm({ ...form, approvalMode: event.target.value })
              }
            >
              {(
                [
                  "always_ask",
                  "ask_for_sensitive",
                  "trusted_tools_only",
                ] as const
              ).map((mode) => (
                <option key={mode} value={mode}>
                  {text.approvalLabels[mode]}
                </option>
              ))}
            </select>
          </Field>
          <ToggleField
            checked={form.memoryEnabled}
            label={text.memoryEnabled}
            onChange={(checked) => onForm({ ...form, memoryEnabled: checked })}
          />
          <ToggleField
            checked={form.voiceEnabled}
            label={text.voiceEnabled}
            onChange={(checked) =>
              onForm({
                ...form,
                voiceEnabled: checked,
                voiceProvider: checked ? "elevenlabs" : "",
                voiceId: checked ? form.voiceId : "",
              })
            }
          />
          {form.voiceEnabled ? (
            <Field label={text.voiceId}>
              <input
                className={FIELD_CLASS}
                disabled={mutating}
                value={form.voiceId}
                onChange={(event) =>
                  onForm({
                    ...form,
                    voiceProvider: "elevenlabs",
                    voiceId: event.target.value,
                  })
                }
              />
            </Field>
          ) : null}
        </div>
      </Panel>

      <Panel icon={Wrench} title={text.tools}>
        <div className="space-y-4">
          {Object.entries(toolsByGroup).length ? (
            Object.entries(toolsByGroup).map(([group, groupTools]) => (
              <div key={group} className="min-w-0">
                <h3 className="mb-2 text-xs font-semibold uppercase text-[#6B7280]">
                  {text.groups[group as keyof typeof text.groups] ?? group}
                </h3>
                <div className="grid min-w-0 gap-2 md:grid-cols-2">
                  {groupTools.map((tool) => (
                    <ToolCard
                      key={tool.name}
                      selected={selectedTools.includes(tool.name)}
                      text={text}
                      tool={tool}
                      onToggle={(checked) =>
                        onSelectedTools(
                          checked
                            ? [...selectedTools, tool.name]
                            : selectedTools.filter(
                                (name) => name !== tool.name,
                              ),
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-[#F7F7F8] p-3 text-sm text-[#6B7280]">
              {text.noTools}
            </p>
          )}
        </div>
      </Panel>

      <Panel icon={Link2} title={text.connections}>
        {verifiedConnections.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {verifiedConnections.map((connection) => (
              <label
                key={connection.id}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedConnections.includes(connection.id)}
                  onChange={(event) =>
                    onSelectedConnections(
                      event.target.checked
                        ? [...selectedConnections, connection.id]
                        : selectedConnections.filter(
                            (id) => id !== connection.id,
                          ),
                    )
                  }
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {connection.label}
                  </span>
                  <span className="block truncate text-xs text-[#6B7280]">
                    {connection.provider}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-[#F7F7F8] p-3 text-sm text-[#6B7280]">
            {text.noConnections}
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-[#6B7280]">
          {text.noSecrets}
        </p>
        <button
          className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
          disabled={mutating}
          onClick={onAssignmentSave}
        >
          {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {text.assignments}
        </button>
      </Panel>

      <Panel icon={Database} title={text.memory}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-[#6B7280]">
            {detail.memories.length
              ? `${detail.memories.length} stored memories`
              : text.noMemory}
          </p>
          <button
            className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50"
            disabled={mutating || !detail.memories.length}
            onClick={() => onClearMemory()}
          >
            {confirmClearAll ? text.confirmClearAll : text.clearAll}
          </button>
        </div>
        <div className="space-y-2">
          {detail.memories.map((memory) => (
            <article
              key={memory.id}
              className="min-w-0 rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{memory.memory_key}</h3>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {memory.category} / {memory.importance} /{" "}
                    {formatDate(memory.updated_at)}
                  </p>
                </div>
                <button
                  className="shrink-0 text-xs font-medium text-red-600"
                  disabled={mutating}
                  onClick={() => onClearMemory(memory.id)}
                >
                  {text.clear}
                </button>
              </div>
              <p className="mt-2 break-words text-sm leading-6 text-[#374151]">
                {formatValue(memory.memory_value)}
              </p>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function TestPanel({
  prompt,
  result,
  running,
  text,
  onPrompt,
  onRun,
}: {
  prompt: string;
  result: string | null;
  running: boolean;
  text: AgentBuilderCopy;
  onPrompt: (prompt: string) => void;
  onRun: () => void;
}) {
  return (
    <Panel icon={ShieldCheck} title={text.test}>
      <textarea
        className={`${FIELD_CLASS} min-h-36 resize-y`}
        placeholder={text.prompt}
        value={prompt}
        onChange={(event) => onPrompt(event.target.value)}
      />
      <button
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
        disabled={running || !prompt.trim()}
        onClick={onRun}
      >
        {running ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Activity className="h-4 w-4" />
        )}
        {running ? text.running : text.run}
      </button>
      {result ? (
        <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] p-3">
          <p className="break-words text-sm leading-6 text-[#374151]">
            {result}
          </p>
        </div>
      ) : null}
    </Panel>
  );
}

function ActivityPanel({
  activity,
  text,
}: {
  activity: ActivityFeed;
  text: AgentBuilderCopy;
}) {
  const hasActivity =
    Boolean(activity.logs?.length) ||
    Boolean(activity.approvals?.length) ||
    Boolean(activity.executions?.length) ||
    Boolean(activity.steps?.length);
  return (
    <Panel icon={History} title={text.sections.activity}>
      {!hasActivity ? (
        <p className="rounded-xl bg-[#F7F7F8] p-3 text-sm text-[#6B7280]">
          {text.noActivity}
        </p>
      ) : (
        <div className="space-y-4">
          <ActivityGroup title={text.executions}>
            {(activity.executions ?? []).map((execution) => (
              <ActivityRow
                key={execution.id}
                title={
                  execution.result?.final ??
                  execution.result?.message ??
                  execution.status
                }
                meta={`${execution.status} / ${execution.result?.requestedTool ?? "manual"} / ${formatDate(execution.created_at)}`}
              />
            ))}
          </ActivityGroup>
          <ActivityGroup title={text.approvals}>
            {(activity.approvals ?? []).map((approval) => (
              <ActivityRow
                key={approval.id}
                title={approval.action_summary}
                meta={`${approval.status} / ${approval.tool_name ?? "approval"} / ${formatDate(approval.requested_at)}`}
              />
            ))}
          </ActivityGroup>
          <ActivityGroup title={text.steps}>
            {(activity.steps ?? []).map((step) => (
              <ActivityRow
                key={step.id}
                title={step.tool_name ?? step.kind}
                meta={`${step.status} / ${step.error ?? "safe"} / ${formatDate(step.created_at)}`}
              />
            ))}
          </ActivityGroup>
          <ActivityGroup title={text.logs}>
            {(activity.logs ?? []).map((log) => (
              <ActivityRow
                key={log.id}
                title={log.summary}
                meta={`${log.event_type} / ${formatDate(log.created_at)}`}
              />
            ))}
          </ActivityGroup>
        </div>
      )}
    </Panel>
  );
}

function ToolCard({
  selected,
  text,
  tool,
  onToggle,
}: {
  selected: boolean;
  text: AgentBuilderCopy;
  tool: BuilderTool;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex min-w-0 gap-3 rounded-xl border p-3 text-sm ${
        tool.available
          ? "border-[#E5E7EB] bg-white"
          : "border-[#E5E7EB] bg-[#F7F7F8] opacity-70"
      }`}
    >
      <input
        className="mt-1 shrink-0"
        type="checkbox"
        disabled={!tool.available}
        checked={selected}
        onChange={(event) => onToggle(event.target.checked)}
      />
      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="font-medium">{tool.label}</span>
          {tool.sensitive ? <Tag>{text.requiresApproval}</Tag> : null}
          {tool.beta ? <Tag>{text.betaTool}</Tag> : null}
          {tool.requiresConnection ? <Tag>{text.connectionNeeded}</Tag> : null}
        </span>
        <span className="mt-1 block text-xs leading-5 text-[#6B7280]">
          {tool.available ? tool.description : text.unavailableTool}
        </span>
      </span>
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 text-sm">
      <span className="mb-1.5 block text-xs font-semibold uppercase text-[#6B7280]">
        {label}
      </span>
      {children}
    </label>
  );
}

function ToggleField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm font-medium">
      <span>{label}</span>
      <input
        className="h-5 w-5"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
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
    <section className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F7F7F8]">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="truncate text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-6 text-sm text-[#6B7280] shadow-sm">
      {text}
    </section>
  );
}

function ActionButton({
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
      className={`flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-[#E5E7EB] text-[#374151] hover:bg-[#F7F7F8]"
      }`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function StatusBadge({
  status,
  text,
}: {
  status: AgentStatus;
  text: AgentBuilderCopy;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E5E7EB] px-2 py-1 text-[11px] font-medium uppercase text-[#4B5563]">
      <CheckCircle2 className="h-3 w-3" />
      {text[status]}
    </span>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[#F0F2F4] px-2 py-0.5 text-[10px] font-medium uppercase text-[#4B5563]">
      {children}
    </span>
  );
}

function ActivityGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-[#6B7280]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ActivityRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#E5E7EB] bg-white p-3">
      <p className="break-words text-sm leading-6 text-[#374151]">{title}</p>
      <p className="mt-1 break-words text-xs leading-5 text-[#6B7280]">
        {meta}
      </p>
    </div>
  );
}
