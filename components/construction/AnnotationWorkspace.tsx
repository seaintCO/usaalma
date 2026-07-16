"use client";

import {
  AlertCircle,
  Baseline,
  Download,
  FileText,
  Loader2,
  LocateFixed,
  Minus,
  Move,
  RefreshCcw,
  RotateCcw,
  Save,
  Square,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ConstructionPlanFile } from "@/components/construction/FileUpload";
import type { ConstructionMeasurement } from "@/components/construction/MeasurementCalculator";
import {
  normalizedBox,
  pointFromViewport,
  validateAnnotationGeometry,
  type AnnotationGeometry,
} from "@/lib/construction/annotations";
import {
  constructionAnnotationColorKeys,
  type ConstructionAnnotationColorKey,
  type ConstructionAnnotationType,
} from "@/lib/construction/types";

type RequestState = "idle" | "loading" | "success" | "error";
type Tool = ConstructionAnnotationType | "pan";

export type ConstructionAnnotationRecord = {
  id: string;
  project_id: string;
  plan_file_id: string;
  measurement_id?: string | null;
  annotation_type: ConstructionAnnotationType;
  x1: number | string;
  y1: number | string;
  x2?: number | string | null;
  y2?: number | string | null;
  label?: string | null;
  color_key?: ConstructionAnnotationColorKey | string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type EditableAnnotation = {
  localId: string;
  persistedId?: string;
  planFileId: string;
  measurementId: string;
  annotationType: ConstructionAnnotationType;
  x1: number;
  y1: number;
  x2?: number | null;
  y2?: number | null;
  label: string;
  colorKey: ConstructionAnnotationColorKey;
  createdAt?: string | null;
  dirty: boolean;
};

export type ConstructionAnnotationText = {
  annotations: string;
  annotate: string;
  point: string;
  line: string;
  rectangle: string;
  textAnnotation: string;
  label: string;
  linkedMeasurement: string;
  noLinkedMeasurement: string;
  category: string;
  neutral: string;
  measurement: string;
  material: string;
  scopeCategory: string;
  warning: string;
  zoomIn: string;
  zoomOut: string;
  resetView: string;
  pan: string;
  undo: string;
  save: string;
  saving: string;
  cancel: string;
  delete: string;
  open: string;
  download: string;
  retry: string;
  loadingAnnotations: string;
  noAnnotations: string;
  annotationLoadError: string;
  annotationSaveError: string;
  annotationDeleteError: string;
  pdfAnnotationSoon: string;
  selectPlanToAnnotate: string;
  noAnnotatableFiles: string;
  imageOnlyAnnotation: string;
  annotationDisclaimer: string;
  textLabelRequired: string;
  unsavedChanges: string;
  confirmDeleteAnnotation: string;
};

export function AnnotationWorkspace({
  projectId,
  text,
}: {
  projectId: string;
  text: ConstructionAnnotationText;
}) {
  const [files, setFiles] = useState<ConstructionPlanFile[]>([]);
  const [measurements, setMeasurements] = useState<ConstructionMeasurement[]>(
    [],
  );
  const [annotations, setAnnotations] = useState<EditableAnnotation[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [state, setState] = useState<RequestState>("idle");
  const [mutation, setMutation] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tool, setTool] = useState<Tool>("point");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftMeasurementId, setDraftMeasurementId] = useState("");
  const [draftColorKey, setDraftColorKey] =
    useState<ConstructionAnnotationColorKey>("neutral");
  const [signedUrl, setSignedUrl] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  const selectedFile = files.find((file) => file.id === selectedFileId) ?? null;
  const visibleAnnotations = annotations.filter(
    (annotation) =>
      annotation.planFileId === selectedFileId &&
      !deletedIds.includes(annotation.persistedId ?? ""),
  );
  const selectedAnnotation =
    visibleAnnotations.find(
      (annotation) => annotation.localId === selectedId,
    ) ?? null;
  const hasDirty =
    annotations.some((annotation) => annotation.dirty) || deletedIds.length > 0;
  const fileSupportsAnnotation =
    selectedFile?.mime_type === "image/png" ||
    selectedFile?.mime_type === "image/jpeg";

  const measurementById = useMemo(
    () =>
      new Map(measurements.map((measurement) => [measurement.id, measurement])),
    [measurements],
  );

  async function load() {
    setState("loading");
    setError("");
    try {
      const [filesResponse, measurementsResponse, annotationsResponse] =
        await Promise.all([
          fetch(`/api/construction/projects/${projectId}/files`),
          fetch(`/api/construction/projects/${projectId}/measurements`),
          fetch(`/api/construction/projects/${projectId}/annotations`),
        ]);
      const filesData = await filesResponse.json();
      const measurementsData = await measurementsResponse.json();
      const annotationsData = await annotationsResponse.json();
      if (!filesResponse.ok || !filesData.ok || !annotationsResponse.ok)
        throw new Error(text.annotationLoadError);
      const nextFiles = Array.isArray(filesData.files) ? filesData.files : [];
      setFiles(nextFiles);
      setMeasurements(
        measurementsResponse.ok && Array.isArray(measurementsData.measurements)
          ? measurementsData.measurements
          : [],
      );
      setAnnotations(
        Array.isArray(annotationsData.annotations)
          ? annotationsData.annotations.map(fromApiAnnotation)
          : [],
      );
      setDeletedIds([]);
      setSelectedFileId((current) => current || nextFiles[0]?.id || "");
      setSelectedId(null);
      setState("success");
    } catch {
      setState("error");
      setError(text.annotationLoadError);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!hasDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasDirty]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setSignedUrl("");
      setSelectedId(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }, 0);
    if (!selectedFile || !fileSupportsAnnotation) {
      return () => window.clearTimeout(resetTimer);
    }
    const file = selectedFile;
    let cancelled = false;
    async function loadPreview() {
      try {
        const response = await fetch(
          `/api/construction/files/${file.id}?mode=preview`,
        );
        const data = await response.json();
        if (!cancelled && response.ok && data.ok && data.url) {
          setSignedUrl(data.url);
        }
      } catch {
        if (!cancelled) setError(text.annotationLoadError);
      }
    }
    void loadPreview();
    return () => {
      window.clearTimeout(resetTimer);
      cancelled = true;
    };
  }, [fileSupportsAnnotation, selectedFile, text.annotationLoadError]);

  function addAnnotation(geometry: AnnotationGeometry) {
    if (!selectedFile || !fileSupportsAnnotation) return;
    if (tool === "pan") return;
    if (tool === "text" && !draftLabel.trim()) {
      setError(text.textLabelRequired);
      return;
    }
    if (!validateAnnotationGeometry(tool, geometry)) return;
    const next: EditableAnnotation = {
      localId: crypto.randomUUID(),
      planFileId: selectedFile.id,
      measurementId: draftMeasurementId,
      annotationType: tool,
      label: draftLabel.trim(),
      colorKey: draftColorKey,
      dirty: true,
      ...geometry,
    };
    setAnnotations((current) => [...current, next]);
    setSelectedId(next.localId);
    setError("");
  }

  function onSurfacePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!surfaceRef.current || !fileSupportsAnnotation) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    if (tool === "pan") {
      setPanStart({
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      });
      return;
    }
    const point = pointFromViewport(event.clientX, event.clientY, rect);
    if (tool === "point" || tool === "text") {
      addAnnotation({ x1: point.x, y1: point.y });
    } else {
      setDragStart(point);
    }
  }

  function onSurfacePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!surfaceRef.current) return;
    if (panStart) {
      setPanStart(null);
      return;
    }
    if (!dragStart || tool === "point" || tool === "text" || tool === "pan")
      return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const point = pointFromViewport(event.clientX, event.clientY, rect);
    addAnnotation({
      x1: dragStart.x,
      y1: dragStart.y,
      x2: point.x,
      y2: point.y,
    });
    setDragStart(null);
  }

  function onSurfacePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!panStart) return;
    setPan({
      x: panStart.panX + event.clientX - panStart.x,
      y: panStart.panY + event.clientY - panStart.y,
    });
  }

  function updateSelected(patch: Partial<EditableAnnotation>) {
    if (!selectedAnnotation) return;
    setAnnotations((current) =>
      current.map((annotation) =>
        annotation.localId === selectedAnnotation.localId
          ? { ...annotation, ...patch, dirty: true }
          : annotation,
      ),
    );
  }

  function undoLast() {
    const lastDraft = [...annotations]
      .reverse()
      .find((annotation) => annotation.dirty && !annotation.persistedId);
    if (!lastDraft) return;
    setAnnotations((current) =>
      current.filter((annotation) => annotation.localId !== lastDraft.localId),
    );
    if (selectedId === lastDraft.localId) setSelectedId(null);
  }

  function cancelLocal() {
    if (!hasDirty) return;
    void load();
  }

  function deleteSelected() {
    if (!selectedAnnotation) return;
    if (
      selectedAnnotation.persistedId &&
      confirmDeleteId !== selectedAnnotation.localId
    ) {
      setConfirmDeleteId(selectedAnnotation.localId);
      return;
    }
    if (selectedAnnotation.persistedId) {
      setDeletedIds((current) => [...current, selectedAnnotation.persistedId!]);
    } else {
      setAnnotations((current) =>
        current.filter(
          (annotation) => annotation.localId !== selectedAnnotation.localId,
        ),
      );
    }
    setSelectedId(null);
    setConfirmDeleteId(null);
  }

  async function saveAnnotations() {
    if (mutation) return;
    setMutation("save");
    setError("");
    try {
      for (const id of deletedIds) {
        const response = await fetch(
          `/api/construction/annotations/${id}?confirm=delete`,
          { method: "DELETE" },
        );
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error();
      }
      for (const annotation of annotations.filter((item) => item.dirty)) {
        const payload = toPayload(annotation);
        const response = await fetch(
          annotation.persistedId
            ? `/api/construction/annotations/${annotation.persistedId}`
            : `/api/construction/projects/${projectId}/annotations`,
          {
            method: annotation.persistedId ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error();
      }
      await load();
    } catch {
      setError(text.annotationSaveError);
    } finally {
      setMutation(null);
    }
  }

  async function openDownload() {
    if (!selectedFile) return;
    try {
      const response = await fetch(
        `/api/construction/files/${selectedFile.id}?mode=download`,
      );
      const data = await response.json();
      if (response.ok && data.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      setError(text.annotationLoadError);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
      <aside className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-medium">{text.annotations}</h3>
          <button
            type="button"
            onClick={() => void load()}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB]"
            aria-label={text.retry}
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {files.length ? (
            files.map((file) => (
              <button
                type="button"
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className={`min-h-11 rounded-2xl border px-3 py-2 text-left text-sm ${
                  selectedFileId === file.id
                    ? "border-black bg-black text-white"
                    : "border-[#E5E7EB] bg-white"
                }`}
              >
                <span className="block truncate font-medium">
                  {file.title || file.original_filename}
                </span>
                <span className="block text-xs opacity-70">
                  {file.mime_type === "application/pdf" ? "PDF" : text.annotate}
                </span>
              </button>
            ))
          ) : (
            <p className="rounded-2xl bg-[#F7F7F8] p-3 text-sm leading-6 text-[#6B7280]">
              {text.noAnnotatableFiles}
            </p>
          )}
        </div>
      </aside>

      <div className="min-w-0 rounded-3xl border border-[#E5E7EB] bg-white p-3 md:p-4">
        <Toolbar
          tool={tool}
          text={text}
          onTool={setTool}
          onZoomIn={() => setZoom((value) => Math.min(3, value + 0.25))}
          onZoomOut={() => setZoom((value) => Math.max(0.5, value - 0.25))}
          onReset={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <SelectField
            label={text.linkedMeasurement}
            value={draftMeasurementId}
            onChange={setDraftMeasurementId}
            options={[
              ["", text.noLinkedMeasurement],
              ...measurements.map(
                (measurement) =>
                  [measurement.id, measurement.label] as readonly [
                    string,
                    string,
                  ],
              ),
            ]}
          />
          <SelectField
            label={text.category}
            value={draftColorKey}
            onChange={(value) =>
              setDraftColorKey(value as ConstructionAnnotationColorKey)
            }
            options={constructionAnnotationColorKeys.map(
              (key) => [key, categoryLabel(key, text)] as const,
            )}
          />
          <label>
            <span className="text-sm font-medium">{text.label}</span>
            <input
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4 outline-none focus:border-black"
            />
          </label>
        </div>

        <div className="mt-4 min-h-[360px] overflow-hidden rounded-3xl bg-[#F7F7F8]">
          {state === "loading" ? (
            <LoadingState text={text.loadingAnnotations} />
          ) : state === "error" ? (
            <RetryState
              text={error || text.annotationLoadError}
              retry={text.retry}
              onRetry={load}
            />
          ) : !selectedFile ? (
            <EmptyState text={text.selectPlanToAnnotate} />
          ) : selectedFile.mime_type === "application/pdf" ? (
            <PdfState text={text} onDownload={() => void openDownload()} />
          ) : signedUrl ? (
            <div
              ref={surfaceRef}
              role="application"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setDragStart(null);
                  setTool("pan");
                }
              }}
              onPointerDown={onSurfacePointerDown}
              onPointerMove={onSurfacePointerMove}
              onPointerUp={onSurfacePointerUp}
              className="relative mx-auto max-h-[70vh] min-h-[360px] w-full touch-none overflow-hidden outline-none"
            >
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signedUrl}
                  alt={selectedFile.title || selectedFile.original_filename}
                  className="max-h-[70vh] w-full object-contain"
                />
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 1 1"
                  preserveAspectRatio="none"
                >
                  {visibleAnnotations.map((annotation) => (
                    <AnnotationShape
                      key={annotation.localId}
                      annotation={annotation}
                      selected={selectedId === annotation.localId}
                      onSelect={() => setSelectedId(annotation.localId)}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0">
                  {visibleAnnotations.map((annotation) => (
                    <button
                      type="button"
                      key={`${annotation.localId}-hit`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(annotation.localId);
                      }}
                      className="absolute min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{
                        left: `${annotation.x1 * 100}%`,
                        top: `${annotation.y1 * 100}%`,
                      }}
                      aria-label={annotation.label || text.annotations}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <LoadingState text={text.loadingAnnotations} />
          )}
        </div>

        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
          <ActionButton icon={Undo2} label={text.undo} onClick={undoLast} />
          <ActionButton icon={X} label={text.cancel} onClick={cancelLocal} />
          <ActionButton
            icon={Trash2}
            label={text.delete}
            onClick={deleteSelected}
            disabled={!selectedAnnotation}
          />
          <button
            type="button"
            disabled={!hasDirty || mutation === "save"}
            onClick={() => void saveAnnotations()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 font-medium text-white disabled:bg-[#9CA3AF]"
          >
            {mutation === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {mutation === "save" ? text.saving : text.save}
          </button>
        </div>
        {confirmDeleteId ? (
          <p className="mt-3 rounded-2xl bg-[#FEF2F2] p-3 text-sm leading-6 text-[#991B1B]">
            {text.confirmDeleteAnnotation}
          </p>
        ) : null}
        {hasDirty ? (
          <p className="mt-3 rounded-2xl bg-[#FFFBEB] p-3 text-sm leading-6 text-[#92400E]">
            {text.unsavedChanges}
          </p>
        ) : null}
        {error ? <ErrorNote message={error} /> : null}
      </div>

      <aside className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
        <h3 className="text-lg font-medium">{text.annotations}</h3>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
          {text.annotationDisclaimer}
        </p>
        {selectedAnnotation ? (
          <div className="mt-4 grid gap-3">
            <SelectField
              label={text.linkedMeasurement}
              value={selectedAnnotation.measurementId}
              onChange={(value) => updateSelected({ measurementId: value })}
              options={[
                ["", text.noLinkedMeasurement],
                ...measurements.map(
                  (measurement) =>
                    [measurement.id, measurement.label] as readonly [
                      string,
                      string,
                    ],
                ),
              ]}
            />
            <SelectField
              label={text.category}
              value={selectedAnnotation.colorKey}
              onChange={(value) =>
                updateSelected({
                  colorKey: value as ConstructionAnnotationColorKey,
                })
              }
              options={constructionAnnotationColorKeys.map(
                (key) => [key, categoryLabel(key, text)] as const,
              )}
            />
            <label>
              <span className="text-sm font-medium">{text.label}</span>
              <input
                value={selectedAnnotation.label}
                onChange={(event) =>
                  updateSelected({ label: event.target.value })
                }
                className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4 outline-none focus:border-black"
              />
            </label>
          </div>
        ) : null}
        <div className="mt-4 grid gap-2">
          {visibleAnnotations.length ? (
            visibleAnnotations.map((annotation) => (
              <button
                type="button"
                key={`${annotation.localId}-row`}
                onClick={() => setSelectedId(annotation.localId)}
                className={`rounded-2xl border p-3 text-left text-sm ${
                  selectedId === annotation.localId
                    ? "border-black"
                    : "border-[#E5E7EB]"
                }`}
              >
                <span className="font-medium">
                  {toolLabel(annotation.annotationType, text)}
                </span>
                <span className="ml-2 rounded-full bg-[#F7F7F8] px-2 py-1 text-xs">
                  {categoryLabel(annotation.colorKey, text)}
                </span>
                <span className="mt-2 block break-words text-[#6B7280]">
                  {annotation.label || text.noAnnotations}
                </span>
                {annotation.measurementId ? (
                  <span className="mt-1 block truncate text-xs text-[#6B7280]">
                    {measurementById.get(annotation.measurementId)?.label ||
                      text.linkedMeasurement}
                  </span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="rounded-2xl bg-[#F7F7F8] p-3 text-sm leading-6 text-[#6B7280]">
              {text.noAnnotations}
            </p>
          )}
        </div>
      </aside>
    </section>
  );
}

function fromApiAnnotation(
  annotation: ConstructionAnnotationRecord,
): EditableAnnotation {
  return {
    localId: annotation.id,
    persistedId: annotation.id,
    planFileId: annotation.plan_file_id,
    measurementId: annotation.measurement_id ?? "",
    annotationType: annotation.annotation_type,
    x1: Number(annotation.x1),
    y1: Number(annotation.y1),
    x2:
      annotation.x2 === null || annotation.x2 === undefined
        ? null
        : Number(annotation.x2),
    y2:
      annotation.y2 === null || annotation.y2 === undefined
        ? null
        : Number(annotation.y2),
    label: annotation.label ?? "",
    colorKey: constructionAnnotationColorKeys.includes(
      annotation.color_key as ConstructionAnnotationColorKey,
    )
      ? (annotation.color_key as ConstructionAnnotationColorKey)
      : "neutral",
    createdAt: annotation.created_at,
    dirty: false,
  };
}

function toPayload(annotation: EditableAnnotation) {
  return {
    planFileId: annotation.planFileId,
    measurementId: annotation.measurementId || null,
    annotationType: annotation.annotationType,
    x1: annotation.x1,
    y1: annotation.y1,
    x2: annotation.x2 ?? null,
    y2: annotation.y2 ?? null,
    label: annotation.label || null,
    colorKey: annotation.colorKey,
    metadata: {},
  };
}

function AnnotationShape({
  annotation,
  selected,
}: {
  annotation: EditableAnnotation;
  selected: boolean;
  onSelect: () => void;
}) {
  const color = colorValue(annotation.colorKey);
  const strokeWidth = selected ? 0.012 : 0.008;
  if (annotation.annotationType === "rectangle") {
    const box = normalizedBox(annotation);
    return (
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={selected ? "0.02 0.01" : undefined}
      />
    );
  }
  if (annotation.annotationType === "line") {
    return (
      <line
        x1={annotation.x1}
        y1={annotation.y1}
        x2={annotation.x2 ?? annotation.x1}
        y2={annotation.y2 ?? annotation.y1}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={selected ? "0.02 0.01" : undefined}
      />
    );
  }
  if (annotation.annotationType === "text") {
    return (
      <g>
        <circle
          cx={annotation.x1}
          cy={annotation.y1}
          r={selected ? 0.026 : 0.02}
          fill={color}
          stroke="white"
          strokeWidth="0.006"
        />
        <text
          x={annotation.x1 + 0.025}
          y={annotation.y1}
          fontSize="0.035"
          fill={color}
          stroke="white"
          strokeWidth="0.003"
          paintOrder="stroke"
        >
          {annotation.label}
        </text>
      </g>
    );
  }
  return (
    <circle
      cx={annotation.x1}
      cy={annotation.y1}
      r={selected ? 0.026 : 0.02}
      fill={color}
      stroke="white"
      strokeWidth="0.006"
    />
  );
}

function Toolbar({
  tool,
  text,
  onTool,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  tool: Tool;
  text: ConstructionAnnotationText;
  onTool: (tool: Tool) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  const tools: Array<[Tool, typeof LocateFixed, string]> = [
    ["point", LocateFixed, text.point],
    ["line", Minus, text.line],
    ["rectangle", Square, text.rectangle],
    ["text", Baseline, text.textAnnotation],
    ["pan", Move, text.pan],
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {tools.map(([key, Icon, label]) => (
        <button
          type="button"
          key={key}
          onClick={() => onTool(key)}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium ${
            tool === key
              ? "bg-black text-white"
              : "border border-[#E5E7EB] bg-white"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
      <IconButton icon={ZoomIn} label={text.zoomIn} onClick={onZoomIn} />
      <IconButton icon={ZoomOut} label={text.zoomOut} onClick={onZoomOut} />
      <IconButton icon={RotateCcw} label={text.resetView} onClick={onReset} />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Save;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] px-4 text-sm font-medium disabled:text-[#9CA3AF]"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof ZoomIn;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB]"
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function PdfState({
  text,
  onDownload,
}: {
  text: ConstructionAnnotationText;
  onDownload: () => void;
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center p-6 text-center">
      <FileText className="h-12 w-12 text-[#6B7280]" />
      <h3 className="mt-4 text-xl font-medium">{text.pdfAnnotationSoon}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#6B7280]">
        {text.imageOnlyAnnotation}
      </p>
      <button
        type="button"
        onClick={onDownload}
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 font-medium text-white"
      >
        <Download className="h-4 w-4" />
        {text.download}
      </button>
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[360px] items-center justify-center text-[#6B7280]">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {text}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[360px] items-center justify-center p-6 text-center text-sm leading-6 text-[#6B7280]">
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
    <div className="flex min-h-[360px] flex-col items-center justify-center p-6 text-center">
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

function toolLabel(
  type: ConstructionAnnotationType,
  text: ConstructionAnnotationText,
) {
  if (type === "point") return text.point;
  if (type === "line") return text.line;
  if (type === "rectangle") return text.rectangle;
  return text.textAnnotation;
}

function categoryLabel(
  key: ConstructionAnnotationColorKey,
  text: ConstructionAnnotationText,
) {
  if (key === "measurement") return text.measurement;
  if (key === "material") return text.material;
  if (key === "scope") return text.scopeCategory;
  if (key === "warning") return text.warning;
  return text.neutral;
}

function colorValue(key: ConstructionAnnotationColorKey) {
  if (key === "measurement") return "#2563EB";
  if (key === "material") return "#7C3AED";
  if (key === "scope") return "#059669";
  if (key === "warning") return "#DC2626";
  return "#111111";
}
