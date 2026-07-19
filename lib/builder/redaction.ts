const SECRET_PATTERNS = [
  /bearer\s+[a-z0-9._~+/=-]+/gi,
  /authorization:\s*[^\n\r]+/gi,
  /cookie:\s*[^\n\r]+/gi,
  /(api[_-]?key|token|secret|password|private[_-]?key)\s*[:=]\s*["']?[^"'\s]+/gi,
  /sk-[a-z0-9_-]{20,}/gi,
  /github_pat_[a-z0-9_]+/gi,
  /gh[psu]_[a-z0-9_]+/gi,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+PRIVATE KEY-----/g,
];

export function redactBuilderSecrets(value: unknown, maxLength = 4000): string {
  let text =
    typeof value === "string" ? value : JSON.stringify(value ?? "", null, 2);
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, "[REDACTED]");
  }
  return text.slice(0, maxLength);
}

export function redactBuilderMetadata(
  metadata: Record<string, unknown> | undefined,
) {
  if (!metadata) return {};
  return JSON.parse(redactBuilderSecrets(metadata, 3000)) as Record<
    string,
    unknown
  >;
}
