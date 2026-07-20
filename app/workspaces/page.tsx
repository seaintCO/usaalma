"use client";

import { Building2, Loader2, Mail, Plus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import { useAlmaLocale } from "@/lib/i18n/useAlmaLocale";

type Workspace = { id: string; name: string; type: string };
type RequestState = "loading" | "ready" | "error";

const copy = {
  en: {
    title: "Workspaces",
    subtitle: "Separate business, team, client, and project information.",
    personal: "Personal workspace",
    personalHelp: "Your private fallback when no shared workspace is selected.",
    create: "Create workspace",
    creating: "Creating…",
    name: "Workspace name",
    inviteTitle: "Invite a member",
    select: "Select a workspace",
    email: "Member email",
    invite: "Create invitation",
    inviting: "Creating invitation…",
    invited: "Invitation created. Membership is not active until accepted.",
    empty: "No owned workspaces yet.",
    loadError: "Workspaces could not be loaded.",
    createError: "The workspace could not be created.",
    inviteError: "The invitation could not be created.",
    ownerOnly: "Only the workspace owner can invite members.",
    retry: "Retry",
  },
  es: {
    title: "Espacios de trabajo",
    subtitle:
      "Separa la información de negocios, equipos, clientes y proyectos.",
    personal: "Espacio personal",
    personalHelp: "Tu espacio privado cuando no seleccionas uno compartido.",
    create: "Crear espacio",
    creating: "Creando…",
    name: "Nombre del espacio",
    inviteTitle: "Invitar a un miembro",
    select: "Selecciona un espacio",
    email: "Correo del miembro",
    invite: "Crear invitación",
    inviting: "Creando invitación…",
    invited:
      "Invitación creada. La membresía no estará activa hasta que se acepte.",
    empty: "Aún no tienes espacios propios.",
    loadError: "No se pudieron cargar los espacios.",
    createError: "No se pudo crear el espacio.",
    inviteError: "No se pudo crear la invitación.",
    ownerOnly: "Solo el propietario puede invitar miembros.",
    retry: "Reintentar",
  },
} as const;

export default function WorkspacesPage() {
  const { locale } = useAlmaLocale();
  const text = copy[locale];
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [state, setState] = useState<RequestState>("loading");
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadWorkspaces = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const response = await fetch("/api/workspaces/list", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error();
      setWorkspaces(data);
      setSelectedWorkspace((current) =>
        current && data.some((item: Workspace) => item.id === current)
          ? current
          : (data[0]?.id ?? ""),
      );
      setState("ready");
    } catch {
      setState("error");
      setError(text.loadError);
    }
  }, [text.loadError]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadWorkspaces(), 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspaces]);

  async function createWorkspace() {
    if (!name.trim() || creating) return;
    setCreating(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/workspaces/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type: "business" }),
      });
      if (!response.ok) throw new Error();
      setName("");
      await loadWorkspaces();
    } catch {
      setError(text.createError);
    } finally {
      setCreating(false);
    }
  }

  async function inviteMember() {
    if (!selectedWorkspace || !inviteEmail.trim() || inviting) return;
    setInviting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/workspaces/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: selectedWorkspace,
          email: inviteEmail.trim(),
          role: "member",
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        if (data?.error?.code === "WORKSPACE_OWNER_REQUIRED")
          throw new Error("OWNER_REQUIRED");
        throw new Error();
      }
      setInviteEmail("");
      setMessage(text.invited);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === "OWNER_REQUIRED"
          ? text.ownerOnly
          : text.inviteError,
      );
    } finally {
      setInviting(false);
    }
  }

  return (
    <AlmaShell
      language={locale}
      activeWorkspace="workspaces"
      title={text.title}
    >
      <div className="mx-auto w-full max-w-6xl space-y-5 px-3 py-5 md:px-6 md:py-8">
        <header className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm md:p-7">
          <Building2 className="h-6 w-6" />
          <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
            {text.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
            {text.subtitle}
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
          <article className="rounded-3xl border border-[#E5E7EB] bg-[#111] p-5 text-white">
            <Users className="h-5 w-5 text-teal-300" />
            <h2 className="mt-5 text-xl font-medium">{text.personal}</h2>
            <p className="mt-2 text-sm leading-6 text-[#A3AAB3]">
              {text.personalHelp}
            </p>
          </article>
          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-medium">{text.create}</h2>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={text.name}
                aria-label={text.name}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#D1D5DB] px-3 outline-none focus:border-black"
              />
              <button
                type="button"
                disabled={!name.trim() || creating}
                onClick={() => void createWorkspace()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                {creating ? <Loader2 className="animate-spin" /> : <Plus />}
                {creating ? text.creating : text.create}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-medium">{text.inviteTitle}</h2>
          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <select
              value={selectedWorkspace}
              onChange={(event) => setSelectedWorkspace(event.target.value)}
              aria-label={text.select}
              className="min-h-11 rounded-xl border border-[#D1D5DB] px-3"
            >
              <option value="">{text.select}</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder={text.email}
              aria-label={text.email}
              className="min-h-11 rounded-xl border border-[#D1D5DB] px-3 outline-none focus:border-black"
            />
            <button
              type="button"
              disabled={!selectedWorkspace || !inviteEmail.trim() || inviting}
              onClick={() => void inviteMember()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {inviting ? <Loader2 className="animate-spin" /> : <Mail />}
              {inviting ? text.inviting : text.invite}
            </button>
          </div>
          {message ? (
            <p className="mt-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </section>

        {state === "loading" ? (
          <div className="flex min-h-32 items-center justify-center">
            <Loader2 className="animate-spin" />
          </div>
        ) : state === "error" ? (
          <button
            type="button"
            onClick={() => void loadWorkspaces()}
            className="rounded-xl border px-4 py-2"
          >
            {text.retry}
          </button>
        ) : workspaces.length ? (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <article
                key={workspace.id}
                className="rounded-2xl border border-[#E5E7EB] bg-white p-5"
              >
                <Users className="h-5 w-5 text-[#6B7280]" />
                <h2 className="mt-4 truncate font-medium">{workspace.name}</h2>
                <p className="mt-1 text-sm text-[#6B7280]">{workspace.type}</p>
              </article>
            ))}
          </section>
        ) : (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
            {text.empty}
          </div>
        )}
      </div>
    </AlmaShell>
  );
}
