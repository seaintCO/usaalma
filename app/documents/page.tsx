"use client";

import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Download,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";

type DocumentRecord = {
  id: string;
  title: string;
  content?: string | null;
  extracted_text?: string | null;
  document_type?: "text" | "uploaded_file" | string | null;
  file_name?: string | null;
  file_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  source?: string | null;
  source_type?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Section = "recent" | "all" | "upload" | "create" | "search";
type RequestState = "idle" | "loading" | "success" | "error";

function readStoredLanguage(): AlmaShellLanguage {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("alma_language");
  return saved === "en" || saved === "es" ? saved : "en";
}

const uploadTypes = new Set(["text/plain", "text/markdown"]);
const maxUploadSize = 5 * 1024 * 1024;

const copy = {
  en: {
    title: "Documents",
    subtitle:
      "A private knowledge workspace for text and Markdown ALMA can use.",
    recent: "Recent",
    all: "All Documents",
    upload: "Upload",
    create: "Create",
    search: "Search",
    searchDocuments: "Search documents",
    searchPlaceholder: "Search title, content, or saved knowledge",
    searchHelp:
      "Search uses the existing documents index and returns owned documents only.",
    noSearch: "No matching documents.",
    startSearch: "Enter a search term to look across documents.",
    retry: "Retry",
    open: "Open",
    download: "Download",
    downloading: "Preparing download",
    delete: "Delete",
    deleteUnavailable: "Delete is not available in the current Documents API.",
    noDocuments: "No documents yet.",
    noRecent:
      "Recent documents will appear here after you create or upload one.",
    noContent: "No content preview available.",
    uploadTitle: "Upload knowledge",
    uploadPrompt: "Drop a TXT or Markdown file here",
    uploadTap: "Choose file",
    uploadTypes: "TXT or Markdown, up to 5MB. One file at a time.",
    uploadFile: "Upload file",
    uploading: "Uploading",
    uploadFailed: "Upload failed",
    unsupportedFile: "Unsupported file. Use TXT or Markdown.",
    fileTooLarge: "File too large. Maximum size is 5MB.",
    emptyFile: "This file is empty.",
    removeFile: "Remove file",
    createTitle: "Create document",
    titlePlaceholder: "Document title",
    contentPlaceholder: "Write or paste useful knowledge here...",
    save: "Save",
    saving: "Saving",
    saved: "Saved",
    createFailed: "Document could not be saved. Your draft is still here.",
    missingTitle: "Add a title before saving.",
    loading: "Loading documents",
    loadFailed: "Documents could not be loaded.",
    details: "Document Detail",
    metadata: "Metadata",
    type: "Type",
    status: "Status",
    source: "Source",
    created: "Created",
    updated: "Updated",
    size: "Size",
    fileType: "File type",
    manual: "Manual",
    uploadedFile: "Uploaded file",
    textDocument: "Text document",
    ready: "Ready",
    failed: "Failed",
    processing: "Processing",
    uploaded: "Uploaded",
    selected: "Selected document",
    back: "Back to list",
    fileSelected: "Selected file",
    downloadUnavailable: "Download is available only for uploaded files.",
    downloadFailed: "Download unavailable.",
    editUnavailable: "Editing existing documents is not supported yet.",
  },
  es: {
    title: "Documentos",
    subtitle:
      "Un espacio privado de conocimiento para texto y Markdown que ALMA puede usar.",
    recent: "Recientes",
    all: "Todos",
    upload: "Subir",
    create: "Crear",
    search: "Buscar",
    searchDocuments: "Buscar documentos",
    searchPlaceholder: "Buscar titulo, contenido o conocimiento guardado",
    searchHelp:
      "La busqueda usa el indice actual y solo muestra documentos propios.",
    noSearch: "No hay documentos que coincidan.",
    startSearch: "Escribe una busqueda para revisar tus documentos.",
    retry: "Reintentar",
    open: "Abrir",
    download: "Descargar",
    downloading: "Preparando descarga",
    delete: "Eliminar",
    deleteUnavailable:
      "Eliminar no esta disponible en la API actual de Documentos.",
    noDocuments: "Aun no tienes documentos.",
    noRecent:
      "Tus documentos recientes apareceran aqui despues de crear o subir uno.",
    noContent: "No hay vista previa disponible.",
    uploadTitle: "Subir conocimiento",
    uploadPrompt: "Suelta aqui un archivo TXT o Markdown",
    uploadTap: "Elegir archivo",
    uploadTypes: "TXT o Markdown, hasta 5MB. Un archivo a la vez.",
    uploadFile: "Subir archivo",
    uploading: "Subiendo",
    uploadFailed: "No se pudo subir",
    unsupportedFile: "Archivo no compatible. Usa TXT o Markdown.",
    fileTooLarge: "Archivo demasiado grande. El maximo es 5MB.",
    emptyFile: "Este archivo esta vacio.",
    removeFile: "Quitar archivo",
    createTitle: "Crear documento",
    titlePlaceholder: "Titulo del documento",
    contentPlaceholder: "Escribe o pega conocimiento util aqui...",
    save: "Guardar",
    saving: "Guardando",
    saved: "Guardado",
    createFailed: "No se pudo guardar. Tu borrador sigue aqui.",
    missingTitle: "Agrega un titulo antes de guardar.",
    loading: "Cargando documentos",
    loadFailed: "No se pudieron cargar los documentos.",
    details: "Detalle del documento",
    metadata: "Metadatos",
    type: "Tipo",
    status: "Estado",
    source: "Origen",
    created: "Creado",
    updated: "Actualizado",
    size: "Tamano",
    fileType: "Tipo de archivo",
    manual: "Manual",
    uploadedFile: "Archivo subido",
    textDocument: "Documento de texto",
    ready: "Listo",
    failed: "Error",
    processing: "Procesando",
    uploaded: "Subido",
    selected: "Documento seleccionado",
    back: "Volver a la lista",
    fileSelected: "Archivo seleccionado",
    downloadUnavailable:
      "La descarga solo esta disponible para archivos subidos.",
    downloadFailed: "Descarga no disponible.",
    editUnavailable: "Editar documentos existentes aun no esta soportado.",
  },
};

const sectionIcons = {
  recent: CalendarDays,
  all: FolderOpen,
  upload: Upload,
  create: Plus,
  search: Search,
};

function getDocumentText(document: DocumentRecord) {
  return document.content || document.extracted_text || "";
}

function getDocumentDate(document: DocumentRecord) {
  return document.updated_at || document.created_at || "";
}

function formatDate(
  value: string | null | undefined,
  language: AlmaShellLanguage,
) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatBytes(value: number | null | undefined) {
  if (!value) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function previewText(value: string, fallback: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  return cleaned.length > 180 ? `${cleaned.slice(0, 180)}...` : cleaned;
}

function normalizeStatus(
  status: string | null | undefined,
  t: (typeof copy)["en"],
) {
  if (status === "failed") return t.failed;
  if (status === "processing") return t.processing;
  if (status === "uploaded") return t.uploaded;
  return t.ready;
}

function normalizeType(document: DocumentRecord, t: (typeof copy)["en"]) {
  return document.document_type === "uploaded_file" || document.file_name
    ? t.uploadedFile
    : t.textDocument;
}

function validateFile(file: File, t: (typeof copy)["en"]) {
  const isMarkdown =
    file.type === "text/markdown" || file.name.toLowerCase().endsWith(".md");
  const isText =
    file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
  if (!isMarkdown && !isText && !uploadTypes.has(file.type)) {
    return t.unsupportedFile;
  }
  if (file.size > maxUploadSize) return t.fileTooLarge;
  if (file.size === 0) return t.emptyFile;
  return "";
}

export default function DocumentsPage() {
  const [language, setLanguage] =
    useState<AlmaShellLanguage>(readStoredLanguage);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("recent");
  const [listState, setListState] = useState<RequestState>("idle");
  const [listError, setListError] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [createState, setCreateState] = useState<RequestState>("idle");
  const [createError, setCreateError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<RequestState>("idle");
  const [uploadError, setUploadError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DocumentRecord[]>([]);
  const [searchState, setSearchState] = useState<RequestState>("idle");
  const [searchError, setSearchError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const t = copy[language];

  const sortedDocuments = useMemo(
    () =>
      [...documents].sort(
        (a, b) =>
          new Date(getDocumentDate(b)).getTime() -
          new Date(getDocumentDate(a)).getTime(),
      ),
    [documents],
  );
  const recentDocuments = sortedDocuments.slice(0, 5);
  const selectedDocument = selectedId
    ? (documents.find((document) => document.id === selectedId) ?? null)
    : null;

  async function loadDocuments(nextSelectedId?: string | null) {
    setListState("loading");
    setListError("");
    try {
      const res = await fetch("/api/documents/list");
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error(t.loadFailed);
      setDocuments(data);
      if (nextSelectedId !== undefined) {
        setSelectedId(nextSelectedId);
      } else if (
        selectedId &&
        !data.some((doc: DocumentRecord) => doc.id === selectedId)
      ) {
        setSelectedId(null);
      }
      setListState("success");
    } catch {
      setListState("error");
      setListError(t.loadFailed);
    }
  }

  async function createDocument() {
    if (createState === "loading") return;
    if (!title.trim()) {
      setCreateError(t.missingTitle);
      setCreateState("error");
      return;
    }

    setCreateState("loading");
    setCreateError("");
    try {
      const res = await fetch("/api/documents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content }),
      });
      const data = await res.json();
      if (!res.ok || !data?.id) throw new Error(t.createFailed);
      setTitle("");
      setContent("");
      setCreateState("success");
      setActiveSection("recent");
      await loadDocuments(data.id);
    } catch {
      setCreateState("error");
      setCreateError(t.createFailed);
    }
  }

  function chooseFile(file: File | null) {
    setUploadError("");
    setUploadState("idle");
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const validation = validateFile(file, t);
    if (validation) {
      setSelectedFile(null);
      setUploadError(validation);
      setUploadState("error");
      return;
    }
    setSelectedFile(file);
  }

  async function uploadDocument() {
    if (!selectedFile || uploadState === "loading") return;
    const validation = validateFile(selectedFile, t);
    if (validation) {
      setUploadError(validation);
      setUploadState("error");
      return;
    }

    setUploadState("loading");
    setUploadError("");
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data?.id) throw new Error(t.uploadFailed);
      setSelectedFile(null);
      setUploadState("success");
      setActiveSection("recent");
      await loadDocuments(data.id);
    } catch {
      setUploadState("error");
      setUploadError(t.uploadFailed);
    }
  }

  async function downloadDocument(document: DocumentRecord) {
    if (!document.file_path || downloadingId) {
      setDownloadError(t.downloadUnavailable);
      return;
    }
    setDownloadingId(document.id);
    setDownloadError("");
    try {
      const res = await fetch(`/api/documents/${document.id}/download`);
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(t.downloadFailed);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setDownloadError(t.downloadFailed);
    } finally {
      setDownloadingId(null);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDocuments(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedQuery) {
      const timer = window.setTimeout(() => {
        setSearchResults([]);
        setSearchState("idle");
        setSearchError("");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let cancelled = false;
    async function runSearch() {
      setSearchState("loading");
      setSearchError("");
      try {
        const res = await fetch("/api/documents/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: debouncedQuery }),
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data)) throw new Error(t.noSearch);
        if (!cancelled) {
          setSearchResults(data);
          setSearchState("success");
        }
      } catch {
        if (!cancelled) {
          setSearchState("error");
          setSearchError(t.noSearch);
        }
      }
    }

    void runSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, t.noSearch]);

  function updateLanguage(next: AlmaShellLanguage) {
    setLanguage(next);
    localStorage.setItem("alma_language", next);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  function openDocument(document: DocumentRecord) {
    setSelectedId(document.id);
    setDownloadError("");
  }

  const sectionLabels: Record<Section, string> = {
    recent: t.recent,
    all: t.all,
    upload: t.upload,
    create: t.create,
    search: t.search,
  };

  const visibleList =
    activeSection === "recent" ? recentDocuments : sortedDocuments;

  return (
    <AlmaShell
      language={language}
      activeWorkspace="documents"
      title={t.title}
      onLanguageChange={updateLanguage}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 text-[#111111] sm:px-4 md:px-6 md:py-8">
        <header className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8]">
                <FolderOpen className="h-5 w-5" />
              </div>
              <h1 className="text-4xl font-medium tracking-tight md:text-6xl">
                {t.title}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#6B7280] md:text-lg">
                {t.subtitle}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:flex">
              <button
                type="button"
                onClick={() => setActiveSection("upload")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D1D5DB] bg-white px-4 py-2.5 font-medium"
              >
                <Upload className="h-4 w-4" />
                {t.upload}
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("create")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 font-medium text-white"
              >
                <Plus className="h-4 w-4" />
                {t.create}
              </button>
            </div>
          </div>
        </header>

        <nav className="grid grid-cols-5 gap-1 rounded-2xl border border-[#E5E7EB] bg-white p-1 md:hidden">
          {(Object.keys(sectionLabels) as Section[]).map((section) => {
            const Icon = sectionIcons[section];
            return (
              <button
                type="button"
                key={section}
                onClick={() => {
                  setActiveSection(section);
                  setSelectedId(null);
                }}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium ${
                  activeSection === section && !selectedDocument
                    ? "bg-black text-white"
                    : "text-[#6B7280]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{sectionLabels[section]}</span>
              </button>
            );
          })}
        </nav>

        {selectedDocument ? (
          <DocumentDetail
            document={selectedDocument}
            language={language}
            text={t}
            downloading={downloadingId === selectedDocument.id}
            downloadError={downloadError}
            onBack={() => setSelectedId(null)}
            onDownload={() => void downloadDocument(selectedDocument)}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
            <aside className="hidden min-w-0 rounded-3xl border border-[#E5E7EB] bg-white p-3 shadow-sm lg:block">
              {(Object.keys(sectionLabels) as Section[]).map((section) => {
                const Icon = sectionIcons[section];
                return (
                  <button
                    type="button"
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium ${
                      activeSection === section
                        ? "bg-black text-white"
                        : "text-[#4B5563] hover:bg-[#F7F7F8]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {sectionLabels[section]}
                  </button>
                );
              })}

              <div className="mt-5 border-t border-[#E5E7EB] pt-4">
                <p className="px-3 text-xs font-medium uppercase tracking-[0.16em] text-[#9CA3AF]">
                  {t.recent}
                </p>
                <div className="mt-3 space-y-2">
                  {recentDocuments.length ? (
                    recentDocuments.map((document) => (
                      <button
                        type="button"
                        key={document.id}
                        onClick={() => openDocument(document)}
                        className="w-full rounded-2xl border border-transparent px-3 py-2 text-left hover:border-[#E5E7EB] hover:bg-[#F7F7F8]"
                      >
                        <span className="block truncate text-sm font-medium">
                          {document.title}
                        </span>
                        <span className="mt-1 block text-xs text-[#6B7280]">
                          {formatDate(getDocumentDate(document), language)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 text-sm leading-6 text-[#6B7280]">
                      {t.noRecent}
                    </p>
                  )}
                </div>
              </div>
            </aside>

            <main className="min-w-0">
              {(activeSection === "recent" || activeSection === "all") && (
                <DocumentList
                  documents={visibleList}
                  language={language}
                  text={t}
                  state={listState}
                  error={listError}
                  emptyText={
                    activeSection === "recent" ? t.noRecent : t.noDocuments
                  }
                  onOpen={openDocument}
                  onDownload={(document) => void downloadDocument(document)}
                  onRetry={() => void loadDocuments()}
                  downloadingId={downloadingId}
                />
              )}

              {activeSection === "upload" && (
                <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F7F8]">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-medium">{t.uploadTitle}</h2>
                      <p className="mt-1 text-sm leading-6 text-[#6B7280]">
                        {t.uploadTypes}
                      </p>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,text/plain,text/markdown"
                    className="hidden"
                    onChange={handleFileInput}
                  />

                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={`mt-6 rounded-3xl border border-dashed p-5 text-center transition md:p-8 ${
                      dragActive
                        ? "border-black bg-[#F7F7F8]"
                        : "border-[#D1D5DB] bg-white"
                    }`}
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F7F8]">
                      <FileText className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-lg font-medium">{t.uploadPrompt}</p>
                    <p className="mt-2 text-sm text-[#6B7280]">
                      {t.uploadTypes}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-[#D1D5DB] px-4 py-2.5 text-sm font-medium"
                    >
                      <Upload className="h-4 w-4" />
                      {t.uploadTap}
                    </button>
                  </div>

                  {selectedFile ? (
                    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F7F7F8] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                          {t.fileSelected}
                        </p>
                        <p className="mt-1 truncate font-medium">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-[#6B7280]">
                          {formatBytes(selectedFile.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => chooseFile(null)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D1D5DB] px-4 py-2 text-sm font-medium"
                      >
                        <X className="h-4 w-4" />
                        {t.removeFile}
                      </button>
                    </div>
                  ) : null}

                  {uploadError ? <ErrorNote message={uploadError} /> : null}
                  {uploadState === "success" ? (
                    <SuccessNote message={t.saved} />
                  ) : null}

                  <button
                    type="button"
                    disabled={!selectedFile || uploadState === "loading"}
                    onClick={() => void uploadDocument()}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 font-medium text-white disabled:bg-[#9CA3AF] sm:w-auto"
                  >
                    {uploadState === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {uploadState === "loading" ? t.uploading : t.uploadFile}
                  </button>
                </section>
              )}

              {activeSection === "create" && (
                <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F7F8]">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-medium">{t.createTitle}</h2>
                      <p className="mt-1 text-sm leading-6 text-[#6B7280]">
                        {t.editUnavailable}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <input
                      value={title}
                      onChange={(event) => {
                        setTitle(event.target.value);
                        setCreateError("");
                        if (createState !== "loading") setCreateState("idle");
                      }}
                      placeholder={t.titlePlaceholder}
                      className="w-full min-w-0 rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4 py-3 outline-none focus:border-black"
                    />
                    <textarea
                      value={content}
                      onChange={(event) => {
                        setContent(event.target.value);
                        setCreateError("");
                        if (createState !== "loading") setCreateState("idle");
                      }}
                      placeholder={t.contentPlaceholder}
                      className="min-h-[260px] w-full min-w-0 resize-y rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] p-4 leading-7 outline-none focus:border-black"
                    />
                  </div>

                  {createError ? <ErrorNote message={createError} /> : null}
                  {createState === "success" ? (
                    <SuccessNote message={t.saved} />
                  ) : null}

                  <button
                    type="button"
                    disabled={createState === "loading"}
                    onClick={() => void createDocument()}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 font-medium text-white disabled:bg-[#9CA3AF] sm:w-auto"
                  >
                    {createState === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {createState === "loading" ? t.saving : t.save}
                  </button>
                </section>
              )}

              {activeSection === "search" && (
                <section className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F7F8]">
                      <Search className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-medium">
                        {t.searchDocuments}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-[#6B7280]">
                        {t.searchHelp}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2 rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4 py-3">
                    <Search className="h-4 w-4 shrink-0 text-[#6B7280]" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="min-w-0 flex-1 bg-transparent outline-none"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="rounded-full p-1 hover:bg-white"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-5">
                    {!debouncedQuery ? (
                      <EmptyState text={t.startSearch} />
                    ) : searchState === "loading" ? (
                      <LoadingState text={t.searchDocuments} />
                    ) : searchState === "error" ? (
                      <RetryState
                        text={searchError || t.noSearch}
                        retry={t.retry}
                        onRetry={() => setDebouncedQuery(searchQuery.trim())}
                      />
                    ) : (
                      <DocumentList
                        documents={searchResults}
                        language={language}
                        text={t}
                        state="success"
                        error=""
                        emptyText={t.noSearch}
                        onOpen={openDocument}
                        onDownload={(document) =>
                          void downloadDocument(document)
                        }
                        onRetry={() => setDebouncedQuery(searchQuery.trim())}
                        downloadingId={downloadingId}
                        compact
                      />
                    )}
                  </div>
                </section>
              )}
            </main>

            <aside className="hidden min-w-0 rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm lg:block">
              <h2 className="text-lg font-medium">{t.metadata}</h2>
              <div className="mt-4 space-y-3 text-sm text-[#6B7280]">
                <MetaLine label={t.all} value={String(documents.length)} />
                <MetaLine
                  label={t.uploadedFile}
                  value={String(
                    documents.filter((doc) => doc.file_name).length,
                  )}
                />
                <MetaLine
                  label={t.textDocument}
                  value={String(
                    documents.filter((doc) => !doc.file_name).length,
                  )}
                />
              </div>
              {downloadError ? <ErrorNote message={downloadError} /> : null}
              <div className="mt-6 rounded-2xl bg-[#F7F7F8] p-4 text-sm leading-6 text-[#6B7280]">
                {t.editUnavailable}
              </div>
            </aside>
          </div>
        )}
      </div>
    </AlmaShell>
  );
}

function DocumentList({
  documents,
  language,
  text,
  state,
  error,
  emptyText,
  onOpen,
  onDownload,
  onRetry,
  downloadingId,
  compact = false,
}: {
  documents: DocumentRecord[];
  language: AlmaShellLanguage;
  text: (typeof copy)["en"];
  state: RequestState;
  error: string;
  emptyText: string;
  onOpen: (document: DocumentRecord) => void;
  onDownload: (document: DocumentRecord) => void;
  onRetry: () => void;
  downloadingId: string | null;
  compact?: boolean;
}) {
  if (state === "loading") return <LoadingState text={text.loading} />;
  if (state === "error") {
    return (
      <RetryState
        text={error || text.loadFailed}
        retry={text.retry}
        onRetry={onRetry}
      />
    );
  }
  if (!documents.length) return <EmptyState text={emptyText} />;

  return (
    <section
      className={
        compact
          ? "space-y-3"
          : "rounded-3xl border border-[#E5E7EB] bg-white p-3 shadow-sm md:p-4"
      }
    >
      <div className="grid gap-3">
        {documents.map((document) => {
          const canDownload = Boolean(document.file_path);
          const isDownloading = downloadingId === document.id;
          return (
            <article
              key={document.id}
              className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-4 transition hover:border-[#D1D5DB] hover:shadow-sm"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F7F7F8]">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 max-w-full truncate text-lg font-medium">
                      {document.title}
                    </h3>
                    <span className="rounded-full bg-[#F7F7F8] px-2.5 py-1 text-xs font-medium text-[#6B7280]">
                      {normalizeType(document, text)}
                    </span>
                    <span className="rounded-full bg-[#F7F7F8] px-2.5 py-1 text-xs font-medium text-[#6B7280]">
                      {normalizeStatus(document.status, text)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6B7280]">
                    {previewText(getDocumentText(document), text.noContent)}
                  </p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-[#9CA3AF]">
                    {formatDate(getDocumentDate(document), language)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpen(document)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
                >
                  <BookOpen className="h-4 w-4" />
                  {text.open}
                </button>
                <button
                  type="button"
                  disabled={!canDownload || isDownloading}
                  title={!canDownload ? text.downloadUnavailable : undefined}
                  onClick={() => onDownload(document)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D1D5DB] px-4 py-2 text-sm font-medium disabled:text-[#9CA3AF]"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isDownloading ? text.downloading : text.download}
                </button>
                <button
                  type="button"
                  disabled
                  title={text.deleteUnavailable}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#9CA3AF]"
                >
                  <Trash2 className="h-4 w-4" />
                  {text.delete}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DocumentDetail({
  document,
  language,
  text,
  downloading,
  downloadError,
  onBack,
  onDownload,
}: {
  document: DocumentRecord;
  language: AlmaShellLanguage;
  text: (typeof copy)["en"];
  downloading: boolean;
  downloadError: string;
  onBack: () => void;
  onDownload: () => void;
}) {
  const canDownload = Boolean(document.file_path);

  return (
    <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <article className="min-w-0 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D1D5DB] px-3 py-2 text-sm font-medium"
        >
          <ChevronLeft className="h-4 w-4" />
          {text.back}
        </button>
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7F7F8]">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9CA3AF]">
              {text.details}
            </p>
            <h2 className="mt-2 break-words text-3xl font-medium tracking-tight md:text-5xl">
              {document.title}
            </h2>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#F7F7F8] px-3 py-1.5 text-sm font-medium text-[#6B7280]">
            {normalizeType(document, text)}
          </span>
          <span className="rounded-full bg-[#F7F7F8] px-3 py-1.5 text-sm font-medium text-[#6B7280]">
            {normalizeStatus(document.status, text)}
          </span>
        </div>

        <div className="mt-6 rounded-3xl bg-[#F7F7F8] p-4 md:p-5">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-[#374151] md:text-base">
            {getDocumentText(document) || text.noContent}
          </pre>
        </div>
      </article>

      <aside className="min-w-0 rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h3 className="text-lg font-medium">{text.metadata}</h3>
        <div className="mt-4 space-y-3 text-sm text-[#6B7280]">
          <MetaLine label={text.type} value={normalizeType(document, text)} />
          <MetaLine
            label={text.status}
            value={normalizeStatus(document.status, text)}
          />
          <MetaLine
            label={text.source}
            value={document.source || document.source_type || text.manual}
          />
          <MetaLine
            label={text.created}
            value={formatDate(document.created_at, language)}
          />
          <MetaLine
            label={text.updated}
            value={formatDate(document.updated_at, language)}
          />
          <MetaLine label={text.size} value={formatBytes(document.file_size)} />
          <MetaLine label={text.fileType} value={document.mime_type || "—"} />
        </div>

        <div className="mt-6 grid gap-2">
          <button
            type="button"
            disabled={!canDownload || downloading}
            title={!canDownload ? text.downloadUnavailable : undefined}
            onClick={onDownload}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-medium text-white disabled:bg-[#9CA3AF]"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? text.downloading : text.download}
          </button>
          <button
            type="button"
            disabled
            title={text.deleteUnavailable}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-3 text-sm font-medium text-[#9CA3AF]"
          >
            <Trash2 className="h-4 w-4" />
            {text.delete}
          </button>
        </div>

        {downloadError ? <ErrorNote message={downloadError} /> : null}
        <div className="mt-4 rounded-2xl bg-[#F7F7F8] p-4 text-sm leading-6 text-[#6B7280]">
          {text.editUnavailable}
        </div>
      </aside>
    </section>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-3xl border border-[#E5E7EB] bg-white p-6 text-[#6B7280]">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {text}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 text-sm leading-6 text-[#6B7280]">
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
    <div className="rounded-3xl border border-[#FCA5A5] bg-white p-5">
      <div className="flex items-start gap-3 text-sm leading-6 text-[#991B1B]">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>{text}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D1D5DB] px-4 py-2 text-sm font-medium"
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

function SuccessNote({ message }: { message: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[#ECFDF5] p-3 text-sm leading-6 text-[#065F46]">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#F3F4F6] pb-3 last:border-0 last:pb-0">
      <span>{label}</span>
      <span className="min-w-0 max-w-[60%] truncate text-right font-medium text-[#111111]">
        {value}
      </span>
    </div>
  );
}
