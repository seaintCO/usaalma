import {
  AppWindow,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileText,
  Hammer,
  Home,
  Image,
  KeyRound,
  Languages,
  MessageSquareText,
  NotebookPen,
  ReceiptText,
  Settings,
  ShieldCheck,
  TrendingUp,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";
import { useCallback, useEffect, useState } from "react";
import type { PinnedApp } from "@/lib/platform/app-navigation/types";
import type { RoutedWorkspace } from "@/lib/platform/workspaceRoutes";
import type { AlmaShellLabels, AlmaWorkspaceNavigationKey } from "./types";

type WorkspaceNavigationProps = {
  activeWorkspace: AlmaWorkspaceNavigationKey;
  labels: AlmaShellLabels;
  onHome: () => void;
  onAskAlma: () => void;
  onWorkspaceNavigate: (workspace: RoutedWorkspace) => void;
  workspaceReleases?: unknown;
};

type NavigationButtonProps = {
  activeWorkspace: AlmaWorkspaceNavigationKey;
  itemKey: AlmaWorkspaceNavigationKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
};

function NavigationButton({
  activeWorkspace,
  itemKey,
  label,
  icon: Icon,
  onClick,
}: NavigationButtonProps) {
  const active = activeWorkspace === itemKey;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-black ${
        active
          ? "bg-black text-white"
          : "text-[#6B7280] hover:bg-white hover:text-black"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function WorkspaceNavigation({
  activeWorkspace,
  labels,
  onHome,
  onAskAlma,
  onWorkspaceNavigate,
}: WorkspaceNavigationProps) {
  const [pinnedApps, setPinnedApps] = useState<PinnedApp[]>([]);
  const [appsExpanded, setAppsExpanded] = useState(true);
  const loadPinnedApps = useCallback(async () => {
    try {
      const response = await fetch("/api/app-navigation", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = await response.json();
      setPinnedApps(
        Array.isArray(payload.apps) ? payload.apps.slice(0, 8) : [],
      );
    } catch {
      // Navigation remains usable when this optional personalized read fails.
    }
  }, []);

  useEffect(() => {
    void loadPinnedApps();
    const refresh = () => void loadPinnedApps();
    window.addEventListener("alma:app-navigation-changed", refresh);
    return () =>
      window.removeEventListener("alma:app-navigation-changed", refresh);
  }, [loadPinnedApps]);

  return (
    <>
      <div className="mb-6 space-y-1">
        <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">
          {labels.primary}
        </h5>
        <NavigationButton
          activeWorkspace={activeWorkspace}
          itemKey="home"
          label={labels.home}
          icon={Home}
          onClick={onHome}
        />
        <NavigationButton
          activeWorkspace={activeWorkspace}
          itemKey="chat"
          label={labels.alma}
          icon={Bot}
          onClick={onAskAlma}
        />
        <NavigationButton
          activeWorkspace={activeWorkspace}
          itemKey="approvals"
          label={labels.approvals}
          icon={ShieldCheck}
          onClick={() => onWorkspaceNavigate("approvals")}
        />
        <NavigationButton
          activeWorkspace={activeWorkspace}
          itemKey="files"
          label={labels.files}
          icon={FileText}
          onClick={() => onWorkspaceNavigate("files")}
        />
        <NavigationButton
          activeWorkspace={activeWorkspace}
          itemKey="apps"
          label={labels.apps}
          icon={AppWindow}
          onClick={() => onWorkspaceNavigate("apps")}
        />
      </div>

      <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

      <div className="mb-6 space-y-1" aria-label={labels.myApps}>
        <button
          type="button"
          onClick={() => setAppsExpanded((expanded) => !expanded)}
          aria-expanded={appsExpanded}
          className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-[#6B7280] hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-black"
        >
          {labels.myApps}
          {appsExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        {appsExpanded ? (
          <div className="max-h-60">
            {pinnedApps.slice(0, 6).map((app) => {
              const Icon = MODULE_ICONS[app.moduleId] ?? AppWindow;
              return (
                <a
                  key={app.moduleId}
                  href={app.route}
                  title={localizedAppName(app, labels)}
                  className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[#6B7280] transition hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {localizedAppName(app, labels)}
                  </span>
                </a>
              );
            })}
            <button
              type="button"
              onClick={() => onWorkspaceNavigate("apps")}
              className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[#6B7280] hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-black"
            >
              {labels.viewAllApps || "View all apps"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

      <div className="mb-6 space-y-1">
        <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">
          {labels.secondary}
        </h5>
        <NavigationButton
          activeWorkspace={activeWorkspace}
          itemKey="connections"
          label={labels.connections}
          icon={KeyRound}
          onClick={() => onWorkspaceNavigate("connections")}
        />
        <NavigationButton
          activeWorkspace={activeWorkspace}
          itemKey="billing"
          label={labels.billing}
          icon={CreditCard}
          onClick={() => onWorkspaceNavigate("billing")}
        />
        <NavigationButton
          activeWorkspace={activeWorkspace}
          itemKey="settings"
          label={labels.settings}
          icon={Settings}
          onClick={() => onWorkspaceNavigate("settings")}
        />
      </div>
    </>
  );
}

const MODULE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  tasks: ClipboardList,
  notes: NotebookPen,
  planner: CalendarDays,
  documents: FileText,
  communications: MessageSquareText,
  translator: Languages,
  office: BriefcaseBusiness,
  construction: Hammer,
  invoicing: ReceiptText,
  images: Image,
  trader: TrendingUp,
  fitness: Dumbbell,
  builder: Wrench,
};

function localizedAppName(app: PinnedApp, labels: AlmaShellLabels) {
  const names: Partial<Record<string, string>> = {
    tasks: labels.tasks,
    notes: labels.notes,
    planner: labels.planner,
    documents: labels.documents,
    fitness: labels.fitness,
    crm: labels.crm,
    construction: labels.construction,
    invoicing: labels.invoices,
    images: labels.images,
    creative_studio: labels.creativeStudio,
    launch_studio: labels.launchStudio,
    trader: labels.trader,
    agent_builder: labels.agentBuilder,
  };
  return names[app.moduleId] ?? app.name;
}
