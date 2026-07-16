import { createClient } from "@/lib/supabase/server";
import { safeFilename } from "@/lib/construction/api";
import { normalizeAnnotationColor } from "@/lib/construction/annotations";
import {
  calculateMeasurement,
  type ConstructionMeasurementType,
  type ConstructionUnit,
} from "@/lib/construction/calculations";
import { isCompatibleMaterialSource } from "@/lib/construction/materials";
import {
  constructionAnnotationTypes,
  constructionFileLimits,
  constructionMimeTypes,
  constructionProjectStatuses,
  constructionProjectTypes,
  constructionScopeKeys,
  isAllowed,
  type ConstructionAnnotationInput,
  type ConstructionMaterialInput,
  type ConstructionMeasurementInput,
  type ConstructionProjectInput,
  type ConstructionScopeKey,
} from "@/lib/construction/types";

const constructionBucket = "alma-construction";

type ConstructionScopeInput = {
  sectionKey: ConstructionScopeKey;
  title?: string;
  content?: string | null;
  sortOrder?: number | string | null;
};

type ConstructionCrewInput = {
  checklist?: unknown;
  workSequence?: string | null;
  work_sequence?: string | null;
  measurementReferences?: unknown;
  materialSummaryNotes?: string | null;
  material_summary_notes?: string | null;
  planFileReferences?: unknown;
  userSafetyNotes?: string | null;
  user_safety_notes?: string | null;
  assignedCrewText?: string | null;
  assigned_crew_text?: string | null;
};

type MeasurementSummaryRow = {
  measurement_type: string;
  adjusted_total?: number | string | null;
};

type ConstructionMeasurementRow = {
  id: string;
  measurement_type: string;
};

type ConstructionMaterialRow = {
  id: string;
  unit?: string | null;
  calculated_quantity?: number | string | null;
  manual_quantity_override?: number | string | null;
};

type CrewChecklistItem = {
  id?: string;
  title?: string;
  body?: string;
  completed?: boolean;
  measurementId?: string | null;
  materialId?: string | null;
  planFileId?: string | null;
};

type ConstructionExportStatus =
  "pending" | "generating" | "completed" | "failed";

type ConstructionExportInput = {
  idempotencyKey?: string | null;
  filename: string;
  sourceSnapshot?: Record<string, unknown>;
};

type ConstructionExportCompleteInput = {
  storagePath: string;
  filename: string;
  sourceSnapshot?: Record<string, unknown>;
};

function normalizeProject(input: ConstructionProjectInput) {
  const projectType = isAllowed(input.projectType, constructionProjectTypes)
    ? input.projectType
    : "custom";
  const status = isAllowed(input.status, constructionProjectStatuses)
    ? input.status
    : "draft";
  return {
    project_name: input.projectName,
    contact_id: input.contactId ?? null,
    company_id: input.companyId ?? null,
    jobsite_address: input.jobsiteAddress ?? null,
    project_type: projectType,
    status,
    description: input.description ?? null,
  };
}

function assertMeasurementInput(input: ConstructionMeasurementInput) {
  const result = calculateMeasurement({
    measurementType: input.measurementType,
    length: input.length,
    width: input.width,
    heightOrDepth: input.heightOrDepth,
    quantity: input.quantity ?? 1,
    unit: input.unit,
    wastePercentage: input.wastePercentage ?? 0,
  });

  return {
    plan_file_id: input.planFileId ?? null,
    measurement_type: input.measurementType,
    label: input.label,
    length: input.length ?? null,
    width: input.width ?? null,
    height_or_depth: input.heightOrDepth ?? null,
    quantity: input.quantity ?? 1,
    unit: input.unit,
    waste_percentage: input.wastePercentage ?? 0,
    base_total: result.baseTotal,
    adjusted_total: result.adjustedTotal,
    notes: input.notes ?? null,
  };
}

function assertCoordinate(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${field} must be between 0 and 1`);
  }
}

function assertNonNegativeFinite(
  value: number | null | undefined,
  field: string,
) {
  if (value === null || value === undefined) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`invalid_${field}`);
  }
}

function normalizeCrewChecklist(input: unknown): CrewChecklistItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object"),
    )
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
      title:
        typeof item.title === "string"
          ? item.title.slice(0, 180)
          : `Item ${index + 1}`,
      body: typeof item.body === "string" ? item.body.slice(0, 2000) : "",
      completed: item.completed === true,
      measurementId:
        typeof item.measurementId === "string" ? item.measurementId : null,
      materialId: typeof item.materialId === "string" ? item.materialId : null,
      planFileId: typeof item.planFileId === "string" ? item.planFileId : null,
    }));
}

function normalizeReferenceArray(input: unknown) {
  return Array.isArray(input)
    ? input.filter((value): value is string => typeof value === "string")
    : [];
}

export class ConstructionRepository {
  static async listProjects(
    userId: string,
    filters: { query?: string; status?: string; projectType?: string } = {},
  ) {
    const supabase = await createClient();
    let query = supabase
      .from("construction_projects")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters.projectType && filters.projectType !== "all") {
      query = query.eq("project_type", filters.projectType);
    }
    if (filters.query?.trim()) {
      const value = filters.query.trim();
      query = query.or(
        `project_name.ilike.%${value}%,jobsite_address.ilike.%${value}%,description.ilike.%${value}%`,
      );
    }

    const { data, error } = await query;
    if (error) throw new Error("construction_projects_list_failed");
    return data ?? [];
  }

  static async getProject(userId: string, projectId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error("construction_project_get_failed");
    return data;
  }

  static async createProject(userId: string, input: ConstructionProjectInput) {
    const supabase = await createClient();
    await this.assertCanonicalReferences(userId, {
      contactId: input.contactId,
      companyId: input.companyId,
    });
    const { data, error } = await supabase
      .from("construction_projects")
      .insert({ user_id: userId, ...normalizeProject(input) })
      .select()
      .single();
    if (error) throw new Error("construction_project_create_failed");
    return data;
  }

  static async updateProject(
    userId: string,
    projectId: string,
    input: Partial<ConstructionProjectInput>,
  ) {
    const existing = await this.getProject(userId, projectId);
    if (!existing) return null;
    await this.assertCanonicalReferences(userId, {
      contactId: input.contactId,
      companyId: input.companyId,
    });
    const patch = normalizeProject({
      projectName: input.projectName ?? existing.project_name,
      contactId:
        input.contactId === undefined ? existing.contact_id : input.contactId,
      companyId:
        input.companyId === undefined ? existing.company_id : input.companyId,
      jobsiteAddress:
        input.jobsiteAddress === undefined
          ? existing.jobsite_address
          : input.jobsiteAddress,
      projectType: input.projectType ?? existing.project_type,
      status: input.status ?? existing.status,
      description:
        input.description === undefined
          ? existing.description
          : input.description,
    });
    const { data, error } = await (
      await createClient()
    )
      .from("construction_projects")
      .update(patch)
      .eq("id", projectId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error("construction_project_update_failed");
    return data;
  }

  static async deleteProject(userId: string, projectId: string) {
    const supabase = await createClient();
    const project = await this.getProject(userId, projectId);
    if (!project) return false;
    const { error } = await supabase
      .from("construction_projects")
      .delete()
      .eq("id", projectId)
      .eq("user_id", userId);
    if (error) throw new Error("construction_project_delete_failed");
    return true;
  }

  static async listFiles(userId: string, projectId: string) {
    await this.assertProject(userId, projectId);
    const { data, error } = await (
      await createClient()
    )
      .from("construction_plan_files")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("construction_files_list_failed");
    return data ?? [];
  }

  static async uploadFile(
    userId: string,
    projectId: string,
    file: File,
    input: {
      title?: string | null;
      notes?: string | null;
      documentId?: string | null;
    },
  ) {
    await this.assertProject(userId, projectId);
    if (!isAllowed(file.type, constructionMimeTypes)) {
      throw new Error("unsupported_construction_file_type");
    }
    if (
      file.size <= 0 ||
      file.size >
        constructionFileLimits[file.type as keyof typeof constructionFileLimits]
    ) {
      throw new Error("invalid_construction_file_size");
    }
    if (input.documentId) {
      await this.assertDocument(userId, input.documentId);
    }
    const supabase = await createClient();
    const filename = safeFilename(file.name);
    const storagePath = `${userId}/${projectId}/plans/${crypto.randomUUID()}-${filename}`;
    const { error: uploadError } = await supabase.storage
      .from(constructionBucket)
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error("construction_file_upload_failed");

    const { data, error } = await supabase
      .from("construction_plan_files")
      .insert({
        user_id: userId,
        project_id: projectId,
        document_id: input.documentId ?? null,
        storage_path: storagePath,
        original_filename: filename,
        mime_type: file.type,
        size_bytes: file.size,
        title: input.title || filename.replace(/\.[^.]+$/, "") || filename,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      await supabase.storage.from(constructionBucket).remove([storagePath]);
      throw new Error("construction_file_metadata_failed");
    }
    return data;
  }

  static async createFileSignedUrl(
    userId: string,
    fileId: string,
    mode: "preview" | "download",
  ) {
    const supabase = await createClient();
    const { data: file, error: getError } = await supabase
      .from("construction_plan_files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", userId)
      .maybeSingle();
    if (getError) throw new Error("construction_file_get_failed");
    if (!file) return null;

    const options =
      mode === "download" ? { download: file.original_filename } : undefined;
    const { data, error } = await supabase.storage
      .from(constructionBucket)
      .createSignedUrl(file.storage_path, 300, options);
    if (error || !data?.signedUrl) {
      throw new Error("construction_file_signed_url_failed");
    }

    return {
      url: data.signedUrl,
      expiresIn: 300,
      file: {
        id: file.id,
        original_filename: file.original_filename,
        mime_type: file.mime_type,
        title: file.title,
      },
    };
  }

  static async deleteFile(userId: string, fileId: string) {
    const supabase = await createClient();
    const { data: file, error: getError } = await supabase
      .from("construction_plan_files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", userId)
      .maybeSingle();
    if (getError) throw new Error("construction_file_get_failed");
    if (!file) return false;
    const { error } = await supabase
      .from("construction_plan_files")
      .delete()
      .eq("id", fileId)
      .eq("user_id", userId);
    if (error) throw new Error("construction_file_delete_failed");
    await supabase.storage.from(constructionBucket).remove([file.storage_path]);
    return true;
  }

  static async listMeasurements(userId: string, projectId: string) {
    await this.assertProject(userId, projectId);
    const { data, error } = await (
      await createClient()
    )
      .from("construction_measurements")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("construction_measurements_list_failed");
    return data ?? [];
  }

  static async createMeasurement(
    userId: string,
    projectId: string,
    input: ConstructionMeasurementInput,
  ) {
    await this.assertProject(userId, projectId);
    if (input.planFileId)
      await this.assertPlanFile(userId, projectId, input.planFileId);
    const row = assertMeasurementInput(input);
    const { data, error } = await (
      await createClient()
    )
      .from("construction_measurements")
      .insert({ user_id: userId, project_id: projectId, ...row })
      .select()
      .single();
    if (error) throw new Error("construction_measurement_create_failed");
    return data;
  }

  static async updateMeasurement(
    userId: string,
    measurementId: string,
    input: Partial<ConstructionMeasurementInput>,
  ) {
    const supabase = await createClient();
    const { data: existing, error: getError } = await supabase
      .from("construction_measurements")
      .select("*")
      .eq("id", measurementId)
      .eq("user_id", userId)
      .maybeSingle();
    if (getError) throw new Error("construction_measurement_get_failed");
    if (!existing) return null;
    const next: ConstructionMeasurementInput = {
      planFileId:
        input.planFileId === undefined
          ? existing.plan_file_id
          : input.planFileId,
      measurementType: (input.measurementType ??
        existing.measurement_type) as ConstructionMeasurementType,
      label: input.label ?? existing.label,
      length: input.length === undefined ? existing.length : input.length,
      width: input.width === undefined ? existing.width : input.width,
      heightOrDepth:
        input.heightOrDepth === undefined
          ? existing.height_or_depth
          : input.heightOrDepth,
      quantity:
        input.quantity === undefined ? existing.quantity : input.quantity,
      unit: (input.unit ?? existing.unit) as ConstructionUnit,
      wastePercentage:
        input.wastePercentage === undefined
          ? existing.waste_percentage
          : input.wastePercentage,
      notes: input.notes === undefined ? existing.notes : input.notes,
    };
    if (next.planFileId) {
      await this.assertPlanFile(userId, existing.project_id, next.planFileId);
    }
    const row = assertMeasurementInput(next);
    const { data, error } = await supabase
      .from("construction_measurements")
      .update(row)
      .eq("id", measurementId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error("construction_measurement_update_failed");
    return data;
  }

  static async deleteMeasurement(userId: string, measurementId: string) {
    const { error, count } = await (
      await createClient()
    )
      .from("construction_measurements")
      .delete({ count: "exact" })
      .eq("id", measurementId)
      .eq("user_id", userId);
    if (error) throw new Error("construction_measurement_delete_failed");
    return Boolean(count);
  }

  static async listMaterials(userId: string, projectId: string) {
    await this.assertProject(userId, projectId);
    const { data, error } = await (
      await createClient()
    )
      .from("construction_material_items")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error("construction_materials_list_failed");
    return data ?? [];
  }

  static async createMaterial(
    userId: string,
    projectId: string,
    input: ConstructionMaterialInput,
  ) {
    await this.assertProject(userId, projectId);
    assertNonNegativeFinite(input.conversionFactor ?? 1, "conversion_factor");
    assertNonNegativeFinite(
      input.calculatedQuantity ?? 0,
      "calculated_quantity",
    );
    assertNonNegativeFinite(
      input.manualQuantityOverride,
      "manual_quantity_override",
    );
    assertNonNegativeFinite(input.wasteFactor ?? 0, "waste_factor");
    if ((input.wasteFactor ?? 0) > 100) throw new Error("invalid_waste_factor");
    if (input.measurementId) {
      const measurement = await this.assertMeasurement(
        userId,
        projectId,
        input.measurementId,
      );
      if (
        !isCompatibleMaterialSource(
          measurement.measurement_type,
          input.sourceMeasurementType,
        )
      ) {
        throw new Error("invalid_material_measurement_type");
      }
    }
    const { data, error } = await (
      await createClient()
    )
      .from("construction_material_items")
      .insert({
        user_id: userId,
        project_id: projectId,
        template_id: input.templateId ?? null,
        measurement_id: input.measurementId ?? null,
        material_name: input.materialName,
        source_measurement_type: input.sourceMeasurementType ?? null,
        conversion_factor: input.conversionFactor ?? 1,
        unit: input.unit,
        calculated_quantity: input.calculatedQuantity ?? 0,
        manual_quantity_override: input.manualQuantityOverride ?? null,
        waste_factor: input.wasteFactor ?? 0,
        notes: input.notes ?? null,
        sort_order: input.sortOrder ?? 0,
      })
      .select()
      .single();
    if (error) throw new Error("construction_material_create_failed");
    return data;
  }

  static async updateMaterial(
    userId: string,
    materialId: string,
    input: Partial<ConstructionMaterialInput>,
  ) {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("construction_material_items")
      .select("*")
      .eq("id", materialId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!existing) return null;
    const nextMeasurementId =
      input.measurementId === undefined
        ? existing.measurement_id
        : input.measurementId;
    const nextSourceMeasurementType =
      input.sourceMeasurementType === undefined
        ? existing.source_measurement_type
        : input.sourceMeasurementType;
    assertNonNegativeFinite(input.conversionFactor, "conversion_factor");
    assertNonNegativeFinite(input.calculatedQuantity, "calculated_quantity");
    assertNonNegativeFinite(
      input.manualQuantityOverride,
      "manual_quantity_override",
    );
    assertNonNegativeFinite(input.wasteFactor, "waste_factor");
    if (
      input.wasteFactor !== undefined &&
      input.wasteFactor !== null &&
      input.wasteFactor > 100
    ) {
      throw new Error("invalid_waste_factor");
    }
    if (nextMeasurementId) {
      const measurement = await this.assertMeasurement(
        userId,
        existing.project_id,
        nextMeasurementId,
      );
      if (
        !isCompatibleMaterialSource(
          measurement.measurement_type,
          nextSourceMeasurementType,
        )
      ) {
        throw new Error("invalid_material_measurement_type");
      }
    }
    const patch: Record<string, unknown> = {};
    if (input.templateId !== undefined) patch.template_id = input.templateId;
    if (input.measurementId !== undefined)
      patch.measurement_id = input.measurementId;
    if (input.materialName !== undefined)
      patch.material_name = input.materialName;
    if (input.sourceMeasurementType !== undefined) {
      patch.source_measurement_type = input.sourceMeasurementType;
    }
    if (input.conversionFactor !== undefined) {
      patch.conversion_factor = input.conversionFactor;
    }
    if (input.unit !== undefined) patch.unit = input.unit;
    if (input.calculatedQuantity !== undefined) {
      patch.calculated_quantity = input.calculatedQuantity;
    }
    if (input.manualQuantityOverride !== undefined) {
      patch.manual_quantity_override = input.manualQuantityOverride;
    }
    if (input.wasteFactor !== undefined) patch.waste_factor = input.wasteFactor;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
    const { data, error } = await supabase
      .from("construction_material_items")
      .update(patch)
      .eq("id", materialId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error("construction_material_update_failed");
    return data;
  }

  static async deleteMaterial(userId: string, materialId: string) {
    const { error, count } = await (
      await createClient()
    )
      .from("construction_material_items")
      .delete({ count: "exact" })
      .eq("id", materialId)
      .eq("user_id", userId);
    if (error) throw new Error("construction_material_delete_failed");
    return Boolean(count);
  }

  static async listAnnotations(userId: string, projectId: string) {
    await this.assertProject(userId, projectId);
    const { data, error } = await (
      await createClient()
    )
      .from("construction_annotations")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error("construction_annotations_list_failed");
    return data ?? [];
  }

  static async createAnnotation(
    userId: string,
    projectId: string,
    input: ConstructionAnnotationInput,
  ) {
    await this.assertProject(userId, projectId);
    await this.assertPlanFile(userId, projectId, input.planFileId);
    if (input.measurementId) {
      await this.assertMeasurement(userId, projectId, input.measurementId);
    }
    if (!isAllowed(input.annotationType, constructionAnnotationTypes)) {
      throw new Error("invalid_annotation_type");
    }
    assertCoordinate(input.x1, "x1");
    assertCoordinate(input.y1, "y1");
    if (input.x2 !== null && input.x2 !== undefined)
      assertCoordinate(input.x2, "x2");
    if (input.y2 !== null && input.y2 !== undefined)
      assertCoordinate(input.y2, "y2");
    const { data, error } = await (
      await createClient()
    )
      .from("construction_annotations")
      .insert({
        user_id: userId,
        project_id: projectId,
        plan_file_id: input.planFileId,
        measurement_id: input.measurementId ?? null,
        annotation_type: input.annotationType,
        x1: input.x1,
        y1: input.y1,
        x2: input.x2 ?? null,
        y2: input.y2 ?? null,
        label: input.label ?? null,
        color_key: normalizeAnnotationColor(input.colorKey),
        metadata: input.metadata ?? {},
      })
      .select()
      .single();
    if (error) throw new Error("construction_annotation_create_failed");
    return data;
  }

  static async updateAnnotation(
    userId: string,
    annotationId: string,
    input: Partial<ConstructionAnnotationInput>,
  ) {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("construction_annotations")
      .select("*")
      .eq("id", annotationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!existing) return null;
    const next: ConstructionAnnotationInput = {
      planFileId: input.planFileId ?? existing.plan_file_id,
      measurementId:
        input.measurementId === undefined
          ? existing.measurement_id
          : input.measurementId,
      annotationType: (input.annotationType ??
        existing.annotation_type) as ConstructionAnnotationInput["annotationType"],
      x1: input.x1 ?? existing.x1,
      y1: input.y1 ?? existing.y1,
      x2: input.x2 === undefined ? existing.x2 : input.x2,
      y2: input.y2 === undefined ? existing.y2 : input.y2,
      label: input.label === undefined ? existing.label : input.label,
      colorKey:
        input.colorKey === undefined
          ? normalizeAnnotationColor(existing.color_key)
          : normalizeAnnotationColor(input.colorKey),
      metadata: input.metadata ?? existing.metadata ?? {},
    };
    await this.assertPlanFile(userId, existing.project_id, next.planFileId);
    if (next.measurementId) {
      await this.assertMeasurement(
        userId,
        existing.project_id,
        next.measurementId,
      );
    }
    assertCoordinate(next.x1, "x1");
    assertCoordinate(next.y1, "y1");
    if (next.x2 !== null && next.x2 !== undefined)
      assertCoordinate(next.x2, "x2");
    if (next.y2 !== null && next.y2 !== undefined)
      assertCoordinate(next.y2, "y2");
    const { data, error } = await supabase
      .from("construction_annotations")
      .update({
        plan_file_id: next.planFileId,
        measurement_id: next.measurementId ?? null,
        annotation_type: next.annotationType,
        x1: next.x1,
        y1: next.y1,
        x2: next.x2 ?? null,
        y2: next.y2 ?? null,
        label: next.label ?? null,
        color_key: normalizeAnnotationColor(next.colorKey),
        metadata: next.metadata ?? {},
      })
      .eq("id", annotationId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error("construction_annotation_update_failed");
    return data;
  }

  static async deleteAnnotation(userId: string, annotationId: string) {
    const { error, count } = await (
      await createClient()
    )
      .from("construction_annotations")
      .delete({ count: "exact" })
      .eq("id", annotationId)
      .eq("user_id", userId);
    if (error) throw new Error("construction_annotation_delete_failed");
    return Boolean(count);
  }

  static async listScope(userId: string, projectId: string) {
    await this.assertProject(userId, projectId);
    const { data, error } = await (
      await createClient()
    )
      .from("construction_scope_sections")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error("construction_scope_list_failed");
    return data ?? [];
  }

  static async replaceScope(
    userId: string,
    projectId: string,
    sections: ConstructionScopeInput[],
  ) {
    await this.assertProject(userId, projectId);
    const rows = sections
      .filter((section) => isAllowed(section.sectionKey, constructionScopeKeys))
      .map((section, index) => ({
        user_id: userId,
        project_id: projectId,
        section_key: section.sectionKey,
        title: section.title || section.sectionKey,
        content: section.content ?? "",
        sort_order: Number.isFinite(Number(section.sortOrder))
          ? Number(section.sortOrder)
          : index,
      }));
    const { data, error } = await (
      await createClient()
    )
      .from("construction_scope_sections")
      .upsert(rows, { onConflict: "project_id,section_key" })
      .select();
    if (error) throw new Error("construction_scope_save_failed");
    return data ?? [];
  }

  static async getCrewInstructions(userId: string, projectId: string) {
    await this.assertProject(userId, projectId);
    const { data, error } = await (
      await createClient()
    )
      .from("construction_crew_instructions")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error("construction_crew_get_failed");
    return data;
  }

  static async saveCrewInstructions(
    userId: string,
    projectId: string,
    input: ConstructionCrewInput,
  ) {
    await this.assertProject(userId, projectId);
    const checklist = normalizeCrewChecklist(input.checklist);
    const measurementReferences = normalizeReferenceArray(
      input.measurementReferences,
    );
    const planFileReferences = normalizeReferenceArray(
      input.planFileReferences,
    );
    for (const item of checklist) {
      if (item.measurementId) {
        await this.assertMeasurement(userId, projectId, item.measurementId);
      }
      if (item.materialId) {
        await this.assertMaterial(userId, projectId, item.materialId);
      }
      if (item.planFileId) {
        await this.assertPlanFile(userId, projectId, item.planFileId);
      }
    }
    for (const measurementId of measurementReferences) {
      await this.assertMeasurement(userId, projectId, measurementId);
    }
    for (const planFileId of planFileReferences) {
      await this.assertPlanFile(userId, projectId, planFileId);
    }
    const { data, error } = await (
      await createClient()
    )
      .from("construction_crew_instructions")
      .upsert(
        {
          user_id: userId,
          project_id: projectId,
          checklist,
          work_sequence: input.workSequence ?? input.work_sequence ?? null,
          measurement_references: measurementReferences,
          material_summary_notes:
            input.materialSummaryNotes ?? input.material_summary_notes ?? null,
          plan_file_references: planFileReferences,
          user_safety_notes:
            input.userSafetyNotes ?? input.user_safety_notes ?? null,
          assigned_crew_text:
            input.assignedCrewText ?? input.assigned_crew_text ?? null,
        },
        { onConflict: "project_id" },
      )
      .select()
      .single();
    if (error) throw new Error("construction_crew_save_failed");
    return data;
  }

  static async getSummary(userId: string, projectId: string) {
    const project = await this.assertProject(userId, projectId);
    const [
      files,
      measurements,
      materials,
      scope,
      crew,
      annotations,
      contact,
      company,
    ] = await Promise.all([
      this.listFiles(userId, projectId),
      this.listMeasurements(userId, projectId),
      this.listMaterials(userId, projectId),
      this.listScope(userId, projectId),
      this.getCrewInstructions(userId, projectId),
      this.listAnnotations(userId, projectId),
      project.contact_id
        ? this.getContact(userId, project.contact_id)
        : Promise.resolve(null),
      project.company_id
        ? this.getCompany(userId, project.company_id)
        : Promise.resolve(null),
    ]);
    const measurementTotals = measurements.reduce<Record<string, number>>(
      (totals, measurement: MeasurementSummaryRow) => ({
        ...totals,
        [measurement.measurement_type]:
          (totals[measurement.measurement_type] ?? 0) +
          Number(measurement.adjusted_total ?? 0),
      }),
      {},
    );
    const materialTotals = (materials as ConstructionMaterialRow[]).reduce<
      Record<string, number>
    >((totals, material) => {
      const unit = material.unit || "each";
      const quantity = Number(
        material.manual_quantity_override ?? material.calculated_quantity ?? 0,
      );
      if (!Number.isFinite(quantity)) return totals;
      return {
        ...totals,
        [unit]: (totals[unit] ?? 0) + quantity,
      };
    }, {});
    const crewChecklist = Array.isArray(crew?.checklist) ? crew.checklist : [];
    return {
      project,
      contact,
      company,
      files,
      measurements,
      materials,
      scope,
      crew,
      annotations,
      counts: {
        files: files.length,
        measurements: measurements.length,
        materials: materials.length,
        scopeSections: scope.filter((section) =>
          String(section.content ?? "").trim(),
        ).length,
        crewInstructions: crewChecklist.length,
        annotations: annotations.length,
      },
      measurementTotals,
      materialTotals,
    };
  }

  static async listExports(userId: string, projectId: string) {
    await this.assertProject(userId, projectId);
    const { data, error } = await (
      await createClient()
    )
      .from("construction_export_records")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("construction_exports_list_failed");
    return data ?? [];
  }

  static async getCompletedExportByIdempotencyKey(
    userId: string,
    projectId: string,
    idempotencyKey: string,
  ) {
    const { data, error } = await (
      await createClient()
    )
      .from("construction_export_records")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .eq("idempotency_key", idempotencyKey)
      .eq("status", "completed")
      .maybeSingle();
    if (error) throw new Error("construction_export_get_failed");
    return data;
  }

  static async createExportRecord(
    userId: string,
    projectId: string,
    input: ConstructionExportInput,
  ) {
    await this.assertProject(userId, projectId);
    const { data, error } = await (
      await createClient()
    )
      .from("construction_export_records")
      .insert({
        user_id: userId,
        project_id: projectId,
        idempotency_key: input.idempotencyKey ?? null,
        filename: input.filename,
        status: "generating" satisfies ConstructionExportStatus,
        source_snapshot: input.sourceSnapshot ?? {},
      })
      .select()
      .single();
    if (error) throw new Error("construction_export_create_failed");
    return data;
  }

  static async completeExportRecord(
    userId: string,
    exportId: string,
    input: ConstructionExportCompleteInput,
  ) {
    const { data, error } = await (
      await createClient()
    )
      .from("construction_export_records")
      .update({
        status: "completed" satisfies ConstructionExportStatus,
        storage_path: input.storagePath,
        filename: input.filename,
        source_snapshot: input.sourceSnapshot ?? {},
        error_code: null,
        error_message: null,
        generated_at: new Date().toISOString(),
      })
      .eq("id", exportId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw new Error("construction_export_complete_failed");
    return data;
  }

  static async failExportRecord(
    userId: string,
    exportId: string,
    errorCode: string,
    errorMessage: string,
  ) {
    await (
      await createClient()
    )
      .from("construction_export_records")
      .update({
        status: "failed" satisfies ConstructionExportStatus,
        error_code: errorCode.slice(0, 80),
        error_message: errorMessage.slice(0, 500),
      })
      .eq("id", exportId)
      .eq("user_id", userId);
  }

  static async uploadExportPdf(
    userId: string,
    projectId: string,
    filename: string,
    pdf: ArrayBuffer,
  ) {
    await this.assertProject(userId, projectId);
    const storagePath = `${userId}/${projectId}/exports/${crypto.randomUUID()}-${safeFilename(filename)}`;
    const { error } = await (
      await createClient()
    ).storage
      .from(constructionBucket)
      .upload(storagePath, pdf, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (error) throw new Error("construction_export_storage_failed");
    return storagePath;
  }

  static async createExportSignedUrl(userId: string, exportId: string) {
    const supabase = await createClient();
    const { data: record, error: getError } = await supabase
      .from("construction_export_records")
      .select("*")
      .eq("id", exportId)
      .eq("user_id", userId)
      .maybeSingle();
    if (getError) throw new Error("construction_export_get_failed");
    if (!record) return null;
    if (record.status !== "completed" || !record.storage_path) {
      throw new Error("construction_export_not_ready");
    }
    const { data, error } = await supabase.storage
      .from(constructionBucket)
      .createSignedUrl(record.storage_path, 300, {
        download: record.filename || "construction-summary.pdf",
      });
    if (error || !data?.signedUrl) {
      throw new Error("construction_export_signed_url_failed");
    }
    return {
      url: data.signedUrl,
      expiresIn: 300,
      export: record,
    };
  }

  static async downloadPlanFileBlob(userId: string, fileId: string) {
    const supabase = await createClient();
    const { data: file, error: getError } = await supabase
      .from("construction_plan_files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", userId)
      .maybeSingle();
    if (getError) throw new Error("construction_file_get_failed");
    if (!file) return null;
    const { data, error } = await supabase.storage
      .from(constructionBucket)
      .download(file.storage_path);
    if (error || !data) throw new Error("construction_file_download_failed");
    return { file, blob: data };
  }

  private static async assertProject(userId: string, projectId: string) {
    const project = await this.getProject(userId, projectId);
    if (!project) throw new Error("construction_project_not_found");
    return project;
  }

  private static async assertCanonicalReferences(
    userId: string,
    refs: { contactId?: string | null; companyId?: string | null },
  ) {
    const supabase = await createClient();
    if (refs.contactId) {
      const { data } = await supabase
        .from("contacts")
        .select("id")
        .eq("id", refs.contactId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!data) throw new Error("invalid_contact_reference");
    }
    if (refs.companyId) {
      const { data } = await supabase
        .from("companies")
        .select("id")
        .eq("id", refs.companyId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!data) throw new Error("invalid_company_reference");
    }
  }

  private static async assertDocument(userId: string, documentId: string) {
    const { data } = await (
      await createClient()
    )
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) throw new Error("invalid_document_reference");
  }

  private static async getContact(userId: string, contactId: string) {
    const { data } = await (
      await createClient()
    )
      .from("contacts")
      .select("id,name,first_name,last_name,email,phone,company")
      .eq("id", contactId)
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  }

  private static async getCompany(userId: string, companyId: string) {
    const { data } = await (
      await createClient()
    )
      .from("companies")
      .select("id,name,website,industry,phone,address")
      .eq("id", companyId)
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  }

  private static async assertPlanFile(
    userId: string,
    projectId: string,
    fileId: string,
  ) {
    const { data } = await (
      await createClient()
    )
      .from("construction_plan_files")
      .select("id")
      .eq("id", fileId)
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) throw new Error("invalid_plan_file_reference");
  }

  private static async assertMeasurement(
    userId: string,
    projectId: string,
    measurementId: string,
  ) {
    const { data } = await (
      await createClient()
    )
      .from("construction_measurements")
      .select("*")
      .eq("id", measurementId)
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) throw new Error("invalid_measurement_reference");
    return data as ConstructionMeasurementRow;
  }

  private static async assertMaterial(
    userId: string,
    projectId: string,
    materialId: string,
  ) {
    const { data } = await (
      await createClient()
    )
      .from("construction_material_items")
      .select("id")
      .eq("id", materialId)
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) throw new Error("invalid_material_reference");
    return data as ConstructionMaterialRow;
  }
}
