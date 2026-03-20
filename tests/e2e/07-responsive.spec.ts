import { test, expect } from "@playwright/test";

test.describe("Responsive & Accessibility", () => {
  test("login page works at 320px width", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("SchoolHub");
    await expect(page.locator("h2")).toContainText("הכנס קוד PIN");

    // PIN inputs should be visible and not overflow
    const inputs = page.locator('input[data-pin-digit="true"]');
    await expect(inputs).toHaveCount(6);

    // Check first input is visible
    const firstInput = inputs.first();
    await expect(firstInput).toBeVisible();

    // Check submit button is visible
    await expect(page.getByRole("button", { name: "כניסה" })).toBeVisible();
  });

  test("login page at 768px (tablet)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("SchoolHub");
    await expect(page.locator('input[data-pin-digit="true"]')).toHaveCount(6);
  });

  test("RTL direction is set", async ({ page }) => {
    await page.goto("/");
    const dir = await page.locator("html").getAttribute("dir");
    expect(dir).toBe("rtl");
  });

  test("Hebrew language is set", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBe("he");
  });

  test("PIN inputs have aria-labels", async ({ page }) => {
    await page.goto("/");
    const firstInput = page.locator('input[data-pin-digit="true"]').first();
    const ariaLabel = await firstInput.getAttribute("aria-label");
    expect(ariaLabel).toContain("ספרה 1");
  });

  test("error messages have role=alert", async ({ page }) => {
    await page.goto("/");
    const inputs = page.locator('input[data-pin-digit="true"]');
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill("9");
    }
    // Wait for error
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 10000 });
  });

  test("PIN digit group has role=group", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("group", { name: /PIN/ })).toBeVisible();
  });
});
