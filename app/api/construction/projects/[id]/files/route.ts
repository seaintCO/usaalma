import { fail, ok, optionalString } from "@/lib/construction/api";
import { requireConstructionUser, routeError } from "@/lib/construction/routes";
import { ConstructionRepository } from "@/lib/db/repositories/construction/construction.repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { id } = await context.params;
  try {
    const files = await ConstructionRepository.listFiles(user.id, id);
    return ok({ files });
  } catch (cause) {
    return routeError(cause, "Construction files could not be loaded.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireConstructionUser();
  if (error) return error;
  const { id } = await context.params;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return fail(
        400,
        "validation_error",
        "A plan, PDF, or image file is required.",
      );
    }
    const uploaded = await ConstructionRepository.uploadFile(
      user.id,
      id,
      file,
      {
        title: optionalString(form.get("title"), 160),
        notes: optionalString(form.get("notes"), 2000),
        documentId: optionalString(form.get("documentId"), 80),
      },
    );
    return ok({ file: uploaded }, { status: 201 });
  } catch (cause) {
    return routeError(cause, "Construction file could not be uploaded.");
  }
}
