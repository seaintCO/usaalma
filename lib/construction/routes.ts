import { getCurrentUser } from "@/lib/auth/user";
import { fail } from "@/lib/construction/api";

export async function requireConstructionUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      error: fail(401, "unauthorized", "Unauthorized"),
    };
  }
  return { user, error: null };
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function requireDeleteConfirmation(request: Request) {
  return new URL(request.url).searchParams.get("confirm") === "delete";
}

export function routeError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes("not_found")) {
    return fail(404, "not_found", "Construction record was not found.");
  }
  if (message.includes("invalid_") || message.includes("unsupported_")) {
    return fail(400, "validation_error", "Construction request is invalid.");
  }
  if (message.includes("storage") || message.includes("upload")) {
    return fail(400, "storage_error", "Construction file could not be saved.");
  }
  return fail(400, "validation_error", fallback);
}
