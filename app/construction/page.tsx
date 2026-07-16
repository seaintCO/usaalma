"use client";

import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileStack,
  Hammer,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AlmaShell from "@/components/alma-shell/AlmaShell";
import type { AlmaShellLanguage } from "@/components/alma-shell/types";
import { AnnotationWorkspace } from "@/components/construction/AnnotationWorkspace";
import { ConstructionSummary } from "@/components/construction/ConstructionSummary";
import { CrewWorkspace } from "@/components/construction/CrewWorkspace";
import { FileUpload } from "@/components/construction/FileUpload";
import { MaterialsWorkspace } from "@/components/construction/MaterialsWorkspace";
import { MeasurementCalculator } from "@/components/construction/MeasurementCalculator";
import { ScopeWorkspace } from "@/components/construction/ScopeWorkspace";

type RequestState = "idle" | "loading" | "success" | "error";
type ProjectType =
  | "masonry"
  | "chimney"
  | "wall"
  | "floor"
  | "roof"
  | "deck"
  | "fence"
  | "remodel"
  | "custom";
type ProjectStatus = "draft" | "active" | "completed" | "archived";
type ListMode = "active" | "archived" | "all";
type WorkflowStep =
  | "overview"
  | "plans"
  | "measurements"
  | "annotations"
  | "materials"
  | "scope"
  | "crew"
  | "preview";

type ConstructionProject = {
  id: string;
  project_name: string;
  contact_id?: string | null;
  company_id?: string | null;
  jobsite_address?: string | null;
  project_type: ProjectType;
  status: ProjectStatus;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CrmContact = {
  id: string;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
};

type CrmCompany = {
  id: string;
  name?: string | null;
  website?: string | null;
  industry?: string | null;
};

type ProjectDraft = {
  projectName: string;
  contactId: string;
  companyId: string;
  jobsiteAddress: string;
  projectType: ProjectType;
  status: ProjectStatus;
  description: string;
};

const projectTypes: ProjectType[] = [
  "masonry",
  "chimney",
  "wall",
  "floor",
  "roof",
  "deck",
  "fence",
  "remodel",
  "custom",
];

const projectStatuses: ProjectStatus[] = [
  "draft",
  "active",
  "completed",
  "archived",
];

const workflowSteps: WorkflowStep[] = [
  "overview",
  "plans",
  "measurements",
  "annotations",
  "materials",
  "scope",
  "crew",
  "preview",
];

function readStoredLanguage(): AlmaShellLanguage {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem("alma_language");
  return saved === "en" || saved === "es" ? saved : "en";
}

const emptyDraft: ProjectDraft = {
  projectName: "",
  contactId: "",
  companyId: "",
  jobsiteAddress: "",
  projectType: "custom",
  status: "active",
  description: "",
};

const copy = {
  en: {
    title: "Construction",
    subtitle: "Blueprint and takeoff sender for field-verified estimates.",
    beta: "Beta",
    projects: "Projects",
    newProject: "New Project",
    editProject: "Edit Project",
    active: "Active",
    archived: "Archived",
    all: "All",
    projectType: "Project Type",
    status: "Status",
    jobsite: "Jobsite",
    contact: "Contact",
    company: "Company",
    description: "Description",
    save: "Save",
    saving: "Saving",
    cancel: "Cancel",
    open: "Open",
    archive: "Archive",
    restore: "Restore",
    delete: "Delete",
    edit: "Edit",
    search: "Search projects",
    noContact: "No contact linked",
    noCompany: "No company linked",
    noJobsite: "No jobsite added",
    noDescription: "No description yet.",
    empty: "No construction projects yet.",
    loading: "Loading construction projects",
    loadError: "Construction projects could not be loaded.",
    saveError: "Project could not be saved. Your changes are still here.",
    mutationError: "Project could not be updated.",
    deleteError: "Project could not be deleted.",
    deleteConfirm:
      "Deleting removes project-owned construction records. CRM contacts and companies are not deleted.",
    projectName: "Project name",
    projectNameRequired: "Project name is required.",
    overview: "Overview",
    plans: "Plans",
    measurements: "Measurements",
    annotations: "Annotations",
    materials: "Materials",
    scope: "Scope",
    crew: "Crew",
    preview: "Preview",
    nextCheckpoint: "Available in the next Construction checkpoint.",
    created: "Created",
    updated: "Updated",
    disclaimer:
      "Estimates only. Verify all field measurements. Not engineering or architectural advice. Not code-compliance approval.",
    nextStep:
      "Next: add plans/photos and measurements after the next checkpoint is approved.",
    masonry: "Masonry",
    chimney: "Chimney",
    wall: "Wall",
    floor: "Floor",
    roof: "Roof",
    deck: "Deck",
    fence: "Fence",
    remodel: "Remodel",
    custom: "Custom",
    draft: "Draft",
    completed: "Completed",
    back: "Projects",
    retry: "Retry",
    photos: "Photos",
    upload: "Upload",
    uploading: "Uploading",
    uploadPlan: "Upload plan or photo",
    uploadHint: "Add a private plan PDF, site photo, or phone-camera image.",
    fileTitle: "Title",
    notes: "Notes",
    download: "Download",
    loadingFiles: "Loading plans and photos",
    noFiles: "No plans or photos uploaded yet.",
    fileLoadError: "Plans and photos could not be loaded.",
    fileUploadError:
      "File could not be uploaded. Your selection is still here.",
    fileDeleteError: "File could not be deleted.",
    fileTypeError: "Use a PDF, PNG, JPG, or JPEG file.",
    fileSizeError: "PDF files can be up to 25MB. Images can be up to 15MB.",
    chooseFile: "Choose file",
    cameraPhoto: "Camera photo",
    pdfCard: "PDF preview is available as a private signed file.",
    privateFiles:
      "Uploaded files stay private and user-owned. Preview and download links are temporary signed links.",
    confirmDeleteFile:
      "Delete this project file? Measurements keep their values, but this file link will be removed.",
    close: "Close",
    addMeasurement: "Add Measurement",
    editMeasurement: "Edit Measurement",
    linear: "Linear",
    area: "Area",
    volume: "Volume",
    perimeter: "Perimeter",
    count: "Count",
    length: "Length",
    width: "Width",
    heightDepth: "Height/Depth",
    quantity: "Quantity",
    unit: "Unit",
    waste: "Waste",
    wasteFactor: "Waste Factor",
    label: "Label",
    linkedPlan: "Plan or photo",
    noLinkedPlan: "No linked plan",
    baseTotal: "Base Total",
    adjustedTotal: "Adjusted Total",
    estimate: "Estimate",
    formula: "Formula",
    loadingMeasurements: "Loading measurements",
    loadingMaterials: "Loading materials",
    noMeasurements: "No measurements yet.",
    noMaterials: "No materials yet.",
    measurementLoadError: "Measurements could not be loaded.",
    measurementSaveError:
      "Measurement could not be saved. Your values are still here.",
    measurementDeleteError: "Measurement could not be deleted.",
    requiredField: "Required field",
    invalidMeasurement: "Measurement values are invalid.",
    confirmDeleteMeasurement: "Delete this measurement?",
    measurementSummary: "Measurement Summary",
    verifyMeasurements: "Verify all field measurements.",
    estimateOnly: "Estimate only.",
    notAdvice: "Not engineering or architectural advice.",
    annotate: "Annotate",
    point: "Point",
    line: "Line",
    rectangle: "Rectangle",
    textAnnotation: "Text",
    linkedMeasurement: "Link Measurement",
    noLinkedMeasurement: "No linked measurement",
    category: "Category",
    neutral: "Neutral",
    measurement: "Measurement",
    material: "Material",
    scopeCategory: "Scope",
    warning: "Warning",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    resetView: "Reset View",
    pan: "Pan",
    undo: "Undo",
    loadingAnnotations: "Loading annotations",
    noAnnotations: "No annotations",
    annotationLoadError: "Annotations could not be loaded.",
    annotationSaveError:
      "Annotations could not be saved. Your changes are still here.",
    annotationDeleteError: "Annotation could not be deleted.",
    pdfAnnotationSoon: "PDF annotation preview coming soon",
    selectPlanToAnnotate: "Select a plan or photo to annotate.",
    noAnnotatableFiles: "Upload a plan or photo before adding annotations.",
    imageOnlyAnnotation:
      "PNG and JPG files can be annotated now. Open or download PDFs privately; PDF page annotation will come in a later checkpoint.",
    annotationDisclaimer:
      "Annotations are visual references only. Measurements must be entered and verified manually. Annotations do not establish scale. Not engineering or architectural advice.",
    textLabelRequired: "Text annotations require a label.",
    unsavedChanges: "You have unsaved annotation changes.",
    confirmDeleteAnnotation: "Delete this selected annotation on Save?",
    addMaterial: "Add Material",
    editMaterial: "Edit Material",
    template: "Template",
    manualItem: "Manual item",
    conversionFactor: "Conversion Factor",
    calculatedQuantity: "Calculated Quantity",
    manualOverride: "Manual Override",
    finalQuantity: "Final Quantity",
    materialLoadError: "Materials could not be loaded.",
    materialSaveError:
      "Material could not be saved. Your values are still here.",
    materialDeleteError: "Material could not be deleted.",
    invalidMaterial: "Material values are invalid.",
    confirmDeleteMaterial: "Tap Delete again to remove this material item.",
    materialDisclaimer:
      "Estimates only. Verify field measurements before ordering. Conversion factors and waste assumptions may vary. Not engineering or architectural advice.",
    scopeSections: "Scope Sections",
    projectSummary: "Project Summary",
    includedWork: "Included Work",
    exclusions: "Exclusions",
    assumptions: "Assumptions",
    materialNotes: "Material Notes",
    accessSiteNotes: "Access / Site Notes",
    customerNotes: "Customer Notes",
    editSection: "Edit Section",
    moveUp: "Move Up",
    moveDown: "Move Down",
    clearSection: "Clear Section",
    loadingScope: "Loading scope",
    noScope: "No scope content yet.",
    scopeLoadError: "Scope could not be loaded.",
    scopeSaveError: "Scope could not be saved. Your draft is still here.",
    scopeDisclaimer:
      "Use user-entered content only. ALMA does not generate legal scope language or code-compliance statements.",
    addInstruction: "Add Instruction",
    editInstruction: "Edit Instruction",
    checklist: "Checklist",
    workSequence: "Work Sequence",
    safetyNote: "Safety Note",
    assignedCrew: "Assigned Crew",
    instructionTitle: "Instruction title",
    instructionBody: "Instruction / body",
    linkedMaterial: "Linked material",
    noLinkedMaterial: "No linked material",
    loadingCrew: "Loading crew instructions",
    noCrew: "No crew instructions yet.",
    crewLoadError: "Crew instructions could not be loaded.",
    crewSaveError:
      "Crew instructions could not be saved. Your draft is still here.",
    crewDeleteConfirm: "Tap Delete again to remove this instruction.",
    createTask: "Create Task",
    addToPlanner: "Add to Planner",
    taskCreated: "Task created.",
    plannerAdded: "Planner item added.",
    taskPlannerError: "The canonical record could not be created.",
    crewDisclaimer:
      "Crew notes are user-entered field instructions. No payroll, GPS, live collaboration, or compliance certification is included.",
    summaryCounts: "Project Summary",
    filesCount: "Plans / Photos",
    measurementsCount: "Measurements",
    materialsCount: "Materials",
    scopeCount: "Scope Sections",
    crewCount: "Crew Items",
    annotationsCount: "Annotations",
    generatePdf: "Generate PDF",
    generatingPdf: "Generating PDF",
    downloadPdf: "Download PDF",
    exportHistory: "Export History",
    exportReady: "PDF ready.",
    exportFailed: "PDF generation failed. Retry when ready.",
    exportLoadError: "PDF exports could not be loaded.",
    exportGenerateError: "PDF could not be generated.",
    exportDownloadError: "Download link could not be created.",
    noExports: "No PDFs generated yet.",
  },
  es: {
    title: "Construccion",
    subtitle:
      "Envio de planos y takeoff ligero para estimaciones verificadas en campo.",
    beta: "Beta",
    projects: "Proyectos",
    newProject: "Nuevo proyecto",
    editProject: "Editar proyecto",
    active: "Activos",
    archived: "Archivados",
    all: "Todos",
    projectType: "Tipo de proyecto",
    status: "Estado",
    jobsite: "Sitio de trabajo",
    contact: "Contacto",
    company: "Empresa",
    description: "Descripcion",
    save: "Guardar",
    saving: "Guardando",
    cancel: "Cancelar",
    open: "Abrir",
    archive: "Archivar",
    restore: "Restaurar",
    delete: "Eliminar",
    edit: "Editar",
    search: "Buscar proyectos",
    noContact: "Sin contacto vinculado",
    noCompany: "Sin empresa vinculada",
    noJobsite: "Sin sitio agregado",
    noDescription: "Sin descripcion todavia.",
    empty: "Aun no hay proyectos de construccion.",
    loading: "Cargando proyectos de construccion",
    loadError: "No se pudieron cargar los proyectos.",
    saveError: "No se pudo guardar. Tus cambios siguen aqui.",
    mutationError: "No se pudo actualizar el proyecto.",
    deleteError: "No se pudo eliminar el proyecto.",
    deleteConfirm:
      "Eliminar borra registros de construccion del proyecto. No elimina contactos ni empresas CRM.",
    projectName: "Nombre del proyecto",
    projectNameRequired: "El nombre del proyecto es obligatorio.",
    overview: "Resumen",
    plans: "Planos",
    measurements: "Medidas",
    annotations: "Anotaciones",
    materials: "Materiales",
    scope: "Alcance",
    crew: "Equipo",
    preview: "Vista previa",
    nextCheckpoint: "Disponible en el siguiente checkpoint de Construccion.",
    created: "Creado",
    updated: "Actualizado",
    disclaimer:
      "Solo estimaciones. Verifica todas las medidas en campo. No es asesoria de ingenieria o arquitectura. No es aprobacion de codigo.",
    nextStep:
      "Siguiente: agrega planos/fotos y medidas despues de aprobar el proximo checkpoint.",
    masonry: "Mamposteria",
    chimney: "Chimenea",
    wall: "Muro",
    floor: "Piso",
    roof: "Techo",
    deck: "Deck",
    fence: "Cerca",
    remodel: "Remodelacion",
    custom: "Personalizado",
    draft: "Borrador",
    completed: "Completado",
    back: "Proyectos",
    retry: "Reintentar",
    photos: "Fotos",
    upload: "Subir",
    uploading: "Subiendo",
    uploadPlan: "Subir plano o foto",
    uploadHint: "Agrega un PDF privado, foto del sitio o imagen de camara.",
    fileTitle: "Titulo",
    notes: "Notas",
    download: "Descargar",
    loadingFiles: "Cargando planos y fotos",
    noFiles: "Aun no hay planos o fotos subidos.",
    fileLoadError: "No se pudieron cargar los planos y fotos.",
    fileUploadError: "No se pudo subir el archivo. Tu seleccion sigue aqui.",
    fileDeleteError: "No se pudo eliminar el archivo.",
    fileTypeError: "Usa un archivo PDF, PNG, JPG o JPEG.",
    fileSizeError: "Los PDF pueden ser de hasta 25MB. Las imagenes hasta 15MB.",
    chooseFile: "Elegir archivo",
    cameraPhoto: "Foto de camara",
    pdfCard:
      "La vista previa del PDF esta disponible como archivo privado firmado.",
    privateFiles:
      "Los archivos subidos permanecen privados y son propiedad del usuario. Las vistas y descargas usan enlaces firmados temporales.",
    confirmDeleteFile:
      "Eliminar este archivo del proyecto? Las medidas conservan sus valores, pero se quita este vinculo.",
    close: "Cerrar",
    addMeasurement: "Agregar medida",
    editMeasurement: "Editar medida",
    linear: "Lineal",
    area: "Area",
    volume: "Volumen",
    perimeter: "Perimetro",
    count: "Conteo",
    length: "Largo",
    width: "Ancho",
    heightDepth: "Altura/Profundidad",
    quantity: "Cantidad",
    unit: "Unidad",
    waste: "Desperdicio",
    wasteFactor: "Factor de desperdicio",
    label: "Etiqueta",
    linkedPlan: "Plano o foto",
    noLinkedPlan: "Sin plano vinculado",
    baseTotal: "Total base",
    adjustedTotal: "Total ajustado",
    estimate: "Estimacion",
    formula: "Formula",
    loadingMeasurements: "Cargando medidas",
    loadingMaterials: "Cargando materiales",
    noMeasurements: "Aun no hay medidas.",
    noMaterials: "Aun no hay materiales.",
    measurementLoadError: "No se pudieron cargar las medidas.",
    measurementSaveError:
      "No se pudo guardar la medida. Tus valores siguen aqui.",
    measurementDeleteError: "No se pudo eliminar la medida.",
    requiredField: "Campo obligatorio",
    invalidMeasurement: "Los valores de la medida no son validos.",
    confirmDeleteMeasurement: "Eliminar esta medida?",
    measurementSummary: "Resumen de medidas",
    verifyMeasurements: "Verifica todas las medidas en campo.",
    estimateOnly: "Solo estimacion.",
    notAdvice: "No es asesoria de ingenieria o arquitectura.",
    annotate: "Anotar",
    point: "Punto",
    line: "Linea",
    rectangle: "Rectangulo",
    textAnnotation: "Texto",
    linkedMeasurement: "Vincular medida",
    noLinkedMeasurement: "Sin medida vinculada",
    category: "Categoria",
    neutral: "Neutral",
    measurement: "Medida",
    material: "Material",
    scopeCategory: "Alcance",
    warning: "Advertencia",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    resetView: "Restablecer vista",
    pan: "Mover",
    undo: "Deshacer",
    loadingAnnotations: "Cargando anotaciones",
    noAnnotations: "Sin anotaciones",
    annotationLoadError: "No se pudieron cargar las anotaciones.",
    annotationSaveError:
      "No se pudieron guardar las anotaciones. Tus cambios siguen aqui.",
    annotationDeleteError: "No se pudo eliminar la anotacion.",
    pdfAnnotationSoon: "Anotacion de PDF disponible pronto",
    selectPlanToAnnotate: "Selecciona un plano o foto para anotar.",
    noAnnotatableFiles: "Sube un plano o foto antes de agregar anotaciones.",
    imageOnlyAnnotation:
      "Los archivos PNG y JPG se pueden anotar ahora. Abre o descarga PDFs en privado; la anotacion de paginas PDF vendra en un checkpoint posterior.",
    annotationDisclaimer:
      "Las anotaciones son solo referencias visuales. Las medidas deben ingresarse y verificarse manualmente. Las anotaciones no establecen escala. No es asesoria de ingenieria o arquitectura.",
    textLabelRequired: "Las anotaciones de texto requieren etiqueta.",
    unsavedChanges: "Tienes cambios de anotaciones sin guardar.",
    confirmDeleteAnnotation: "Eliminar esta anotacion seleccionada al guardar?",
    addMaterial: "Agregar material",
    editMaterial: "Editar material",
    template: "Plantilla",
    manualItem: "Item manual",
    conversionFactor: "Factor de conversion",
    calculatedQuantity: "Cantidad calculada",
    manualOverride: "Ajuste manual",
    finalQuantity: "Cantidad final",
    materialLoadError: "No se pudieron cargar los materiales.",
    materialSaveError:
      "No se pudo guardar el material. Tus valores siguen aqui.",
    materialDeleteError: "No se pudo eliminar el material.",
    invalidMaterial: "Los valores del material no son validos.",
    confirmDeleteMaterial: "Toca Eliminar otra vez para quitar este material.",
    materialDisclaimer:
      "Solo estimaciones. Verifica las medidas antes de ordenar. Los factores y desperdicios pueden variar. No es asesoria de ingenieria o arquitectura.",
    scopeSections: "Secciones de alcance",
    projectSummary: "Resumen del proyecto",
    includedWork: "Trabajo incluido",
    exclusions: "Exclusiones",
    assumptions: "Supuestos",
    materialNotes: "Notas de materiales",
    accessSiteNotes: "Acceso / sitio",
    customerNotes: "Notas del cliente",
    editSection: "Editar seccion",
    moveUp: "Subir",
    moveDown: "Bajar",
    clearSection: "Limpiar seccion",
    loadingScope: "Cargando alcance",
    noScope: "Sin contenido de alcance todavia.",
    scopeLoadError: "No se pudo cargar el alcance.",
    scopeSaveError: "No se pudo guardar el alcance. Tu borrador sigue aqui.",
    scopeDisclaimer:
      "Usa solo contenido ingresado por el usuario. ALMA no genera lenguaje legal ni declaraciones de codigo.",
    addInstruction: "Agregar instruccion",
    editInstruction: "Editar instruccion",
    checklist: "Checklist",
    workSequence: "Secuencia de trabajo",
    safetyNote: "Nota de seguridad",
    assignedCrew: "Equipo asignado",
    instructionTitle: "Titulo de instruccion",
    instructionBody: "Instruccion / detalle",
    linkedMaterial: "Material vinculado",
    noLinkedMaterial: "Sin material vinculado",
    loadingCrew: "Cargando instrucciones",
    noCrew: "Sin instrucciones todavia.",
    crewLoadError: "No se pudieron cargar las instrucciones.",
    crewSaveError:
      "No se pudieron guardar las instrucciones. Tu borrador sigue aqui.",
    crewDeleteConfirm: "Toca Eliminar otra vez para quitar esta instruccion.",
    createTask: "Crear tarea",
    addToPlanner: "Agregar al planner",
    taskCreated: "Tarea creada.",
    plannerAdded: "Item agregado al planner.",
    taskPlannerError: "No se pudo crear el registro canonico.",
    crewDisclaimer:
      "Las notas de equipo son instrucciones ingresadas por el usuario. No incluye nomina, GPS, colaboracion en vivo ni certificacion de cumplimiento.",
    summaryCounts: "Resumen del proyecto",
    filesCount: "Planos / Fotos",
    measurementsCount: "Medidas",
    materialsCount: "Materiales",
    scopeCount: "Secciones",
    crewCount: "Instrucciones",
    annotationsCount: "Anotaciones",
    generatePdf: "Generar PDF",
    generatingPdf: "Generando PDF",
    downloadPdf: "Descargar PDF",
    exportHistory: "Historial de exportaciones",
    exportReady: "PDF listo.",
    exportFailed: "No se pudo generar el PDF. Reintenta cuando estes listo.",
    exportLoadError: "No se pudieron cargar los PDFs.",
    exportGenerateError: "No se pudo generar el PDF.",
    exportDownloadError: "No se pudo crear el enlace de descarga.",
    noExports: "Aun no hay PDFs generados.",
  },
};

function formatDate(
  value: string | null | undefined,
  language: AlmaShellLanguage,
) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function contactName(contact?: CrmContact | null) {
  if (!contact) return "";
  const full = `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim();
  return contact.name || full || contact.email || "Contact";
}

function companyName(company?: CrmCompany | null) {
  return company?.name || "";
}

function preview(value: string | null | undefined, fallback: string) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
}

function draftFromProject(project: ConstructionProject): ProjectDraft {
  return {
    projectName: project.project_name,
    contactId: project.contact_id ?? "",
    companyId: project.company_id ?? "",
    jobsiteAddress: project.jobsite_address ?? "",
    projectType: project.project_type,
    status: project.status,
    description: project.description ?? "",
  };
}

export default function ConstructionPage() {
  const [language, setLanguage] =
    useState<AlmaShellLanguage>(readStoredLanguage);
  const [projects, setProjects] = useState<ConstructionProject[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listMode, setListMode] = useState<ListMode>("active");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ProjectType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>(
    "all",
  );
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("overview");
  const [listState, setListState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft);
  const [formState, setFormState] = useState<RequestState>("idle");
  const [formError, setFormError] = useState("");
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const t = copy[language];

  const contactById = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact])),
    [contacts],
  );
  const companyById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );
  const selectedProject =
    projects.find((project) => project.id === selectedId) ?? null;

  async function load() {
    setListState("loading");
    setError("");
    try {
      const [projectsResponse, crmResponse] = await Promise.all([
        fetch("/api/construction/projects?status=all"),
        fetch("/api/crm/summary"),
      ]);
      const projectsData = await projectsResponse.json();
      const crmData = await crmResponse.json();
      if (!projectsResponse.ok || !projectsData.ok)
        throw new Error(t.loadError);
      setProjects(
        Array.isArray(projectsData.projects) ? projectsData.projects : [],
      );
      if (crmResponse.ok) {
        setContacts(Array.isArray(crmData.contacts) ? crmData.contacts : []);
        setCompanies(Array.isArray(crmData.companies) ? crmData.companies : []);
      }
      setListState("success");
    } catch {
      setListState("error");
      setError(t.loadError);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateLanguage(next: AlmaShellLanguage) {
    setLanguage(next);
    localStorage.setItem("alma_language", next);
  }

  const filteredProjects = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (listMode === "active" && project.status === "archived") return false;
      if (listMode === "archived" && project.status !== "archived")
        return false;
      if (typeFilter !== "all" && project.project_type !== typeFilter)
        return false;
      if (statusFilter !== "all" && project.status !== statusFilter)
        return false;
      if (!needle) return true;
      const contact = contactById.get(project.contact_id ?? "");
      const company = companyById.get(project.company_id ?? "");
      return [
        project.project_name,
        project.jobsite_address,
        project.description,
        contactName(contact),
        companyName(company),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [
    companyById,
    contactById,
    listMode,
    projects,
    query,
    statusFilter,
    typeFilter,
  ]);

  function openCreate() {
    setDraft(emptyDraft);
    setPanelMode("create");
    setFormState("idle");
    setFormError("");
  }

  function openEdit(project: ConstructionProject) {
    setDraft(draftFromProject(project));
    setPanelMode("edit");
    setFormState("idle");
    setFormError("");
  }

  async function saveProject() {
    if (formState === "loading") return;
    if (!draft.projectName.trim()) {
      setFormState("error");
      setFormError(t.projectNameRequired);
      return;
    }
    setFormState("loading");
    setFormError("");
    const payload = {
      projectName: draft.projectName.trim(),
      contactId: draft.contactId || null,
      companyId: draft.companyId || null,
      jobsiteAddress: draft.jobsiteAddress.trim() || null,
      projectType: draft.projectType,
      status: draft.status,
      description: draft.description.trim() || null,
    };
    try {
      const response = await fetch(
        panelMode === "edit" && selectedProject
          ? `/api/construction/projects/${selectedProject.id}`
          : "/api/construction/projects",
        {
          method: panelMode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok || !data.ok || !data.project)
        throw new Error(t.saveError);
      setPanelMode(null);
      setSelectedId(data.project.id);
      setWorkflowStep("overview");
      await load();
    } catch {
      setFormState("error");
      setFormError(t.saveError);
    }
  }

  async function mutateProject(
    project: ConstructionProject,
    status: ProjectStatus,
  ) {
    if (mutatingId) return;
    setMutatingId(project.id);
    setError("");
    try {
      const response = await fetch(`/api/construction/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(t.mutationError);
      if (selectedId === project.id)
        setSelectedId(data.project?.id ?? project.id);
      await load();
    } catch {
      setError(t.mutationError);
    } finally {
      setMutatingId(null);
    }
  }

  async function deleteProject(project: ConstructionProject) {
    if (mutatingId || confirmDeleteId !== project.id) {
      setConfirmDeleteId(project.id);
      return;
    }
    setMutatingId(project.id);
    setError("");
    try {
      const response = await fetch(
        `/api/construction/projects/${project.id}?confirm=delete`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(t.deleteError);
      if (selectedId === project.id) setSelectedId(null);
      setConfirmDeleteId(null);
      await load();
    } catch {
      setError(t.deleteError);
    } finally {
      setMutatingId(null);
    }
  }

  return (
    <AlmaShell
      language={language}
      activeWorkspace="construction"
      title={t.title}
      onLanguageChange={updateLanguage}
      releaseBadge={t.beta}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 text-[#111111] sm:px-4 md:px-6 md:py-8">
        <header className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F7F7F8]">
                <Hammer className="h-5 w-5" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-medium tracking-tight md:text-6xl">
                  {t.title}
                </h1>
                <span className="rounded-full border border-[#D1D5DB] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em]">
                  {t.beta}
                </span>
              </div>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#6B7280] md:text-lg">
                {t.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 py-3 font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              {t.newProject}
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="min-w-0 rounded-3xl border border-[#E5E7EB] bg-white p-3 shadow-sm md:p-4">
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[#F7F7F8] p-1">
              {(["active", "archived", "all"] as ListMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setListMode(mode)}
                  className={`min-h-11 truncate rounded-xl px-2 text-sm font-medium ${
                    listMode === mode ? "bg-black text-white" : "text-[#6B7280]"
                  }`}
                >
                  {t[mode]}
                </button>
              ))}
            </div>

            <div className="mt-3 grid gap-2">
              <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-3">
                <Search className="h-4 w-4 shrink-0 text-[#6B7280]" />
                <span className="sr-only">{t.search}</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.search}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value as "all" | ProjectType)
                  }
                  className="min-h-11 min-w-0 rounded-2xl border border-[#E5E7EB] bg-white px-3 text-sm"
                  aria-label={t.projectType}
                >
                  <option value="all">{t.projectType}</option>
                  {projectTypes.map((type) => (
                    <option key={type} value={type}>
                      {t[type]}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "all" | ProjectStatus)
                  }
                  className="min-h-11 min-w-0 rounded-2xl border border-[#E5E7EB] bg-white px-3 text-sm"
                  aria-label={t.status}
                >
                  <option value="all">{t.status}</option>
                  {projectStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status === "active" || status === "archived"
                        ? t[status]
                        : t[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error ? <ErrorNote message={error} /> : null}

            <div className="mt-4 grid gap-3">
              {listState === "loading" ? (
                <LoadingState text={t.loading} />
              ) : listState === "error" ? (
                <RetryState
                  text={error || t.loadError}
                  retry={t.retry}
                  onRetry={() => void load()}
                />
              ) : filteredProjects.length ? (
                filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    language={language}
                    text={t}
                    contact={contactById.get(project.contact_id ?? "")}
                    company={companyById.get(project.company_id ?? "")}
                    selected={selectedId === project.id}
                    mutating={mutatingId === project.id}
                    confirmingDelete={confirmDeleteId === project.id}
                    onOpen={() => {
                      setSelectedId(project.id);
                      setWorkflowStep("overview");
                    }}
                    onArchive={() =>
                      void mutateProject(
                        project,
                        project.status === "archived" ? "active" : "archived",
                      )
                    }
                    onDelete={() => void deleteProject(project)}
                  />
                ))
              ) : (
                <EmptyState text={t.empty} />
              )}
            </div>
          </section>

          <section className="min-w-0">
            {selectedProject ? (
              <ProjectDetail
                project={selectedProject}
                language={language}
                text={t}
                contact={contactById.get(selectedProject.contact_id ?? "")}
                company={companyById.get(selectedProject.company_id ?? "")}
                workflowStep={workflowStep}
                onWorkflowStep={setWorkflowStep}
                onBack={() => setSelectedId(null)}
                onEdit={() => openEdit(selectedProject)}
                onArchive={() =>
                  void mutateProject(
                    selectedProject,
                    selectedProject.status === "archived"
                      ? "active"
                      : "archived",
                  )
                }
              />
            ) : (
              <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F7F7F8]">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-2xl font-medium">{t.projects}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#6B7280]">
                  {t.nextStep}
                </p>
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 font-medium text-white"
                >
                  <Plus className="h-4 w-4" />
                  {t.newProject}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {panelMode ? (
        <ProjectPanel
          mode={panelMode}
          draft={draft}
          contacts={contacts}
          companies={companies}
          text={t}
          state={formState}
          error={formError}
          onChange={setDraft}
          onClose={() => setPanelMode(null)}
          onSave={() => void saveProject()}
        />
      ) : null}
    </AlmaShell>
  );
}

function ProjectCard({
  project,
  language,
  text,
  contact,
  company,
  selected,
  mutating,
  confirmingDelete,
  onOpen,
  onArchive,
  onDelete,
}: {
  project: ConstructionProject;
  language: AlmaShellLanguage;
  text: (typeof copy)["en"];
  contact?: CrmContact;
  company?: CrmCompany;
  selected: boolean;
  mutating: boolean;
  confirmingDelete: boolean;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={`rounded-3xl border bg-white p-4 ${
        selected ? "border-black" : "border-[#E5E7EB]"
      }`}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-lg font-medium">
            {project.project_name}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-[#6B7280]">
            <span className="rounded-full bg-[#F7F7F8] px-2.5 py-1">
              {text[project.project_type]}
            </span>
            <span className="rounded-full bg-[#F7F7F8] px-2.5 py-1">
              {project.status === "active" || project.status === "archived"
                ? text[project.status]
                : text[project.status]}
            </span>
          </div>
        </div>
        <Hammer className="h-5 w-5 shrink-0 text-[#6B7280]" />
      </div>
      <div className="mt-3 space-y-2 text-sm leading-6 text-[#6B7280]">
        <p className="flex min-w-0 gap-2">
          <MapPin className="mt-1 h-4 w-4 shrink-0" />
          <span className="break-words">
            {project.jobsite_address || text.noJobsite}
          </span>
        </p>
        <p className="flex min-w-0 gap-2">
          <Users className="mt-1 h-4 w-4 shrink-0" />
          <span className="break-words">
            {contactName(contact) || text.noContact}
          </span>
        </p>
        <p className="flex min-w-0 gap-2">
          <Building2 className="mt-1 h-4 w-4 shrink-0" />
          <span className="break-words">
            {companyName(company) || text.noCompany}
          </span>
        </p>
        <p>{preview(project.description, text.noDescription)}</p>
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-[#9CA3AF]">
        {text.updated}: {formatDate(project.updated_at, language)}
      </p>
      {confirmingDelete ? (
        <p className="mt-3 rounded-2xl bg-[#FEF2F2] p-3 text-sm leading-6 text-[#991B1B]">
          {text.deleteConfirm}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <ActionButton icon={FileStack} label={text.open} onClick={onOpen} />
        <ActionButton
          icon={project.status === "archived" ? RefreshCcw : Archive}
          label={project.status === "archived" ? text.restore : text.archive}
          onClick={onArchive}
          disabled={mutating}
        />
        <ActionButton
          icon={Trash2}
          label={confirmingDelete ? text.delete : text.delete}
          onClick={onDelete}
          disabled={mutating}
        />
      </div>
    </article>
  );
}

function ProjectDetail({
  project,
  language,
  text,
  contact,
  company,
  workflowStep,
  onWorkflowStep,
  onBack,
  onEdit,
  onArchive,
}: {
  project: ConstructionProject;
  language: AlmaShellLanguage;
  text: (typeof copy)["en"];
  contact?: CrmContact;
  company?: CrmCompany;
  workflowStep: WorkflowStep;
  onWorkflowStep: (step: WorkflowStep) => void;
  onBack: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <article className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#D1D5DB] px-4 text-sm font-medium lg:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        {text.back}
      </button>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#9CA3AF]">
            {text[project.project_type]} /{" "}
            {project.status === "active" || project.status === "archived"
              ? text[project.status]
              : text[project.status]}
          </p>
          <h2 className="mt-2 break-words text-3xl font-medium tracking-tight md:text-5xl">
            {project.project_name}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280]">
            {preview(project.description, text.noDescription)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <ActionButton icon={Pencil} label={text.edit} onClick={onEdit} />
          <ActionButton
            icon={project.status === "archived" ? RefreshCcw : Archive}
            label={project.status === "archived" ? text.restore : text.archive}
            onClick={onArchive}
          />
        </div>
      </div>

      <div className="mt-5 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {workflowSteps.map((step) => (
            <button
              type="button"
              key={step}
              onClick={() => onWorkflowStep(step)}
              className={`min-h-11 rounded-full px-4 text-sm font-medium ${
                workflowStep === step
                  ? "bg-black text-white"
                  : "border border-[#E5E7EB] bg-white text-[#6B7280]"
              }`}
            >
              {text[step]}
            </button>
          ))}
        </div>
      </div>

      {workflowStep === "overview" ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="rounded-3xl bg-[#F7F7F8] p-4">
            <h3 className="text-xl font-medium">{text.overview}</h3>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-[#6B7280] md:grid-cols-2">
              <InfoLine
                icon={Users}
                label={text.contact}
                value={contactName(contact) || text.noContact}
              />
              <InfoLine
                icon={Building2}
                label={text.company}
                value={companyName(company) || text.noCompany}
              />
              <InfoLine
                icon={MapPin}
                label={text.jobsite}
                value={project.jobsite_address || text.noJobsite}
              />
              <InfoLine
                icon={Hammer}
                label={text.projectType}
                value={text[project.project_type]}
              />
              <InfoLine
                icon={CheckCircle2}
                label={text.status}
                value={
                  project.status === "active" || project.status === "archived"
                    ? text[project.status]
                    : text[project.status]
                }
              />
              <InfoLine
                icon={FileStack}
                label={text.created}
                value={formatDate(project.created_at, language)}
              />
            </div>
            <div className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white p-4 text-sm leading-6 text-[#374151]">
              {project.description || text.noDescription}
            </div>
          </section>
          <aside className="rounded-3xl border border-[#E5E7EB] p-4">
            <h3 className="font-medium">{text.preview}</h3>
            <p className="mt-3 text-sm leading-6 text-[#6B7280]">
              {text.disclaimer}
            </p>
            <p className="mt-4 rounded-2xl bg-[#F7F7F8] p-3 text-sm leading-6 text-[#6B7280]">
              {text.nextStep}
            </p>
          </aside>
        </div>
      ) : workflowStep === "plans" ? (
        <div className="mt-5">
          <FileUpload projectId={project.id} language={language} text={text} />
        </div>
      ) : workflowStep === "measurements" ? (
        <div className="mt-5">
          <MeasurementCalculator
            projectId={project.id}
            language={language}
            text={text}
          />
        </div>
      ) : workflowStep === "annotations" ? (
        <div className="mt-5">
          <AnnotationWorkspace projectId={project.id} text={text} />
        </div>
      ) : workflowStep === "materials" ? (
        <div className="mt-5">
          <MaterialsWorkspace projectId={project.id} text={text} />
        </div>
      ) : workflowStep === "scope" ? (
        <div className="mt-5">
          <ScopeWorkspace projectId={project.id} text={text} />
        </div>
      ) : workflowStep === "crew" ? (
        <div className="mt-5">
          <CrewWorkspace projectId={project.id} text={text} />
        </div>
      ) : workflowStep === "preview" ? (
        <div className="mt-5">
          <ConstructionSummary projectId={project.id} text={text} />
        </div>
      ) : (
        <div className="mt-5 rounded-3xl border border-dashed border-[#D1D5DB] bg-[#F7F7F8] p-6">
          <h3 className="text-xl font-medium">{text[workflowStep]}</h3>
          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            {text.nextCheckpoint}
          </p>
        </div>
      )}
    </article>
  );
}

function ProjectPanel({
  mode,
  draft,
  contacts,
  companies,
  text,
  state,
  error,
  onChange,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  draft: ProjectDraft;
  contacts: CrmContact[];
  companies: CrmCompany[];
  text: (typeof copy)["en"];
  state: RequestState;
  error: string;
  onChange: (draft: ProjectDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 p-0 sm:items-center sm:justify-center sm:p-4">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:max-w-3xl sm:rounded-3xl sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-medium">
            {mode === "edit" ? text.editProject : text.newProject}
          </h2>
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
            <span className="text-sm font-medium">{text.projectName}</span>
            <input
              value={draft.projectName}
              onChange={(event) =>
                onChange({ ...draft, projectName: event.target.value })
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4 outline-none focus:border-black"
            />
          </label>
          <SelectField
            label={text.projectType}
            value={draft.projectType}
            onChange={(value) =>
              onChange({ ...draft, projectType: value as ProjectType })
            }
            options={projectTypes.map((type) => [type, text[type]])}
          />
          <SelectField
            label={text.status}
            value={draft.status}
            onChange={(value) =>
              onChange({ ...draft, status: value as ProjectStatus })
            }
            options={projectStatuses.map((status) => [status, text[status]])}
          />
          <SelectField
            label={text.contact}
            value={draft.contactId}
            onChange={(value) => onChange({ ...draft, contactId: value })}
            options={[
              ["", text.noContact],
              ...contacts.map((contact) => [contact.id, contactName(contact)]),
            ]}
          />
          <SelectField
            label={text.company}
            value={draft.companyId}
            onChange={(value) => onChange({ ...draft, companyId: value })}
            options={[
              ["", text.noCompany],
              ...companies.map((company) => [company.id, companyName(company)]),
            ]}
          />
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">{text.jobsite}</span>
            <input
              value={draft.jobsiteAddress}
              onChange={(event) =>
                onChange({ ...draft, jobsiteAddress: event.target.value })
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] px-4 outline-none focus:border-black"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-medium">{text.description}</span>
            <textarea
              value={draft.description}
              onChange={(event) =>
                onChange({ ...draft, description: event.target.value })
              }
              className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-[#D1D5DB] bg-[#F7F7F8] p-4 outline-none focus:border-black"
            />
          </label>
        </div>
        <p className="mt-4 rounded-2xl bg-[#F7F7F8] p-3 text-sm leading-6 text-[#6B7280]">
          {text.disclaimer}
        </p>
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

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
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

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Hammer;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-3 rounded-2xl bg-white p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7280]" />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#9CA3AF]">
          {label}
        </p>
        <p className="mt-1 break-words text-[#111111]">{value}</p>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof FileStack;
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
    <div className="flex min-h-40 items-center justify-center rounded-3xl border border-[#E5E7EB] bg-white p-5 text-[#6B7280]">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {text}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-5 text-sm leading-6 text-[#6B7280]">
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
      <p className="text-sm leading-6 text-[#991B1B]">{text}</p>
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
