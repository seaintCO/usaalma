import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED" } },
      { status: 401 },
    );

  const { documentId } = await context.params;
  const supabase = await createClient();
  const { data: document, error: readError } = await supabase
    .from("documents")
    .select("id,file_path")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError)
    return NextResponse.json(
      { error: { code: "DOCUMENT_READ_FAILED" } },
      { status: 500 },
    );
  if (!document)
    return NextResponse.json(
      { error: { code: "DOCUMENT_NOT_FOUND" } },
      { status: 404 },
    );

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", document.id)
    .eq("user_id", user.id);
  if (deleteError)
    return NextResponse.json(
      { error: { code: "DOCUMENT_DELETE_FAILED" } },
      { status: 500 },
    );

  let storageCleanup = "not_required";
  if (document.file_path) {
    const { error } = await supabase.storage
      .from("alma-documents")
      .remove([document.file_path]);
    storageCleanup = error ? "deferred" : "completed";
  }

  return NextResponse.json({ ok: true, storageCleanup });
}
