"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CreativeResourceKind = "brandKit" | "campaign" | "folder" | "asset";
export type CreativeDetailError = {
  code: string;
  message: string;
  retryable: boolean;
};
export type CreativeAssetLineage = {
  rootId: string;
  currentId: string;
  versions: Array<{ id: string; source_asset_id?: string | null }>;
};
export type CreativeResourceDetail = {
  kind: CreativeResourceKind;
  resource: unknown;
  lineage?: CreativeAssetLineage;
};

export function creativeResourceEndpoint(
  kind: CreativeResourceKind,
  id: string,
) {
  if (kind === "asset") return `/api/creative/assets/${id}`;
  if (kind === "folder") return `/api/creative/folders/${id}`;
  return `/api/creative/resources/${kind === "brandKit" ? "brand-kits" : "campaigns"}/${id}`;
}

function normalizeError(status: number, payload: unknown): CreativeDetailError {
  const error =
    typeof payload === "object" && payload
      ? (payload as { error?: { code?: string; message?: string } }).error
      : undefined;
  return {
    code: error?.code ?? "request_failed",
    message: error?.message ?? "Creative resource could not be loaded.",
    retryable: status === 0 || status >= 500,
  };
}

export function useCreativeResourceDetail() {
  const [selected, setSelected] = useState<{
    kind: CreativeResourceKind;
    id: string;
  } | null>(null);
  const [detail, setDetail] = useState<CreativeResourceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CreativeDetailError | null>(null);
  const controller = useRef<AbortController | null>(null);
  const epoch = useRef(0);

  const load = useCallback(async (kind: CreativeResourceKind, id: string) => {
    controller.current?.abort();
    const requestEpoch = ++epoch.current;
    const next = new AbortController();
    controller.current = next;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(creativeResourceEndpoint(kind, id), {
        signal: next.signal,
      });
      const payload = await response.json();
      if (requestEpoch !== epoch.current) return;
      if (!response.ok || payload?.ok === false) {
        setDetail(null);
        setError(normalizeError(response.status, payload));
        return;
      }
      setDetail({
        kind,
        resource: payload.asset ?? payload.folder ?? payload.item ?? payload,
        lineage: payload.lineage,
      });
    } catch {
      if (requestEpoch === epoch.current && !next.signal.aborted)
        setError(normalizeError(0, null));
    } finally {
      if (requestEpoch === epoch.current) setLoading(false);
    }
  }, []);

  const selectResource = useCallback(
    (kind: CreativeResourceKind, id: string) => {
      setSelected({ kind, id });
      void load(kind, id);
    },
    [load],
  );
  const closeResource = useCallback(() => {
    controller.current?.abort();
    epoch.current++;
    setSelected(null);
    setDetail(null);
    setError(null);
    setLoading(false);
  }, []);
  const refresh = useCallback(() => {
    if (selected) void load(selected.kind, selected.id);
  }, [load, selected]);
  useEffect(() => () => controller.current?.abort(), []);
  return {
    selectedKind: selected?.kind ?? null,
    selectedId: selected?.id ?? null,
    detail,
    loading,
    error,
    selectResource,
    closeResource,
    retry: refresh,
    refresh,
  };
}
