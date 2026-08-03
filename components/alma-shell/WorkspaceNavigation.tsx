import {
  Bot,
  BriefcaseBusiness,
  CircleDollarSign,
  CreditCard,
  FileSearch,
  Home,
  Inbox,
  KeyRound,
  Library,
  MessagesSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  ChevronDown,
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
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-black ${
        active
          ? "bg-black text-white"
          : "text-[#596173] hover:bg-white hover:text-black"
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
      <div className="mb-5 space-y-1">
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
          itemKey="customers"
          label={labels.customers}
          icon={Users}
          onClick={() => onWorkspaceNavigate("customers")}
        />
        <NavigationButton
          activeWorkspace={activeWorkspace}
          itemKey="inbox"
          label={labels.inbox}
          icon={Inbox}
          onClick={() => onWorkspaceNavigate("inbox")}
        />
        <NavigationButton
          activeWorkspace={activeWorkspace}
          itemKey="work"
          label={labels.work}
          icon={BriefcaseBusiness}
          onClick={() => onWorkspaceNavigate("work")}
        />
        <NavigationButton
          activeWorkspace={activeWorkspace}
          itemKey="money"
          label={labels.money}
          icon={CircleDollarSign}
          onClick={() => onWorkspaceNavigate("money")}
        />
      </div>

      <details className="group mb-6 border-t border-[#E5E7EB] pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-[#7C8495] hover:bg-white">
          <span>{labels.more}</span>
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </summary>
        <div className="mt-2 space-y-1">
          <NavigationButton
            activeWorkspace={activeWorkspace}
            itemKey="automations"
            label={labels.automations}
            icon={Sparkles}
            onClick={() => onWorkspaceNavigate("automations")}
          />
          <NavigationButton
            activeWorkspace={activeWorkspace}
            itemKey="knowledge"
            label={labels.knowledge}
            icon={Library}
            onClick={() => onWorkspaceNavigate("knowledge")}
          />
          <NavigationButton
            activeWorkspace={activeWorkspace}
            itemKey="reports"
            label={labels.reports}
            icon={FileSearch}
            onClick={() => onWorkspaceNavigate("reports")}
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
            itemKey="connections"
            label={labels.connections}
            icon={MessagesSquare}
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
          <NavigationButton
            activeWorkspace={activeWorkspace}
            itemKey="files"
            label={labels.files}
            icon={KeyRound}
            onClick={() => onWorkspaceNavigate("files")}
          />
        </div>
      </details>
    </>
  );
}
