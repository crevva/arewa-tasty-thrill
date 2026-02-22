import { test, expect } from "@playwright/test";

test("guest can reach checkout route", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /shop/i })).toBeVisible();

  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: /checkout/i })).toBeVisible();
});
