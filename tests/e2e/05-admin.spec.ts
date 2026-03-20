import { test, expect } from "@playwright/test";
import { login, PINS } from "./helpers";

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PINS.admin, "/admin");
  });

  test("shows admin name and role", async ({ page }) => {
    await expect(page.locator("text=שרה")).toBeVisible();
    await expect(page.locator("text=מנהל")).toBeVisible();
  });

  test("has view toggle buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: /סטטוס/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /מערכת שעות/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /סיכום AI/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /תלמידים בסיכון/ })).toBeVisible();
  });

  test("status view shows class cards", async ({ page }) => {
    // Default view is overview/status
    await page.waitForTimeout(1000);
    // Should show summary cards (numbers)
    await expect(page.locator("text=תקין")).toBeVisible();
  });

  test("schedule view shows weekly grid", async ({ page }) => {
    await page.getByRole("button", { name: /מערכת שעות/ }).click();
    await expect(page.locator("text=מערכת שעות שבועית")).toBeVisible();
    await expect(page.getByLabel("בחר כיתה")).toBeVisible();
  });

  test("AI digest view has date picker and generate button", async ({ page }) => {
    await page.getByRole("button", { name: /סיכום AI/ }).click();
    await expect(page.locator("text=סיכום יומי AI")).toBeVisible();
    await expect(page.getByRole("button", { name: /צור סיכום/ })).toBeVisible();
  });

  test("at-risk view shows student risk report", async ({ page }) => {
    await page.getByRole("button", { name: /תלמידים בסיכון/ }).click();
    await expect(page.locator("text=תלמידים בסיכון")).toBeVisible();
  });

  test("classes page loads", async ({ page }) => {
    await page.getByRole("button", { name: "כיתות" }).click();
    await page.waitForURL("**/admin/classes**");
    await expect(page.locator("text=ניהול כיתות")).toBeVisible();
  });

  test("users page loads with export buttons", async ({ page }) => {
    await page.getByRole("button", { name: "משתמשים" }).click();
    await page.waitForURL("**/admin/users**");
    await expect(page.locator("text=ניהול משתמשים")).toBeVisible();
    await expect(page.getByRole("button", { name: /ייצוא CSV/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /ייצוא PDF/ })).toBeVisible();
  });

  test("enrollment page loads", async ({ page }) => {
    await page.getByRole("button", { name: "הרשמה" }).click();
    await page.waitForURL("**/admin/enrollment**");
    await expect(page.locator("text=ניהול קישורי הזמנה")).toBeVisible();
  });
});
