import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { generateCreativeAsset } from "@/lib/creative/generateCreativeAsset";

export async function POST(req:Request) {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const body = await req.json();

  const result = await generateCreativeAsset(user.id, body);

  return NextResponse.json(result);
}
