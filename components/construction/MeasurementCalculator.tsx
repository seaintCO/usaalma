"use client";

import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Ruler,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import {
  displayMeasurementTotal,
  tryCalculateMeasurement,
  type ConstructionMeasurementType,
  type ConstructionUnit,
} from "@/lib/construction/calculations";
import type { ConstructionPlanFile } from "@/components/construction/FileUpload";

type RequestState = "idle" | "loading" | "success" | "error";

export type ConstructionMeasurement = {
  id: string;
  project_id: string;
  plan_file_id?: string | null;
  measurement_type: ConstructionMeasurementType;
  label: string;
  length?: number | string | null;
  width?: number | string | null;
  height_or_depth?: number | string | null;
  quantity: number | string;
  unit: ConstructionUnit;
  waste_percentage: number | string;
  base_total: number | string;
  adjusted_total: number | string;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ConstructionMeasurementText = {
  measurements: string;
  addMeasurement: string;
  editMeasurement: string;
  linear: string;
  area: string;
  volume: string;
  perimeter: string;
  count: string;
  length: string;
  width: string;
  heightDepth: string;
  quantity: string;
  unit: string;
  waste: string;
  label: string;
  notes: string;
  linkedPlan: string;
  noLinkedPlan: string;
  baseTotal: string;
  adjustedTotal: string;
  estimate: string;
  formula: string;
  save: string;
  saving: string;
  cancel: string;
  edit: string;
  delete: string;
  retry: string;
  loadingMeasurements: string;
  noMeasurements: string;
  measurementLoadError: string;
  measurementSaveError: string;
  measurementDeleteError: string;
  requiredField: string;
  invalidMeasurement: string;
  confirmDeleteMeasurement: string;
  measurementSummary: string;
  verifyMeasurements: string;
  estimateOnly: string;
  notAdvice: string;
};

type MeasurementDraft = {
  id?: string;
  planFileId: string;
  measurementType: ConstructionMeasurementType;
  label: string;
  length: string;
  width: string;
  heightOrDepth: string;
  quantity: string;
  unit: ConstructionUnit;
  wastePercentage: string;
  notes: string;
};

const defaultDraft: MeasurementDraft = {
  planFileId: "",
  measurementType: "linear",
  label: "",
  length: "",
  width: "",
  heightOrDepth: "",
  quantity: "1",
  unit: "feet",
  wastePercentage: "0",
  notes: "",
};

const unitsByType: Record<ConstructionMeasurementType, ConstructionUnit[]> = {
  linear: ["feet", "inches", "yards"],
  perimeter: ["feet", "inches", "yards"],
  area: ["square_feet", "square_yards"],
  volume: ["cubic_feet", "cubic_yards"],
  count: ["each"],
};

export function MeasurementCalculator({
  projectId,
  language,
  text,
}: {
  projectId: string;
  language: AlmaShellLanguage;
  text: ConstructionMeasurementText;
}) {
  const [files, setFiles] = useState<ConstructionPlanFile[]>([]);
  const [measurements, setMeasurements] = useState<ConstructionMeasurement[]>(
    [],
  );
  const [state, setState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const [mutation, setMutation] = useState<string | null>(null);
  const [draft, setDraft] = useState<MeasurementDraft>(defaultDraft);
  const [panelOpen, setPanelOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileById = useMemo(
    () => new Map(files.map((file) => [file.id, file])),
    [files],
  );

  const summary = useMemo(() => {
    return measurements.reduce<
      Record<string, { label: string; total: number }>
    >((groups, measurement) => {
      const key = `${measurement.measurement_type}:${measurement.unit}`;
      const label = `${text[measurement.measurement_type]} / ${unitLabel(
        measurement.unit,
        language,
      )}`;
      groups[key] = {
        label,
        total:
          (groups[key]?.total ?? 0) + Number(measurement.adjusted_total ?? 0),
      };
      return groups;
    }, {});
  }, [language, measurements, text]);

  async function load() {
    setState("loading");
    setError("");
    try {
      const [measurementsResponse, filesResponse] = await Promise.all([
        fetch(`/api/construction/projects/${projectId}/measurements`),
        fetch(`/api/construction/projects/${projectId}/files`),
      ]);
      const measurementsData = await measurementsResponse.json();
      const filesData = await filesResponse.json();
      if (!measurementsResponse.ok || !measurementsData.ok)
        throw new Error(text.measurementLoadError);
      setMeasurements(
        Array.isArray(measurementsData.measurements)
          ? measurementsData.measurements
          : [],
      );
      if (filesResponse.ok && filesData.ok) {
        setFiles(Array.isArray(filesData.files) ? filesData.files : []);
      }
      setState("success");
    } catch {
      setState("error");
      setError(text.measurementLoadError);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function openCreate() {
    setDraft(defaultDraft);
    setFormError("");
    setPanelOpen(true);
  }

  function openEdit(measurement: ConstructionMeasurement) {
    setDraft({
      id: measurement.id,
      planFileId: measurement.plan_file_id ?? "",
      measurementType: measurement.measurement_type,
      label: measurement.label,
      length: stringifyNumber(measurement.length),
      width: stringifyNumber(measurement.width),
      heightOrDepth: stringifyNumber(measurement.height_or_depth),
      quantity: stringifyNumber(measurement.quantity || 1),
      unit: measurement.unit,
      wastePercentage: stringifyNumber(measurement.waste_percentage || 0),
      notes: measurement.notes ?? "",
    });
    setFormError("");
    setPanelOpen(true);
  }

  async function saveMeasurement() {
    if (mutation) return;
    const payload = buildPayload(draft, text);
    if (!payload.ok) {
      setFormError(payload.message);
      return;
    }
    setMutation("save");
    setFormError("");
    try {
      const response = await fetch(
        draft.id
          ? `/api/construction/measurements/${draft.id}`
          : `/api/construction/projects/${projectId}/measurements`,
        {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload.value),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(text.measurementSaveError);
      setPanelOpen(false);
      await load();
    } catch {
      setFormError(text.measurementSaveError);
    } finally {
      setMutation(null);
    }
  }

  async function deleteMeasurement(measurement: ConstructionMeasurement) {
    if (mutation) return;
    if (confirmDeleteId !== measurement.id) {
      setConfirmDeleteId(measurement.id);
      return;
    }
    setMutation(`delete-${measurement.id}`);
    setError("");
    try {
      const response = await fetch(
        `/api/construction/measurements/${measurement.id}?confirm=delete`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok || !data.ok)
        throw new Error(text.measurementDeleteError);
      setConfirmDeleteId(null);
      await load();
    } catch {
      setError(text.measurementDeleteError);
    } finally {
      setMutation(null);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 rounded-3xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-xl font-medium">{text.measurements}</h3>
            <p className="mt-1 text-sm leading-6 text-[#6B7280]">
              {text.verifyMeasurements}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            {text.addMeasurement}
          </button>
        </div>

        {error ? <ErrorNote message={error} /> : null}
        {state === "loading" ? (
          <LoadingState text={text.loadingMeasurements} />
        ) : state === "error" ? (
          <RetryState
            text={text.measurementLoadError}
            retry={text.retry}
            onRetry={load}
          />
        ) : measurements.length ? (
          <div className="mt-4 grid gap-3">
            {measurements.map((measurement) => (
              <MeasurementCard
                key={measurement.id}
                measurement={measurement}
                language={language}
                text={text}
                file={fileById.get(measurement.plan_file_id ?? "")}
                confirmingDelete={confirmDeleteId === measurement.id}
                busy={mutation === `delete-${measurement.id}`}
                onEdit={() => openEdit(measurement)}
                onDelete={() => void deleteMeasurement(measurement)}
              />
            ))}
          </div>
        ) : (
          <EmptyState text={text.noMeasurements} />
        )}
      </div>

      <aside className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F7F8]">
          <Calculator className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-lg font-medium">{text.measurementSummary}</h3>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
          {text.estimateOnly}
        </p>
        <div className="mt-4 space-y-2">
          <SummaryLine
            label={text.measurements}
            value={String(measurements.length)}
          />
          {Object.entries(summary).map(([key, group]) => (
            <SummaryLine
              key={key}
              label={group.label}
              value={displayMeasurementTotal(group.total)}
            />
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-[#F7F7F8] p-3 text-sm leading-6 text-[#6B7280]">
          <p>{text.verifyMeasurements}</p>
          <p>{text.estimateOnly}</p>
          <p>{text.notAdvice}</p>
        </div>
      </aside>

      {panelOpen ? (
        <MeasurementPanel
          draft={draft}
          files={files}
          language={language}
          text={text}
          state={mutation === "save" ? "loading" : "idle"}
          error={formError}
          onChange={setDraft}
          onClose={() => setPanelOpen(false)}
          onSave={() => void saveMeasurement()}
        />
      ) : null}
    </section>
  );
}

function MeasurementPanel({
  draft,
  files,
  language,
  text,
  state,
  error,
  onChange,
  onClose,
  onSave,
}: {
  draft: MeasurementDraft;
  files: ConstructionPlanFile[];
  language: AlmaShellLanguage;
  text: ConstructionMeasurementText;
  state: RequestState;
  error: string;
  onChange: (draft: MeasurementDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const preview = buildPayload(draft, text);
  const dimensionFields = visibleDimensions(draft.measurementType);
  const unitOptions = unitsByType[draft.measurementType];

  function changeType(measurementType: ConstructionMeasurementType) {
    const nextUnit = unitsByType[measurementType][0];
    onChange({
      ...draft,
      measurementType,
      unit: nextUnit,
      length: measurementType === "count" ? "" : draft.length,
      width: ["area", "volume", "perimeter"].includes(measurementType)
        ? draft.width
        : "",
      heightOrDepth: measurementType === "volume" ? draft.heightOrDepth : "",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 p-0 sm:items-center sm:justify-center sm:p-4">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-2xl font-medium">
            {draft.id ? text.editMeasurement : text.addMeasurement}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB]"
            aria-label={text.cancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">{text.label}</span>
            <input
              value={draft.label}
              onChange={(event) =>
                onChange({ ...draft, label: event.target.value })
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4 outline-none focus:border-black"
            />
          </label>
          <SelectField
            label={text.measurements}
            value={draft.measurementType}
            onChange={(value) =>
              changeType(value as ConstructionMeasurementType)
            }
            options={(
              ["linear", "area", "volume", "perimeter", "count"] as const
            ).map((type) => [type, text[type]] as const)}
          />
          <SelectField
            label={text.unit}
            value={draft.unit}
            onChange={(value) =>
              onChange({ ...draft, unit: value as ConstructionUnit })
            }
            options={unitOptions.map(
              (unit) => [unit, unitLabel(unit, language)] as const,
            )}
          />
          <SelectField
            label={text.linkedPlan}
            value={draft.planFileId}
            onChange={(value) => onChange({ ...draft, planFileId: value })}
            options={[
              ["", text.noLinkedPlan] as const,
              ...files.map(
                (file) =>
                  [file.id, file.title || file.original_filename] as const,
              ),
            ]}
          />
          {dimensionFields.includes("length") ? (
            <NumberField
              label={text.length}
              value={draft.length}
              onChange={(value) => onChange({ ...draft, length: value })}
            />
          ) : null}
          {dimensionFields.includes("width") ? (
            <NumberField
              label={text.width}
              value={draft.width}
              onChange={(value) => onChange({ ...draft, width: value })}
            />
          ) : null}
          {dimensionFields.includes("heightOrDepth") ? (
            <NumberField
              label={text.heightDepth}
              value={draft.heightOrDepth}
              onChange={(value) => onChange({ ...draft, heightOrDepth: value })}
            />
          ) : null}
          <NumberField
            label={text.quantity}
            value={draft.quantity}
            onChange={(value) => onChange({ ...draft, quantity: value })}
          />
          <NumberField
            label={text.waste}
            value={draft.wastePercentage}
            onChange={(value) => onChange({ ...draft, wastePercentage: value })}
          />
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">{text.notes}</span>
            <textarea
              value={draft.notes}
              onChange={(event) =>
                onChange({ ...draft, notes: event.target.value })
              }
              className="mt-2 min-h-24 w-full resize-y rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] p-4 outline-none focus:border-black"
            />
          </label>
        </div>

        <div className="mt-4 rounded-3xl bg-[#F7F7F8] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            {text.estimate}
          </p>
          {preview.ok ? (
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <SummaryLine
                label={text.baseTotal}
                value={`${displayMeasurementTotal(
                  preview.value.baseTotal,
                )} ${unitLabel(preview.value.unit, language)}`}
              />
              <SummaryLine
                label={text.adjustedTotal}
                value={`${displayMeasurementTotal(
                  preview.value.adjustedTotal,
                )} ${unitLabel(preview.value.unit, language)}`}
              />
              <p className="sm:col-span-2 text-[#6B7280]">
                {text.formula}: {formulaLabel(draft.measurementType, text)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[#991B1B]">
              {preview.message}
            </p>
          )}
        </div>

        {error ? <ErrorNote message={error} /> : null}
        <div className="mt-5 grid gap-2 sm:flex sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-[#D1D5DB] px-5 font-medium"
          >
            {text.cancel}
          </button>
          <button
            type="button"
            disabled={state === "loading"}
            onClick={onSave}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 font-medium text-white disabled:bg-[#9CA3AF]"
          >
            {state === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {state === "loading" ? text.saving : text.save}
          </button>
        </div>
      </section>
    </div>
  );
}

function MeasurementCard({
  measurement,
  language,
  text,
  file,
  confirmingDelete,
  busy,
  onEdit,
  onDelete,
}: {
  measurement: ConstructionMeasurement;
  language: AlmaShellLanguage;
  text: ConstructionMeasurementText;
  file?: ConstructionPlanFile;
  confirmingDelete: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-3xl border border-[#E5E7EB] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F7F8]">
          <Ruler className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="break-words text-lg font-medium">
            {measurement.label}
          </h4>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-[#9CA3AF]">
            {text[measurement.measurement_type]} /{" "}
            {unitLabel(measurement.unit, language)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <SummaryLine
          label={text.quantity}
          value={String(measurement.quantity)}
        />
        <SummaryLine
          label={text.waste}
          value={`${displayMeasurementTotal(Number(measurement.waste_percentage))}%`}
        />
        <SummaryLine
          label={text.baseTotal}
          value={`${displayMeasurementTotal(
            Number(measurement.base_total),
          )} ${unitLabel(measurement.unit, language)}`}
        />
        <SummaryLine
          label={text.adjustedTotal}
          value={`${displayMeasurementTotal(
            Number(measurement.adjusted_total),
          )} ${unitLabel(measurement.unit, language)}`}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-[#6B7280]">
        {dimensionSummary(measurement, text)}
      </p>
      {file ? (
        <p className="mt-2 flex min-w-0 items-center gap-2 text-sm text-[#6B7280]">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {file.title || file.original_filename}
          </span>
        </p>
      ) : null}
      {measurement.notes ? (
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
          {measurement.notes}
        </p>
      ) : null}
      {confirmingDelete ? (
        <p className="mt-3 rounded-2xl bg-[#FEF2F2] p-3 text-sm leading-6 text-[#991B1B]">
          {text.confirmDeleteMeasurement}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
        <ActionButton icon={Pencil} label={text.edit} onClick={onEdit} />
        <ActionButton
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

function buildPayload(
  draft: MeasurementDraft,
  text: ConstructionMeasurementText,
):
  | {
      ok: true;
      value: {
        planFileId: string | null;
        measurementType: ConstructionMeasurementType;
        label: string;
        length: number | null;
        width: number | null;
        heightOrDepth: number | null;
        quantity: number;
        unit: ConstructionUnit;
        wastePercentage: number;
        notes: string | null;
        baseTotal: number;
        adjustedTotal: number;
      };
    }
  | { ok: false; message: string } {
  if (!draft.label.trim()) return { ok: false, message: text.requiredField };
  const input = {
    measurementType: draft.measurementType,
    length: parseDraftNumber(draft.length),
    width: parseDraftNumber(draft.width),
    heightOrDepth: parseDraftNumber(draft.heightOrDepth),
    quantity: parseDraftNumber(draft.quantity) ?? 1,
    unit: draft.unit,
    wastePercentage: parseDraftNumber(draft.wastePercentage) ?? 0,
  };
  const result = tryCalculateMeasurement(input);
  if (!result.ok) return { ok: false, message: text.invalidMeasurement };
  return {
    ok: true,
    value: {
      planFileId: draft.planFileId || null,
      ...input,
      label: draft.label.trim(),
      notes: draft.notes.trim() || null,
      baseTotal: result.result.baseTotal,
      adjustedTotal: result.result.adjustedTotal,
    },
  };
}

function visibleDimensions(type: ConstructionMeasurementType) {
  if (type === "linear") return ["length"];
  if (type === "area" || type === "perimeter") return ["length", "width"];
  if (type === "volume") return ["length", "width", "heightOrDepth"];
  return [];
}

function formulaLabel(
  type: ConstructionMeasurementType,
  text: ConstructionMeasurementText,
) {
  if (type === "linear") return `${text.length} x ${text.quantity}`;
  if (type === "area")
    return `${text.length} x ${text.width} x ${text.quantity}`;
  if (type === "volume")
    return `${text.length} x ${text.width} x ${text.heightDepth} x ${text.quantity}`;
  if (type === "perimeter")
    return `2 x (${text.length} + ${text.width}) x ${text.quantity}`;
  return text.quantity;
}

function dimensionSummary(
  measurement: ConstructionMeasurement,
  text: ConstructionMeasurementText,
) {
  const parts = [];
  if (measurement.length) parts.push(`${text.length}: ${measurement.length}`);
  if (measurement.width) parts.push(`${text.width}: ${measurement.width}`);
  if (measurement.height_or_depth)
    parts.push(`${text.heightDepth}: ${measurement.height_or_depth}`);
  return parts.join(" / ") || text.count;
}

function unitLabel(unit: ConstructionUnit, language: AlmaShellLanguage) {
  const labels: Record<ConstructionUnit, string> = {
    feet: language === "es" ? "pies" : "feet",
    inches: language === "es" ? "pulgadas" : "inches",
    yards: language === "es" ? "yardas" : "yards",
    square_feet: language === "es" ? "pies cuadrados" : "sq ft",
    square_yards: language === "es" ? "yardas cuadradas" : "sq yd",
    cubic_feet: language === "es" ? "pies cubicos" : "cu ft",
    cubic_yards: language === "es" ? "yardas cubicas" : "cu yd",
    each: language === "es" ? "cada uno" : "each",
  };
  return labels[unit];
}

function parseDraftNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function stringifyNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "";
  return String(value);
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

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-sm font-medium">{label}</span>
      <input
        value={value}
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4 outline-none focus:border-black"
      />
    </label>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F7F7F8] p-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#9CA3AF]">
        {label}
      </p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  spinning,
}: {
  icon: typeof Pencil;
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
      className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] px-3 text-sm font-medium disabled:text-[#9CA3AF]"
    >
      <Icon className={`h-4 w-4 shrink-0 ${spinning ? "animate-spin" : ""}`} />
      <span className="truncate">{label}</span>
    </button>
  );
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
