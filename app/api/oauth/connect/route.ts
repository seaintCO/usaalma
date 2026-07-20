import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.provider)
    return NextResponse.json({ error: "Missing provider" }, { status: 400 });

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "legacy_mock_connection_disabled",
        message:
          "This legacy connection route cannot create real provider access. Use the provider-specific connection flow.",
        provider: String(body.provider),
        retryable: false,
      },
    },
    { status: 410 },
  );
}
