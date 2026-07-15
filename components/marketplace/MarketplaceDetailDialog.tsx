"use client";

import type { MarketplaceItem } from "@/lib/platform/marketplace/types";
import { X } from "lucide-react";
import { useEffect } from "react";
import {
  accessLabel,
  connectionLabel,
  installLabel,
  releaseLabel,
  type MarketplaceCopy,
} from "./marketplaceCopy";
import type { MarketplaceCardAction } from "./MarketplaceCatalogCard";

type MarketplaceDetailDialogProps = {
  item: MarketplaceItem | null;
  copy: MarketplaceCopy;
  action: MarketplaceCardAction;
  isMutating: boolean;
  onClose: () => void;
  onInstall: (item: MarketplaceItem) => void;
  onDisconnect: (item: MarketplaceItem) => void;
};

function DetailList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <section className="mt-6">
      <h3 className="text-sm font-medium text-[#111111]">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#6B7280]">
        {items.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </section>
  );
}

export function MarketplaceDetailDialog({
  item,
  copy,
  action,
  isMutating,
  onClose,
  onInstall,
  onDisconnect,
}: MarketplaceDetailDialogProps) {
  useEffect(() => {
    if (!item) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, onClose]);

  if (!item) return null;
  const state = item.connectionStatus
    ? connectionLabel(item.connectionStatus, copy)
    : item.installStatus
      ? installLabel(item.installStatus, copy)
      : accessLabel(item.accessStatus, copy);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/30 p-4 sm:items-center sm:justify-center"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="marketplace-detail-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] bg-white p-6 shadow-xl sm:p-8"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">
              {item.itemType === "internal_module"
                ? copy.module
                : copy.connection}
            </p>
            <h2
              id="marketplace-detail-title"
              className="mt-2 text-2xl font-medium tracking-tight"
            >
              {item.name}
            </h2>
          </div>
          {item.providerAccountEmail || item.providerAccountLabel ? (
            <div>
              <dt className="text-[#6B7280]">{copy.account}</dt>
              <dd className="mt-1 break-all font-medium">
                {item.providerAccountLabel ?? item.providerAccountEmail}
              </dd>
              {item.providerAccountLabel && item.providerAccountEmail ? (
                <dd className="mt-1 break-all text-[#6B7280]">
                  {item.providerAccountEmail}
                </dd>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E5E7EB] p-2 text-[#4B5563] hover:bg-[#F7F7F8] focus:outline-none focus:ring-2 focus:ring-black"
            aria-label={copy.close}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-[#6B7280]">
          {item.description}
        </p>
        <dl className="mt-6 grid gap-3 rounded-2xl bg-[#F7F7F8] p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#6B7280]">{copy.release}</dt>
            <dd className="mt-1 font-medium">
              {releaseLabel(item.releaseStatus, copy)}
            </dd>
          </div>
          <div>
            <dt className="text-[#6B7280]">{copy.status}</dt>
            <dd className="mt-1 font-medium">{state}</dd>
          </div>
          <div>
            <dt className="text-[#6B7280]">{copy.category}</dt>
            <dd className="mt-1 font-medium">{item.category}</dd>
          </div>
          <div>
            <dt className="text-[#6B7280]">{copy.requiredPlan}</dt>
            <dd className="mt-1 font-medium">
              {item.requiredPlan ?? copy.included}
            </dd>
          </div>
        </dl>
        <DetailList
          title={copy.permissions}
          items={item.grantedScopes ?? item.requiredScopes}
        />
        <DetailList title={copy.setup} items={item.setupRequirements} />
        <DetailList title={copy.limitations} items={item.limitations} />

        <div className="mt-8">
          {action?.kind === "open" || action?.kind === "connect" ? (
            <a
              href={action.href}
              className="inline-flex rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
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
              className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#9CA3AF]"
            >
              {isMutating
                ? action.kind === "install"
                  ? copy.installing
                  : copy.disconnect
                : action.label}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
