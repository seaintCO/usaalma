import type { RoutedWorkspace } from "@/lib/platform/workspaceRoutes";

export type AlmaShellLanguage = "en" | "es";
export type ConversationStatus = {
  active?: boolean;
  unread?: boolean;
  failed?: boolean;
};
export type ConversationNavItem = { id: string; title: string | null };
export type ConversationEditingState = { id: string | null; title: string };
export type AlmaNavigationItem = {
  key: RoutedWorkspace;
  label: string;
  release: "active" | "beta" | "coming_soon" | "requires_setup";
};
export type AlmaSidebarNavigationProps = {
  language: AlmaShellLanguage;
  activeWorkspace: "home" | "chat";
  navigation: readonly AlmaNavigationItem[];
  onHome: () => void;
  onAskAlma: () => void;
  onWorkspaceNavigate: (workspace: RoutedWorkspace) => void;
};
export type AlmaConversationSectionProps = {
  conversations: readonly ConversationNavItem[];
  selectedConversationId: string | null;
  statuses: Readonly<Record<string, ConversationStatus>>;
  editing: ConversationEditingState;
  onConversationSelect: (conversationId: string) => void;
  onNewChat: () => void;
  onConversationRenameStart: (conversationId: string, title: string) => void;
  onConversationRenameChange: (title: string) => void;
  onConversationRenameSave: (conversationId: string) => void;
  onConversationRenameCancel: () => void;
  onConversationDelete: (conversationId: string) => void;
};
export type AlmaMobileDrawerProps = {
  open: boolean;
  onMobileClose: () => void;
};
export type AlmaSidebarProps = AlmaSidebarNavigationProps &
  AlmaConversationSectionProps &
  AlmaMobileDrawerProps;
