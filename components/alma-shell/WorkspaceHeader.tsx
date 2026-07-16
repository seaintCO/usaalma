import { Menu, PenSquare } from "lucide-react";

type WorkspaceHeaderProps = {
  title: string;
  onMenuClick: () => void;
  onAskAlma: () => void;
};

export default function WorkspaceHeader({
  title,
  onMenuClick,
  onAskAlma,
}: WorkspaceHeaderProps) {
  return (
    <div className="flex h-14 w-full max-w-full shrink-0 items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-4 md:hidden">
      <button
        onClick={onMenuClick}
        className="shrink-0 rounded-lg p-2 hover:bg-[#F7F7F8]"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="min-w-0 flex-1 truncate text-center text-lg font-medium tracking-tight">
        {title}
      </span>
      <button
        onClick={onAskAlma}
        className="shrink-0 rounded-lg p-2 hover:bg-[#F7F7F8]"
      >
        <PenSquare className="h-5 w-5" />
      </button>
    </div>
  );
}
