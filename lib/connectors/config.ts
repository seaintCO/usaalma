import type {
  ConnectorProvider,
  EmailConnectorProvider,
  OAuthConnectorProvider,
} from "./types";

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
    operational: true,
    env: [
      "QUICKBOOKS_CLIENT_ID",
      "QUICKBOOKS_CLIENT_SECRET",
      "APP_ENCRYPTION_KEY",
    ],
    scopes: ["com.intuit.quickbooks.accounting"],
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
  github_app: {
    name: "GitHub App",
    operational: true,
    env: [
      "GITHUB_APP_ID",
      "GITHUB_APP_CLIENT_ID",
      "GITHUB_APP_CLIENT_SECRET",
      "GITHUB_APP_PRIVATE_KEY",
      "GITHUB_WEBHOOK_SECRET",
      "GITHUB_APP_SLUG",
      "APP_ENCRYPTION_KEY",
    ],
    scopes: ["Contents read/write", "Metadata read"],
  },
  elevenlabs: {
    name: "ElevenLabs Voice Agents",
    operational: true,
    env: ["APP_ENCRYPTION_KEY"],
    scopes: ["agents:write", "conversations:read"],
  },
  twilio: {
    name: "Twilio Phone Number",
    operational: true,
    env: ["APP_ENCRYPTION_KEY"],
    scopes: ["phone_numbers:read", "calls:write"],
  },
};

export function hasServerSupabaseSecret() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getAppBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  try {
    const parsed = new URL(configured);
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.origin;
  } catch {
    return "";
  }
}

export function getConnectorCallbackUrl(provider: OAuthConnectorProvider) {
  return `${getAppBaseUrl()}/api/connectors/oauth/${provider}/callback`;
}

export function getWhatsAppCallbackUrl() {
  return `${getAppBaseUrl()}/api/connectors/whatsapp/callback`;
}

export function getGitHubAppCallbackUrl() {
  return `${getAppBaseUrl()}/api/connectors/github/callback`;
}

export function getMissingConnectorEnv(provider: ConnectorProvider) {
  const definition = CONNECTOR_DEFINITIONS[provider];
  const missing = definition.env.filter((name) => !process.env[name]);
  if (definition.operational && !hasServerSupabaseSecret()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (definition.operational && !getAppBaseUrl()) {
    missing.push("NEXT_PUBLIC_APP_URL");
  }
  return missing;
}

export function isEmailConnectorProvider(
  provider: string,
): provider is EmailConnectorProvider {
  return provider === "gmail" || provider === "outlook";
}

export function isOAuthConnectorProvider(
  provider: string,
): provider is OAuthConnectorProvider {
  return isEmailConnectorProvider(provider) || provider === "quickbooks";
}
