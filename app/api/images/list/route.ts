import { NextResponse } from "next/server";
import { requirePaidUser } from "@/lib/api/requirePaidUser";
import { ImageRepository } from "@/lib/db/repositories/images/image.repository";

export async function GET() {
  const { user, error } = await requirePaidUser();

  if (error) return error;

  const images = await ImageRepository.list(user.id);

  return NextResponse.json(images);
}
