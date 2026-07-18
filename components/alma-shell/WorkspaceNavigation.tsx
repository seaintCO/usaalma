import {
  AppWindow,
  Bot,
  CreditCard,
  FileText,
  Home,
  KeyRound,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { ComponentType } from "react";
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
