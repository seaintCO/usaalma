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
  primary: string;
  secondary: string;
  myApps: string;
  viewAllApps: string;
  active: string;
  pro: string;
  beta?: string;
  included?: string;
  upgradeRequired?: string;
  comingSoon?: string;
  unavailable?: string;
  home: string;
  approvals: string;
  files: string;
  apps: string;
  connections: string;
  profile: string;
  planner: string;
  tasks: string;
  notes: string;
  documents: string;
  fitness: string;
  crm: string;
  construction: string;
  invoices: string;
  alma: string;
  images: string;
  creativeStudio: string;
  launchStudio: string;
  trader: string;
  agentBuilder: string;
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
  release: AlmaWorkspaceRelease;
};
export type AlmaWorkspaceRelease =
  "active" | "beta" | "pro" | "coming_soon" | "requires_setup";
export type AlmaWorkspaceReleaseOverrides = Partial<
  Record<AlmaWorkspaceNavigationKey, AlmaWorkspaceRelease>
>;
export type AlmaSidebarNavigationProps = {
  language: AlmaShellLanguage;
  activeWorkspace: AlmaWorkspaceNavigationKey;
  navigation: readonly AlmaNavigationItem[];
  onHome: () => void;
  onAskAlma: () => void;
  onWorkspaceNavigate: (workspace: RoutedWorkspace) => void;
  workspaceReleases?: AlmaWorkspaceReleaseOverrides;
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
  showConversations?: boolean;
  onMobileClose: () => void;
  onBrandClick: () => void;
  onLanguageChange: (language: AlmaShellLanguage) => void;
  onNewChat: () => void;
  onConversationSelect: (conversationId: string) => void;
  onConversationDelete: (conversationId: string) => void;
  onHome: () => void;
  onAskAlma: () => void;
  onWorkspaceNavigate: (workspace: RoutedWorkspace) => void;
  workspaceReleases?: AlmaWorkspaceReleaseOverrides;
};
export type AlmaSidebarProps = AlmaSidebarNavigationProps &
  AlmaConversationSectionProps &
  AlmaMobileDrawerProps;
