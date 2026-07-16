"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DASHBOARD_ROUTE,
  WORKSPACE_ROUTES,
  type RoutedWorkspace,
} from "@/lib/platform/workspaceRoutes";
import AlmaDesktopSidebar from "./AlmaDesktopSidebar";
import AlmaMobileDrawer from "./AlmaMobileDrawer";
import WorkspaceHeader from "./WorkspaceHeader";
import type {
  AlmaShellLabels,
  AlmaShellLanguage,
  AlmaWorkspaceNavigationKey,
  AlmaWorkspaceReleaseOverrides,
} from "./types";

const EMPTY_CONVERSATIONS = [] as const;
const EMPTY_STATUSES = {};

export const ALMA_SHELL_LABELS: Record<AlmaShellLanguage, AlmaShellLabels> = {
  en: {
    language: "Language",
    newChat: "New Chat",
    search: "Search...",
    history: "History",
    core: "Core",
    business: "Business",
    ai: "AI",
    platform: "Platform",
    active: "Active",
    pro: "Pro",
    beta: "Beta",
    home: "Home",
    planner: "Planner",
    tasks: "Tasks",
    notes: "Notes",
    documents: "Documents",
    fitness: "Fitness",
    crm: "CRM",
    construction: "Construction",
    invoices: "Invoices",
    alma: "ALMA",
    images: "Images",
    creativeStudio: "Creative Studio",
    launchStudio: "Launch Studio",
    trader: "Trader",
    agentBuilder: "Agent Builder",
    marketplace: "Marketplace",
    billing: "Billing",
    settings: "Settings",
  },
  es: {
    language: "Idioma",
    newChat: "Nuevo Chat",
    search: "Buscar...",
    history: "Historial",
    core: "Core",
    business: "Negocio",
    ai: "IA",
    platform: "Plataforma",
    active: "Activo",
    pro: "Pro",
    beta: "Beta",
    home: "Inicio",
    planner: "Planificador",
    tasks: "Tareas",
    notes: "Notas",
    documents: "Documentos",
    fitness: "Fitness",
    crm: "CRM",
    construction: "Construccion",
    invoices: "Facturas",
    alma: "ALMA",
    images: "Imágenes",
    creativeStudio: "Estudio Creativo",
    launchStudio: "Launch Studio",
    trader: "Trader",
    agentBuilder: "Agent Builder",
    marketplace: "Marketplace",
    billing: "Pagos",
    settings: "Configuración",
  },
};

const SHELL_WORKSPACE_RELEASES: AlmaWorkspaceReleaseOverrides = {
  tasks: "active",
  images: "active",
  creative: "beta",
  launch: "beta",
  trader: "beta",
  agents: "beta",
  construction: "beta",
};

type AlmaShellProps = {
  language: AlmaShellLanguage;
  activeWorkspace: AlmaWorkspaceNavigationKey;
  title: string;
  description?: string;
  children: ReactNode;
  onLanguageChange?: (language: AlmaShellLanguage) => void;
  actions?: ReactNode;
  releaseBadge?: string;
  onBack?: () => void;
};

export default function AlmaShell({
  language,
  activeWorkspace,
  title,
  children,
  onLanguageChange,
}: AlmaShellProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const labels = ALMA_SHELL_LABELS[language];

  function updateLanguage(next: AlmaShellLanguage) {
    onLanguageChange?.(next);
  }

  function openDashboard() {
    setMobileOpen(false);
    router.push(DASHBOARD_ROUTE);
  }

  function openWorkspace(workspace: RoutedWorkspace) {
    setMobileOpen(false);
    router.push(WORKSPACE_ROUTES[workspace]);
  }

  return (
    <main className="flex h-[100dvh] w-full max-w-full overflow-hidden bg-white text-[#111111]">
      <div className="hidden md:block">
        <AlmaDesktopSidebar
          language={language}
          activeWorkspace={activeWorkspace}
          labels={labels}
          onBrandClick={openDashboard}
          onLanguageChange={updateLanguage}
          onNewChat={openDashboard}
          onHome={openDashboard}
          onAskAlma={openDashboard}
          onWorkspaceNavigate={openWorkspace}
          workspaceReleases={SHELL_WORKSPACE_RELEASES}
        />
      </div>

      <AlmaMobileDrawer
        open={mobileOpen}
        language={language}
        activeWorkspace={activeWorkspace}
        labels={labels}
        conversations={EMPTY_CONVERSATIONS}
        selectedConversationId={null}
        statuses={EMPTY_STATUSES}
        deleteLabel="Delete"
        onMobileClose={() => setMobileOpen(false)}
        onBrandClick={openDashboard}
        onLanguageChange={updateLanguage}
        onNewChat={openDashboard}
        onConversationSelect={openDashboard}
        onConversationDelete={() => undefined}
        showConversations={false}
        onHome={openDashboard}
        onAskAlma={openDashboard}
        onWorkspaceNavigate={openWorkspace}
        workspaceReleases={SHELL_WORKSPACE_RELEASES}
      />

      <section className="relative flex h-full min-w-0 flex-1 flex-col">
        <WorkspaceHeader
          title={title}
          onMenuClick={() => setMobileOpen(true)}
          onAskAlma={openDashboard}
        />
        <div className="min-h-0 w-full max-w-full flex-1 overflow-y-auto bg-[#F7F7F8]">
          {children}
        </div>
      </section>
    </main>
  );
}
