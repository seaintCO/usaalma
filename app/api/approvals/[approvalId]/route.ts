import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { executeApprovedAction } from "@/lib/platform/actions/executionBoundary";
import { transitionActionApproval } from "@/lib/platform/approvals/service";
import { ActionApprovalRepository } from "@/lib/platform/approvals/repository";

type ApprovalAction = "approve" | "reject";

async function updateLegacyApproval(input: {
  userId: string;
  approvalId: string;
  action: ApprovalAction;
}) {
  const supabase = await createClient();
  const nextStatus = input.action === "approve" ? "approved" : "rejected";
  const { data, error } = await supabase
    .from("agent_approvals")
    .update({
      status: nextStatus,
      resolved_at: new Date().toISOString(),
      resolved_by: input.userId,
    })
    .eq("id", input.approvalId)
    .eq("user_id", input.userId)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ approvalId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { approvalId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const action = body.action === "reject" ? "reject" : "approve";
  const kind = body.kind === "agent" ? "agent" : "action";
  const editedPayload =
    body.editedPayload && typeof body.editedPayload === "object"
      ? (body.editedPayload as Record<string, unknown>)
      : null;

  try {
    if (kind === "agent") {
      const legacy = await updateLegacyApproval({
        userId: user.id,
        approvalId,
        action,
      });
      if (!legacy) {
        return NextResponse.json(
          { ok: false, error: "Approval is not pending or does not exist." },
          { status: 409 },
        );
      }
      return NextResponse.json({ ok: true, approval: legacy });
    }

    const current = await ActionApprovalRepository.getForUser(
      user.id,
      approvalId,
    );
    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Approval not found." },
        { status: 404 },
      );
    }

    if (action === "reject") {
      const rejected = await transitionActionApproval({
        userId: user.id,
        approvalId,
        nextStatus: "rejected",
      });
      return NextResponse.json({ ok: true, approval: rejected });
    }

    const result = await executeApprovedAction({
      userId: user.id,
      approvalId,
      editedPayload,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Approval could not be updated. The request may be invalid or already resolved.",
      },
      { status: 400 },
    );
  }
}

