import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { DocumentRepository } from "@/lib/db/repositories/documents/document.repository";
import { withUsageRoute } from "@/lib/usage/routeBoundary";

async function post(req: Request) {
  const { user, error } = await requirePaidUser("documents");

  if (error) return error;

  const body = await req.json();

  if (!body.title)
    return NextResponse.json({ error: "Missing title" }, { status: 400 });

  const document = await DocumentRepository.create(
    user.id,
    body.title,
    body.content ?? "",
  );

  return NextResponse.json(document);
}
export const POST = withUsageRoute(post);
