export const ALMA_ROUTES = {
  login: "/login?next=/onboarding",
  home: "/dashboard",
  onboarding: "/onboarding",
  customers: "/customers",
  money: "/money",
  inbox: "/inbox",
  alma: "/dashboard",
  documents: "/documents",
} as const;

export type AlmaRoute = keyof typeof ALMA_ROUTES;

const OAUTH_HOSTS = new Set([
  "accounts.google.com",
  "login.microsoftonline.com",
  "www.facebook.com",
  "facebook.com",
  "appcenter.intuit.com",
  "oauth.platform.intuit.com",
]);

const BLOCKED_PURCHASE_HOSTS = new Set([
  "checkout.stripe.com",
  "billing.stripe.com",
]);

export type NavigationDecision = "internal" | "oauth" | "external" | "blocked";

export function classifyNavigation(
  rawUrl: string,
  almaBaseUrl: string,
): NavigationDecision {
  if (rawUrl === "about:blank") return "internal";
  try {
    const url = new URL(rawUrl);
    const base = new URL(almaBaseUrl);
    if (url.protocol !== "https:") return "blocked";
    if (url.host === base.host) {
      if (url.pathname === "/pricing") return "blocked";
      return "internal";
    }
    if (BLOCKED_PURCHASE_HOSTS.has(url.host)) return "blocked";
    if (OAUTH_HOSTS.has(url.host)) return "oauth";
    return "external";
  } catch {
    return "blocked";
  }
}
