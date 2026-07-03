export function safeJsonParse(value:string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function cleanString(value:any) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function cleanNumber(value:any) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}
