import { NextResponse } from "next/server";

export type ConstructionErrorCode =
  | "unauthorized"
  | "validation_error"
  | "not_found"
  | "forbidden"
  | "storage_error"
  | "server_error";

export type ConstructionError = {
  code: ConstructionErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export function ok<T extends Record<string, unknown>>(
  payload: T,
  init?: ResponseInit,
) {
  return NextResponse.json({ ok: true, ...payload }, init);
}

export function fail(
  status: number,
  code: ConstructionErrorCode,
  message: string,
  details?: Record<string, unknown>,
) {
  const error: ConstructionError = details
    ? { code, message, details }
    : { code, message };
  return NextResponse.json({ ok: false, error }, { status });
}

export function cleanString(value: unknown, maxLength = 5000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function optionalString(value: unknown, maxLength = 5000) {
  const cleaned = cleanString(value, maxLength);
  return cleaned || null;
}

export function numberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function numberOrDefault(value: unknown, fallback: number) {
  const parsed = numberOrNull(value);
  return parsed === null ? fallback : parsed;
}

export function safeFilename(name: string) {
  return (
    name
      .replace(/[/\\?%*:|"<>]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "construction-file"
  );
}
