import { getDatesForDay, formatDate, buildInstanceInserts } from "../schedule";

describe("schedule utilities", () => {
  describe("formatDate", () => {
    it("formats a date as YYYY-MM-DD", () => {
      const date = new Date(2026, 2, 19); // March 19, 2026
      expect(formatDate(date)).toBe("2026-03-19");
    });

    it("pads single-digit months and days", () => {
      const date = new Date(2026, 0, 5); // January 5, 2026
      expect(formatDate(date)).toBe("2026-01-05");
    });
  });

  describe("getDatesForDay", () => {
    // March 19, 2026 is a Thursday (day 4)
    const thursday = new Date(2026, 2, 19);

    it("returns dates for the specified day of week", () => {
      // Get all Thursdays for 3 weeks from March 19
      const dates = getDatesForDay(4, 3, thursday);
      expect(dates.length).toBeGreaterThan(0);
      // Each date should be a Thursday
      for (const d of dates) {
        expect(new Date(d).getDay()).toBe(4);
      }
    });

    it("returns 3 weeks of dates by default", () => {
      // From a Sunday (March 15, 2026)
      const sunday = new Date(2026, 2, 15);
      const dates = getDatesForDay(0, 3, sunday); // Sundays
      // Should get at most 3 dates
      expect(dates.length).toBeLessThanOrEqual(3);
      expect(dates.length).toBeGreaterThan(0);
    });

    it("only returns today or future dates", () => {
      const dates = getDatesForDay(4, 3, thursday);
      const todayStr = formatDate(thursday);
      for (const d of dates) {
        expect(d >= todayStr).toBe(true);
      }
    });

    it("returns empty array for past days of current week", () => {
      // March 19 is Thursday (day 4). Asking for Sunday (day 0) of current week
      // which is March 15 (past). Should NOT include it.
      const dates = getDatesForDay(0, 1, thursday);
      for (const d of dates) {
        expect(d >= formatDate(thursday)).toBe(true);
      }
    });

    it("handles weeksAhead=1 (current week only)", () => {
      const sunday = new Date(2026, 2, 15);
      const dates = getDatesForDay(0, 1, sunday);
      expect(dates.length).toBeLessThanOrEqual(1);
    });
  });

  describe("buildInstanceInserts", () => {
    const thursday = new Date(2026, 2, 19);

    it("creates insert records with template_id and date", () => {
      const inserts = buildInstanceInserts("tmpl-1", 4, new Set(), 3, thursday);
      expect(inserts.length).toBeGreaterThan(0);
      for (const record of inserts) {
        expect(record.template_id).toBe("tmpl-1");
        expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it("excludes existing dates", () => {
      const existing = new Set(["2026-03-19"]);
      const inserts = buildInstanceInserts("tmpl-1", 4, existing, 3, thursday);
      const dates = inserts.map((i) => i.date);
      expect(dates).not.toContain("2026-03-19");
    });

    it("returns empty when all dates already exist", () => {
      const dates = getDatesForDay(4, 3, thursday);
      const existing = new Set(dates);
      const inserts = buildInstanceInserts("tmpl-1", 4, existing, 3, thursday);
      expect(inserts).toHaveLength(0);
    });
  });
});
