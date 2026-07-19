const DEFAULT_ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1"]);

function configuredPreviewHosts() {
  const raw = process.env.ALMA_BUILDER_PREVIEW_HOSTS ?? "";
  return raw
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

export function allowedBuilderPreviewHosts() {
  return new Set([...DEFAULT_ALLOWED_HOSTS, ...configuredPreviewHosts()]);
}

export function validateBuilderPreviewUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const allowedHosts = allowedBuilderPreviewHosts();
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
      return null;
    }
    if (!allowedHosts.has(hostname)) return null;
    return {
      url: url.toString(),
      host: hostname,
    };
  } catch {
    return null;
  }
}
