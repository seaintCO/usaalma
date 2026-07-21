import { expect, test } from "@playwright/test";

const fixture = {
  ok: true,
  usage: {
    plan: "business",
    status: "active",
    period: {
      start: "2026-07-01T00:00:00.000Z",
      end: "2026-08-01T00:00:00.000Z",
    },
    limits: {
      modes: { instant: 2000, thinking: 200, pro: 25, research_pro: 0 },
      images: 100,
      voiceSeconds: 18000,
      documentPages: 1000,
      builderJobs: 10,
      dailyAiRequests: 100,
    },
    used: {
      instant: 1400,
      thinking: 180,
      pro: 25,
      image_generation: 5,
      voice: 120,
      document_analysis: 10,
      builder_build: 1,
    },
    dailyAiUsed: 8,
    recent: [
      {
        id: "fixture-1",
        feature: "ai_request",
        alma_mode: "thinking",
        actual_units: 1,
        provider_model: "fixture",
        created_at: "2026-07-20T12:00:00.000Z",
      },
    ],
  },
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/usage", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fixture),
    }),
  );
});

test("usage dashboard is responsive and exposes truthful thresholds", async ({
  page,
}) => {
  await page.goto("/usage", { waitUntil: "domcontentloaded" });
  await expect(page).not.toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { name: /ALMA usage|Uso de ALMA/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/Warning: 70% used|Aviso: 70% usado/),
  ).toBeVisible();
  await expect(page.getByText(/Limit reached|Límite alcanzado/)).toBeVisible();
  await expect(page.getByText(/Research Pro/)).toBeVisible();
  await expect(page.locator("main")).toHaveCSS("overflow-x", "visible");
});

test("chat mode selector exposes only selectable modes and quota context", async ({
  page,
}) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).not.toHaveURL(/\/login/);
  await page
    .getByRole("button", { name: /Ask ALMA|Preguntar a ALMA/ })
    .first()
    .click()
    .catch(() => undefined);
  const group = page.getByRole("group", { name: /ALMA mode|Modo de ALMA/ });
  await expect(group).toBeVisible();
  await expect(group.getByRole("button")).toHaveCount(3);
  await expect(group.getByRole("button", { name: "Pro" })).toBeDisabled();
  await expect(
    page.getByText(/remaining; resets|restantes; reinicia/),
  ).toBeVisible();
});
