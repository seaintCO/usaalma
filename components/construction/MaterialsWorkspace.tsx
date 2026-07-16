"use client";

import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ConstructionMeasurement } from "@/components/construction/MeasurementCalculator";
import {
  calculateMaterialQuantity,
  constructionMaterialTemplates,
  displayMaterialQuantity,
  isCompatibleMaterialSource,
  type ConstructionMaterialTemplate,
} from "@/lib/construction/materials";

type RequestState = "idle" | "loading" | "success" | "error";

type ConstructionMaterial = {
  id: string;
  measurement_id?: string | null;
  material_name: string;
  source_measurement_type?: string | null;
  conversion_factor: number | string;
  calculated_quantity: number | string;
  manual_quantity_override?: number | string | null;
  waste_factor: number | string;
  unit: string;
  notes?: string | null;
  sort_order?: number | string | null;
};

type MaterialDraft = {
  id?: string;
  templateId: string;
  measurementId: string;
  materialName: string;
  sourceMeasurementType: string;
  conversionFactor: string;
  calculatedQuantity: string;
  manualQuantityOverride: string;
  wasteFactor: string;
  unit: string;
  notes: string;
};

export type ConstructionMaterialsText = {
  materials: string;
  addMaterial: string;
  editMaterial: string;
  template: string;
  manualItem: string;
  linkedMeasurement: string;
  noLinkedMeasurement: string;
  conversionFactor: string;
  calculatedQuantity: string;
  manualOverride: string;
  finalQuantity: string;
  unit: string;
  wasteFactor: string;
  notes: string;
  estimate: string;
  save: string;
  saving: string;
  cancel: string;
  edit: string;
  delete: string;
  retry: string;
  loadingMaterials: string;
  noMaterials: string;
  materialLoadError: string;
  materialSaveError: string;
  materialDeleteError: string;
  invalidMaterial: string;
  confirmDeleteMaterial: string;
  materialDisclaimer: string;
};

const emptyDraft: MaterialDraft = {
  templateId: "",
  measurementId: "",
  materialName: "",
  sourceMeasurementType: "manual",
  conversionFactor: "1",
  calculatedQuantity: "0",
  manualQuantityOverride: "",
  wasteFactor: "0",
  unit: "each",
  notes: "",
};

export function MaterialsWorkspace({
  projectId,
  text,
}: {
  projectId: string;
  text: ConstructionMaterialsText;
}) {
  const [materials, setMaterials] = useState<ConstructionMaterial[]>([]);
  const [measurements, setMeasurements] = useState<ConstructionMeasurement[]>(
    [],
  );
  const [state, setState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const [mutation, setMutation] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<MaterialDraft>(emptyDraft);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const measurementById = useMemo(
    () =>
      new Map(measurements.map((measurement) => [measurement.id, measurement])),
    [measurements],
  );

  async function load() {
    setState("loading");
    setError("");
    try {
      const [materialsResponse, measurementsResponse] = await Promise.all([
        fetch(`/api/construction/projects/${projectId}/materials`),
        fetch(`/api/construction/projects/${projectId}/measurements`),
      ]);
      const materialsData = await materialsResponse.json();
      const measurementsData = await measurementsResponse.json();
      if (!materialsResponse.ok || !materialsData.ok)
        throw new Error(text.materialLoadError);
      setMaterials(
        Array.isArray(materialsData.materials) ? materialsData.materials : [],
      );
      setMeasurements(
        measurementsResponse.ok && Array.isArray(measurementsData.measurements)
          ? measurementsData.measurements
          : [],
      );
      setState("success");
    } catch {
      setState("error");
      setError(text.materialLoadError);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function openCreate(template?: ConstructionMaterialTemplate) {
    setDraft(template ? draftFromTemplate(template) : emptyDraft);
    setFormError("");
    setPanelOpen(true);
  }

  function openEdit(material: ConstructionMaterial) {
    setDraft({
      id: material.id,
      templateId: "",
      measurementId: material.measurement_id ?? "",
      materialName: material.material_name,
      sourceMeasurementType: material.source_measurement_type ?? "manual",
      conversionFactor: String(material.conversion_factor ?? 1),
      calculatedQuantity: String(material.calculated_quantity ?? 0),
      manualQuantityOverride:
        material.manual_quantity_override === null ||
        material.manual_quantity_override === undefined
          ? ""
          : String(material.manual_quantity_override),
      wasteFactor: String(material.waste_factor ?? 0),
      unit: material.unit,
      notes: material.notes ?? "",
    });
    setFormError("");
    setPanelOpen(true);
  }

  function applyTemplate(templateId: string) {
    const template = constructionMaterialTemplates.find(
      (item) => item.id === templateId,
    );
    if (!template) {
      setDraft({ ...draft, templateId });
      return;
    }
    setDraft({
      ...draftFromTemplate(template),
      measurementId: draft.measurementId,
    });
  }

  async function saveMaterial() {
    if (mutation) return;
    const payload = buildPayload(draft, measurements);
    if (!payload.ok) {
      setFormError(text.invalidMaterial);
      return;
    }
    setMutation("save");
    setFormError("");
    try {
      const response = await fetch(
        draft.id
          ? `/api/construction/materials/${draft.id}`
          : `/api/construction/projects/${projectId}/materials`,
        {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload.value),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(text.materialSaveError);
      setPanelOpen(false);
      await load();
    } catch {
      setFormError(text.materialSaveError);
    } finally {
      setMutation(null);
    }
  }

  async function deleteMaterial(material: ConstructionMaterial) {
    if (mutation) return;
    if (confirmDeleteId !== material.id) {
      setConfirmDeleteId(material.id);
      return;
    }
    setMutation(`delete-${material.id}`);
    setError("");
    try {
      const response = await fetch(
        `/api/construction/materials/${material.id}?confirm=delete`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(text.materialDeleteError);
      setConfirmDeleteId(null);
      await load();
    } catch {
      setError(text.materialDeleteError);
    } finally {
      setMutation(null);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 rounded-3xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-medium">{text.materials}</h3>
            <p className="mt-1 text-sm leading-6 text-[#6B7280]">
              {text.materialDisclaimer}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openCreate()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            {text.addMaterial}
          </button>
        </div>
        {error ? <ErrorNote message={error} /> : null}
        {state === "loading" ? (
          <LoadingState text={text.loadingMaterials} />
        ) : state === "error" ? (
          <RetryState
            text={text.materialLoadError}
            retry={text.retry}
            onRetry={load}
          />
        ) : materials.length ? (
          <div className="mt-4 grid gap-3">
            {materials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                measurement={measurementById.get(material.measurement_id ?? "")}
                text={text}
                confirmingDelete={confirmDeleteId === material.id}
                busy={mutation === `delete-${material.id}`}
                onEdit={() => openEdit(material)}
                onDelete={() => void deleteMaterial(material)}
              />
            ))}
          </div>
        ) : (
          <EmptyState text={text.noMaterials} />
        )}
      </div>

      <aside className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F7F8]">
          <Layers3 className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-lg font-medium">{text.template}</h3>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">{text.estimate}</p>
        <div className="mt-4 grid gap-2">
          {constructionMaterialTemplates.map((template) => (
            <button
              type="button"
              key={template.id}
              onClick={() => openCreate(template)}
              className="rounded-2xl border border-[#E5E7EB] p-3 text-left text-sm"
            >
              <span className="block font-medium">{template.name}</span>
              <span className="mt-1 block text-xs uppercase tracking-[0.14em] text-[#9CA3AF]">
                {template.group} / {template.unit}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {panelOpen ? (
        <MaterialPanel
          draft={draft}
          measurements={measurements}
          text={text}
          state={mutation === "save" ? "loading" : "idle"}
          error={formError}
          onTemplate={applyTemplate}
          onChange={setDraft}
          onClose={() => setPanelOpen(false)}
          onSave={() => void saveMaterial()}
        />
      ) : null}
    </section>
  );
}

function MaterialPanel({
  draft,
  measurements,
  text,
  state,
  error,
  onTemplate,
  onChange,
  onClose,
  onSave,
}: {
  draft: MaterialDraft;
  measurements: ConstructionMeasurement[];
  text: ConstructionMaterialsText;
  state: RequestState;
  error: string;
  onTemplate: (templateId: string) => void;
  onChange: (draft: MaterialDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const preview = buildPayload(draft, measurements);
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 p-0 sm:items-center sm:justify-center sm:p-4">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-2xl font-medium">
            {draft.id ? text.editMaterial : text.addMaterial}
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
          <SelectField
            label={text.template}
            value={draft.templateId}
            onChange={onTemplate}
            options={[
              ["", text.manualItem],
              ...constructionMaterialTemplates.map(
                (template) => [template.id, template.name] as const,
              ),
            ]}
          />
          <SelectField
            label={text.linkedMeasurement}
            value={draft.measurementId}
            onChange={(value) => onChange({ ...draft, measurementId: value })}
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
          <InputField
            label={text.materials}
            value={draft.materialName}
            onChange={(value) => onChange({ ...draft, materialName: value })}
          />
          <InputField
            label={text.unit}
            value={draft.unit}
            onChange={(value) => onChange({ ...draft, unit: value })}
          />
          <InputField
            label={text.conversionFactor}
            value={draft.conversionFactor}
            inputMode="decimal"
            onChange={(value) =>
              onChange({ ...draft, conversionFactor: value })
            }
          />
          <InputField
            label={text.wasteFactor}
            value={draft.wasteFactor}
            inputMode="decimal"
            onChange={(value) => onChange({ ...draft, wasteFactor: value })}
          />
          <InputField
            label={text.manualOverride}
            value={draft.manualQuantityOverride}
            inputMode="decimal"
            onChange={(value) =>
              onChange({ ...draft, manualQuantityOverride: value })
            }
          />
          <InputField
            label={text.notes}
            value={draft.notes}
            onChange={(value) => onChange({ ...draft, notes: value })}
          />
        </div>
        <div className="mt-4 rounded-3xl bg-[#F7F7F8] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">
            {text.estimate}
          </p>
          {preview.ok ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <SummaryLine
                label={text.calculatedQuantity}
                value={displayMaterialQuantity(
                  preview.value.calculatedQuantity,
                )}
              />
              <SummaryLine
                label={text.finalQuantity}
                value={`${displayMaterialQuantity(
                  preview.value.manualQuantityOverride ??
                    preview.value.calculatedQuantity,
                )} ${draft.unit}`}
              />
              <SummaryLine
                label={text.manualOverride}
                value={
                  preview.value.manualQuantityOverride !== null
                    ? text.manualOverride
                    : "-"
                }
              />
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[#991B1B]">
              {text.invalidMaterial}
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

function MaterialCard({
  material,
  measurement,
  text,
  confirmingDelete,
  busy,
  onEdit,
  onDelete,
}: {
  material: ConstructionMaterial;
  measurement?: ConstructionMeasurement;
  text: ConstructionMaterialsText;
  confirmingDelete: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const finalQuantity =
    material.manual_quantity_override ?? material.calculated_quantity;
  return (
    <article className="rounded-3xl border border-[#E5E7EB] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F7F8]">
          <Calculator className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="break-words text-lg font-medium">
            {material.material_name}
          </h4>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#9CA3AF]">
            {measurement?.label || text.manualItem}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <SummaryLine
          label={text.calculatedQuantity}
          value={displayMaterialQuantity(material.calculated_quantity)}
        />
        <SummaryLine
          label={text.manualOverride}
          value={
            material.manual_quantity_override === null ||
            material.manual_quantity_override === undefined
              ? "-"
              : displayMaterialQuantity(material.manual_quantity_override)
          }
        />
        <SummaryLine
          label={text.finalQuantity}
          value={`${displayMaterialQuantity(finalQuantity)} ${material.unit}`}
        />
        <SummaryLine
          label={text.conversionFactor}
          value={String(material.conversion_factor)}
        />
        <SummaryLine
          label={text.wasteFactor}
          value={`${displayMaterialQuantity(material.waste_factor)}%`}
        />
      </div>
      {material.notes ? (
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">
          {material.notes}
        </p>
      ) : null}
      {confirmingDelete ? (
        <p className="mt-3 rounded-2xl bg-[#FEF2F2] p-3 text-sm leading-6 text-[#991B1B]">
          {text.confirmDeleteMaterial}
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
  draft: MaterialDraft,
  measurements: ConstructionMeasurement[],
):
  | {
      ok: true;
      value: {
        templateId: string | null;
        measurementId: string | null;
        materialName: string;
        sourceMeasurementType: string | null;
        conversionFactor: number;
        unit: string;
        calculatedQuantity: number;
        manualQuantityOverride: number | null;
        wasteFactor: number;
        notes: string | null;
        sortOrder: number;
      };
    }
  | { ok: false } {
  const measurement =
    measurements.find((item) => item.id === draft.measurementId) ?? null;
  const factor = Number(draft.conversionFactor || 1);
  const waste = Number(draft.wasteFactor || 0);
  const manual =
    draft.manualQuantityOverride.trim() === ""
      ? null
      : Number(draft.manualQuantityOverride);
  if (!draft.materialName.trim() || !draft.unit.trim()) return { ok: false };
  if (
    !Number.isFinite(factor) ||
    factor < 0 ||
    !Number.isFinite(waste) ||
    waste < 0 ||
    waste > 100 ||
    (manual !== null && (!Number.isFinite(manual) || manual < 0))
  ) {
    return { ok: false };
  }
  if (
    measurement &&
    !isCompatibleMaterialSource(
      measurement.measurement_type,
      draft.sourceMeasurementType,
    )
  ) {
    return { ok: false };
  }
  const calculated = calculateMaterialQuantity({
    measurementAdjustedTotal: measurement
      ? Number(measurement.adjusted_total ?? 0)
      : Number(draft.calculatedQuantity || 0),
    conversionFactor: factor,
    wasteFactor: waste,
    manualQuantityOverride: manual,
  });
  return {
    ok: true,
    value: {
      templateId: null,
      measurementId: draft.measurementId || null,
      materialName: draft.materialName.trim(),
      sourceMeasurementType:
        draft.sourceMeasurementType === "manual"
          ? null
          : draft.sourceMeasurementType,
      conversionFactor: factor,
      unit: draft.unit.trim(),
      calculatedQuantity: calculated.calculatedQuantity,
      manualQuantityOverride: manual,
      wasteFactor: waste,
      notes: draft.notes.trim() || null,
      sortOrder: 0,
    },
  };
}

function draftFromTemplate(
  template: ConstructionMaterialTemplate,
): MaterialDraft {
  return {
    ...emptyDraft,
    templateId: template.id,
    materialName: template.name,
    sourceMeasurementType: template.sourceMeasurementType,
    conversionFactor: String(template.conversionFactor),
    wasteFactor: String(template.wasteFactor),
    unit: template.unit,
    notes: template.notes,
  };
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

function InputField({
  label,
  value,
  inputMode,
  onChange,
}: {
  label: string;
  value: string;
  inputMode?: "decimal";
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-sm font-medium">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
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
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] px-3 text-sm font-medium disabled:text-[#9CA3AF]"
    >
      <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
      {label}
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
