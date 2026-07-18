export const EMAIL_CONNECTOR_PROVIDERS = ["gmail", "outlook"] as const;

export const CONNECTOR_PROVIDERS = [
  "gmail",
  "outlook",
  "quickbooks",
  "stripe_connect",
  "whatsapp_business",
] as const;

export type ConnectorProvider = (typeof CONNECTOR_PROVIDERS)[number];
export type EmailConnectorProvider = (typeof EMAIL_CONNECTOR_PROVIDERS)[number];

export type ConnectorStatus =
  | "not_connected"
  | "connecting"
  | "connected"
  | "expired"
  | "reauthorization_required"
  | "configuration_required"
  | "error"
  | "disconnected";

export type ConnectorSummary = {
  provider: ConnectorProvider;
  name: string;
  status: ConnectorStatus;
  connectedEmail: string | null;
  connectedName: string | null;
  lastSuccessfulUse: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  canConnect: boolean;
  canDisconnect: boolean;
};

export type EmailDeliveryInput = {
  userId: string;
  workspaceId: string;
  provider?: EmailConnectorProvider | null;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string | null;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    contentBase64: string;
  }>;
};

export type EmailDeliveryResult = {
  ok: boolean;
  provider: EmailConnectorProvider | null;
  connectionId?: string | null;
  providerMessageId?: string | null;
  deliveredAt?: string | null;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
};
