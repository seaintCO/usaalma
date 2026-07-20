import { expect, test } from "@playwright/test";

const routes = [
  ["/login", "Sign in", "Iniciar sesión"],
  ["/signup", "Create your ALMA", "Crea tu ALMA"],
  ["/forgot-password", "Reset password", "Restablecer contraseña"],
  [
    "/auth/update-password",
    "Create a new password",
    "Crea una contraseña nueva",
  ],
] as const;

for (const [route, english, spanish] of routes) {
  test(`${route} switches the complete public interface`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: english })).toBeVisible();
    await page.getByRole("button", { name: "ES", exact: true }).click();
    await expect(page.getByRole("heading", { name: spanish })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: spanish })).toBeVisible();
  });
}

test("login validation is accessible and does not expose provider details", async ({
  page,
}) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByLabel("Email address")).toBeFocused();
});
