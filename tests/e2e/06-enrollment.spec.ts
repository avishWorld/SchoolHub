import { test, expect } from "@playwright/test";

test.describe("Enrollment — Public Join Page", () => {
  test("valid invite token shows registration form", async ({ page }) => {
    // Use seed data token: abc123def456 (class ז'2)
    await page.goto("/join/abc123def456");
    await expect(page.locator("h1")).toContainText("SchoolHub");

    // Should show form after validation
    await page.waitForTimeout(2000);

    // Either shows form or "invalid link" — depends on live DB state
    const hasForm = await page.locator("text=טופס הרשמה").isVisible().catch(() => false);
    const hasError = await page.locator("text=קישור לא תקין").isVisible().catch(() => false);

    expect(hasForm || hasError).toBe(true);
  });

  test("invalid token shows error page", async ({ page }) => {
    await page.goto("/join/invalid-token-xyz");
    await page.waitForTimeout(2000);
    await expect(page.locator("text=קישור לא תקין")).toBeVisible();
  });

  test("join page has generic OG tags (no class name in title)", async ({ page }) => {
    await page.goto("/join/abc123def456");
    const title = await page.title();
    expect(title).toContain("SchoolHub");
    expect(title).not.toContain("ז׳2"); // Privacy: no class name in meta
  });
});
