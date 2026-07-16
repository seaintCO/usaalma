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
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 md:hidden">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 hover:bg-[#F7F7F8]"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="text-lg font-medium tracking-tight">{title}</span>
      <button onClick={onAskAlma} className="rounded-lg p-2 hover:bg-[#F7F7F8]">
        <PenSquare className="h-5 w-5" />
      </button>
    </div>
  );
}
