import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { searchGmail } from "@/lib/google/gmail";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();
  if (error) return error;

  const body = await req.json();

  try {
    const results = await searchGmail(
      user.id,
      body.query ?? "in:inbox",
      body.maxResults ?? 10
    );

    return NextResponse.json({ success:true, results });
  } catch {
    return NextResponse.json({
      success:false,
      error:"Connect Gmail first or try again.",
    }, { status:400 });
  }
}
