import { PenSquare, PlusCircle } from "lucide-react";
import type { AlmaConversationSectionProps } from "./types";

type ConversationNewChatButtonProps = Pick<
  AlmaConversationSectionProps,
  "onNewChat"
> & {
  label: string;
};

export function ConversationNewChatButton({
  label,
  onNewChat,
}: ConversationNewChatButtonProps) {
  return (
    <button
      onClick={onNewChat}
      className="mb-4 flex w-full items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium shadow-sm"
    >
      <span className="flex items-center gap-2">
        <PlusCircle className="h-4 w-4 text-[#6B7280]" />
        {label}
      </span>
      <PenSquare className="h-4 w-4 text-[#6B7280]" />
    </button>
  );
}

type ConversationNavigationProps = Omit<
  AlmaConversationSectionProps,
  "onNewChat"
>;

export default function ConversationNavigation({
  conversations,
  selectedConversationId,
  statuses,
  heading,
  newChatLabel,
  deleteLabel,
  loadingLabel,
  emptyLabel,
  loading = false,
  onConversationSelect,
  onConversationDelete,
}: ConversationNavigationProps) {
  return (
    <>
      <h5 className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-[#6B7280]">
        {heading}
      </h5>

      {loading && loadingLabel ? (
        <div className="px-2 py-1.5 text-[#6B7280]">{loadingLabel}</div>
      ) : conversations.length === 0 && emptyLabel ? (
        <div className="px-2 py-1.5 text-[#6B7280]">{emptyLabel}</div>
      ) : (
        conversations.map((chat) => (
          <div
            key={chat.id}
            className="group flex items-center gap-1 rounded-lg hover:bg-gray-200"
          >
            <button
              onClick={() => onConversationSelect(chat.id)}
              className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-[#6B7280] hover:text-black"
            >
              <span className="flex items-center gap-1.5">
                <span className="truncate">{chat.title || newChatLabel}</span>
                {statuses[chat.id]?.failed ? (
                  <span
                    aria-label="Response failed"
                    className="h-2 w-2 rounded-full bg-red-500"
                  />
                ) : statuses[chat.id]?.active ? (
                  <span
                    aria-label="Generating response"
                    className="h-2 w-2 animate-pulse rounded-full bg-blue-500"
                  />
                ) : statuses[chat.id]?.unread &&
                  selectedConversationId !== chat.id ? (
                  <span
                    aria-label="Unread response"
                    className="h-2 w-2 rounded-full bg-black"
                  />
                ) : null}
              </span>
            </button>
            <button
              onClick={() => onConversationDelete(chat.id)}
              className="hidden px-1 text-xs text-red-500 group-hover:block"
            >
              {deleteLabel}
            </button>
          </div>
        ))
      )}
    </>
  );
}
