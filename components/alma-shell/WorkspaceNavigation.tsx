import {
  Activity,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  FolderOpen,
  Home,
  ImageIcon,
  Mic,
  ReceiptText,
  Rocket,
  Settings,
  Store,
  Users,
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
};

type WorkspaceButtonProps = {
  activeWorkspace: AlmaWorkspaceNavigationKey;
  itemKey: AlmaWorkspaceNavigationKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  release?: "active" | "pro";
  releaseLabel?: string;
  onClick: () => void;
};

function WorkspaceButton({
  activeWorkspace,
  itemKey,
  label,
  icon: Icon,
  release,
  releaseLabel,
  onClick,
}: WorkspaceButtonProps) {
  const navClass = `flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition ${
    activeWorkspace === itemKey
      ? "bg-gray-200 text-black"
      : "text-[#6B7280] hover:bg-gray-200 hover:text-black"
  }`;

  return (
    <button onClick={onClick} className={navClass}>
      <span className="flex items-center gap-2.5">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      {release === "active" && releaseLabel ? (
        <span className="text-[10px] font-medium text-green-600">
          {releaseLabel.toUpperCase()}
        </span>
      ) : release === "pro" && releaseLabel ? (
        <span className="text-[10px] font-medium text-black">
          {releaseLabel.toUpperCase()}
        </span>
      ) : null}
    </button>
  );
}

type PlatformButtonProps = Pick<
  WorkspaceButtonProps,
  "activeWorkspace" | "itemKey" | "label" | "icon" | "onClick"
>;

function PlatformButton({
  activeWorkspace,
  itemKey,
  label,
  icon: Icon,
  onClick,
}: PlatformButtonProps) {
  const navClass = `flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition ${
    activeWorkspace === itemKey
      ? "bg-gray-200 text-black"
      : "text-[#6B7280] hover:bg-gray-200 hover:text-black"
  }`;

  return (
    <button onClick={onClick} className={navClass}>
      <Icon className="h-4 w-4" />
      {label}
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
          {labels.core}
        </h5>

        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="home"
          label={labels.home}
          icon={Home}
          release="active"
          releaseLabel={labels.active}
          onClick={onHome}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="planner"
          label={labels.planner}
          icon={Calendar}
          release="active"
          releaseLabel={labels.active}
          onClick={() => onWorkspaceNavigate("planner")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="tasks"
          label={labels.tasks}
          icon={CheckCircle2}
          release="active"
          releaseLabel={labels.active}
          onClick={() => onWorkspaceNavigate("tasks")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="notes"
          label={labels.notes}
          icon={FileText}
          release="active"
          releaseLabel={labels.active}
          onClick={() => onWorkspaceNavigate("notes")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="documents"
          label={labels.documents}
          icon={FolderOpen}
          release="active"
          releaseLabel={labels.active}
          onClick={() => onWorkspaceNavigate("documents")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="fitness"
          label={labels.fitness}
          icon={Activity}
          release="active"
          releaseLabel={labels.active}
          onClick={() => onWorkspaceNavigate("fitness")}
        />
      </div>

      <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

      <div className="mb-6 space-y-1">
        <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">
          {labels.business}
        </h5>

        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="crm"
          label={labels.crm}
          icon={Users}
          release="active"
          releaseLabel={labels.active}
          onClick={() => onWorkspaceNavigate("crm")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="invoicing"
          label={labels.invoices}
          icon={ReceiptText}
          release="active"
          releaseLabel={labels.active}
          onClick={() => onWorkspaceNavigate("invoicing")}
        />
      </div>

      <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

      <div className="mb-6 space-y-1">
        <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">
          {labels.ai}
        </h5>

        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="chat"
          label={labels.alma}
          icon={Mic}
          release="pro"
          releaseLabel={labels.pro}
          onClick={onAskAlma}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="images"
          label={labels.images}
          icon={ImageIcon}
          release="pro"
          releaseLabel={labels.pro}
          onClick={() => onWorkspaceNavigate("images")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="creative"
          label={labels.creativeStudio}
          icon={Settings}
          release="pro"
          releaseLabel={labels.pro}
          onClick={() => onWorkspaceNavigate("creative")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="launch"
          label={labels.launchStudio}
          icon={Rocket}
          release="pro"
          releaseLabel={labels.pro}
          onClick={() => onWorkspaceNavigate("launch")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="trader"
          label={labels.trader}
          icon={Activity}
          release="pro"
          releaseLabel={labels.pro}
          onClick={() => onWorkspaceNavigate("trader")}
        />
      </div>

      <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

      <div className="mb-6 space-y-1">
        <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">
          {labels.platform}
        </h5>

        <PlatformButton
          activeWorkspace={activeWorkspace}
          itemKey="marketplace"
          label={labels.marketplace}
          icon={Store}
          onClick={() => onWorkspaceNavigate("marketplace")}
        />
        <PlatformButton
          activeWorkspace={activeWorkspace}
          itemKey="billing"
          label={labels.billing}
          icon={CreditCard}
          onClick={() => onWorkspaceNavigate("billing")}
        />
        <PlatformButton
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
