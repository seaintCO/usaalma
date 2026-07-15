import type { RoutedWorkspace } from "@/lib/platform/workspaceRoutes";

export type AlmaShellLanguage = "en" | "es";
export type AlmaWorkspaceNavigationKey = "home" | "chat" | RoutedWorkspace;
export type AlmaShellLabels = {
  language: string;
  newChat: string;
  search: string;
  history: string;
  core: string;
  business: string;
  ai: string;
  platform: string;
  active: string;
  pro: string;
  home: string;
  planner: string;
  tasks: string;
  notes: string;
  documents: string;
  fitness: string;
  crm: string;
  invoices: string;
  alma: string;
  images: string;
  creativeStudio: string;
  launchStudio: string;
  trader: string;
  marketplace: string;
  billing: string;
  settings: string;
};
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
  activeWorkspace: AlmaWorkspaceNavigationKey;
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
  language: AlmaShellLanguage;
  activeWorkspace: AlmaWorkspaceNavigationKey;
  labels: AlmaShellLabels;
  conversations: readonly ConversationNavItem[];
  selectedConversationId: string | null;
  statuses: Readonly<Record<string, ConversationStatus>>;
  deleteLabel: string;
  onMobileClose: () => void;
  onBrandClick: () => void;
  onLanguageChange: (language: AlmaShellLanguage) => void;
  onNewChat: () => void;
  onConversationSelect: (conversationId: string) => void;
  onConversationDelete: (conversationId: string) => void;
  onHome: () => void;
  onAskAlma: () => void;
  onWorkspaceNavigate: (workspace: RoutedWorkspace) => void;
};
export type AlmaSidebarProps = AlmaSidebarNavigationProps &
  AlmaConversationSectionProps &
  AlmaMobileDrawerProps;
