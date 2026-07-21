import { expect, test } from "@playwright/test";

test("public sandbox is interactive, bilingual, persistent, and safe", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Interactive demo", { exact: true }).first(),
  ).toBeVisible();
  for (const name of [
    "ALMA Office",
    "Communications",
    "Planner",
    "Creator",
    "Builder",
  ])
    await expect(
      page.getByRole("button", { name, exact: true }).first(),
    ).toBeVisible();
  await page
    .getByRole("button", { name: "Builder", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Run demonstration" }).click();
  await expect(
    page
      .getByText("Preview simulation ready — no code ran or deployed")
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Replay demo" }).click();
  await expect(page.getByText("Ready for a command").first()).toBeVisible();
  await page.getByRole("button", { name: "ES", exact: true }).click();
  await expect(
    page.getByText("Demo interactiva", { exact: true }).first(),
  ).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Demo interactiva", { exact: true }).first(),
  ).toBeVisible();
  const essentialCta = page.getByRole("link", { name: /Comprar · Esencial/ });
  await expect(essentialCta).toHaveAttribute(
    "href",
    "/signup?plan=starter&next=/billing",
  );
  await essentialCta.click();
  await expect(page).toHaveURL(/\/signup\?plan=starter&next=\/billing$/);
  await page.getByRole("link", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/login\?plan=starter&next=%2Fbilling$/);
});

test("public sandbox command accepts keyboard interaction", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const command = page.getByLabel("Command ALMA");
  await command.fill("Plan a safe demonstration");
  await command.press("Tab");
  await expect(
    page.getByRole("button", { name: "Run demonstration" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Demonstration result")).toBeVisible();
});
