import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";

export async function POST(req:Request) {
  const user = await getCurrentUser();

  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 });

  const body = await req.json();

  if (!body.accountSid || !body.authToken) {
    return NextResponse.json({ error:"Missing Twilio credentials" }, { status:400 });
  }

  const supabase = await createClient();

  await supabase.from("oauth_connections").upsert({
    user_id:user.id,
    provider:"twilio",
    account_sid:body.accountSid,
    encrypted_secret:body.authToken,
    connected:true,
    metadata:{ status:"credentials_saved" },
  });

  return NextResponse.json({ success:true });
}
