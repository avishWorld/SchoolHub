/**
 * SchoolHub Database Types
 *
 * These types mirror the SQL schema in supabase/migrations/001_initial_schema.sql.
 * When you connect to a real Supabase project, generate types automatically:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 *
 * For now, these are manually maintained to match the schema.
 */

// ============================================
// Enums
// ============================================

export type UserRole = "student" | "parent" | "teacher" | "admin";
export type MeetingPlatform = "zoom" | "teams" | "other";
export type LessonStatus = "scheduled" | "active" | "completed" | "cancelled";
export type AttendanceStatus = "unknown" | "present" | "absent" | "late";
export type EnrollmentRole = "parent" | "student";
export type EnrollmentRequestStatus = "pending" | "approved" | "rejected";

// ============================================
// Table Row Types
// ============================================

export interface School {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  school_id: string;
  name: string;
  role: UserRole;
  pin: string; // bcrypt hash
  email: string | null;
  phone: string | null;
  is_active: boolean;
  email_notifications: boolean;
  created_at: string;
}

export interface Class {
  id: string;
  school_id: string;
  name: string;
  grade: number;
  created_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  class_id: string;
  created_at: string;
}

export interface ParentStudent {
  id: string;
  parent_id: string;
  student_id: string;
  last_viewed: boolean;
  created_at: string;
}

export interface LessonTemplate {
  id: string;
  class_id: string;
  teacher_id: string;
  subject: string;
  day_of_week: number; // 0 (Sunday) to 6 (Saturday)
  start_time: string; // HH:MM:SS
  duration_minutes: number;
  meeting_url: string | null;
  meeting_type: MeetingPlatform | null;
  is_recurring_link: boolean;
  created_at: string;
}

export interface LessonResource {
  url: string;
  label: string;
}

export interface LessonInstance {
  id: string;
  template_id: string;
  date: string; // YYYY-MM-DD
  meeting_url: string | null; // override — null = inherit from template
  status: LessonStatus;
  cancelled_reason: string | null;
  notes: string | null; // Teacher notes (free text, max 500 chars)
  resources: LessonResource[] | null; // External links [{url, label}]
  created_at: string;
}

export interface Attendance {
  id: string;
  lesson_instance_id: string;
  student_id: string;
  join_clicked_at: string | null;
  status: AttendanceStatus;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface Invitation {
  id: string;
  class_id: string;
  school_id: string;
  token: string;
  created_by: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EnrollmentRequest {
  id: string;
  invitation_id: string;
  name: string;
  role: EnrollmentRole;
  phone: string | null;
  email: string | null;
  children_names: string[] | null;
  status: EnrollmentRequestStatus;
  reject_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  school_id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// Supabase Database Type (for createClient<Database>)
// ============================================

export interface Database {
  public: {
    Tables: {
      school: { Row: School; Insert: Omit<School, "id" | "created_at">; Update: Partial<Omit<School, "id">> };
      user: { Row: User; Insert: Omit<User, "id" | "created_at" | "is_active">; Update: Partial<Omit<User, "id">> };
      class: { Row: Class; Insert: Omit<Class, "id" | "created_at">; Update: Partial<Omit<Class, "id">> };
      student: { Row: Student; Insert: Omit<Student, "id" | "created_at">; Update: Partial<Omit<Student, "id">> };
      parent_student: { Row: ParentStudent; Insert: Omit<ParentStudent, "id" | "created_at">; Update: Partial<Omit<ParentStudent, "id">> };
      lesson_template: { Row: LessonTemplate; Insert: Omit<LessonTemplate, "id" | "created_at" | "is_recurring_link">; Update: Partial<Omit<LessonTemplate, "id">> };
      lesson_instance: { Row: LessonInstance; Insert: Omit<LessonInstance, "id" | "created_at" | "status">; Update: Partial<Omit<LessonInstance, "id">> };
      attendance: { Row: Attendance; Insert: Omit<Attendance, "id" | "created_at" | "status">; Update: Partial<Omit<Attendance, "id">> };
      invitation: { Row: Invitation; Insert: Omit<Invitation, "id" | "created_at" | "is_active">; Update: Partial<Omit<Invitation, "id">> };
      enrollment_request: { Row: EnrollmentRequest; Insert: Omit<EnrollmentRequest, "id" | "created_at" | "status">; Update: Partial<Omit<EnrollmentRequest, "id">> };
      admin_audit_log: { Row: AdminAuditLog; Insert: Omit<AdminAuditLog, "id" | "created_at">; Update: never };
    };
    Enums: {
      user_role: UserRole;
      meeting_platform: MeetingPlatform;
      lesson_status: LessonStatus;
      attendance_status: AttendanceStatus;
      enrollment_role: EnrollmentRole;
      enrollment_status: EnrollmentRequestStatus;
    };
  };
}
