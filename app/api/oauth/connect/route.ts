import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { OAuthRepository } from "@/lib/db/repositories/oauth/oauth.repository";

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.provider)
    return NextResponse.json({ error: "Missing provider" }, { status: 400 });

  const connection = await OAuthRepository.mockConnect(user.id, body.provider);

  return NextResponse.json(connection);
}
