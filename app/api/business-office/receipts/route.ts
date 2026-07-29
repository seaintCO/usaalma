import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_BYTES = 15 * 1024 * 1024;

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_receipts")
    .select(
      "id,transaction_id,merchant,receipt_date,amount,tax_amount,category,payment_method,original_filename,content_type,review_status,notes,created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(250);
  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "receipts_unavailable" } },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, receipts: data ?? [] });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_receipt" } },
      { status: 400 },
    );
  }
  const file = form.get("file");
  let storagePath: string | null = null;
  let originalFilename: string | null = null;
  let contentType: string | null = null;
  let fileSize: number | null = null;
  const supabase = await createClient();

  if (file instanceof File && file.size > 0) {
    const extension = ALLOWED_TYPES.get(file.type.toLowerCase());
    if (!extension || file.size > MAX_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "unsupported_receipt_file",
            message: "Use PDF, JPG, PNG, or WebP files up to 15 MB.",
          },
        },
        { status: 415 },
      );
    }
    storagePath = `${user.id}/${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("alma-business-receipts")
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      return NextResponse.json(
        { ok: false, error: { code: "receipt_upload_failed" } },
        { status: 503 },
      );
    }
    originalFilename = file.name.slice(0, 240);
    contentType = file.type;
    fileSize = file.size;
  }

  const parsedAmount = Number(text(form.get("amount")));
  const parsedTax = Number(text(form.get("taxAmount")));
  const { data, error } = await supabase
    .from("business_receipts")
    .insert({
      user_id: user.id,
      transaction_id: text(form.get("transactionId")) || null,
      merchant: text(form.get("merchant")) || null,
      receipt_date: text(form.get("receiptDate")).slice(0, 10) || null,
      amount:
        Number.isFinite(parsedAmount) && parsedAmount >= 0
          ? parsedAmount
          : null,
      tax_amount:
        Number.isFinite(parsedTax) && parsedTax >= 0 ? parsedTax : null,
      category: text(form.get("category")) || null,
      payment_method: text(form.get("paymentMethod")) || null,
      storage_path: storagePath,
      original_filename: originalFilename,
      content_type: contentType,
      file_size: fileSize,
      review_status: "needs_review",
      extraction_status: "manual",
      notes: text(form.get("notes")) || null,
    })
    .select(
      "id,transaction_id,merchant,receipt_date,amount,tax_amount,category,payment_method,original_filename,content_type,review_status,notes,created_at",
    )
    .single();
  if (error) {
    if (storagePath) {
      await supabase.storage
        .from("alma-business-receipts")
        .remove([storagePath]);
    }
    return NextResponse.json(
      { ok: false, error: { code: "receipt_create_failed" } },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, receipt: data }, { status: 201 });
}
