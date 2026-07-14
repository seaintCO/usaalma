import "server-only";

const SECRET_KEY = /(^|[_-])(authorization|access[_-]?token|refresh[_-]?token|id[_-]?token|token|api[_-]?key|apikey|secret|client[_-]?secret|password|credential(?:s)?|cookie|set[_-]?cookie|bearer)([_-]|$)/i;
const SECRET_VALUE = /\b(bearer\s+[a-z0-9._~+/=-]+|sk-[a-z0-9_-]+|AIza[a-z0-9_-]+|eyJ[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+|xox[a-z0-9-]+|-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|(?:api[_-]?key|client[_-]?secret|password|token)\s*[:=])/i;
const REDACTED = "[REDACTED]";

export function redactExecutionText(value: string | null | undefined) {
  if (!value) return value ?? null;
  return SECRET_VALUE.test(value) ? REDACTED : value;
}

function redactValue(value: unknown, key?: string): unknown {
  if (key && SECRET_KEY.test(key)) return REDACTED;
  if (typeof value === "string") return redactExecutionText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
      entryKey,
      redactValue(entryValue, entryKey),
    ])
  );
}

export function redactExecutionData<T>(value: T): T {
  return redactValue(value) as T;
}
