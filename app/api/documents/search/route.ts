import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { searchDocuments } from "@/lib/ai/documents/search";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.query) return NextResponse.json({ error:"Missing query" }, { status:400 });

  const results = await searchDocuments(user.id, body.query);

  return NextResponse.json(results);
}
