import { Page, expect } from "@playwright/test";

/**
 * Login with a PIN code. Fills the 6-digit PIN and waits for redirect.
 */
export async function login(page: Page, pin: string, expectedPath: string) {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("SchoolHub");

  // Type PIN digits via keyboard (triggers onChange + auto-advance)
  const inputs = page.locator('input[data-pin-digit="true"]');
  await expect(inputs).toHaveCount(6);
  await inputs.first().click();

  // Type each digit with small delay — auto-advances to next input
  for (const digit of pin) {
    await page.keyboard.press(digit);
    await page.waitForTimeout(100);
  }

  // Wait for redirect after auto-submit
  await page.waitForURL(`**${expectedPath}**`, { timeout: 15000 });
}

/**
 * Logout by clicking the logout button.
 */
export async function logout(page: Page) {
  await page.getByRole("button", { name: "יציאה" }).click();
  await page.waitForURL("/", { timeout: 5000 });
}

/**
 * Seed PINs for testing — matches supabase/seed.sql
 */
export const PINS = {
  admin: "100100",     // מנהלת — שרה
  teacher1: "111111",  // גב׳ כהן (homeroom)
  teacher2: "222222",  // מר לוי (homeroom)
  teacher4: "444444",  // מר דוד (subject)
  student1: "101010",  // יואב
  student2: "202020",  // נועה
  parent1: "600600",   // יעל כהן (3 kids)
  parent2: "700700",   // דנה לוי
};
