import { AppWindow, Bot, Home, Settings, ShieldCheck } from "lucide-react";
import type { ComponentType } from "react";
import type { RoutedWorkspace } from "@/lib/platform/workspaceRoutes";
import type { AlmaShellLabels, AlmaWorkspaceNavigationKey } from "./types";

type AlmaMobileBottomNavProps = {
  activeWorkspace: AlmaWorkspaceNavigationKey;
  labels: AlmaShellLabels;
  onHome: () => void;
  onAskAlma: () => void;
  onWorkspaceNavigate: (workspace: RoutedWorkspace) => void;
};

type ItemProps = {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
};

function BottomNavItem({ active, icon: Icon, label, onClick }: ItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-inset focus:ring-black ${
        active ? "text-black" : "text-[#6B7280]"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

export default function AlmaMobileBottomNav({
  activeWorkspace,
  labels,
  onHome,
  onAskAlma,
  onWorkspaceNavigate,
}: AlmaMobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 border-t border-[#E5E7EB] bg-white/95 shadow-[0_-8px_24px_rgba(17,17,17,0.06)] backdrop-blur md:hidden">
      <BottomNavItem
        active={activeWorkspace === "home"}
        icon={Home}
        label={labels.home}
        onClick={onHome}
      />
      <BottomNavItem
        active={activeWorkspace === "chat"}
        icon={Bot}
        label={labels.alma}
        onClick={onAskAlma}
      />
      <BottomNavItem
        active={activeWorkspace === "approvals"}
        icon={ShieldCheck}
        label={labels.approvals}
        onClick={() => onWorkspaceNavigate("approvals")}
      />
      <BottomNavItem
        active={activeWorkspace === "apps"}
        icon={AppWindow}
        label={labels.apps}
        onClick={() => onWorkspaceNavigate("apps")}
      />
      <BottomNavItem
        active={activeWorkspace === "settings"}
        icon={Settings}
        label={labels.profile}
        onClick={() => onWorkspaceNavigate("settings")}
      />
    </nav>
  );
}
