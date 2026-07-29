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
  const updates: Record<string, unknown> = {};
  if (body?.reviewStatus === "reviewed" || body?.reviewStatus === "excluded") {
    updates.review_status = body.reviewStatus;
  }
  if (typeof body?.category === "string") {
    updates.category = body.category.trim() || null;
    updates.category_status = body.category.trim() ? "confirmed" : "unreviewed";
  }
  if (!Object.keys(updates).length) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_update" } },
      { status: 400 },
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_transactions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(
      "id,transaction_date,description,merchant,amount,direction,transaction_type,category,review_status,notes",
    )
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: { code: "transaction_update_failed" } },
      { status: error ? 503 : 404 },
    );
  }
  return NextResponse.json({ ok: true, transaction: data });
}

export async function DELETE(_: Request, context: Context) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const { id } = await context.params;
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("business_transactions")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error || count !== 1) {
    return NextResponse.json(
      { ok: false, error: { code: "transaction_delete_failed" } },
      { status: error ? 503 : 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
