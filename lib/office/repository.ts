import { createClient } from "@/lib/supabase/server";
import {
  calculateOfficeEstimate,
  createEstimateNumber,
  officeNumber,
} from "./calculations";
import type {
  OfficeEstimateDraftInput,
  OfficeEstimateLineInput,
  OfficeEstimateStatus,
  OfficeServiceInput,
} from "./types";

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function assertEstimateStatus(value: string): OfficeEstimateStatus {
  const allowed: OfficeEstimateStatus[] = [
    "draft",
    "awaiting_review",
    "approved",
    "sent",
    "viewed",
    "accepted",
    "rejected",
    "expired",
    "converted_to_invoice",
    "cancelled",
  ];
  if (!allowed.includes(value as OfficeEstimateStatus)) {
    throw new Error("invalid_estimate_status");
  }
  return value as OfficeEstimateStatus;
}

export class OfficeRepository {
  static async overview(userId: string) {
    const supabase = await createClient();
    const [services, estimates, invoices, customers] = await Promise.all([
      supabase
        .from("office_services")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("active", true),
      supabase
        .from("office_estimates")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("status", ["draft", "sent", "viewed", "overdue"]),
      supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);
    return {
      services: services.count ?? 0,
      estimates: estimates.count ?? 0,
      unpaidInvoices: invoices.count ?? 0,
      customers: customers.count ?? 0,
    };
  }

  static async listServices(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("office_services")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    if (error) throw error;
    return data ?? [];
  }

  static async createService(userId: string, input: OfficeServiceInput) {
    const name = cleanString(input.name);
    if (!name) throw new Error("missing_service_name");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("office_services")
      .insert({
        user_id: userId,
        name,
        description_en: cleanString(input.descriptionEn),
        description_es: cleanString(input.descriptionEs),
        unit_type: cleanString(input.unitType, "each"),
        standard_rate: Math.max(0, officeNumber(input.standardRate)),
        minimum_charge: Math.max(0, officeNumber(input.minimumCharge)),
        taxable: input.taxable !== false,
        default_deposit_percentage: Math.min(
          100,
          Math.max(0, officeNumber(input.defaultDepositPercentage)),
        ),
        active: input.active !== false,
        internal_notes: cleanString(input.internalNotes),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async updateService(
    userId: string,
    serviceId: string,
    input: Partial<OfficeServiceInput>,
  ) {
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = cleanString(input.name);
    if (input.descriptionEn !== undefined)
      patch.description_en = cleanString(input.descriptionEn);
    if (input.descriptionEs !== undefined)
      patch.description_es = cleanString(input.descriptionEs);
    if (input.unitType !== undefined)
      patch.unit_type = cleanString(input.unitType, "each");
    if (input.standardRate !== undefined)
      patch.standard_rate = Math.max(0, officeNumber(input.standardRate));
    if (input.minimumCharge !== undefined)
      patch.minimum_charge = Math.max(0, officeNumber(input.minimumCharge));
    if (input.taxable !== undefined) patch.taxable = input.taxable !== false;
    if (input.defaultDepositPercentage !== undefined)
      patch.default_deposit_percentage = Math.min(
        100,
        Math.max(0, officeNumber(input.defaultDepositPercentage)),
      );
    if (input.active !== undefined) patch.active = input.active !== false;
    if (input.internalNotes !== undefined)
      patch.internal_notes = cleanString(input.internalNotes);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("office_services")
      .update(patch)
      .eq("id", serviceId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async findCustomers(userId: string, query = "") {
    const supabase = await createClient();
    const normalized = query.trim();
    const contacts = supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId);
    const companies = supabase
      .from("companies")
      .select("*")
      .eq("user_id", userId);
    if (normalized) {
      contacts.ilike("name", `%${normalized}%`);
      companies.ilike("name", `%${normalized}%`);
    }
    const [contactResult, companyResult] = await Promise.all([
      contacts.limit(20),
      companies.limit(20),
    ]);
    if (contactResult.error) throw contactResult.error;
    if (companyResult.error) throw companyResult.error;
    return {
      contacts: contactResult.data ?? [],
      companies: companyResult.data ?? [],
    };
  }

  static async createCustomerDraft(
    userId: string,
    input: {
      name: string;
      email?: string;
      phone?: string;
      companyId?: string | null;
    },
  ) {
    const name = cleanString(input.name);
    if (!name) throw new Error("missing_customer_name");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        user_id: userId,
        name,
        email: cleanString(input.email),
        phone: cleanString(input.phone),
        company_id: cleanString(input.companyId) || null,
        source: "office",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async listEstimates(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("office_estimates")
      .select("*,office_estimate_line_items(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  static async getEstimate(userId: string, estimateId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("office_estimates")
      .select(
        "*,office_estimate_line_items(*),office_estimate_attachments(*),office_estimate_status_history(*)",
      )
      .eq("id", estimateId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  static async draftEstimate(userId: string, input: OfficeEstimateDraftInput) {
    if (!input.lines.length) throw new Error("missing_estimate_lines");
    const supabase = await createClient();
    if (input.idempotencyKey) {
      const { data: existing } = await supabase
        .from("office_estimates")
        .select("*,office_estimate_line_items(*)")
        .eq("user_id", userId)
        .eq("idempotency_key", input.idempotencyKey)
        .maybeSingle();
      if (existing) return existing;
    }
    const calculations = calculateOfficeEstimate({
      taxRate: input.taxRate,
      depositPercentage: input.depositPercentage,
      lines: input.lines.map((line) => ({
        quantity: line.quantity,
        unitRate: line.unitRate,
        discountAmount: line.discountAmount,
        taxable: line.taxable,
      })),
    });
    const { data: estimate, error } = await supabase
      .from("office_estimates")
      .insert({
        user_id: userId,
        contact_id: cleanString(input.contactId) || null,
        company_id: cleanString(input.companyId) || null,
        project_id: cleanString(input.projectId) || null,
        estimate_number: createEstimateNumber(),
        status: "awaiting_review",
        currency: cleanString(input.currency, "USD").toUpperCase(),
        scope: cleanString(input.scope),
        message: cleanString(input.message),
        ...{
          subtotal: calculations.subtotal,
          discount_amount: calculations.discountAmount,
          tax_rate: calculations.taxRate,
          tax_amount: calculations.taxAmount,
          total: calculations.total,
          deposit_percentage: calculations.depositPercentage,
          deposit_amount: calculations.depositAmount,
          remaining_balance: calculations.remainingBalance,
        },
        source: input.sourceExecutionId ? "alma_chat" : "manual",
        source_execution_id: cleanString(input.sourceExecutionId) || null,
        idempotency_key: cleanString(input.idempotencyKey) || null,
      })
      .select()
      .single();
    if (error) throw error;
    await this.replaceEstimateLines(userId, estimate.id, input.lines);
    await this.recordStatus(
      userId,
      estimate.id,
      null,
      "awaiting_review",
      "Estimate drafted.",
      "system",
    );
    const full = await this.getEstimate(userId, estimate.id);
    return full ?? estimate;
  }

  static async replaceEstimateLines(
    userId: string,
    estimateId: string,
    lines: OfficeEstimateLineInput[],
  ) {
    const supabase = await createClient();
    const estimate = await this.getEstimate(userId, estimateId);
    if (!estimate || !["draft", "awaiting_review"].includes(estimate.status)) {
      throw new Error("estimate_not_editable");
    }
    await supabase
      .from("office_estimate_line_items")
      .delete()
      .eq("estimate_id", estimateId)
      .eq("user_id", userId);
    const taxRate = officeNumber(estimate.tax_rate);
    const rows = lines.map((line, index) => {
      const calc = calculateOfficeEstimate({
        taxRate,
        depositPercentage: 0,
        lines: [
          {
            quantity: line.quantity,
            unitRate: line.unitRate,
            discountAmount: line.discountAmount,
            taxable: line.taxable,
          },
        ],
      });
      return {
        estimate_id: estimateId,
        user_id: userId,
        service_id: cleanString(line.serviceId) || null,
        description: cleanString(line.description),
        quantity: Math.max(0.01, officeNumber(line.quantity, 1)),
        unit_type: cleanString(line.unitType, "each"),
        unit_rate: Math.max(0, officeNumber(line.unitRate)),
        discount_amount: Math.max(0, officeNumber(line.discountAmount)),
        taxable: line.taxable !== false,
        tax_amount: calc.taxAmount,
        line_total: calc.total,
        position: index,
      };
    });
    const { error } = await supabase
      .from("office_estimate_line_items")
      .insert(rows);
    if (error) throw error;
    return rows;
  }

  static async reviseEstimate(
    userId: string,
    estimateId: string,
    input: OfficeEstimateDraftInput,
  ) {
    if (!input.lines.length) throw new Error("missing_estimate_lines");
    const current = await this.getEstimate(userId, estimateId);
    if (!current || !["draft", "awaiting_review"].includes(current.status)) {
      throw new Error("estimate_not_editable");
    }
    const calculations = calculateOfficeEstimate({
      taxRate: input.taxRate ?? current.tax_rate,
      depositPercentage: input.depositPercentage ?? current.deposit_percentage,
      lines: input.lines.map((line) => ({
        quantity: line.quantity,
        unitRate: line.unitRate,
        discountAmount: line.discountAmount,
        taxable: line.taxable,
      })),
    });
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("office_estimates")
      .update({
        contact_id: cleanString(input.contactId) || current.contact_id || null,
        company_id: cleanString(input.companyId) || current.company_id || null,
        project_id: cleanString(input.projectId) || current.project_id || null,
        currency: cleanString(input.currency, current.currency).toUpperCase(),
        scope: cleanString(input.scope, current.scope),
        message: cleanString(input.message, current.message),
        subtotal: calculations.subtotal,
        discount_amount: calculations.discountAmount,
        tax_rate: calculations.taxRate,
        tax_amount: calculations.taxAmount,
        total: calculations.total,
        deposit_percentage: calculations.depositPercentage,
        deposit_amount: calculations.depositAmount,
        remaining_balance: calculations.remainingBalance,
        status: "awaiting_review",
      })
      .eq("id", estimateId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    await this.replaceEstimateLines(userId, estimateId, input.lines);
    await this.recordStatus(
      userId,
      estimateId,
      current.status,
      "awaiting_review",
      "Estimate revised.",
      "system",
    );
    const full = await this.getEstimate(userId, estimateId);
    return full ?? data;
  }

  static async transitionEstimate(
    userId: string,
    estimateId: string,
    nextStatus: OfficeEstimateStatus,
    note?: string,
    approvalId?: string | null,
  ) {
    const current = await this.getEstimate(userId, estimateId);
    if (!current) throw new Error("estimate_not_found");
    const status = assertEstimateStatus(nextStatus);
    const patch: Record<string, unknown> = { status };
    const now = new Date().toISOString();
    if (status === "sent") patch.sent_at = now;
    if (status === "viewed") patch.viewed_at = now;
    if (status === "accepted") patch.accepted_at = now;
    if (status === "rejected") patch.rejected_at = now;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("office_estimates")
      .update(patch)
      .eq("id", estimateId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    await this.recordStatus(
      userId,
      estimateId,
      current.status,
      status,
      note,
      "system",
      approvalId,
    );
    return data;
  }

  static async recordStatus(
    userId: string,
    estimateId: string,
    fromStatus: string | null,
    toStatus: string,
    note?: string | null,
    source = "system",
    approvalId?: string | null,
  ) {
    const supabase = await createClient();
    const { error } = await supabase
      .from("office_estimate_status_history")
      .insert({
        estimate_id: estimateId,
        user_id: userId,
        from_status: fromStatus,
        to_status: toStatus,
        note: cleanString(note),
        source,
        approval_id: cleanString(approvalId) || null,
      });
    if (error) throw error;
  }

  static async attachEstimateFile(
    userId: string,
    estimateId: string,
    input: {
      documentId?: string | null;
      fileName?: string | null;
      filePath?: string | null;
      mimeType?: string | null;
      notes?: string | null;
      analysis?: Record<string, unknown>;
    },
  ) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("office_estimate_attachments")
      .insert({
        estimate_id: estimateId,
        user_id: userId,
        document_id: cleanString(input.documentId) || null,
        file_name: cleanString(input.fileName),
        file_path: cleanString(input.filePath),
        mime_type: cleanString(input.mimeType),
        notes: cleanString(input.notes),
        analysis: input.analysis ?? {},
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async convertEstimateToInvoice(userId: string, estimateId: string) {
    const estimate = await this.getEstimate(userId, estimateId);
    if (!estimate) throw new Error("estimate_not_found");
    if (estimate.converted_invoice_id) return estimate.converted_invoice_id;
    if (!["accepted", "approved", "sent"].includes(estimate.status)) {
      throw new Error("estimate_not_convertible");
    }
    const supabase = await createClient();
    const { data: contact } = estimate.contact_id
      ? await supabase
          .from("contacts")
          .select("*")
          .eq("id", estimate.contact_id)
          .eq("user_id", userId)
          .maybeSingle()
      : { data: null };
    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        invoice_number: `INV-${estimate.estimate_number.replace(/^EST-/, "")}`,
        client_name: contact?.name ?? estimate.estimate_number,
        client_email: contact?.email ?? null,
        client_phone: contact?.phone ?? null,
        currency: estimate.currency,
        subtotal: estimate.subtotal,
        tax_amount: estimate.tax_amount,
        discount_amount: estimate.discount_amount,
        total: estimate.total,
        amount: estimate.total,
        notes: estimate.scope,
        terms: `Deposit required: ${estimate.deposit_amount} ${estimate.currency}`,
        status: "draft",
        source: "office_estimate",
        duplicate_key: `estimate:${estimate.id}`,
      })
      .select()
      .single();
    if (error) throw error;
    const lines = (estimate.office_estimate_line_items ?? []).map(
      (line: Record<string, unknown>, index: number) => ({
        invoice_id: invoice.id,
        user_id: userId,
        description: cleanString(line.description),
        quantity: officeNumber(line.quantity, 1),
        unit_price: officeNumber(line.unit_rate),
        line_total: officeNumber(line.line_total),
        position: index,
      }),
    );
    if (lines.length) {
      const { error: lineError } = await supabase
        .from("invoice_line_items")
        .insert(lines);
      if (lineError) throw lineError;
    }
    await supabase
      .from("office_estimates")
      .update({ converted_invoice_id: invoice.id })
      .eq("id", estimateId)
      .eq("user_id", userId);
    await this.transitionEstimate(
      userId,
      estimateId,
      "converted_to_invoice",
      "Converted to draft invoice.",
    );
    return invoice.id;
  }
}
