import "server-only";

export type PayPalEnvironment = "sandbox" | "live";

function baseUrl(environment: PayPalEnvironment) {
  return environment === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function getPayPalAccessToken(input: {
  clientId: string;
  clientSecret: string;
  environment: PayPalEnvironment;
}) {
  const authorization = Buffer.from(
    `${input.clientId}:${input.clientSecret}`,
  ).toString("base64");
  const response = await fetch(
    `${baseUrl(input.environment)}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error("paypal_credentials_invalid");
  }
  return payload.access_token;
}

export async function createPayPalOrder(input: {
  clientId: string;
  clientSecret: string;
  environment: PayPalEnvironment;
  amount: number;
  currency: string;
  invoiceNumber: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  requestId: string;
}) {
  const accessToken = await getPayPalAccessToken(input);
  const response = await fetch(
    `${baseUrl(input.environment)}/v2/checkout/orders`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": input.requestId,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.invoiceNumber,
            invoice_id: input.invoiceNumber,
            description: input.description.slice(0, 127),
            amount: {
              currency_code: input.currency,
              value: input.amount.toFixed(2),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              user_action: "PAY_NOW",
              return_url: input.returnUrl,
              cancel_url: input.cancelUrl,
            },
          },
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    links?: Array<{ rel?: string; href?: string }>;
  };
  const approvalUrl = payload.links?.find(
    (link) => link.rel === "payer-action",
  )?.href;
  if (!response.ok || !payload.id || !approvalUrl) {
    throw new Error("paypal_order_create_failed");
  }
  return { id: payload.id, url: approvalUrl };
}

export async function capturePayPalOrder(input: {
  clientId: string;
  clientSecret: string;
  environment: PayPalEnvironment;
  orderId: string;
  requestId: string;
}) {
  const accessToken = await getPayPalAccessToken(input);
  const response = await fetch(
    `${baseUrl(input.environment)}/v2/checkout/orders/${encodeURIComponent(input.orderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": input.requestId,
      },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id?: string;
          status?: string;
          amount?: { value?: string; currency_code?: string };
        }>;
      };
    }>;
  };
  const capture = payload.purchase_units?.[0]?.payments?.captures?.[0];
  if (
    !response.ok ||
    payload.status !== "COMPLETED" ||
    capture?.status !== "COMPLETED"
  ) {
    throw new Error("paypal_capture_failed");
  }
  return {
    eventId: capture.id ?? payload.id ?? input.orderId,
    amount: Number(capture.amount?.value ?? 0),
    currency: capture.amount?.currency_code ?? "USD",
  };
}
