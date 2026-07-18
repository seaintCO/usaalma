import type { ConnectorProvider, EmailConnectorProvider } from "./types";

export const CONNECTOR_DEFINITIONS: Record<
  ConnectorProvider,
  {
    name: string;
    operational: boolean;
    env: string[];
    scopes: string[];
  }
> = {
  gmail: {
    name: "Gmail",
    operational: true,
    env: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "APP_ENCRYPTION_KEY"],
    scopes: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/gmail.send",
    ],
  },
  outlook: {
    name: "Outlook",
    operational: true,
    env: [
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
      "APP_ENCRYPTION_KEY",
    ],
    scopes: [
      "openid",
      "email",
      "profile",
      "offline_access",
      "User.Read",
      "Mail.Send",
    ],
  },
  quickbooks: {
    name: "QuickBooks",
    operational: false,
    env: [],
    scopes: [],
  },
  stripe_connect: {
    name: "Stripe Connect",
    operational: false,
    env: [],
    scopes: [],
  },
  whatsapp_business: {
    name: "WhatsApp Business",
    operational: true,
    env: [
      "META_APP_ID",
      "META_APP_SECRET",
      "META_EMBEDDED_SIGNUP_CONFIG_ID",
      "META_WEBHOOK_VERIFY_TOKEN",
      "APP_ENCRYPTION_KEY",
    ],
    scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
  },
};

export function hasServerSupabaseSecret() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getAppBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getConnectorCallbackUrl(provider: EmailConnectorProvider) {
  return `${getAppBaseUrl()}/api/connectors/oauth/${provider}/callback`;
}

export function getWhatsAppCallbackUrl() {
  return `${getAppBaseUrl()}/api/connectors/whatsapp/callback`;
}

export function getMissingConnectorEnv(provider: ConnectorProvider) {
  const definition = CONNECTOR_DEFINITIONS[provider];
  const missing = definition.env.filter((name) => !process.env[name]);
  if (definition.operational && !hasServerSupabaseSecret()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  return missing;
}

export function isEmailConnectorProvider(
  provider: string,
): provider is EmailConnectorProvider {
  return provider === "gmail" || provider === "outlook";
}
