import { NextResponse } from "next/server";
import { createEmbedding } from "@/lib/ai/embeddings/createEmbedding";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

const allowed = new Set(["text/plain", "text/markdown"]);

async function post(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const file = (await request.formData()).get("file");
  if (
    !(file instanceof File) ||
    !allowed.has(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    return NextResponse.json(
      { error: "Only TXT/Markdown files up to 5MB are supported" },
      { status: 400 },
    );
  const content = await file.text();
  const embedding = await createEmbedding(
    user.id,
    content,
    `document-upload:${file.name}:${file.size}`,
  );
  const supabase = await createClient();
  const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("alma-documents")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title: file.name.replace(/\.[^.]+$/, "") || file.name,
      document_type: "uploaded_file",
      file_name: file.name,
      file_path: path,
      mime_type: file.type,
      file_size: file.size,
      status: "ready",
      extracted_text: content,
      content,
      source: "upload",
      embedding,
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from("alma-documents").remove([path]);
    return NextResponse.json(
      { error: "Metadata persistence failed" },
      { status: 500 },
    );
  }
  return NextResponse.json(data);
}
export const POST = withUsageRoute(post);
