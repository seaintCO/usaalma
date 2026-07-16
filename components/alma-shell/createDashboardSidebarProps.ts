import type {
  AlmaSidebarProps,
  ConversationNavItem,
  ConversationStatus,
} from "./types";

type Input = Omit<AlmaSidebarProps, "conversations" | "statuses"> & {
  conversations: readonly ConversationNavItem[];
  statuses: Readonly<Record<string, ConversationStatus>>;
};
export function createDashboardSidebarProps(input: Input): AlmaSidebarProps {
  return {
    ...input,
    conversations: input.conversations.map((conversation) => ({
      ...conversation,
    })),
    statuses: { ...input.statuses },
  };
}
