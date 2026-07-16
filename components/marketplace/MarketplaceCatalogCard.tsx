"use client";

import type { MarketplaceItem } from "@/lib/platform/marketplace/types";
import {
  Bot,
  Calendar,
  CheckCircle2,
  Dumbbell,
  FileText,
  Hammer,
  ImageIcon,
  Landmark,
  Mail,
  Palette,
  ReceiptText,
  Store,
  Users,
  Workflow,
} from "lucide-react";
import type { ComponentType } from "react";
import {
  accessLabel,
  connectionLabel,
  installLabel,
  releaseLabel,
  type MarketplaceCopy,
} from "./marketplaceCopy";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  tasks: CheckCircle2,
  notes: FileText,
  planner: Calendar,
  documents: FileText,
  fitness: Dumbbell,
  crm: Users,
  construction: Hammer,
  invoicing: ReceiptText,
  images: ImageIcon,
  creative_studio: Palette,
  launch_studio: Workflow,
  trader: Landmark,
  automations: Workflow,
  google: Mail,
  stripe: ReceiptText,
  elevenlabs: Bot,
  twilio: Bot,
};

export type MarketplaceCardAction =
  | { kind: "open"; label: string; href: string }
  | { kind: "install"; label: string; disabled?: boolean }
  | { kind: "connect"; label: string; href: string }
  | { kind: "disconnect"; label: string; disabled?: boolean }
  | null;

type MarketplaceCatalogCardProps = {
  item: MarketplaceItem;
  copy: MarketplaceCopy;
  action: MarketplaceCardAction;
  isMutating: boolean;
  onInstall: (item: MarketplaceItem) => void;
  onDisconnect: (item: MarketplaceItem) => void;
  onDetails: (item: MarketplaceItem) => void;
};

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#F7F7F8] px-3 py-1 text-xs font-medium text-[#4B5563]">
      {children}
    </span>
  );
}

export function MarketplaceCatalogCard({
  item,
  copy,
  action,
  isMutating,
  onInstall,
  onDisconnect,
  onDetails,
}: MarketplaceCatalogCardProps) {
  const Icon = ICONS[item.key] ?? Store;
  const stateLabel = item.connectionStatus
    ? connectionLabel(item.connectionStatus, copy)
    : item.installStatus
      ? installLabel(item.installStatus, copy)
      : accessLabel(item.accessStatus, copy);

  return (
    <article className="flex min-w-0 flex-col rounded-[1.5rem] border border-[#E5E7EB] bg-white p-6 shadow-sm shadow-black/5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div
          className="flex flex-wrap justify-end gap-2"
          aria-label={`${item.name} status`}
        >
          <Badge>{releaseLabel(item.releaseStatus, copy)}</Badge>
          <Badge>{stateLabel}</Badge>
        </div>
      </div>

      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">
        {item.category}
      </p>
      <h2 className="mt-2 text-lg font-medium tracking-tight">{item.name}</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-[#6B7280]">
        {item.description}
      </p>

      {item.requiredPlan ? (
        <p className="mt-4 text-xs text-[#6B7280]">
          {copy.requiredPlan}: {item.requiredPlan}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {action?.kind === "open" || action?.kind === "connect" ? (
          <a
            href={action.href}
            className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            {action.label}
          </a>
        ) : action?.kind === "install" || action?.kind === "disconnect" ? (
          <button
            type="button"
            onClick={() =>
              action.kind === "install" ? onInstall(item) : onDisconnect(item)
            }
            disabled={isMutating || action.disabled}
            className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
          >
            {isMutating
              ? action.kind === "install"
                ? copy.installing
                : copy.disconnect
              : action.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onDetails(item)}
          className="rounded-2xl border border-[#E5E7EB] px-4 py-3 text-sm font-medium text-[#374151] transition hover:bg-[#F7F7F8] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
        >
          {copy.details}
        </button>
      </div>
    </article>
  );
}
