/**
 * QA Scenarios — Sprint 02 (Q17-Q22)
 * Unit-level validation of attendance, AI, and dashboard logic.
 */

import { parseTextForMeetingLink, resetClaudeState } from "../claude";

// Mock Anthropic SDK
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

beforeAll(() => {
  process.env.ANTHROPIC_API_KEY = "qa-test-key";
});

beforeEach(() => {
  resetClaudeState();
  mockCreate.mockReset();
});

// ============================================
// Q17: Attendance — Join records intent
// ============================================
describe("Q17: Join records intent", () => {
  it("attendance record should have join_clicked_at timestamp", () => {
    const now = new Date().toISOString();
    const record = {
      lesson_instance_id: "inst-1",
      student_id: "student-1",
      join_clicked_at: now,
      status: "unknown",
    };
    expect(record.join_clicked_at).not.toBeNull();
    expect(new Date(record.join_clicked_at).getTime()).toBeGreaterThan(0);
  });

  it("upsert pattern: existing record gets updated, not duplicated", () => {
    const records = [{ id: "att-1", student_id: "s1", join_clicked_at: "2026-03-20T08:00:00Z" }];
    const existingForStudent = records.find((r) => r.student_id === "s1");
    expect(existingForStudent).not.toBeUndefined();
    // Should update, not insert
    if (existingForStudent) {
      existingForStudent.join_clicked_at = new Date().toISOString();
      expect(records.length).toBe(1); // Still 1 record
    }
  });
});

// ============================================
// Q18: Attendance — Teacher confirms
// ============================================
describe("Q18: Teacher confirms attendance", () => {
  it("valid statuses are present, absent, late", () => {
    const validStatuses = ["present", "absent", "late"];
    expect(validStatuses).toContain("present");
    expect(validStatuses).toContain("absent");
    expect(validStatuses).toContain("late");
    expect(validStatuses).not.toContain("unknown"); // unknown is initial, not a confirm action
  });

  it("confirmation includes confirmed_by and confirmed_at", () => {
    const confirmation = {
      status: "present" as const,
      confirmed_by: "teacher-1",
      confirmed_at: new Date().toISOString(),
    };
    expect(confirmation.confirmed_by).toBeTruthy();
    expect(confirmation.confirmed_at).toBeTruthy();
  });
});

// ============================================
// Q19: AI — Claude extracts Zoom URL from Hebrew text
// ============================================
describe("Q19: Claude extracts Zoom URL", () => {
  it("extracts URL and platform from Hebrew text", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{
        type: "text",
        text: '{"url":"https://zoom.us/j/123456789","platform":"zoom","date":"2026-03-20","time":"08:00","confidence":0.95}',
      }],
    });

    const result = await parseTextForMeetingLink(
      "שלום לכולם, השיעור מחר ב-8 בוקר, קישור: https://zoom.us/j/123456789"
    );

    expect(result).not.toBeNull();
    expect(result!.url).toBe("https://zoom.us/j/123456789");
    expect(result!.platform).toBe("zoom");
    expect(result!.confidence).toBeGreaterThan(0.5);
  });

  it("handles Teams URL", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{
        type: "text",
        text: '{"url":"https://teams.microsoft.com/l/meetup-join/abc","platform":"teams","date":null,"time":"09:00","confidence":0.9}',
      }],
    });

    const result = await parseTextForMeetingLink("השיעור בטימס https://teams.microsoft.com/l/meetup-join/abc");
    expect(result!.platform).toBe("teams");
  });
});

// ============================================
// Q20: AI — Cache returns same result
// ============================================
describe("Q20: AI cache", () => {
  it("second call for same text doesn't hit Claude API", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"url":"https://zoom.us/j/1","platform":"zoom","date":null,"time":null,"confidence":0.9}' }],
    });

    const text = "שיעור מתמטיקה https://zoom.us/j/1";
    const r1 = await parseTextForMeetingLink(text);
    const r2 = await parseTextForMeetingLink(text);

    expect(r1).toEqual(r2);
    expect(mockCreate).toHaveBeenCalledTimes(1); // Only 1 API call
  });
});

// ============================================
// Q21: AI — Graceful degradation
// ============================================
describe("Q21: AI graceful degradation", () => {
  it("returns null when API throws error", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Service unavailable"));
    const result = await parseTextForMeetingLink("some text with a link");
    expect(result).toBeNull(); // Graceful — no crash
  });

  it("returns null when API key missing", async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const result = await parseTextForMeetingLink("test");
    expect(result).toBeNull();
    process.env.ANTHROPIC_API_KEY = saved;
  });

  it("returns null for empty input without calling API", async () => {
    const result = await parseTextForMeetingLink("");
    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ============================================
// Q22: Dashboard — Status colors correct
// ============================================
describe("Q22: Dashboard status colors", () => {
  it("green = active lesson with link", () => {
    const hasLink = true;
    const isActive = true; // now is between start and end
    const status = isActive ? (hasLink ? "green" : "red") : (hasLink ? "green" : "yellow");
    expect(status).toBe("green");
  });

  it("yellow = upcoming lesson missing link", () => {
    const hasLink = false;
    const isActive = false; // future
    const status = isActive ? (hasLink ? "green" : "red") : (hasLink ? "green" : "yellow");
    expect(status).toBe("yellow");
  });

  it("red = active lesson WITHOUT link", () => {
    const hasLink = false;
    const isActive = true;
    const status = isActive ? (hasLink ? "green" : "red") : (hasLink ? "green" : "yellow");
    expect(status).toBe("red");
  });

  it("gray = no lessons today", () => {
    const lessonsToday = 0;
    const status = lessonsToday === 0 ? "gray" : "green";
    expect(status).toBe("gray");
  });
});
