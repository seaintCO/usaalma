import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { DocumentRepository } from "@/lib/db/repositories/documents/document.repository";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: { code: "unauthorized" } },
      { status: 401 },
    );
  }

  try {
    const documents = await DocumentRepository.list(user.id);

    return NextResponse.json({ ok: true, documents });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "storage_unavailable" } },
      { status: 503 },
    );
  }
}
