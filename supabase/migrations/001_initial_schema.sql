-- ============================================
-- SchoolHub — Initial Schema (PRD v3.0)
-- 11 Tables: School, User, Student, ParentStudent, Class,
--   LessonTemplate, LessonInstance, Attendance,
--   Invitation, EnrollmentRequest, AdminAuditLog
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. School
-- ============================================
CREATE TABLE school (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. User (all roles: student, parent, teacher, admin)
-- ============================================
CREATE TYPE user_role AS ENUM ('student', 'parent', 'teacher', 'admin');

CREATE TABLE "user" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  pin TEXT NOT NULL,                -- bcrypt hash, 6-digit PIN
  email TEXT,                       -- optional, for teachers/admins/parents
  phone TEXT,                       -- optional, for parents/students with own phone
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_school_id ON "user"(school_id);
CREATE INDEX idx_user_role ON "user"(role);
-- PIN lookup needs to scan all active users per school (no index on hash)

-- ============================================
-- 3. Class
-- ============================================
CREATE TABLE class (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  name TEXT NOT NULL,               -- e.g., "ז'2", "ח'1"
  grade INTEGER NOT NULL,           -- e.g., 7, 8
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_class_school_id ON class(school_id);

-- ============================================
-- 4. Student (links user to class)
-- ============================================
CREATE TABLE student (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES class(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, class_id)
);

CREATE INDEX idx_student_class_id ON student(class_id);
CREATE INDEX idx_student_user_id ON student(user_id);

-- ============================================
-- 5. ParentStudent (join table — supports child picker)
-- ============================================
CREATE TABLE parent_student (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  last_viewed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

CREATE INDEX idx_parent_student_parent ON parent_student(parent_id);
CREATE INDEX idx_parent_student_student ON parent_student(student_id);

-- ============================================
-- 6. LessonTemplate (recurring definition)
-- ============================================
CREATE TYPE meeting_platform AS ENUM ('zoom', 'teams', 'other');

CREATE TABLE lesson_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES class(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES "user"(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,            -- e.g., "מתמטיקה", "אנגלית"
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  meeting_url TEXT,                 -- recurring Zoom/Teams link (if set)
  meeting_type meeting_platform,
  is_recurring_link BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_template_class ON lesson_template(class_id);
CREATE INDEX idx_lesson_template_teacher ON lesson_template(teacher_id);

-- ============================================
-- 7. LessonInstance (specific occurrence)
-- ============================================
CREATE TYPE lesson_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');

CREATE TABLE lesson_instance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES lesson_template(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meeting_url TEXT,                 -- override (null = inherit from template)
  status lesson_status NOT NULL DEFAULT 'scheduled',
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, date)
);

CREATE INDEX idx_lesson_instance_template ON lesson_instance(template_id);
CREATE INDEX idx_lesson_instance_date ON lesson_instance(date);

-- ============================================
-- 8. Attendance (intent + confirmation)
-- ============================================
CREATE TYPE attendance_status AS ENUM ('unknown', 'present', 'absent', 'late');

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_instance_id UUID NOT NULL REFERENCES lesson_instance(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  join_clicked_at TIMESTAMPTZ,     -- student clicked "Join" in SchoolHub
  status attendance_status NOT NULL DEFAULT 'unknown',
  confirmed_by UUID REFERENCES "user"(id),  -- teacher who confirmed
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lesson_instance_id, student_id)
);

CREATE INDEX idx_attendance_instance ON attendance(lesson_instance_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);

-- ============================================
-- 9. Invitation (enrollment link per class)
-- ============================================
CREATE TABLE invitation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES class(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,       -- 12-char alphanumeric, URL-safe
  created_by UUID NOT NULL REFERENCES "user"(id),
  expires_at TIMESTAMPTZ,           -- null = no expiry
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_invitation_token ON invitation(token);
CREATE INDEX idx_invitation_class ON invitation(class_id);

-- ============================================
-- 10. EnrollmentRequest (waiting list)
-- ============================================
CREATE TYPE enrollment_role AS ENUM ('parent', 'student');
CREATE TYPE enrollment_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE enrollment_request (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invitation_id UUID NOT NULL REFERENCES invitation(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role enrollment_role NOT NULL,
  phone TEXT,
  email TEXT,
  children_names TEXT[],            -- for parents: names of children to enroll
  status enrollment_status NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  reviewed_by UUID REFERENCES "user"(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enrollment_request_invitation ON enrollment_request(invitation_id);
CREATE INDEX idx_enrollment_request_status ON enrollment_request(status);

-- ============================================
-- 11. AdminAuditLog
-- ============================================
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES school(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id),
  action TEXT NOT NULL,             -- e.g., 'create_user', 'reset_pin', 'approve_enrollment'
  target_type TEXT NOT NULL,        -- e.g., 'user', 'class', 'enrollment_request'
  target_id UUID,
  details JSONB,                    -- additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_school ON admin_audit_log(school_id);
CREATE INDEX idx_audit_log_user ON admin_audit_log(user_id);
CREATE INDEX idx_audit_log_created ON admin_audit_log(created_at DESC);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- SECURITY ARCHITECTURE (MVP):
-- SchoolHub uses PIN-based auth (not Supabase Auth), so we enforce access
-- in Next.js API routes using the service_role key (which bypasses RLS).
--
-- RLS is enabled as DEFENSE-IN-DEPTH: if the anon key is ever leaked,
-- attackers can only read active invitations and insert enrollment requests.
-- All other tables are locked to anon users by default (no SELECT/INSERT policies).
--
-- The anon key is ONLY used for:
--   1. Public join page — read invitation by token
--   2. Submit enrollment request — insert into enrollment_request
--
-- All other operations go through API routes with service_role.
-- TODO (Sprint 2+): Add per-user RLS policies using custom JWT claims.

ALTER TABLE school ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE class ENABLE ROW LEVEL SECURITY;
ALTER TABLE student ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_instance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS. Anon key used only for:
-- 1. Public join page (read invitation by token)
-- 2. Submit enrollment request
-- All other operations use service_role via API routes.

-- Allow anon to read invitation by token (for public join page)
CREATE POLICY "anon_read_invitation" ON invitation
  FOR SELECT USING (is_active = true);

-- Allow anon to insert enrollment requests (public registration)
CREATE POLICY "anon_insert_enrollment" ON enrollment_request
  FOR INSERT WITH CHECK (true);

-- Service role has full access (used by API routes)
-- Supabase automatically grants service_role full access when RLS is enabled
