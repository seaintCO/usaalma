import { Search } from "lucide-react";
import ConversationNavigation, {
  ConversationNewChatButton,
} from "./ConversationNavigation";
import WorkspaceNavigation from "./WorkspaceNavigation";
import type { AlmaMobileDrawerProps } from "./types";

export default function AlmaMobileDrawer({
  open,
  language,
  activeWorkspace,
  labels,
  conversations,
  selectedConversationId,
  statuses,
  deleteLabel,
  onMobileClose,
  onBrandClick,
  onLanguageChange,
  onNewChat,
  onConversationSelect,
  onConversationDelete,
  onHome,
  onAskAlma,
  onWorkspaceNavigate,
}: AlmaMobileDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <aside className="flex h-full w-72 flex-col border-r border-[#E5E7EB] bg-[#F7F7F8] md:w-64">
        <div className="px-5 pb-4 pt-5">
          <button onClick={onBrandClick} className="text-left">
            <div className="text-lg font-medium tracking-tight">ALMA</div>
            <div className="text-[10px] text-[#6B7280]">Powered by SEAINT</div>
          </button>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => onLanguageChange("en")}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium ${language === "en" ? "bg-black text-white" : "text-[#6B7280] hover:text-black"}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange("es")}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium ${language === "es" ? "bg-black text-white" : "text-[#6B7280] hover:text-black"}`}
            >
              ES
            </button>
          </div>
        </div>

        <div className="px-3">
          <ConversationNewChatButton
            label={labels.newChat}
            onNewChat={onNewChat}
          />

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
            <input
              placeholder={labels.search}
              className="w-full rounded-lg border border-[#E5E7EB] bg-transparent py-1.5 pl-9 pr-3 text-sm outline-none focus:border-black"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-8 text-sm">
          <ConversationNavigation
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            statuses={statuses}
            heading={labels.history}
            newChatLabel={labels.newChat}
            deleteLabel={deleteLabel}
            onConversationSelect={onConversationSelect}
            onConversationDelete={onConversationDelete}
          />

          <div className="mx-2 my-6 h-px bg-[#E5E7EB]" />

          <WorkspaceNavigation
            activeWorkspace={activeWorkspace}
            labels={labels}
            onHome={onHome}
            onAskAlma={onAskAlma}
            onWorkspaceNavigate={onWorkspaceNavigate}
          />
        </div>
      </aside>
      <button
        onClick={onMobileClose}
        className="flex-1 bg-black/20 backdrop-blur-sm"
      />
    </div>
  );
}
