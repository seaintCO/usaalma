"use client";

import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  RefreshCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import {
  constructionFileAccept,
  constructionFileLimits,
  constructionMimeTypes,
  type ConstructionMimeType,
} from "@/lib/construction/types";

type RequestState = "idle" | "loading" | "success" | "error";

export type ConstructionPlanFile = {
  id: string;
  original_filename: string;
  mime_type: ConstructionMimeType;
  size_bytes: number | string;
  title: string;
  notes?: string | null;
  created_at?: string | null;
};

export type ConstructionFileText = {
  plans: string;
  photos: string;
  upload: string;
  uploading: string;
  uploadPlan: string;
  uploadHint: string;
  fileTitle: string;
  notes: string;
  preview: string;
  download: string;
  delete: string;
  retry: string;
  loadingFiles: string;
  noFiles: string;
  fileLoadError: string;
  fileUploadError: string;
  fileDeleteError: string;
  fileTypeError: string;
  fileSizeError: string;
  chooseFile: string;
  cameraPhoto: string;
  pdfCard: string;
  privateFiles: string;
  confirmDeleteFile: string;
  close: string;
};

export function FileUpload({
  projectId,
  language,
  text,
}: {
  projectId: string;
  language: AlmaShellLanguage;
  text: ConstructionFileText;
}) {
  const [files, setFiles] = useState<ConstructionPlanFile[]>([]);
  const [state, setState] = useState<RequestState>("idle");
  const [mutation, setMutation] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    file: ConstructionPlanFile;
    url: string;
  } | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const acceptedLabel = useMemo(() => {
    const pdfMb = constructionFileLimits["application/pdf"] / 1024 / 1024;
    const imageMb = constructionFileLimits["image/png"] / 1024 / 1024;
    return `PDF up to ${pdfMb}MB. PNG/JPG up to ${imageMb}MB.`;
  }, []);

  async function loadFiles() {
    setState("loading");
    setError("");
    try {
      const response = await fetch(
        `/api/construction/projects/${projectId}/files`,
      );
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(text.fileLoadError);
      setFiles(Array.isArray(data.files) ? data.files : []);
      setState("success");
    } catch {
      setState("error");
      setError(text.fileLoadError);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadFiles(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    const imageFiles = files.filter((file) =>
      file.mime_type.startsWith("image/"),
    );
    if (!imageFiles.length) return;
    let cancelled = false;
    async function loadThumbnails() {
      const pairs = await Promise.all(
        imageFiles.map(async (file) => {
          try {
            const response = await fetch(
              `/api/construction/files/${file.id}?mode=preview`,
            );
            const data = await response.json();
            return response.ok && data.ok && data.url
              ? ([file.id, data.url] as const)
              : null;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setThumbnails((current) => ({
        ...current,
        ...Object.fromEntries(pairs.filter(Boolean) as [string, string][]),
      }));
    }
    void loadThumbnails();
    return () => {
      cancelled = true;
    };
  }, [files]);

  function validateFile(file: File) {
    if (!constructionMimeTypes.includes(file.type as ConstructionMimeType)) {
      return text.fileTypeError;
    }
    const max = constructionFileLimits[file.type as ConstructionMimeType];
    if (file.size <= 0 || file.size > max) return text.fileSizeError;
    return "";
  }

  function choose(file: File | null | undefined) {
    if (!file) return;
    const validation = validateFile(file);
    setError(validation);
    setSelectedFile(file);
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ""));
  }

  async function uploadFile() {
    if (!selectedFile || mutation) return;
    const validation = validateFile(selectedFile);
    if (validation) {
      setError(validation);
      return;
    }
    setMutation("upload");
    setError("");
    const form = new FormData();
    form.append("file", selectedFile);
    form.append("title", title.trim() || selectedFile.name);
    form.append("notes", notes.trim());
    try {
      const response = await fetch(
        `/api/construction/projects/${projectId}/files`,
        {
          method: "POST",
          body: form,
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(text.fileUploadError);
      setSelectedFile(null);
      setTitle("");
      setNotes("");
      await loadFiles();
    } catch {
      setError(text.fileUploadError);
    } finally {
      setMutation(null);
    }
  }

  async function openFile(
    file: ConstructionPlanFile,
    mode: "preview" | "download",
  ) {
    if (mutation) return;
    setMutation(`${mode}-${file.id}`);
    setError("");
    try {
      const response = await fetch(
        `/api/construction/files/${file.id}?mode=${mode}`,
      );
      const data = await response.json();
      if (!response.ok || !data.ok || !data.url) throw new Error();
      if (mode === "preview") setPreview({ file, url: data.url });
      else window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError(text.fileLoadError);
    } finally {
      setMutation(null);
    }
  }

  async function deleteFile(file: ConstructionPlanFile) {
    if (mutation) return;
    if (confirmDeleteId !== file.id) {
      setConfirmDeleteId(file.id);
      return;
    }
    setMutation(`delete-${file.id}`);
    setError("");
    try {
      const response = await fetch(
        `/api/construction/files/${file.id}?confirm=delete`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(text.fileDeleteError);
      setConfirmDeleteId(null);
      setPreview((current) => (current?.file.id === file.id ? null : current));
      await loadFiles();
    } catch {
      setError(text.fileDeleteError);
    } finally {
      setMutation(null);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F7F8]">
            <Upload className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-medium">{text.uploadPlan}</h3>
            <p className="mt-1 text-sm leading-6 text-[#6B7280]">
              {text.uploadHint} {acceptedLabel}
            </p>
          </div>
        </div>

        <div
          className="mt-5 rounded-3xl border border-dashed border-[#D1D5DB] bg-[#F7F7F8] p-5 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            choose(event.dataTransfer.files.item(0));
          }}
        >
          <Upload className="mx-auto h-8 w-8 text-[#6B7280]" />
          <p className="mt-3 text-sm font-medium">{text.chooseFile}</p>
          <p className="mt-1 text-xs leading-5 text-[#6B7280]">
            {acceptedLabel}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white"
            >
              <Upload className="h-4 w-4" />
              {text.chooseFile}
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#D1D5DB] px-4 text-sm font-medium"
            >
              <ImageIcon className="h-4 w-4" />
              {text.cameraPhoto}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={constructionFileAccept}
            className="hidden"
            onChange={(event) => choose(event.target.files?.item(0))}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/png,image/jpeg"
            capture="environment"
            className="hidden"
            onChange={(event) => choose(event.target.files?.item(0))}
          />
        </div>

        {selectedFile ? (
          <div className="mt-4 rounded-3xl border border-[#E5E7EB] p-4">
            <p className="break-words text-sm font-medium">
              {selectedFile.name}
            </p>
            <p className="mt-1 text-xs text-[#6B7280]">
              {formatBytes(selectedFile.size, language)}
            </p>
            <label className="mt-4 block">
              <span className="text-sm font-medium">{text.fileTitle}</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4 outline-none focus:border-black"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium">{text.notes}</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] p-4 outline-none focus:border-black"
              />
            </label>
            <button
              type="button"
              disabled={mutation === "upload"}
              onClick={() => void uploadFile()}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-5 font-medium text-white disabled:bg-[#9CA3AF] sm:w-auto"
            >
              {mutation === "upload" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {mutation === "upload" ? text.uploading : text.upload}
            </button>
          </div>
        ) : null}

        <p className="mt-4 rounded-2xl bg-[#F7F7F8] p-3 text-sm leading-6 text-[#6B7280]">
          {text.privateFiles}
        </p>
        {error ? <ErrorNote message={error} /> : null}
      </div>

      <div className="min-w-0 rounded-3xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-medium">{text.plans}</h3>
          <button
            type="button"
            onClick={() => void loadFiles()}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB]"
            aria-label={text.retry}
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
        {state === "loading" ? (
          <LoadingState text={text.loadingFiles} />
        ) : state === "error" ? (
          <RetryState
            text={text.fileLoadError}
            retry={text.retry}
            onRetry={loadFiles}
          />
        ) : files.length ? (
          <div className="mt-4 grid gap-3">
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                language={language}
                text={text}
                thumbnailUrl={thumbnails[file.id]}
                confirmingDelete={confirmDeleteId === file.id}
                busy={Boolean(mutation?.endsWith(file.id))}
                onPreview={() => void openFile(file, "preview")}
                onDownload={() => void openFile(file, "download")}
                onDelete={() => void deleteFile(file)}
              />
            ))}
          </div>
        ) : (
          <EmptyState text={text.noFiles} />
        )}
      </div>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-0 sm:items-center sm:justify-center sm:p-4">
          <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-4xl sm:rounded-3xl">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-medium">
                  {preview.file.title || preview.file.original_filename}
                </h3>
                <p className="text-sm text-[#6B7280]">
                  {fileKind(preview.file.mime_type)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB]"
                aria-label={text.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-3xl bg-[#F7F7F8]">
              {preview.file.mime_type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={preview.file.title || preview.file.original_filename}
                  className="max-h-[70vh] w-full object-contain"
                />
              ) : (
                <div className="p-6 text-center">
                  <FileText className="mx-auto h-12 w-12 text-[#6B7280]" />
                  <p className="mt-4 text-lg font-medium">{text.pdfCard}</p>
                  <button
                    type="button"
                    onClick={() =>
                      window.open(preview.url, "_blank", "noopener,noreferrer")
                    }
                    className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 font-medium text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {text.preview}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function FileCard({
  file,
  language,
  text,
  thumbnailUrl,
  confirmingDelete,
  busy,
  onPreview,
  onDownload,
  onDelete,
}: {
  file: ConstructionPlanFile;
  language: AlmaShellLanguage;
  text: ConstructionFileText;
  thumbnailUrl?: string;
  confirmingDelete: boolean;
  busy: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="min-w-0 rounded-3xl border border-[#E5E7EB] p-3">
      <div className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#F7F7F8]">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : file.mime_type.startsWith("image/") ? (
            <ImageIcon className="h-6 w-6 text-[#6B7280]" />
          ) : (
            <FileText className="h-6 w-6 text-[#6B7280]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="break-words font-medium">
            {file.title || file.original_filename}
          </h4>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-[#9CA3AF]">
            {fileKind(file.mime_type)} /{" "}
            {formatBytes(file.size_bytes, language)}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            {file.notes?.trim() || file.original_filename}
          </p>
        </div>
      </div>
      {confirmingDelete ? (
        <p className="mt-3 rounded-2xl bg-[#FEF2F2] p-3 text-sm leading-6 text-[#991B1B]">
          {text.confirmDeleteFile}
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <CompactButton
          icon={ExternalLink}
          label={text.preview}
          onClick={onPreview}
          disabled={busy}
        />
        <CompactButton
          icon={Download}
          label={text.download}
          onClick={onDownload}
          disabled={busy}
        />
        <CompactButton
          icon={busy ? Loader2 : Trash2}
          label={text.delete}
          onClick={onDelete}
          disabled={busy}
          spinning={busy}
        />
      </div>
    </article>
  );
}

function CompactButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  spinning,
}: {
  icon: typeof Upload;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  spinning?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full border border-[#E5E7EB] px-2 text-xs font-medium disabled:text-[#9CA3AF]"
    >
      <Icon className={`h-4 w-4 shrink-0 ${spinning ? "animate-spin" : ""}`} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function formatBytes(value: number | string, language: AlmaShellLanguage) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return "-";
  return (
    new Intl.NumberFormat(language === "es" ? "es-US" : "en-US", {
      maximumFractionDigits: 1,
    }).format(bytes / 1024 / 1024) + " MB"
  );
}

function fileKind(mime: string) {
  if (mime === "application/pdf") return "PDF";
  if (mime === "image/png") return "PNG";
  if (mime === "image/jpeg") return "JPG";
  return "File";
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="mt-4 flex min-h-40 items-center justify-center rounded-3xl bg-[#F7F7F8] p-5 text-[#6B7280]">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {text}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-3xl bg-[#F7F7F8] p-5 text-sm leading-6 text-[#6B7280]">
      {text}
    </div>
  );
}

function RetryState({
  text,
  retry,
  onRetry,
}: {
  text: string;
  retry: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-4 rounded-3xl border border-[#FCA5A5] bg-white p-5">
      <p className="text-sm leading-6 text-[#991B1B]">{text}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#D1D5DB] px-4 text-sm font-medium"
      >
        <RefreshCcw className="h-4 w-4" />
        {retry}
      </button>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[#FEF2F2] p-3 text-sm leading-6 text-[#991B1B]">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}
