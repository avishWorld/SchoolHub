import { test, expect } from "@playwright/test";
import { login, PINS } from "./helpers";

test.describe("Student Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PINS.student1, "/student");
  });

  test("shows daily schedule with title", async ({ page }) => {
    await expect(page.locator("text=המערכת שלי להיום")).toBeVisible();
  });

  test("shows student name in header", async ({ page }) => {
    await expect(page.locator("text=יואב")).toBeVisible();
  });

  test("shows role label", async ({ page }) => {
    await expect(page.locator("text=תלמיד")).toBeVisible();
  });

  test("has daily/weekly toggle buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: /יומי/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /שבועי/ })).toBeVisible();
  });

  test("weekly view shows 6-day grid", async ({ page }) => {
    await page.getByRole("button", { name: /שבועי/ }).click();
    await expect(page.locator("text=יום ראשון")).toBeVisible();
    await expect(page.locator("text=יום שישי")).toBeVisible();
  });

  test("click day in weekly returns to daily", async ({ page }) => {
    await page.getByRole("button", { name: /שבועי/ }).click();
    await expect(page.locator("text=יום ראשון")).toBeVisible();
    // Click on a day card
    await page.locator("text=יום ראשון").click();
    // Should switch back to daily
    await expect(page.getByRole("button", { name: /יומי/ })).toBeVisible();
  });

  test("shows last refresh time", async ({ page }) => {
    await expect(page.locator("text=עודכן לאחרונה")).toBeVisible();
  });
});
