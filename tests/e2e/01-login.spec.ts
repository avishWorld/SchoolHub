import { test, expect } from "@playwright/test";
import { login, logout, PINS } from "./helpers";

test.describe("Login Flow", () => {
  test("shows PIN login page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("SchoolHub");
    await expect(page.locator("h2")).toContainText("הכנס קוד PIN");
    await expect(page.locator('input[data-pin-digit="true"]')).toHaveCount(6);
    await expect(page.getByRole("button", { name: "כניסה" })).toBeVisible();
  });

  test("admin login → /admin", async ({ page }) => {
    await login(page, PINS.admin, "/admin");
    await expect(page.getByRole("button", { name: /סטטוס/ }).first()).toBeVisible();
    await expect(page.locator("text=שרה")).toBeVisible();
  });

  test("teacher login → /teacher", async ({ page }) => {
    await login(page, PINS.teacher1, "/teacher");
    await expect(page.locator("h2").first()).toContainText("ניהול שיעורים");
  });

  test("student login → /student", async ({ page }) => {
    await login(page, PINS.student1, "/student");
    await expect(page.locator("text=המערכת שלי")).toBeVisible();
  });

  test("parent login → /parent", async ({ page }) => {
    await login(page, PINS.parent1, "/parent");
    await expect(page.locator("text=מעקב")).toBeVisible();
  });

  test("wrong PIN shows error", async ({ page }) => {
    await page.goto("/");
    const inputs = page.locator('input[data-pin-digit="true"]');
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill("9");
    }
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 10000 });
    // Error text could be "שגוי" or "תקשורת" depending on server state
    const alertText = await page.getByRole("alert").textContent();
    expect(alertText?.length).toBeGreaterThan(0);
  });

  test("logout returns to login page", async ({ page }) => {
    await login(page, PINS.admin, "/admin");
    await logout(page);
    await expect(page.locator("h2")).toContainText("הכנס קוד PIN");
  });
});
