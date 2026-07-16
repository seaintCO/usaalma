"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ConstructionPlanFile } from "@/components/construction/FileUpload";
import type { ConstructionMeasurement } from "@/components/construction/MeasurementCalculator";
import { displayMaterialQuantity } from "@/lib/construction/materials";

type RequestState = "idle" | "loading" | "success" | "error";

type ConstructionMaterial = {
  id: string;
  material_name: string;
  unit: string;
  calculated_quantity: number | string;
  manual_quantity_override?: number | string | null;
};

type CrewChecklistItem = {
  id: string;
  title: string;
  body: string;
  completed: boolean;
  measurementId: string | null;
  materialId: string | null;
  planFileId: string | null;
};

type CrewInstructions = {
  checklist?: CrewChecklistItem[];
  work_sequence?: string | null;
  workSequence?: string | null;
  measurement_references?: string[];
  material_summary_notes?: string | null;
  plan_file_references?: string[];
  user_safety_notes?: string | null;
  assigned_crew_text?: string | null;
};

type CrewDraft = CrewChecklistItem;

export type ConstructionCrewText = {
  crew: string;
  addInstruction: string;
  editInstruction: string;
  checklist: string;
  workSequence: string;
  safetyNote: string;
  assignedCrew: string;
  instructionTitle: string;
  instructionBody: string;
  linkedMeasurement: string;
  noLinkedMeasurement: string;
  linkedMaterial: string;
  noLinkedMaterial: string;
  linkedPlan: string;
  noLinkedPlan: string;
  materialNotes: string;
  save: string;
  saving: string;
  cancel: string;
  edit: string;
  delete: string;
  retry: string;
  loadingCrew: string;
  noCrew: string;
  crewLoadError: string;
  crewSaveError: string;
  crewDeleteConfirm: string;
  createTask: string;
  addToPlanner: string;
  taskCreated: string;
  plannerAdded: string;
  taskPlannerError: string;
  crewDisclaimer: string;
  moveUp: string;
  moveDown: string;
};

const emptyDraft: CrewDraft = {
  id: "",
  title: "",
  body: "",
  completed: false,
  measurementId: null,
  materialId: null,
  planFileId: null,
};

export function CrewWorkspace({
  projectId,
  text,
}: {
  projectId: string;
  text: ConstructionCrewText;
}) {
  const [checklist, setChecklist] = useState<CrewChecklistItem[]>([]);
  const [workSequence, setWorkSequence] = useState("");
  const [safetyNote, setSafetyNote] = useState("");
  const [assignedCrew, setAssignedCrew] = useState("");
  const [materialNotes, setMaterialNotes] = useState("");
  const [measurements, setMeasurements] = useState<ConstructionMeasurement[]>(
    [],
  );
  const [materials, setMaterials] = useState<ConstructionMaterial[]>([]);
  const [files, setFiles] = useState<ConstructionPlanFile[]>([]);
  const [state, setState] = useState<RequestState>("idle");
  const [mutation, setMutation] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<CrewDraft | null>(null);
  const [draftMode, setDraftMode] = useState<"create" | "edit">("create");
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [canonicalStatus, setCanonicalStatus] = useState<
    Record<string, string>
  >({});

  const measurementById = useMemo(
    () => new Map(measurements.map((item) => [item.id, item])),
    [measurements],
  );
  const materialById = useMemo(
    () => new Map(materials.map((item) => [item.id, item])),
    [materials],
  );
  const fileById = useMemo(
    () => new Map(files.map((item) => [item.id, item])),
    [files],
  );

  async function load() {
    setState("loading");
    setError("");
    try {
      const [
        crewResponse,
        measurementsResponse,
        materialsResponse,
        filesResponse,
      ] = await Promise.all([
        fetch(`/api/construction/projects/${projectId}/crew-instructions`),
        fetch(`/api/construction/projects/${projectId}/measurements`),
        fetch(`/api/construction/projects/${projectId}/materials`),
        fetch(`/api/construction/projects/${projectId}/files`),
      ]);
      const crewData = await crewResponse.json();
      const measurementsData = await measurementsResponse.json();
      const materialsData = await materialsResponse.json();
      const filesData = await filesResponse.json();
      if (!crewResponse.ok || !crewData.ok) throw new Error(text.crewLoadError);
      applyCrew(crewData.crewInstructions);
      setMeasurements(
        measurementsResponse.ok && Array.isArray(measurementsData.measurements)
          ? measurementsData.measurements
          : [],
      );
      setMaterials(
        materialsResponse.ok && Array.isArray(materialsData.materials)
          ? materialsData.materials
          : [],
      );
      setFiles(
        filesResponse.ok && Array.isArray(filesData.files)
          ? filesData.files
          : [],
      );
      setState("success");
    } catch {
      setState("error");
      setError(text.crewLoadError);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function applyCrew(crew: CrewInstructions | null) {
    setChecklist(normalizeChecklist(crew?.checklist));
    setWorkSequence(crew?.work_sequence ?? crew?.workSequence ?? "");
    setSafetyNote(crew?.user_safety_notes ?? "");
    setAssignedCrew(crew?.assigned_crew_text ?? "");
    setMaterialNotes(crew?.material_summary_notes ?? "");
  }

  async function persist(nextChecklist = checklist) {
    setMutation("save");
    setFormError("");
    setError("");
    try {
      const response = await fetch(
        `/api/construction/projects/${projectId}/crew-instructions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checklist: nextChecklist,
            workSequence,
            materialSummaryNotes: materialNotes,
            measurementReferences: uniqueIds(
              nextChecklist.map((item) => item.measurementId),
            ),
            planFileReferences: uniqueIds(
              nextChecklist.map((item) => item.planFileId),
            ),
            userSafetyNotes: safetyNote,
            assignedCrewText: assignedCrew,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(text.crewSaveError);
      applyCrew(data.crewInstructions);
      return true;
    } catch {
      setFormError(text.crewSaveError);
      setError(text.crewSaveError);
      return false;
    } finally {
      setMutation(null);
    }
  }

  function openCreate() {
    setDraft({ ...emptyDraft, id: crypto.randomUUID() });
    setDraftMode("create");
    setFormError("");
  }

  function openEdit(item: CrewChecklistItem) {
    setDraft({ ...item });
    setDraftMode("edit");
    setFormError("");
  }

  async function saveDraft() {
    if (!draft || mutation) return;
    if (!draft.title.trim()) {
      setFormError(text.crewSaveError);
      return;
    }
    const nextItem = {
      ...draft,
      title: draft.title.trim(),
      body: draft.body.trim(),
    };
    const exists = checklist.some((item) => item.id === nextItem.id);
    const nextChecklist = exists
      ? checklist.map((item) => (item.id === nextItem.id ? nextItem : item))
      : [...checklist, nextItem];
    const saved = await persist(nextChecklist);
    if (saved) setDraft(null);
  }

  async function deleteItem(item: CrewChecklistItem) {
    if (mutation) return;
    if (confirmDeleteId !== item.id) {
      setConfirmDeleteId(item.id);
      return;
    }
    const saved = await persist(
      checklist.filter((entry) => entry.id !== item.id),
    );
    if (saved) setConfirmDeleteId(null);
  }

  async function toggleItem(item: CrewChecklistItem) {
    if (mutation) return;
    await persist(
      checklist.map((entry) =>
        entry.id === item.id
          ? { ...entry, completed: !entry.completed }
          : entry,
      ),
    );
  }

  async function moveItem(item: CrewChecklistItem, direction: -1 | 1) {
    if (mutation) return;
    const currentIndex = checklist.findIndex((entry) => entry.id === item.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= checklist.length)
      return;
    const nextChecklist = [...checklist];
    const [moved] = nextChecklist.splice(currentIndex, 1);
    nextChecklist.splice(nextIndex, 0, moved);
    await persist(nextChecklist);
  }

  async function createCanonical(
    item: CrewChecklistItem,
    target: "task" | "planner",
  ) {
    const key = `${target}-${item.id}`;
    if (mutation) return;
    setMutation(key);
    setCanonicalStatus((current) => ({ ...current, [key]: "" }));
    try {
      const endpoint =
        target === "task" ? "/api/tasks/create" : "/api/planner/add";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          target === "task"
            ? {
                title: item.title,
                description: item.body,
                priority: "medium",
                status: item.completed ? "done" : "open",
              }
            : {
                title: item.title,
                notes: item.body,
              },
        ),
      });
      if (!response.ok) throw new Error(text.taskPlannerError);
      setCanonicalStatus((current) => ({
        ...current,
        [key]: target === "task" ? text.taskCreated : text.plannerAdded,
      }));
    } catch {
      setCanonicalStatus((current) => ({
        ...current,
        [key]: text.taskPlannerError,
      }));
    } finally {
      setMutation(null);
    }
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 rounded-3xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-medium">{text.crew}</h3>
            <p className="mt-1 text-sm leading-6 text-[#6B7280]">
              {text.crewDisclaimer}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            {text.addInstruction}
          </button>
        </div>
        {error && !draft ? <ErrorNote message={error} /> : null}
        {state === "loading" ? (
          <LoadingState text={text.loadingCrew} />
        ) : state === "error" ? (
          <RetryState
            text={text.crewLoadError}
            retry={text.retry}
            onRetry={load}
          />
        ) : checklist.length ? (
          <div className="mt-4 grid gap-3">
            {checklist.map((item, index) => (
              <CrewCard
                key={item.id}
                item={item}
                index={index}
                last={index === checklist.length - 1}
                text={text}
                measurement={measurementById.get(item.measurementId ?? "")}
                material={materialById.get(item.materialId ?? "")}
                file={fileById.get(item.planFileId ?? "")}
                confirmingDelete={confirmDeleteId === item.id}
                busy={Boolean(mutation)}
                status={canonicalStatus}
                onToggle={() => void toggleItem(item)}
                onEdit={() => openEdit(item)}
                onDelete={() => void deleteItem(item)}
                onMove={(direction) => void moveItem(item, direction)}
                onCanonical={(target) => void createCanonical(item, target)}
              />
            ))}
          </div>
        ) : (
          <EmptyState text={text.noCrew} />
        )}
      </div>

      <aside className="grid gap-4">
        <CrewTextPanel
          label={text.workSequence}
          value={workSequence}
          onChange={setWorkSequence}
          onSave={() => void persist()}
          saving={mutation === "save"}
          text={text}
        />
        <CrewTextPanel
          label={text.safetyNote}
          value={safetyNote}
          onChange={setSafetyNote}
          onSave={() => void persist()}
          saving={mutation === "save"}
          text={text}
        />
        <CrewTextPanel
          label={text.assignedCrew}
          value={assignedCrew}
          onChange={setAssignedCrew}
          onSave={() => void persist()}
          saving={mutation === "save"}
          text={text}
        />
        <CrewTextPanel
          label={text.materialNotes}
          value={materialNotes}
          onChange={setMaterialNotes}
          onSave={() => void persist()}
          saving={mutation === "save"}
          text={text}
        />
      </aside>

      {draft ? (
        <CrewPanel
          draft={draft}
          measurements={measurements}
          materials={materials}
          files={files}
          text={text}
          error={formError}
          saving={mutation === "save"}
          mode={draftMode}
          onChange={setDraft}
          onClose={() => setDraft(null)}
          onSave={() => void saveDraft()}
        />
      ) : null}
    </section>
  );
}

function CrewCard({
  item,
  index,
  last,
  text,
  measurement,
  material,
  file,
  confirmingDelete,
  busy,
  status,
  onToggle,
  onEdit,
  onDelete,
  onMove,
  onCanonical,
}: {
  item: CrewChecklistItem;
  index: number;
  last: boolean;
  text: ConstructionCrewText;
  measurement?: ConstructionMeasurement;
  material?: ConstructionMaterial;
  file?: ConstructionPlanFile;
  confirmingDelete: boolean;
  busy: boolean;
  status: Record<string, string>;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onCanonical: (target: "task" | "planner") => void;
}) {
  return (
    <article className="rounded-3xl border border-[#E5E7EB] p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
            item.completed
              ? "border-black bg-black text-white"
              : "border-[#E5E7EB] bg-[#F7F7F8]"
          }`}
          aria-label={text.checklist}
        >
          <CheckCircle2 className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h4 className="break-words text-lg font-medium">{item.title}</h4>
          {item.body ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#6B7280]">
              {item.body}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <ReferenceLine
          label={text.linkedMeasurement}
          value={measurement?.label || text.noLinkedMeasurement}
        />
        <ReferenceLine
          label={text.linkedMaterial}
          value={material ? materialLabel(material) : text.noLinkedMaterial}
        />
        <ReferenceLine
          label={text.linkedPlan}
          value={file?.title || text.noLinkedPlan}
        />
      </div>
      {confirmingDelete ? (
        <p className="mt-3 rounded-2xl bg-[#FEF2F2] p-3 text-sm leading-6 text-[#991B1B]">
          {text.crewDeleteConfirm}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <ActionButton
          icon={ArrowUp}
          label={text.moveUp}
          disabled={index === 0 || busy}
          onClick={() => onMove(-1)}
        />
        <ActionButton
          icon={ArrowDown}
          label={text.moveDown}
          disabled={last || busy}
          onClick={() => onMove(1)}
        />
        <ActionButton
          icon={Pencil}
          label={text.edit}
          disabled={busy}
          onClick={onEdit}
        />
        <ActionButton
          icon={Trash2}
          label={text.delete}
          disabled={busy}
          onClick={onDelete}
        />
        <ActionButton
          icon={ClipboardCheck}
          label={text.createTask}
          disabled={busy}
          onClick={() => onCanonical("task")}
        />
        <ActionButton
          icon={CalendarPlus}
          label={text.addToPlanner}
          disabled={busy}
          onClick={() => onCanonical("planner")}
        />
      </div>
      {status[`task-${item.id}`] || status[`planner-${item.id}`] ? (
        <div className="mt-3 grid gap-2 text-sm leading-6 text-[#374151]">
          {status[`task-${item.id}`] ? (
            <p>{status[`task-${item.id}`]}</p>
          ) : null}
          {status[`planner-${item.id}`] ? (
            <p>{status[`planner-${item.id}`]}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function CrewPanel({
  draft,
  measurements,
  materials,
  files,
  text,
  error,
  saving,
  mode,
  onChange,
  onClose,
  onSave,
}: {
  draft: CrewDraft;
  measurements: ConstructionMeasurement[];
  materials: ConstructionMaterial[];
  files: ConstructionPlanFile[];
  text: ConstructionCrewText;
  error: string;
  saving: boolean;
  mode: "create" | "edit";
  onChange: (draft: CrewDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 p-0 sm:items-center sm:justify-center sm:p-4">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-2xl font-medium">
            {mode === "edit" ? text.editInstruction : text.addInstruction}
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
            <span className="text-sm font-medium">{text.instructionTitle}</span>
            <input
              value={draft.title}
              onChange={(event) =>
                onChange({ ...draft, title: event.target.value })
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4 outline-none focus:border-black"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">{text.instructionBody}</span>
            <textarea
              value={draft.body}
              onChange={(event) =>
                onChange({ ...draft, body: event.target.value })
              }
              className="mt-2 min-h-40 w-full resize-y rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] p-4 outline-none focus:border-black"
            />
          </label>
          <SelectField
            label={text.linkedMeasurement}
            value={draft.measurementId ?? ""}
            onChange={(value) =>
              onChange({ ...draft, measurementId: value || null })
            }
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
            label={text.linkedMaterial}
            value={draft.materialId ?? ""}
            onChange={(value) =>
              onChange({ ...draft, materialId: value || null })
            }
            options={[
              ["", text.noLinkedMaterial],
              ...materials.map(
                (material) =>
                  [material.id, materialLabel(material)] as readonly [
                    string,
                    string,
                  ],
              ),
            ]}
          />
          <SelectField
            label={text.linkedPlan}
            value={draft.planFileId ?? ""}
            onChange={(value) =>
              onChange({ ...draft, planFileId: value || null })
            }
            options={[
              ["", text.noLinkedPlan],
              ...files.map(
                (file) => [file.id, file.title] as readonly [string, string],
              ),
            ]}
          />
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
            disabled={saving}
            onClick={onSave}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 font-medium text-white disabled:bg-[#9CA3AF]"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {saving ? text.saving : text.save}
          </button>
        </div>
      </section>
    </div>
  );
}

function CrewTextPanel({
  label,
  value,
  onChange,
  onSave,
  saving,
  text,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  text: ConstructionCrewText;
}) {
  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
      <h3 className="font-medium">{label}</h3>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-3 min-h-32 w-full resize-y rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] p-3 text-sm outline-none focus:border-black"
      />
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-4 text-sm font-medium text-white disabled:bg-[#9CA3AF]"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {saving ? text.saving : text.save}
      </button>
    </section>
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

function ReferenceLine({ label, value }: { label: string; value: string }) {
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
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#E5E7EB] px-3 text-sm font-medium disabled:text-[#9CA3AF]"
    >
      <Icon className="h-4 w-4" />
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

function normalizeChecklist(input: unknown): CrewChecklistItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is Partial<CrewChecklistItem> =>
      Boolean(item && typeof item === "object"),
    )
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `item-${index}`,
      title: typeof item.title === "string" ? item.title : `Item ${index + 1}`,
      body: typeof item.body === "string" ? item.body : "",
      completed: item.completed === true,
      measurementId:
        typeof item.measurementId === "string" ? item.measurementId : null,
      materialId: typeof item.materialId === "string" ? item.materialId : null,
      planFileId: typeof item.planFileId === "string" ? item.planFileId : null,
    }));
}

function uniqueIds(values: Array<string | null>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function materialLabel(material: ConstructionMaterial) {
  const finalQuantity =
    material.manual_quantity_override ?? material.calculated_quantity;
  return `${material.material_name} (${displayMaterialQuantity(finalQuantity)} ${material.unit})`;
}
