import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { sendGmail } from "@/lib/google/gmail";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();

  if (!body.to || !body.subject || !body.body) {
    return NextResponse.json({ error:"Missing fields" }, { status:400 });
  }

  try {
    const sent = await sendGmail(user.id, {
      to:body.to,
      subject:body.subject,
      body:body.body,
    });

    return NextResponse.json({ success:true, sent });
  } catch {
    return NextResponse.json({
      success:false,
      error:"Could not send Gmail. Reconnect Gmail and try again.",
    }, { status:400 });
  }
}
