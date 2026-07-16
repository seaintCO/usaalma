"use client";

import {
  Download,
  ImageIcon,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type SectionKey = "create" | "edit" | "gallery";
type AspectRatio = "square" | "landscape" | "portrait";
type Quality = "medium" | "high";
type MutationKind =
  "generate" | "retry-generate" | "edit" | "retry-edit" | "upload" | "delete";

type ImageRecord = {
  id: string;
  prompt: string;
  image_base64?: string | null;
  status: "source" | "generating" | "completed" | "failed" | string;
  aspect_ratio: AspectRatio | string;
  quality: Quality | string;
  source_image_id?: string | null;
  mime_type?: string | null;
  created_at: string;
};

type GenerateResponse = {
  success?: boolean;
  message?: string;
  image?: ImageRecord & { outputBase64?: string };
  error?: string;
};

type UploadResponse = {
  success?: boolean;
  image?: ImageRecord;
  error?: string;
};

type ImageCopy = (typeof copy)[keyof typeof copy];

const copy = {
  en: {
    title: "Images",
    beta: "Generative media",
    subtitle: "Create, edit, and manage owned visuals with ALMA.",
    tabs: {
      create: "Create",
      edit: "Edit",
      gallery: "Gallery",
    },
    prompt: "Describe the image you want",
    editPrompt: "Describe the change you want",
    generate: "Generate",
    generateAgain: "Generate Again",
    retry: "Retry",
    generating: "Generating...",
    editing: "Editing...",
    upload: "Upload source",
    uploadHint: "Drop PNG, JPG, or WebP here",
    uploadBrowse: "Browse files",
    invalidFile: "Use a PNG, JPG, or WebP image.",
    fileTooLarge: "Use an image under 10 MB.",
    uploadFailed: "Upload failed. Try again.",
    edit: "Edit Image",
    editAgain: "Edit Again",
    download: "Download",
    delete: "Delete",
    confirmDelete: "Click again to delete",
    reuse: "Reuse Prompt",
    useAsSource: "Use as source",
    editThis: "Edit this image",
    openGallery: "Open in Gallery",
    source: "Source",
    noSource: "No source selected",
    selectSource: "Select source",
    optionalSource: "Optional source",
    sourceNote:
      "Create starts fresh. To transform a source image, choose it in Edit.",
    result: "Result",
    original: "Original",
    gallery: "Gallery",
    search: "Search prompts",
    all: "All",
    generated: "Generated",
    uploaded: "Uploaded",
    edited: "Edited",
    failed: "Failed",
    newest: "Newest first",
    empty: "No images yet.",
    emptyHint: "Generate or upload a source image to start your gallery.",
    loading: "Loading images...",
    loadError: "Could not load your images.",
    generationFailed: "Image generation failed. Your prompt is preserved.",
    editFailed: "Image edit failed. Your instruction is preserved.",
    deleteFailed: "Delete failed. Try again.",
    offline: "Images are temporarily unavailable.",
    providerUnavailable: "The image provider is unavailable right now.",
    timeout: "The request took too long. Retry uses the same request key.",
    selectFirst: "Select a source image first.",
    status: "Status",
    aspectRatio: "Aspect ratio",
    quality: "Quality",
    created: "Created",
    lineage: "Lineage",
    square: "Square",
    landscape: "Landscape",
    portrait: "Portrait",
    medium: "Standard",
    high: "High / final",
    selected: "Selected image",
    noPreview: "Preview appears after completion.",
    safeMeta: "Only safe user-facing metadata is shown.",
  },
  es: {
    title: "Imagenes",
    beta: "Medios generativos",
    subtitle: "Crea, edita y administra visuales propios con ALMA.",
    tabs: {
      create: "Crear",
      edit: "Editar",
      gallery: "Galeria",
    },
    prompt: "Describe la imagen que quieres",
    editPrompt: "Describe el cambio que quieres",
    generate: "Generar",
    generateAgain: "Generar otra vez",
    retry: "Reintentar",
    generating: "Generando...",
    editing: "Editando...",
    upload: "Cargar fuente",
    uploadHint: "Suelta PNG, JPG o WebP aqui",
    uploadBrowse: "Buscar archivo",
    invalidFile: "Usa una imagen PNG, JPG o WebP.",
    fileTooLarge: "Usa una imagen menor de 10 MB.",
    uploadFailed: "No se pudo cargar. Intenta otra vez.",
    edit: "Editar imagen",
    editAgain: "Editar otra vez",
    download: "Descargar",
    delete: "Eliminar",
    confirmDelete: "Haz clic otra vez para eliminar",
    reuse: "Reusar prompt",
    useAsSource: "Usar como fuente",
    editThis: "Editar esta imagen",
    openGallery: "Abrir en galeria",
    source: "Fuente",
    noSource: "Sin fuente seleccionada",
    selectSource: "Seleccionar fuente",
    optionalSource: "Fuente opcional",
    sourceNote:
      "Crear empieza desde cero. Para transformar una fuente, usala en Editar.",
    result: "Resultado",
    original: "Original",
    gallery: "Galeria",
    search: "Buscar prompts",
    all: "Todo",
    generated: "Generadas",
    uploaded: "Cargadas",
    edited: "Editadas",
    failed: "Fallidas",
    newest: "Mas recientes",
    empty: "Aun no hay imagenes.",
    emptyHint: "Genera o carga una fuente para iniciar tu galeria.",
    loading: "Cargando imagenes...",
    loadError: "No se pudieron cargar tus imagenes.",
    generationFailed: "La generacion fallo. Tu prompt se conserva.",
    editFailed: "La edicion fallo. Tu instruccion se conserva.",
    deleteFailed: "No se pudo eliminar. Intenta otra vez.",
    offline: "Imagenes no esta disponible temporalmente.",
    providerUnavailable: "El proveedor de imagenes no esta disponible ahora.",
    timeout: "La solicitud tardo demasiado. Reintentar usa la misma clave.",
    selectFirst: "Primero selecciona una fuente.",
    status: "Estado",
    aspectRatio: "Proporcion",
    quality: "Calidad",
    created: "Creada",
    lineage: "Linaje",
    square: "Cuadrado",
    landscape: "Horizontal",
    portrait: "Vertical",
    medium: "Estandar",
    high: "Alta / final",
    selected: "Imagen seleccionada",
    noPreview: "La vista previa aparece al completarse.",
    safeMeta: "Solo se muestran metadatos seguros para el usuario.",
  },
} as const;

const ASPECTS: AspectRatio[] = ["square", "landscape", "portrait"];
const QUALITIES: Quality[] = ["medium", "high"];
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

function readStoredLanguage(): AlmaShellLanguage {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("alma_language");
  return saved === "en" || saved === "es" ? saved : "en";
}

function imageSrc(image?: ImageRecord | null) {
  if (!image?.image_base64) return null;
  return `data:${image.mime_type ?? "image/png"};base64,${image.image_base64}`;
}

function statusKind(image: ImageRecord) {
  if (image.status === "source") return "uploaded";
  if (image.status === "failed") return "failed";
  if (image.source_image_id) return "edited";
  return "generated";
}

function safeApiMessage(message: string | undefined, fallback: string) {
  if (!message) return fallback;
  const lower = message.toLowerCase();
  if (lower.includes("api_key") || lower.includes("provider")) return fallback;
  return fallback;
}

export default function ImagesPage() {
  const [language, setLanguage] =
    useState<AlmaShellLanguage>(readStoredLanguage);
  const t: ImageCopy = language === "es" ? copy.es : copy.en;
  const [section, setSection] = useState<SectionKey>("create");
  const [prompt, setPrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("square");
  const [quality, setQuality] = useState<Quality>("medium");
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createSourceId, setCreateSourceId] = useState<string | null>(null);
  const [latestCreateId, setLatestCreateId] = useState<string | null>(null);
  const [latestEditId, setLatestEditId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<
    "all" | "generated" | "uploaded" | "edited" | "failed"
  >("all");
  const [loading, setLoading] = useState(true);
  const [mutation, setMutation] = useState<MutationKind | null>(null);
  const [error, setError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const createKey = useRef<string | null>(null);
  const editKey = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => images.find((image) => image.id === selectedId) ?? null,
    [images, selectedId],
  );
  const createSource = useMemo(
    () => images.find((image) => image.id === createSourceId) ?? null,
    [createSourceId, images],
  );
  const latestCreate = useMemo(
    () => images.find((image) => image.id === latestCreateId) ?? null,
    [images, latestCreateId],
  );
  const latestEdit = useMemo(
    () => images.find((image) => image.id === latestEditId) ?? null,
    [images, latestEditId],
  );
  const selectedSource = useMemo(
    () =>
      selected?.source_image_id
        ? (images.find((image) => image.id === selected.source_image_id) ??
          null)
        : null,
    [images, selected],
  );

  const filteredImages = useMemo(() => {
    return images.filter((image) => {
      const kind = statusKind(image);
      const matchesFilter = filter === "all" || kind === filter;
      const matchesQuery = image.prompt
        .toLowerCase()
        .includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [filter, images, query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/images/list");
      if (!response.ok) throw new Error("load_failed");
      const nextImages = (await response.json()) as ImageRecord[];
      setImages(nextImages);
      setSelectedId((current) => current ?? nextImages[0]?.id ?? null);
      setError("");
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function updateLanguage(next: AlmaShellLanguage) {
    setLanguage(next);
    localStorage.setItem("alma_language", next);
  }

  async function runMutation<T>(
    kind: MutationKind,
    action: () => Promise<T>,
  ): Promise<T | null> {
    if (mutation) return null;
    setMutation(kind);
    setError("");
    try {
      return await action();
    } catch {
      setError(t.offline);
      return null;
    } finally {
      setMutation(null);
    }
  }

  async function generate(reuseKey: boolean) {
    if (!prompt.trim()) return;
    await runMutation(reuseKey ? "retry-generate" : "generate", async () => {
      if (!reuseKey || !createKey.current)
        createKey.current = crypto.randomUUID();
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          quality,
          idempotencyKey: createKey.current,
        }),
      });
      const data = (await response.json()) as GenerateResponse;
      if (!response.ok || !data.success || !data.image) {
        setError(
          safeApiMessage(data.message ?? data.error, t.generationFailed),
        );
        return;
      }
      setLatestCreateId(data.image.id);
      setSelectedId(data.image.id);
      createKey.current = null;
      await load();
    });
  }

  async function edit(reuseKey: boolean) {
    if (!selectedId) {
      setError(t.selectFirst);
      return;
    }
    if (!editPrompt.trim()) return;
    await runMutation(reuseKey ? "retry-edit" : "edit", async () => {
      if (!reuseKey || !editKey.current) editKey.current = crypto.randomUUID();
      const response = await fetch("/api/images/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceImageId: selectedId,
          prompt: editPrompt,
          aspectRatio,
          quality,
          idempotencyKey: editKey.current,
        }),
      });
      const data = (await response.json()) as GenerateResponse;
      if (!response.ok || !data.success || !data.image) {
        setError(safeApiMessage(data.message ?? data.error, t.editFailed));
        return;
      }
      setLatestEditId(data.image.id);
      setSelectedId(data.image.id);
      editKey.current = null;
      await load();
    });
  }

  async function upload(file: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError(t.invalidFile);
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      setError(t.fileTooLarge);
      return;
    }
    await runMutation("upload", async () => {
      const imageBase64 = await readFileAsDataUrl(file);
      const response = await fetch("/api/images/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          mimeType: file.type,
          imageBase64,
        }),
      });
      const data = (await response.json()) as UploadResponse;
      if (!response.ok || !data.success || !data.image) {
        setError(t.uploadFailed);
        return;
      }
      setSelectedId(data.image.id);
      setCreateSourceId(data.image.id);
      setSection("edit");
      await load();
    });
  }

  async function removeImage(imageId: string) {
    if (deleteConfirmId !== imageId) {
      setDeleteConfirmId(imageId);
      return;
    }
    await runMutation("delete", async () => {
      const response = await fetch(`/api/images/${imageId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError(t.deleteFailed);
        return;
      }
      setDeleteConfirmId(null);
      if (selectedId === imageId) setSelectedId(null);
      if (createSourceId === imageId) setCreateSourceId(null);
      await load();
    });
  }

  function reusePrompt(image: ImageRecord) {
    setPrompt(image.prompt);
    setSection("create");
    createKey.current = null;
  }

  function editThis(image: ImageRecord) {
    setSelectedId(image.id);
    setEditPrompt("");
    setSection("edit");
    editKey.current = null;
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <AlmaShell
      language={language}
      activeWorkspace="images"
      title={t.title}
      onLanguageChange={updateLanguage}
    >
      <main className="min-w-0 overflow-x-hidden bg-[#F7F7F8] px-3 py-4 text-black md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-4">
          <header className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-5">
            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F7F7F8]">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                  <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
                    {t.title}
                  </h1>
                  <span className="rounded-full border border-black px-2.5 py-1 text-xs font-medium">
                    {t.beta}
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280]">
                  {t.subtitle}
                </p>
              </div>
              <PrimaryAction
                disabled={mutation === "generate" || !prompt.trim()}
                icon={Sparkles}
                label={mutation === "generate" ? t.generating : t.generate}
                loading={mutation === "generate"}
                onClick={() => generate(false)}
              />
            </div>
          </header>

          <nav className="flex gap-2 overflow-x-auto pb-1 xl:hidden">
            {(Object.keys(t.tabs) as SectionKey[]).map((key) => (
              <button
                key={key}
                className={`h-10 shrink-0 rounded-full border px-4 text-sm font-medium ${
                  section === key
                    ? "border-black bg-black text-white"
                    : "border-[#E5E7EB] bg-white text-[#374151]"
                }`}
                onClick={() => setSection(key)}
              >
                {t.tabs[key]}
              </button>
            ))}
          </nav>

          {error ? (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{error}</p>
              <button onClick={() => setError("")}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <section className="grid min-w-0 gap-4 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
            <div
              className={`${section === "create" ? "block" : "hidden"} min-w-0 space-y-4 xl:block`}
            >
              <CreatePanel
                aspectRatio={aspectRatio}
                createSource={createSource}
                latestCreate={latestCreate}
                mutation={mutation}
                prompt={prompt}
                quality={quality}
                text={t}
                onAspect={setAspectRatio}
                onEditThis={editThis}
                onGenerate={generate}
                onPrompt={setPrompt}
                onQuality={setQuality}
                onReuse={reusePrompt}
                onSource={setCreateSourceId}
                sourceOptions={images}
              />
              <UploadPanel
                fileRef={fileRef}
                mutation={mutation}
                text={t}
                onDrop={onDrop}
                onUpload={upload}
              />
            </div>

            <div
              className={`${section === "edit" ? "block" : "hidden"} min-w-0 space-y-4 xl:block`}
            >
              <EditPanel
                aspectRatio={aspectRatio}
                editPrompt={editPrompt}
                latestEdit={latestEdit}
                mutation={mutation}
                quality={quality}
                selected={selected}
                source={selectedSource}
                sourceOptions={images}
                text={t}
                onAspect={setAspectRatio}
                onEdit={edit}
                onOpenGallery={() => setSection("gallery")}
                onPrompt={setEditPrompt}
                onQuality={setQuality}
                onSelect={setSelectedId}
              />
            </div>

            <div
              className={`${section === "gallery" ? "block" : "hidden"} min-w-0 space-y-4 xl:block`}
            >
              <GalleryPanel
                deleteConfirmId={deleteConfirmId}
                filter={filter}
                images={filteredImages}
                loading={loading}
                query={query}
                selected={selected}
                source={selectedSource}
                text={t}
                onDelete={removeImage}
                onEdit={editThis}
                onFilter={setFilter}
                onQuery={setQuery}
                onReuse={reusePrompt}
                onSelect={setSelectedId}
              />
            </div>
          </section>
        </div>
      </main>
    </AlmaShell>
  );
}

function CreatePanel({
  aspectRatio,
  createSource,
  latestCreate,
  mutation,
  prompt,
  quality,
  sourceOptions,
  text,
  onAspect,
  onEditThis,
  onGenerate,
  onPrompt,
  onQuality,
  onReuse,
  onSource,
}: {
  aspectRatio: AspectRatio;
  createSource: ImageRecord | null;
  latestCreate: ImageRecord | null;
  mutation: MutationKind | null;
  prompt: string;
  quality: Quality;
  sourceOptions: ImageRecord[];
  text: ImageCopy;
  onAspect: (value: AspectRatio) => void;
  onEditThis: (image: ImageRecord) => void;
  onGenerate: (reuseKey: boolean) => void;
  onPrompt: (value: string) => void;
  onQuality: (value: Quality) => void;
  onReuse: (image: ImageRecord) => void;
  onSource: (id: string | null) => void;
}) {
  const generating = mutation === "generate" || mutation === "retry-generate";
  return (
    <Panel icon={Sparkles} title={text.tabs.create}>
      <textarea
        className="min-h-36 w-full resize-y rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] p-3 text-sm leading-6 outline-none focus:border-black"
        placeholder={text.prompt}
        value={prompt}
        onChange={(event) => onPrompt(event.target.value)}
      />
      <ControlGroup label={text.aspectRatio}>
        {ASPECTS.map((aspect) => (
          <SegmentButton
            key={aspect}
            active={aspectRatio === aspect}
            label={text[aspect]}
            onClick={() => onAspect(aspect)}
          />
        ))}
      </ControlGroup>
      <ControlGroup label={text.quality}>
        {QUALITIES.map((item) => (
          <SegmentButton
            key={item}
            active={quality === item}
            label={text[item]}
            onClick={() => onQuality(item)}
          />
        ))}
      </ControlGroup>
      <SourceSelect
        label={text.optionalSource}
        options={sourceOptions}
        value={createSource?.id ?? ""}
        text={text}
        onSelect={(value) => onSource(value || null)}
      />
      <p className="mt-2 text-xs leading-5 text-[#6B7280]">{text.sourceNote}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <PrimaryAction
          disabled={generating || !prompt.trim()}
          icon={Sparkles}
          label={generating ? text.generating : text.generate}
          loading={generating}
          onClick={() => onGenerate(false)}
        />
        <SecondaryAction
          disabled={generating || !prompt.trim()}
          icon={RefreshCw}
          label={latestCreate ? text.generateAgain : text.retry}
          onClick={() => onGenerate(Boolean(!latestCreate))}
        />
      </div>
      <PreviewCard
        image={latestCreate}
        label={text.result}
        text={text}
        actions={
          latestCreate ? (
            <>
              <DownloadLink image={latestCreate} text={text} />
              <SecondaryAction
                icon={Pencil}
                label={text.editThis}
                onClick={() => onEditThis(latestCreate)}
              />
              <SecondaryAction
                icon={RefreshCw}
                label={text.reuse}
                onClick={() => onReuse(latestCreate)}
              />
            </>
          ) : null
        }
      />
    </Panel>
  );
}

function EditPanel({
  aspectRatio,
  editPrompt,
  latestEdit,
  mutation,
  quality,
  selected,
  source,
  sourceOptions,
  text,
  onAspect,
  onEdit,
  onOpenGallery,
  onPrompt,
  onQuality,
  onSelect,
}: {
  aspectRatio: AspectRatio;
  editPrompt: string;
  latestEdit: ImageRecord | null;
  mutation: MutationKind | null;
  quality: Quality;
  selected: ImageRecord | null;
  source: ImageRecord | null;
  sourceOptions: ImageRecord[];
  text: ImageCopy;
  onAspect: (value: AspectRatio) => void;
  onEdit: (reuseKey: boolean) => void;
  onOpenGallery: () => void;
  onPrompt: (value: string) => void;
  onQuality: (value: Quality) => void;
  onSelect: (id: string | null) => void;
}) {
  const editing = mutation === "edit" || mutation === "retry-edit";
  return (
    <Panel icon={Wand2} title={text.tabs.edit}>
      <SourceSelect
        label={text.selectSource}
        options={sourceOptions}
        value={selected?.id ?? ""}
        text={text}
        onSelect={(value) => onSelect(value || null)}
      />
      <PreviewCard image={selected} label={text.original} text={text} />
      <textarea
        className="mt-4 min-h-28 w-full resize-y rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] p-3 text-sm leading-6 outline-none focus:border-black"
        placeholder={text.editPrompt}
        value={editPrompt}
        onChange={(event) => onPrompt(event.target.value)}
      />
      <ControlGroup label={text.aspectRatio}>
        {ASPECTS.map((aspect) => (
          <SegmentButton
            key={aspect}
            active={aspectRatio === aspect}
            label={text[aspect]}
            onClick={() => onAspect(aspect)}
          />
        ))}
      </ControlGroup>
      <ControlGroup label={text.quality}>
        {QUALITIES.map((item) => (
          <SegmentButton
            key={item}
            active={quality === item}
            label={text[item]}
            onClick={() => onQuality(item)}
          />
        ))}
      </ControlGroup>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <PrimaryAction
          disabled={editing || !selected || !editPrompt.trim()}
          icon={Wand2}
          label={editing ? text.editing : text.edit}
          loading={editing}
          onClick={() => onEdit(false)}
        />
        <SecondaryAction
          disabled={editing || !selected || !editPrompt.trim()}
          icon={RefreshCw}
          label={latestEdit ? text.editAgain : text.retry}
          onClick={() => onEdit(Boolean(!latestEdit))}
        />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PreviewCard
          image={source ?? selected}
          label={text.original}
          text={text}
        />
        <PreviewCard
          image={latestEdit}
          label={text.result}
          text={text}
          actions={
            latestEdit ? (
              <>
                <DownloadLink image={latestEdit} text={text} />
                <SecondaryAction
                  icon={ImageIcon}
                  label={text.openGallery}
                  onClick={onOpenGallery}
                />
              </>
            ) : null
          }
        />
      </div>
    </Panel>
  );
}

function UploadPanel({
  fileRef,
  mutation,
  text,
  onDrop,
  onUpload,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  mutation: MutationKind | null;
  text: ImageCopy;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onUpload: (file: File) => void;
}) {
  return (
    <Panel icon={Upload} title={text.upload}>
      <div
        className="rounded-xl border border-dashed border-[#C9CDD3] bg-[#F7F7F8] p-4 text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <Upload className="mx-auto h-6 w-6" />
        <p className="mt-2 text-sm font-medium">{text.uploadHint}</p>
        <p className="mt-1 text-xs text-[#6B7280]">PNG / JPG / WebP</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.currentTarget.value = "";
          }}
        />
        <button
          className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black px-4 text-sm font-medium disabled:opacity-50"
          disabled={mutation === "upload"}
          onClick={() => fileRef.current?.click()}
        >
          {mutation === "upload" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {text.uploadBrowse}
        </button>
      </div>
    </Panel>
  );
}

function GalleryPanel({
  deleteConfirmId,
  filter,
  images,
  loading,
  query,
  selected,
  source,
  text,
  onDelete,
  onEdit,
  onFilter,
  onQuery,
  onReuse,
  onSelect,
}: {
  deleteConfirmId: string | null;
  filter: "all" | "generated" | "uploaded" | "edited" | "failed";
  images: ImageRecord[];
  loading: boolean;
  query: string;
  selected: ImageRecord | null;
  source: ImageRecord | null;
  text: ImageCopy;
  onDelete: (id: string) => void;
  onEdit: (image: ImageRecord) => void;
  onFilter: (
    filter: "all" | "generated" | "uploaded" | "edited" | "failed",
  ) => void;
  onQuery: (query: string) => void;
  onReuse: (image: ImageRecord) => void;
  onSelect: (id: string) => void;
}) {
  const filters = ["all", "generated", "uploaded", "edited", "failed"] as const;
  return (
    <Panel icon={ImageIcon} title={text.gallery}>
      <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-[#6B7280]" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder={text.search}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button
            key={item}
            className={`h-9 shrink-0 rounded-full border px-3 text-xs font-medium ${
              filter === item
                ? "border-black bg-black text-white"
                : "border-[#E5E7EB] bg-white text-[#374151]"
            }`}
            onClick={() => onFilter(item)}
          >
            {text[item]}
          </button>
        ))}
      </div>
      {selected ? (
        <DetailPanel
          deleteConfirmId={deleteConfirmId}
          image={selected}
          source={source}
          text={text}
          onDelete={onDelete}
          onEdit={onEdit}
          onReuse={onReuse}
        />
      ) : null}
      {loading ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="aspect-square animate-pulse rounded-xl bg-[#F0F2F4]"
            />
          ))}
        </div>
      ) : images.length ? (
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {images.map((image) => (
            <GalleryCard
              key={image.id}
              deleteConfirmId={deleteConfirmId}
              image={image}
              selected={selected?.id === image.id}
              text={text}
              onDelete={onDelete}
              onEdit={onEdit}
              onReuse={onReuse}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-[#F7F7F8] p-4 text-sm text-[#6B7280]">
          <p className="font-medium text-black">{text.empty}</p>
          <p className="mt-1">{text.emptyHint}</p>
        </div>
      )}
    </Panel>
  );
}

function GalleryCard({
  deleteConfirmId,
  image,
  selected,
  text,
  onDelete,
  onEdit,
  onReuse,
  onSelect,
}: {
  deleteConfirmId: string | null;
  image: ImageRecord;
  selected: boolean;
  text: ImageCopy;
  onDelete: (id: string) => void;
  onEdit: (image: ImageRecord) => void;
  onReuse: (image: ImageRecord) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <article
      className={`min-w-0 overflow-hidden rounded-xl border bg-white ${
        selected ? "border-black shadow-sm" : "border-[#E5E7EB]"
      }`}
    >
      <button
        className="block w-full text-left"
        onClick={() => onSelect(image.id)}
      >
        <ImageFrame image={image} />
      </button>
      <div className="p-3">
        <p className="line-clamp-2 break-words text-sm leading-5">
          {image.prompt}
        </p>
        <p className="mt-2 text-xs text-[#6B7280]">
          {text[statusKind(image)]} / {image.aspect_ratio} / {image.quality}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <DownloadLink image={image} text={text} compact />
          <SmallButton
            icon={RefreshCw}
            label={text.reuse}
            onClick={() => onReuse(image)}
          />
          <SmallButton
            icon={Pencil}
            label={text.edit}
            onClick={() => onEdit(image)}
          />
          <SmallButton
            danger
            icon={Trash2}
            label={
              deleteConfirmId === image.id ? text.confirmDelete : text.delete
            }
            onClick={() => onDelete(image.id)}
          />
        </div>
      </div>
    </article>
  );
}

function DetailPanel({
  deleteConfirmId,
  image,
  source,
  text,
  onDelete,
  onEdit,
  onReuse,
}: {
  deleteConfirmId: string | null;
  image: ImageRecord;
  source: ImageRecord | null;
  text: ImageCopy;
  onDelete: (id: string) => void;
  onEdit: (image: ImageRecord) => void;
  onReuse: (image: ImageRecord) => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F7F7F8] p-3">
      <p className="text-xs font-semibold uppercase text-[#6B7280]">
        {text.selected}
      </p>
      <div className="mt-3">
        <ImageFrame image={image} />
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <Meta label={text.prompt} value={image.prompt} />
        <Meta label={text.status} value={image.status} />
        <Meta label={text.aspectRatio} value={String(image.aspect_ratio)} />
        <Meta label={text.quality} value={String(image.quality)} />
        <Meta
          label={text.created}
          value={new Date(image.created_at).toLocaleString()}
        />
        <Meta
          label={text.lineage}
          value={
            image.source_image_id
              ? `${text.edited}${source ? ` / ${source.prompt}` : ""}`
              : text[statusKind(image)]
          }
        />
      </div>
      <p className="mt-3 text-xs text-[#6B7280]">{text.safeMeta}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <DownloadLink image={image} text={text} />
        <SecondaryAction
          icon={RefreshCw}
          label={text.reuse}
          onClick={() => onReuse(image)}
        />
        <SecondaryAction
          icon={Pencil}
          label={text.editThis}
          onClick={() => onEdit(image)}
        />
        <SecondaryAction
          danger
          icon={Trash2}
          label={
            deleteConfirmId === image.id ? text.confirmDelete : text.delete
          }
          onClick={() => onDelete(image.id)}
        />
      </div>
    </div>
  );
}

function PreviewCard({
  actions,
  image,
  label,
  text,
}: {
  actions?: ReactNode;
  image: ImageRecord | null;
  label: string;
  text: ImageCopy;
}) {
  return (
    <div className="mt-4 min-w-0 rounded-xl border border-[#E5E7EB] bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-[#6B7280]">
          {label}
        </p>
        {image ? (
          <span className="rounded-full bg-[#F0F2F4] px-2 py-1 text-[11px] font-medium">
            {image.status}
          </span>
        ) : null}
      </div>
      <ImageFrame image={image} />
      {image ? (
        <p className="mt-2 line-clamp-2 break-words text-sm leading-5">
          {image.prompt}
        </p>
      ) : (
        <p className="mt-2 text-sm text-[#6B7280]">{text.noPreview}</p>
      )}
      {actions ? (
        <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

function ImageFrame({ image }: { image: ImageRecord | null }) {
  const src = imageSrc(image);
  return (
    <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-[#F0F2F4]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={image?.prompt ?? ""}
          className="h-full w-full object-contain"
        />
      ) : (
        <ImageIcon className="h-6 w-6 text-[#6B7280]" />
      )}
    </div>
  );
}

function SourceSelect({
  label,
  options,
  text,
  value,
  onSelect,
}: {
  label: string;
  options: ImageRecord[];
  text: ImageCopy;
  value: string;
  onSelect: (value: string) => void;
}) {
  return (
    <label className="mt-4 block text-sm">
      <span className="mb-1.5 block text-xs font-semibold uppercase text-[#6B7280]">
        {label}
      </span>
      <select
        className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm outline-none focus:border-black"
        value={value}
        onChange={(event) => onSelect(event.target.value)}
      >
        <option value="">{text.noSource}</option>
        {options
          .filter((image) => image.image_base64)
          .map((image) => (
            <option key={image.id} value={image.id}>
              {image.prompt.slice(0, 80)}
            </option>
          ))}
      </select>
    </label>
  );
}

function ControlGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold uppercase text-[#6B7280]">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function SegmentButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-10 rounded-full border px-4 text-sm font-medium ${
        active
          ? "border-black bg-black text-white"
          : "border-[#E5E7EB] bg-white text-[#374151]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Panel({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F7F7F8]">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="truncate text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PrimaryAction({
  disabled,
  icon: Icon,
  label,
  loading,
  onClick,
}: {
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}

function SecondaryAction({
  danger,
  disabled,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium disabled:opacity-50 ${
        danger
          ? "border-red-200 text-red-600"
          : "border-[#E5E7EB] text-[#374151]"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SmallButton({
  danger,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${
        danger ? "border-red-200 text-red-600" : "border-[#E5E7EB]"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function DownloadLink({
  compact,
  image,
  text,
}: {
  compact?: boolean;
  image: ImageRecord;
  text: ImageCopy;
}) {
  return (
    <a
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] font-medium text-[#374151] ${
        compact ? "h-9 px-3 text-xs" : "h-10 px-3 text-sm"
      }`}
      href={`/api/images/${image.id}/download`}
    >
      <Download className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {text.download}
    </a>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
      <span className="text-xs font-semibold uppercase text-[#6B7280]">
        {label}
      </span>
      <span className="break-words text-sm text-[#374151]">{value}</span>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}
