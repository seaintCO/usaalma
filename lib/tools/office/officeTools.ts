import { prepareAuditedAction } from "@/lib/platform/actions/executionBoundary";
import { createTaskTool } from "@/lib/tools/tasks/createTaskTool";
import { cleanString } from "@/lib/ai/tools/utils";
import { OfficeRepository } from "@/lib/office/repository";
import { officeNumber } from "@/lib/office/calculations";
import type { OfficeEstimateLineInput } from "@/lib/office/types";
import { ConnectorRepository } from "@/lib/connectors/repository";

function officeClean(value: unknown, fallback = "") {
  const cleaned = cleanString(value);
  return cleaned || fallback;
}

function lineInput(value: unknown): OfficeEstimateLineInput[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<OfficeEstimateLineInput[]>((lines, item) => {
    if (!item || typeof item !== "object") return lines;
    const record = item as Record<string, unknown>;
    const description = cleanString(record.description);
    if (!description) return lines;
    lines.push({
      serviceId: cleanString(record.serviceId) || null,
      description,
      quantity: Math.max(0.01, officeNumber(record.quantity, 1)),
      unitType: officeClean(record.unitType, "each"),
      unitRate: Math.max(0, officeNumber(record.unitRate)),
      discountAmount: Math.max(0, officeNumber(record.discountAmount)),
      taxable: record.taxable !== false,
    });
    return lines;
  }, []);
}

export async function officeTool(
  userId: string,
  action: string,
  input: Record<string, unknown>,
  executionId?: string,
) {
  if (action === "find_customer") {
    return {
      success: true,
      customers: await OfficeRepository.findCustomers(
        userId,
        cleanString(input.query),
      ),
    };
  }

  if (action === "create_customer_draft") {
    const customer = await OfficeRepository.createCustomerDraft(userId, {
      name: cleanString(input.name),
      email: cleanString(input.email),
      phone: cleanString(input.phone),
      companyId: cleanString(input.companyId) || null,
    });
    return { success: true, customer };
  }

  if (action === "find_services") {
    const services = await OfficeRepository.listServices(userId);
    const query = cleanString(input.query).toLowerCase();
    return {
      success: true,
      services: query
        ? services.filter((service: Record<string, unknown>) =>
            String(service.name ?? "")
              .toLowerCase()
              .includes(query),
          )
        : services,
      message: services.length
        ? "Use only saved service rates. Ask the owner before pricing missing work."
        : "No saved services are available. Ask the owner to add prices before estimating.",
    };
  }

  if (action === "draft_estimate" || action === "revise_estimate") {
    const lines = lineInput(input.lines);
    if (!lines.length) {
      return {
        success: false,
        message:
          "No estimate lines were provided. Use saved price book services or ask for pricing.",
      };
    }
    const estimateInput = {
      contactId: cleanString(input.contactId) || null,
      companyId: cleanString(input.companyId) || null,
      projectId: cleanString(input.projectId) || null,
      currency: officeClean(input.currency, "USD"),
      scope: cleanString(input.scope),
      message: cleanString(input.message),
      taxRate: officeNumber(input.taxRate),
      depositPercentage: officeNumber(input.depositPercentage),
      lines,
      idempotencyKey:
        cleanString(input.idempotencyKey) ||
        (executionId ? `${action}:${executionId}` : null),
      sourceExecutionId: executionId,
    };
    const estimate =
      action === "revise_estimate"
        ? await OfficeRepository.reviseEstimate(
            userId,
            cleanString(input.estimateId),
            estimateInput,
          )
        : await OfficeRepository.draftEstimate(userId, estimateInput);
    return {
      success: true,
      estimate,
      message:
        action === "revise_estimate"
          ? "Estimate revised for owner review. Totals were recalculated deterministically."
          : "Estimate drafted for owner review. Totals were calculated deterministically.",
    };
  }

  if (action === "attach_project_photos") {
    const estimateId = cleanString(input.estimateId);
    if (!estimateId) return { success: false, message: "Missing estimate." };
    const attachment = await OfficeRepository.attachEstimateFile(
      userId,
      estimateId,
      {
        documentId: cleanString(input.documentId) || null,
        fileName: cleanString(input.fileName),
        filePath: cleanString(input.filePath),
        mimeType: cleanString(input.mimeType),
        notes: cleanString(input.notes),
        analysis: {},
      },
    );
    return { success: true, attachment };
  }

  if (action === "analyze_project_photos") {
    return {
      success: true,
      analysis: {
        visibleElements: cleanString(input.visibleElements),
        preliminaryScope: cleanString(input.preliminaryScope),
        missingMeasurements: cleanString(input.missingMeasurements),
        customerQuestions: cleanString(input.customerQuestions),
        matchedServiceIds: Array.isArray(input.matchedServiceIds)
          ? input.matchedServiceIds
          : [],
        limitation:
          "Image analysis is preliminary. ALMA cannot claim exact measurements without known scale or confirmed dimensions.",
      },
    };
  }

  if (action === "prepare_estimate_delivery") {
    const estimateId = cleanString(input.estimateId);
    const estimate = estimateId
      ? await OfficeRepository.getEstimate(userId, estimateId)
      : null;
    if (!estimate) return { success: false, message: "Estimate not found." };
    const workspaceId =
      cleanString(estimate.workspace_id) ||
      (await ConnectorRepository.resolveDefaultWorkspaceId(userId));
    if (!workspaceId) {
      return {
        success: false,
        blocked: true,
        message: "Create or select a workspace before sending estimates.",
      };
    }
    const connection = await ConnectorRepository.getConnectedEmailConnection({
      userId,
      workspaceId,
      provider:
        cleanString(input.deliveryProvider) === "outlook" ? "outlook" : null,
    }).catch(() => null);
    if (!connection) {
      return {
        success: false,
        blocked: true,
        message: "Connect Gmail or Outlook before sending estimates.",
      };
    }
    const subject =
      cleanString(input.subject) || `Estimate ${estimate.estimate_number}`;
    const approval = await prepareAuditedAction({
      userId,
      workspaceId,
      executionId,
      domain: "office",
      actionKey: "office.estimate.deliver",
      actionSummary: `Deliver estimate ${estimate.estimate_number}`,
      riskLevel: "external",
      approvalPolicy: "approval_required",
      requestedPayload: {
        estimateId,
        customer: cleanString(input.customer),
        recipient: cleanString(input.recipient),
        subject,
        estimateNumber: estimate.estimate_number,
        scope: estimate.scope,
        lineItems: estimate.office_estimate_line_items ?? [],
        total: estimate.total,
        deposit: estimate.deposit_amount,
        currency: estimate.currency,
        message: cleanString(input.message) || estimate.message,
        deliveryProvider: connection.provider,
        sendingAccount: connection.provider_account_email,
        connectionId: connection.id,
        attachments: estimate.office_estimate_attachments ?? [],
        followUpDueAt: cleanString(input.followUpDueAt),
        followUpMessage: cleanString(input.followUpMessage),
      },
    });
    return {
      success: false,
      requiresApproval: true,
      approvalId: approval.canExecute ? null : approval.approval.id,
      message:
        "Estimate delivery is ready for owner approval. It will not be marked sent until the delivery executor succeeds.",
    };
  }

  if (action === "convert_accepted_estimate_to_invoice") {
    const invoiceId = await OfficeRepository.convertEstimateToInvoice(
      userId,
      cleanString(input.estimateId),
    );
    return { success: true, invoiceId };
  }

  if (action === "prepare_deposit_request") {
    const estimate = await OfficeRepository.getEstimate(
      userId,
      cleanString(input.estimateId),
    );
    if (!estimate) return { success: false, message: "Estimate not found." };
    if (!estimate.deposit_amount) {
      return { success: false, message: "This estimate has no deposit due." };
    }
    return {
      success: false,
      blocked: true,
      message:
        "Deposit request prepared, but no real payment-link provider is connected in this milestone.",
      depositAmount: estimate.deposit_amount,
      currency: estimate.currency,
    };
  }

  if (action === "schedule_estimate_follow_up") {
    const title =
      cleanString(input.title) ||
      `Follow up on estimate ${cleanString(input.estimateNumber)}`;
    const task = await createTaskTool(userId, {
      title,
      description: cleanString(input.description),
      dueAt: cleanString(input.dueAt),
      sourceExecutionId: executionId,
    });
    return { success: true, task };
  }

  return { success: false, message: "Office tool action not found." };
}
