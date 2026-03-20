import { test, expect } from "@playwright/test";
import { login, PINS } from "./helpers";

test.describe("Teacher Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PINS.teacher1, "/teacher");
  });

  test("shows teacher name and role", async ({ page }) => {
    await expect(page.locator("text=כהן")).toBeVisible();
    await expect(page.locator("text=מורה")).toBeVisible();
  });

  test("shows lesson management title", async ({ page }) => {
    await expect(page.locator("text=ניהול שיעורים")).toBeVisible();
  });

  test("has class selector", async ({ page }) => {
    await expect(page.getByLabel("בחר כיתה")).toBeVisible();
  });

  test("has single/multi class toggle", async ({ page }) => {
    await expect(page.getByRole("button", { name: "כיתה בודדת" })).toBeVisible();
    await expect(page.getByRole("button", { name: /כל הכיתות/ })).toBeVisible();
  });

  test("shows weekly grid with days", async ({ page }) => {
    await expect(page.locator("text=יום ראשון")).toBeVisible();
  });

  test("has copy-from-last-week button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /העתק מהשבוע שעבר/ })).toBeVisible();
  });

  test("has AI paste-text button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /הדבק טקסט/ })).toBeVisible();
  });

  test("has add-lesson button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /הוסף שיעור/ })).toBeVisible();
  });

  test("multi-class view shows class filter chips", async ({ page }) => {
    await page.getByRole("button", { name: /כל הכיתות/ }).click();
    // Should see class name buttons
    await page.waitForTimeout(1000);
    const buttons = page.getByRole("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(3); // toggle buttons + class chips
  });

  test("enrollment tab is accessible", async ({ page }) => {
    await page.getByRole("button", { name: "הרשמה" }).click();
    await page.waitForURL("**/teacher/enrollment**");
    await expect(page.locator("text=ניהול קישורי הזמנה")).toBeVisible();
  });
});
