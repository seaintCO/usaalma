import type { RoutedWorkspace } from "@/lib/platform/workspaceRoutes";

export type AlmaShellLanguage = "en" | "es";
export type ConversationStatus = {
  active?: boolean;
  unread?: boolean;
  failed?: boolean;
};
export type ConversationNavItem = { id: string; title: string | null };
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
  heading: string;
  newChatLabel: string;
  deleteLabel: string;
  loadingLabel?: string;
  emptyLabel?: string;
  loading?: boolean;
  onConversationSelect: (conversationId: string) => void;
  onNewChat: () => void;
  onConversationDelete: (conversationId: string) => void;
};
export type AlmaMobileDrawerProps = {
  open: boolean;
  onMobileClose: () => void;
};
export type AlmaSidebarProps = AlmaSidebarNavigationProps &
  AlmaConversationSectionProps &
  AlmaMobileDrawerProps;
