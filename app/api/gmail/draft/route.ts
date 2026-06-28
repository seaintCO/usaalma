import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { createGmailDraft } from "@/lib/google/gmail";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();

  if (!body.to || !body.subject || !body.body) {
    return NextResponse.json({ error:"Missing fields" }, { status:400 });
  }

  try {
    const draft = await createGmailDraft(user.id, {
      to:body.to,
      subject:body.subject,
      body:body.body,
    });

    return NextResponse.json({ success:true, draft });
  } catch {
    return NextResponse.json({
      success:false,
      error:"Could not create Gmail draft. Reconnect Gmail and try again.",
    }, { status:400 });
  }
}
