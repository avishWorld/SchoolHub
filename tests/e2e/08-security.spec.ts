import { test, expect } from "@playwright/test";
import { login, PINS } from "./helpers";

test.describe("Security — Role-Based Access", () => {
  test("unauthenticated user redirected to login from /admin", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL("/", { timeout: 5000 });
    await expect(page.locator("h2")).toContainText("הכנס קוד PIN");
  });

  test("unauthenticated user redirected from /student", async ({ page }) => {
    await page.goto("/student");
    await page.waitForURL("/", { timeout: 5000 });
  });

  test("unauthenticated user redirected from /teacher", async ({ page }) => {
    await page.goto("/teacher");
    await page.waitForURL("/", { timeout: 5000 });
  });

  test("student cannot access /admin", async ({ page }) => {
    await login(page, PINS.student1, "/student");
    await page.goto("/admin");
    // Should redirect to /student (middleware redirects to user's own dashboard)
    await page.waitForURL("**/student**", { timeout: 5000 });
  });

  test("teacher cannot access /admin", async ({ page }) => {
    await login(page, PINS.teacher1, "/teacher");
    await page.goto("/admin");
    await page.waitForURL("**/teacher**", { timeout: 5000 });
  });

  test("parent cannot access /admin", async ({ page }) => {
    await login(page, PINS.parent1, "/parent");
    await page.goto("/admin");
    await page.waitForURL("**/parent**", { timeout: 5000 });
  });

  test("join page is accessible without login", async ({ page }) => {
    await page.goto("/join/abc123def456");
    // Should NOT redirect to login
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toContain("/join/");
  });

  test("API returns 401 for unauthenticated requests", async ({ page }) => {
    const response = await page.request.get("/api/admin/classes");
    expect(response.status()).toBe(401);
  });
});
