import { logAuditAction } from "../audit";

// Mock Supabase
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({
    from: mockFrom,
  }),
}));

beforeEach(() => {
  mockInsert.mockClear();
  mockFrom.mockClear();
});

describe("audit logging", () => {
  it("calls supabase insert with correct data", async () => {
    await logAuditAction({
      schoolId: "school-1",
      userId: "admin-1",
      action: "user_created",
      targetType: "user",
      targetId: "user-2",
      details: { name: "Test User" },
    });

    expect(mockFrom).toHaveBeenCalledWith("admin_audit_log");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        school_id: "school-1",
        user_id: "admin-1",
        action: "user_created",
        target_type: "user",
        target_id: "user-2",
      })
    );
  });

  it("handles missing optional fields gracefully", async () => {
    await logAuditAction({
      schoolId: "school-1",
      userId: "admin-1",
      action: "class_deleted",
      targetType: "class",
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        target_id: null,
        details: null,
      })
    );
  });

  it("does not throw on DB error (non-blocking)", async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: "DB down" } });

    // Should not throw
    await expect(
      logAuditAction({
        schoolId: "s",
        userId: "u",
        action: "test",
        targetType: "test",
      })
    ).resolves.toBeUndefined();
  });
});
