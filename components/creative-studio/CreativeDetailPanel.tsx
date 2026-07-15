"use client";
import type {
  CreativeResourceDetail,
  CreativeResourceKind,
} from "./useCreativeResourceDetail";
const copy = {
  en: {
    details: "Details",
    close: "Close",
    loading: "Loading…",
    retry: "Retry",
    source: "Source",
    versions: "Versions",
    archived: "Archived",
    folder: "Folder",
    campaign: "Campaign",
    brand: "Brand kit",
    asset: "Asset",
  },
  es: {
    details: "Detalles",
    close: "Cerrar",
    loading: "Cargando…",
    retry: "Reintentar",
    source: "Origen",
    versions: "Versiones",
    archived: "Archivado",
    folder: "Carpeta",
    campaign: "Campaña",
    brand: "Kit de marca",
    asset: "Activo",
  },
};
export function CreativeDetailPanel({
  language,
  detail,
  loading,
  error,
  onClose,
  onRetry,
  onSelect,
}: {
  language: "en" | "es";
  detail: CreativeResourceDetail | null;
  loading: boolean;
  error: { message: string; retryable: boolean } | null;
  onClose: () => void;
  onRetry: () => void;
  onSelect: (kind: CreativeResourceKind, id: string) => void;
}) {
  const t = copy[language];
  if (!loading && !error && !detail) return null;
  const resource: any = detail?.resource;
  return (
    <aside className="fixed inset-x-3 bottom-3 top-3 z-40 overflow-y-auto rounded-2xl border bg-white p-5 shadow-xl md:left-auto md:w-[28rem]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t.details}</h2>
        <button
          onClick={onClose}
          className="rounded-full border px-3 py-1 text-sm"
        >
          {t.close}
        </button>
      </div>
      {loading ? (
        <p className="mt-5 text-sm text-[#6B7280]">{t.loading}</p>
      ) : error ? (
        <div className="mt-5">
          <p className="text-sm text-red-600">{error.message}</p>
          {error.retryable && (
            <button
              onClick={onRetry}
              className="mt-3 rounded-full border px-3 py-1 text-sm"
            >
              {t.retry}
            </button>
          )}
        </div>
      ) : resource ? (
        <div className="mt-5 space-y-4 text-sm">
          <h3 className="text-xl font-medium">
            {resource.name ?? resource.title ?? resource.prompt}
          </h3>
          {resource.output_base64 && (
            <img
              src={`data:image/png;base64,${resource.output_base64}`}
              alt={resource.prompt ?? "Creative asset"}
              className="max-h-72 w-full rounded-xl object-contain"
            />
          )}
          <p className="whitespace-pre-wrap break-words">
            {resource.concept ?? resource.prompt ?? resource.description ?? ""}
          </p>
          {resource.voice && (
            <p>
              <b>Voice:</b> {resource.voice}
            </p>
          )}
          {resource.audience && (
            <p>
              <b>Audience:</b> {resource.audience}
            </p>
          )}
          {resource.colors && (
            <p>
              <b>Colors:</b>{" "}
              {Array.isArray(resource.colors)
                ? resource.colors.join(", ")
                : resource.colors}
            </p>
          )}
          {resource.social_captions && (
            <p className="whitespace-pre-wrap">
              <b>Social:</b> {resource.social_captions}
            </p>
          )}
          {resource.ad_copy && (
            <p className="whitespace-pre-wrap">
              <b>Ad:</b> {resource.ad_copy}
            </p>
          )}
          {resource.product_photo_prompt && (
            <p className="whitespace-pre-wrap">
              <b>Prompt:</b> {resource.product_photo_prompt}
            </p>
          )}
          {resource.archived_at && <p>{t.archived}</p>}
          {detail?.lineage && (
            <div>
              <h4 className="font-medium">{t.versions}</h4>
              {detail.lineage.versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => onSelect("asset", version.id)}
                  className="mt-2 block w-full rounded-xl bg-[#F7F7F8] p-2 text-left"
                >
                  {version.id === detail.lineage?.currentId
                    ? "Current"
                    : t.source}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-[#6B7280]">{resource.created_at ?? ""}</p>
        </div>
      ) : null}
    </aside>
  );
}
