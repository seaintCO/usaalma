import {
  Activity,
  Bot,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  FolderOpen,
  Hammer,
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
import type {
  AlmaShellLabels,
  AlmaWorkspaceNavigationKey,
  AlmaWorkspaceRelease,
  AlmaWorkspaceReleaseOverrides,
} from "./types";

type WorkspaceNavigationProps = {
  activeWorkspace: AlmaWorkspaceNavigationKey;
  labels: AlmaShellLabels;
  onHome: () => void;
  onAskAlma: () => void;
  onWorkspaceNavigate: (workspace: RoutedWorkspace) => void;
  workspaceReleases?: AlmaWorkspaceReleaseOverrides;
};

type WorkspaceButtonProps = {
  activeWorkspace: AlmaWorkspaceNavigationKey;
  itemKey: AlmaWorkspaceNavigationKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  release?: AlmaWorkspaceRelease;
  releaseLabel?: string;
  onClick: () => void;
};

function releaseText(labels: AlmaShellLabels, release?: AlmaWorkspaceRelease) {
  if (release === "active") return labels.active;
  if (release === "beta") return labels.beta ?? "Beta";
  if (release === "pro") return labels.pro;
  return undefined;
}

function releaseClass(release?: AlmaWorkspaceRelease) {
  if (release === "active") return "text-green-600";
  return "text-black";
}

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
      {releaseLabel ? (
        <span className={`text-[10px] font-medium ${releaseClass(release)}`}>
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
  workspaceReleases = {},
}: WorkspaceNavigationProps) {
  const releaseFor = (
    key: AlmaWorkspaceNavigationKey,
    fallback: AlmaWorkspaceRelease,
  ) => workspaceReleases[key] ?? fallback;

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
          release={releaseFor("home", "active")}
          releaseLabel={releaseText(labels, releaseFor("home", "active"))}
          onClick={onHome}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="planner"
          label={labels.planner}
          icon={Calendar}
          release={releaseFor("planner", "active")}
          releaseLabel={releaseText(labels, releaseFor("planner", "active"))}
          onClick={() => onWorkspaceNavigate("planner")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="tasks"
          label={labels.tasks}
          icon={CheckCircle2}
          release={releaseFor("tasks", "active")}
          releaseLabel={releaseText(labels, releaseFor("tasks", "active"))}
          onClick={() => onWorkspaceNavigate("tasks")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="notes"
          label={labels.notes}
          icon={FileText}
          release={releaseFor("notes", "active")}
          releaseLabel={releaseText(labels, releaseFor("notes", "active"))}
          onClick={() => onWorkspaceNavigate("notes")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="documents"
          label={labels.documents}
          icon={FolderOpen}
          release={releaseFor("documents", "active")}
          releaseLabel={releaseText(labels, releaseFor("documents", "active"))}
          onClick={() => onWorkspaceNavigate("documents")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="fitness"
          label={labels.fitness}
          icon={Activity}
          release={releaseFor("fitness", "active")}
          releaseLabel={releaseText(labels, releaseFor("fitness", "active"))}
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
          release={releaseFor("crm", "active")}
          releaseLabel={releaseText(labels, releaseFor("crm", "active"))}
          onClick={() => onWorkspaceNavigate("crm")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="construction"
          label={labels.construction}
          icon={Hammer}
          release={releaseFor("construction", "beta")}
          releaseLabel={releaseText(labels, releaseFor("construction", "beta"))}
          onClick={() => onWorkspaceNavigate("construction")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="invoicing"
          label={labels.invoices}
          icon={ReceiptText}
          release={releaseFor("invoicing", "active")}
          releaseLabel={releaseText(labels, releaseFor("invoicing", "active"))}
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
          release={releaseFor("chat", "pro")}
          releaseLabel={releaseText(labels, releaseFor("chat", "pro"))}
          onClick={onAskAlma}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="images"
          label={labels.images}
          icon={ImageIcon}
          release={releaseFor("images", "pro")}
          releaseLabel={releaseText(labels, releaseFor("images", "pro"))}
          onClick={() => onWorkspaceNavigate("images")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="creative"
          label={labels.creativeStudio}
          icon={Settings}
          release={releaseFor("creative", "pro")}
          releaseLabel={releaseText(labels, releaseFor("creative", "pro"))}
          onClick={() => onWorkspaceNavigate("creative")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="launch"
          label={labels.launchStudio}
          icon={Rocket}
          release={releaseFor("launch", "pro")}
          releaseLabel={releaseText(labels, releaseFor("launch", "pro"))}
          onClick={() => onWorkspaceNavigate("launch")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="trader"
          label={labels.trader}
          icon={Activity}
          release={releaseFor("trader", "pro")}
          releaseLabel={releaseText(labels, releaseFor("trader", "pro"))}
          onClick={() => onWorkspaceNavigate("trader")}
        />
        <WorkspaceButton
          activeWorkspace={activeWorkspace}
          itemKey="agents"
          label={labels.agentBuilder}
          icon={Bot}
          release={releaseFor("agents", "beta")}
          releaseLabel={releaseText(labels, releaseFor("agents", "beta"))}
          onClick={() => onWorkspaceNavigate("agents")}
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
