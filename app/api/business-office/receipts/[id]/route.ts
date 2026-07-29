import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const reviewStatus = String(body?.reviewStatus ?? "");
  if (!["needs_review", "matched", "reviewed"].includes(reviewStatus)) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_receipt_status" } },
      { status: 400 },
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_receipts")
    .update({
      review_status: reviewStatus,
      transaction_id: String(body?.transactionId ?? "").trim() || null,
      category: String(body?.category ?? "").trim() || null,
      notes: String(body?.notes ?? "").trim() || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,review_status,transaction_id,category,notes")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: { code: "receipt_update_failed" } },
      { status: error ? 503 : 404 },
    );
  }
  return NextResponse.json({ ok: true, receipt: data });
}

export async function DELETE(_request: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const { id } = await context.params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_receipts")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) {
    return NextResponse.json(
      { ok: false, error: { code: "receipt_not_found" } },
      { status: 404 },
    );
  }
  if (data.storage_path) {
    await supabase.storage
      .from("alma-business-receipts")
      .remove([data.storage_path]);
  }
  const { error } = await supabase
    .from("business_receipts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "receipt_delete_failed" } },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true });
}
