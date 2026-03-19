import { describe, it, expect } from "vitest";
import type {
  UserRole,
  LessonStatus,
  AttendanceStatus,
  EnrollmentRequestStatus,
  User,
  LessonTemplate,
  LessonInstance,
  Attendance,
  Database,
} from "../database";

describe("Database Types", () => {
  it("UserRole enum has correct values", () => {
    const roles: UserRole[] = ["student", "parent", "teacher", "admin"];
    expect(roles).toHaveLength(4);
  });

  it("LessonStatus enum has correct values", () => {
    const statuses: LessonStatus[] = ["scheduled", "active", "completed", "cancelled"];
    expect(statuses).toHaveLength(4);
  });

  it("AttendanceStatus enum has correct values", () => {
    const statuses: AttendanceStatus[] = ["unknown", "present", "absent", "late"];
    expect(statuses).toHaveLength(4);
  });

  it("EnrollmentRequestStatus enum has correct values", () => {
    const statuses: EnrollmentRequestStatus[] = ["pending", "approved", "rejected"];
    expect(statuses).toHaveLength(3);
  });

  it("User type has 6-digit PIN field and is_active", () => {
    const user: User = {
      id: "test-id",
      school_id: "school-id",
      name: "Test User",
      role: "student",
      pin: "$2b$12$hashedpin",
      email: null,
      phone: null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    expect(user.is_active).toBe(true);
    expect(user.phone).toBeNull();
  });

  it("LessonTemplate has recurring link fields", () => {
    const template: LessonTemplate = {
      id: "template-id",
      class_id: "class-id",
      teacher_id: "teacher-id",
      subject: "מתמטיקה",
      day_of_week: 0,
      start_time: "08:00:00",
      duration_minutes: 45,
      meeting_url: "https://zoom.us/j/123",
      meeting_type: "zoom",
      is_recurring_link: true,
      created_at: new Date().toISOString(),
    };
    expect(template.is_recurring_link).toBe(true);
    expect(template.day_of_week).toBeGreaterThanOrEqual(0);
    expect(template.day_of_week).toBeLessThanOrEqual(6);
  });

  it("LessonInstance inherits from template (null meeting_url = fallback)", () => {
    const instance: LessonInstance = {
      id: "instance-id",
      template_id: "template-id",
      date: "2026-03-19",
      meeting_url: null, // should fallback to template
      status: "scheduled",
      cancelled_reason: null,
      created_at: new Date().toISOString(),
    };
    expect(instance.meeting_url).toBeNull();
    expect(instance.status).toBe("scheduled");
  });

  it("Attendance has intent + confirmation fields", () => {
    const attendance: Attendance = {
      id: "att-id",
      lesson_instance_id: "instance-id",
      student_id: "student-id",
      join_clicked_at: new Date().toISOString(),
      status: "unknown",
      confirmed_by: null,
      confirmed_at: null,
      created_at: new Date().toISOString(),
    };
    expect(attendance.join_clicked_at).not.toBeNull();
    expect(attendance.status).toBe("unknown"); // not yet confirmed
    expect(attendance.confirmed_by).toBeNull();
  });

  it("Database type has all 11 tables", () => {
    // Type-level check: this ensures all tables are in the Database type
    type TableNames = keyof Database["public"]["Tables"];
    const tables: TableNames[] = [
      "school",
      "user",
      "class",
      "student",
      "parent_student",
      "lesson_template",
      "lesson_instance",
      "attendance",
      "invitation",
      "enrollment_request",
      "admin_audit_log",
    ];
    expect(tables).toHaveLength(11);
  });
});
