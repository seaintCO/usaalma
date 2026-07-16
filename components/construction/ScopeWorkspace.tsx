"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Pencil,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  constructionScopeKeys,
  type ConstructionScopeKey,
} from "@/lib/construction/types";

type RequestState = "idle" | "loading" | "success" | "error";

type ConstructionScopeSection = {
  id?: string;
  section_key: ConstructionScopeKey;
  title: string;
  content?: string | null;
  sort_order?: number | string | null;
};

type ScopeDraft = {
  sectionKey: ConstructionScopeKey;
  title: string;
  content: string;
};

export type ConstructionScopeText = {
  scope: string;
  scopeSections: string;
  projectSummary: string;
  includedWork: string;
  exclusions: string;
  assumptions: string;
  materialNotes: string;
  accessSiteNotes: string;
  customerNotes: string;
  editSection: string;
  moveUp: string;
  moveDown: string;
  clearSection: string;
  save: string;
  saving: string;
  cancel: string;
  edit: string;
  retry: string;
  loadingScope: string;
  noScope: string;
  scopeLoadError: string;
  scopeSaveError: string;
  scopeDisclaimer: string;
};

const sectionCopyKey: Record<
  ConstructionScopeKey,
  keyof ConstructionScopeText
> = {
  project_summary: "projectSummary",
  included_work: "includedWork",
  exclusions: "exclusions",
  assumptions: "assumptions",
  material_notes: "materialNotes",
  access_site_notes: "accessSiteNotes",
  customer_notes: "customerNotes",
};

export function ScopeWorkspace({
  projectId,
  text,
}: {
  projectId: string;
  text: ConstructionScopeText;
}) {
  const [sections, setSections] = useState<ConstructionScopeSection[]>([]);
  const [state, setState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const [mutation, setMutation] = useState<RequestState>("idle");
  const [draft, setDraft] = useState<ScopeDraft | null>(null);
  const [formError, setFormError] = useState("");

  const orderedSections = useMemo(
    () => buildOrderedSections(sections, text),
    [sections, text],
  );

  async function load() {
    setState("loading");
    setError("");
    try {
      const response = await fetch(
        `/api/construction/projects/${projectId}/scope`,
      );
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(text.scopeLoadError);
      setSections(Array.isArray(data.scope) ? data.scope : []);
      setState("success");
    } catch {
      setState("error");
      setError(text.scopeLoadError);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function openEditor(section: ConstructionScopeSection) {
    setDraft({
      sectionKey: section.section_key,
      title: section.title || text[sectionCopyKey[section.section_key]],
      content: section.content ?? "",
    });
    setFormError("");
  }

  async function persist(nextSections: ConstructionScopeSection[]) {
    setMutation("loading");
    setFormError("");
    setError("");
    try {
      const payload = {
        sections: nextSections.map((section, index) => ({
          sectionKey: section.section_key,
          title: section.title || text[sectionCopyKey[section.section_key]],
          content: section.content ?? "",
          sortOrder: index,
        })),
      };
      const response = await fetch(
        `/api/construction/projects/${projectId}/scope`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(text.scopeSaveError);
      setSections(Array.isArray(data.scope) ? data.scope : nextSections);
      setMutation("success");
      return true;
    } catch {
      setMutation("error");
      setFormError(text.scopeSaveError);
      setError(text.scopeSaveError);
      return false;
    }
  }

  async function saveDraft() {
    if (!draft || mutation === "loading") return;
    const nextSections = orderedSections.map((section) =>
      section.section_key === draft.sectionKey
        ? { ...section, title: draft.title.trim(), content: draft.content }
        : section,
    );
    const saved = await persist(nextSections);
    if (saved) setDraft(null);
  }

  async function clearSection(section: ConstructionScopeSection) {
    if (mutation === "loading") return;
    await persist(
      orderedSections.map((item) =>
        item.section_key === section.section_key
          ? { ...item, content: "" }
          : item,
      ),
    );
  }

  async function moveSection(
    section: ConstructionScopeSection,
    direction: -1 | 1,
  ) {
    if (mutation === "loading") return;
    const currentIndex = orderedSections.findIndex(
      (item) => item.section_key === section.section_key,
    );
    const nextIndex = currentIndex + direction;
    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= orderedSections.length
    ) {
      return;
    }
    const nextSections = [...orderedSections];
    const [moved] = nextSections.splice(currentIndex, 1);
    nextSections.splice(nextIndex, 0, moved);
    await persist(nextSections);
  }

  const hasContent = orderedSections.some((section) =>
    (section.content ?? "").trim(),
  );

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 rounded-3xl border border-[#E5E7EB] bg-white p-4">
        <div>
          <h3 className="text-xl font-medium">{text.scopeSections}</h3>
          <p className="mt-1 text-sm leading-6 text-[#6B7280]">
            {text.scopeDisclaimer}
          </p>
        </div>
        {error && !draft ? <ErrorNote message={error} /> : null}
        {state === "loading" ? (
          <LoadingState text={text.loadingScope} />
        ) : state === "error" ? (
          <RetryState
            text={text.scopeLoadError}
            retry={text.retry}
            onRetry={load}
          />
        ) : (
          <div className="mt-4 grid gap-3">
            {!hasContent ? <EmptyState text={text.noScope} /> : null}
            {orderedSections.map((section, index) => (
              <article
                key={section.section_key}
                className="rounded-3xl border border-[#E5E7EB] p-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F7F8]">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="break-words text-lg font-medium">
                      {section.title}
                    </h4>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#6B7280]">
                      {(section.content ?? "").trim() || text.noScope}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
                  <ActionButton
                    icon={Pencil}
                    label={text.edit}
                    onClick={() => openEditor(section)}
                  />
                  <ActionButton
                    icon={ArrowUp}
                    label={text.moveUp}
                    disabled={index === 0 || mutation === "loading"}
                    onClick={() => void moveSection(section, -1)}
                  />
                  <ActionButton
                    icon={ArrowDown}
                    label={text.moveDown}
                    disabled={
                      index === orderedSections.length - 1 ||
                      mutation === "loading"
                    }
                    onClick={() => void moveSection(section, 1)}
                  />
                  <ActionButton
                    icon={Trash2}
                    label={text.clearSection}
                    disabled={mutation === "loading"}
                    onClick={() => void clearSection(section)}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <aside className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
        <h3 className="font-medium">{text.scope}</h3>
        <div className="mt-4 grid gap-2">
          {orderedSections.map((section) => (
            <button
              type="button"
              key={section.section_key}
              onClick={() => openEditor(section)}
              className="rounded-2xl border border-[#E5E7EB] p-3 text-left text-sm"
            >
              <span className="block font-medium">{section.title}</span>
              <span className="mt-1 block text-[#6B7280]">
                {(section.content ?? "").trim()
                  ? text.editSection
                  : text.noScope}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {draft ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30 p-0 sm:items-center sm:justify-center sm:p-4">
          <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-2xl font-medium">{text.editSection}</h3>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E7EB]"
                aria-label={text.cancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mt-5 block">
              <span className="text-sm font-medium">{text.scope}</span>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
                className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4 outline-none focus:border-black"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-medium">{draft.title}</span>
              <textarea
                value={draft.content}
                onChange={(event) =>
                  setDraft({ ...draft, content: event.target.value })
                }
                className="mt-2 min-h-56 w-full resize-y rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] p-4 outline-none focus:border-black"
              />
            </label>
            {formError ? <ErrorNote message={formError} /> : null}
            <div className="mt-5 grid gap-2 sm:flex sm:justify-end">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="min-h-11 rounded-full border border-[#D1D5DB] px-5 font-medium"
              >
                {text.cancel}
              </button>
              <button
                type="button"
                disabled={mutation === "loading"}
                onClick={() => void saveDraft()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 font-medium text-white disabled:bg-[#9CA3AF]"
              >
                {mutation === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {mutation === "loading" ? text.saving : text.save}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function buildOrderedSections(
  sections: ConstructionScopeSection[],
  text: ConstructionScopeText,
) {
  const sectionByKey = new Map(
    sections.map((section) => [section.section_key, section]),
  );
  const defaultSections = constructionScopeKeys.map((sectionKey, index) => {
    const existing = sectionByKey.get(sectionKey);
    return {
      id: existing?.id,
      section_key: sectionKey,
      title: existing?.title || text[sectionCopyKey[sectionKey]],
      content: existing?.content ?? "",
      sort_order: existing?.sort_order ?? index,
    };
  });
  return defaultSections.sort(
    (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
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
    <div className="rounded-3xl bg-[#F7F7F8] p-5 text-sm leading-6 text-[#6B7280]">
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
