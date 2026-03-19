# Decision Log

> Document important technical decisions here.
> This helps your future self (and teammates) understand WHY things are the way they are.

---

## Decision 001: Tech Stack — Next.js + Supabase

**Date:** 2026-03-17
**Status:** Accepted
**Decided by:** [CTO]

**Context:**
SchoolHub needs a web app that supports 4 user roles, real-time data, RTL Hebrew, and simple deployment. The team is small, development speed matters, and budget is near zero.

**Options Considered:**
1. **React + Express + PostgreSQL** — Full control, but two deployments, more boilerplate
2. **Next.js + Supabase** — Full-stack in one, real-time built-in, free tier, fast to build
3. **Vue + Firebase** — Good DX, but Firestore is document-based (less ideal for relational data like schedules)

**Decision:**
We chose Next.js 14 (App Router) + Supabase (PostgreSQL + Realtime + Auth helpers).

**Rationale:**
- Single codebase and deployment (Vercel)
- Supabase gives us PostgreSQL (relational — perfect for schedules/classes/users) with Row Level Security
- Realtime subscriptions for admin dashboard
- Free tier handles 500 concurrent users easily
- shadcn/ui components work natively with Tailwind and support RTL

**Consequences:**
- Locked into Vercel ecosystem (acceptable for course project)
- Team needs to learn App Router patterns (Server Components, Server Actions)

---

## Decision 002: PIN-based Authentication

**Date:** 2026-03-17
**Status:** Accepted
**Decided by:** [CTO] + [FOUNDER]

**Context:**
Target users include parents who may not be tech-savvy and young students. Traditional email/password creates friction. The goal is "one code, one click, you're in class."

**Options Considered:**
1. **Email + Password** — Standard, but creates registration friction for parents/students
2. **PIN code (4-6 digits)** — Simple, fast, no email required, assigned by school
3. **Magic link (email)** — No password, but requires email access during class time

**Decision:**
PIN-based login. School admin generates PINs for each user.

**Rationale:**
- A parent with 2 kids at home shouldn't need to remember emails and passwords
- PIN can be shared on paper, WhatsApp, or printed
- Simple enough for young students
- School controls who gets access

**Consequences:**
- PINs must be hashed in DB (security)
- PIN collision prevention needed per school
- No "forgot password" flow — admin resets PINs
- Less secure than email+password (acceptable for school context, not banking)

---

## Decision 003: Accessibility — WCAG 2.1 AA

**Date:** 2026-03-17
**Status:** Accepted
**Decided by:** [CTO]

**Context:**
SchoolHub serves diverse users including young students and parents with varying tech literacy. The PRD mandates WCAG 2.1 AA compliance, screen reader support, and minimum 16px text. This isn't just a nice-to-have — it's a core requirement for a school system.

**Options Considered:**
1. **No specific accessibility standard** — Fastest to build, but excludes users with disabilities
2. **WCAG 2.1 AA** — Industry standard, achievable with shadcn/ui + Tailwind
3. **WCAG 2.1 AAA** — Highest standard, too costly for MVP timeline

**Decision:**
WCAG 2.1 AA as baseline. Use shadcn/ui (accessible by default), semantic HTML, keyboard navigation, and Lighthouse audits.

**Rationale:**
- shadcn/ui components are ARIA-compliant out of the box
- Tailwind supports RTL and contrast utilities
- School systems should be accessible to all students
- Lighthouse CI can enforce this automatically

**Consequences:**
- All interactive elements must be keyboard-navigable
- Color must never be the only way to convey information (icons/text too)
- Minimum contrast ratio 4.5:1 for text, 3:1 for large text
- Adds ~10% development time for testing and fixes

---

## Decision 004: Parent-Student Relationship — Join Table

**Date:** 2026-03-17
**Status:** Accepted
**Decided by:** [CTO]

**Context:**
The PRD requires parents to switch between multiple children (Story 2). The original design used `parent_ids: uuid[]` on the Student table, which is a PostgreSQL array — harder to query, no referential integrity, no place to store "last viewed child" preference.

**Options Considered:**
1. **Array field on Student** — Simple, but no FK constraints, can't store per-relationship metadata
2. **Join table (ParentStudent)** — Proper relational design, supports metadata like `last_viewed`

**Decision:**
ParentStudent join table with `parent_id`, `student_id`, and `last_viewed` flag.

**Rationale:**
- Proper foreign keys ensure data integrity
- `last_viewed` flag lets us remember which child was last viewed (PRD AC: "הילד האחרון שנצפה נשמר")
- Easy to query both directions: "give me all children of parent X" and "give me all parents of student Y"

**Consequences:**
- One extra table in the schema
- Slightly more complex queries (JOIN instead of array contains)
- Better data integrity and extensibility

---

## Decision 005: Enrollment via Invitation Links + Approval

**Date:** 2026-03-17
**Status:** Accepted
**Decided by:** [CTO] + [FOUNDER]

**Context:**
The PRD requires easy onboarding for parents and students while maintaining access control. The admin-only approach (Admin creates every user manually) doesn't scale — a school with 500 students means the admin types 500+ entries. But open registration without control is a security risk for a school system.

**Options Considered:**
1. **Admin-only creation** — Admin manually adds every user and distributes PINs. Secure, but slow and doesn't scale.
2. **Open registration** — Anyone can sign up. Fast, but no access control — dangerous for a school.
3. **Invitation link + approval** — Teacher sends a class-specific link, parents/students self-register, then wait for teacher/admin approval.
4. **Pre-loaded class list** — Admin uploads a CSV, system creates all users. Fast, but requires data prep.

**Decision:**
Invitation link + manual approval (option 3) as primary flow. Admin-only creation (option 1) remains as secondary path for edge cases.

**Rationale:**
- Teacher sends one link to the WhatsApp group → 30 parents register themselves in minutes
- Approval step ensures no unauthorized access (teacher knows every parent in the class)
- Self-service reduces admin burden by 90%
- Link can be revoked instantly if leaked
- Supports the multi-parent reality: each parent registers independently, system detects duplicates by phone/email
- Students with their own phone can also self-register

**Consequences:**
- Two new DB tables: `Invitation` (tokens per class) and `EnrollmentRequest` (waiting list)
- `phone` field added to User table (students/parents may have their own phone)
- Teachers need a "pending requests" view in their dashboard
- Need duplicate detection logic (same phone/email = same parent?)
- PIN generation moves from admin-only to also triggered by enrollment approval
- Token security: 12-char alphanumeric, with optional expiry

---

## Decision 006: LessonTemplate + LessonInstance (Two-Table Lesson Model)

**Date:** 2026-03-17
**Status:** Accepted
**Decided by:** [CTO]

**Context:**
The original design had a single "Lesson" table. But a lesson can be two things: a recurring definition ("Math every Tuesday at 8:00") or a specific occurrence ("Math, Tuesday March 18 at 8:00"). A single table can't cleanly represent both without duplicating data 52 times per year.

**Options Considered:**
1. **Single Lesson table with is_recurring flag** — simple, but instance-specific overrides (cancelled, different link) pollute the template
2. **LessonTemplate + LessonInstance (two tables)** — clean separation, template changes propagate, instance-level overrides
3. **Calendar-style events table** — no recurring concept, create each lesson manually (52x per year per class)

**Decision:**
Split into LessonTemplate (the recurring definition) and LessonInstance (a specific date's occurrence). Templates auto-generate instances. Teachers set links on templates (recurring) or instances (one-off).

**Consequences:**
- Template changes propagate to future instances (not past)
- "Copy from last week" copies instance links, not template links
- Cancellation is per-instance (cancelled_reason field)
- More complex queries, but cleaner data model
- Supports future: "this week's schedule is different" without destroying the template

---

## Decision 007: Attendance = Intent + Confirmation

**Date:** 2026-03-17
**Status:** Accepted
**Decided by:** [CTO]

**Context:**
Original design: student clicks "Join" → marked as present. Problem: clicking proves intent, not actual attendance. A student can click and close the tab. A parent can click for a sleeping child.

**Options Considered:**
1. **Click = Present (automatic)** — simple, but inaccurate (false positives from accidental clicks)
2. **Intent + Confirmation (two-phase)** — click records intent, teacher confirms actual attendance
3. **Zoom/Teams API integration** — read actual meeting participation data. Accurate, but complex and requires API access

**Decision:**
"Join" click records a timestamp (join_clicked_at). Default status is "unknown." In Sprint 2, the system auto-sets clicked = present, but teachers can override. This gives accurate data while keeping Sprint 1 simple.

**Consequences:**
- Attendance table has join_clicked_at (automatic) and status + confirmed_by (teacher action)
- AI features (Student at Risk) use confirmed status, falling back to click data
- Teacher dashboard shows "clicked but not confirmed" as a separate state

---

## Decision 008: 6-Digit PIN Only (Not 4-6)

**Date:** 2026-03-17
**Status:** Accepted
**Decided by:** [CTO]

**Context:**
Original design allowed 4-6 digit PINs. A 4-digit PIN has only 10,000 possibilities. Even with bcrypt, a leaked database allows brute-force of all 4-digit PINs in under a second. Rate limiting on the API is the real protection, but defense-in-depth requires a larger keyspace.

**Options Considered:**
1. **4-digit PIN** — easy to remember, but 10K combinations = trivially brute-forceable
2. **4-6 digit flexible** — user choice, but inconsistent security guarantees
3. **6-digit PIN fixed** — 1M combinations, bcrypt cost 12 = ~3.4h per PIN brute force
4. **PIN + family name** — strongest, but adds friction to login flow

**Decision:**
PINs are exactly 6 digits (1,000,000 possibilities). With bcrypt cost 12, brute-forcing one PIN takes ~3.4 hours. Combined with server-side rate limiting, this provides adequate security for a school system.

**Consequences:**
- PIN generation always produces 6-digit codes
- Slightly harder for young students to remember (mitigated: they can write it down)
- Future enhancement: PIN + family name for additional security

---

## Decision 009: Simplified Multi-Tenant Prep

**Date:** 2026-03-17
**Status:** Accepted
**Decided by:** [CTO]

**Context:**
Original design put school_id on every table. This adds WHERE school_id = X to every query in a single-tenant MVP that will never filter by school. This is premature optimization.

**Options Considered:**
1. **school_id on every table** — full multi-tenant ready, but adds WHERE clause to every query in MVP
2. **school_id on core tables only** — reduced query complexity, multi-tenant via JOINs when needed
3. **No school_id at all** — simplest MVP, but multi-tenant migration requires schema + data migration

**Decision:**
school_id on core tables: School, User, Class. Enrollment tables (Invitation, EnrollmentRequest) also keep school_id for query efficiency (avoid JOIN chains on public-facing endpoints). Other tables (LessonTemplate, LessonInstance, Attendance) get school context through JOINs. When multi-tenant is needed, we add school_id to hot-path tables only.

**Consequences:**
- 50% fewer school_id clauses in queries
- Simpler RLS policies
- Multi-tenant migration requires adding columns later (1 sprint of work, not 0)
- Acceptable trade-off for MVP velocity

---

## Decision 010: AI Cost Controls

**Date:** 2026-03-17
**Status:** Accepted
**Decided by:** [CTO]

**Context:**
Claude API calls cost money. With 30 teachers parsing links + daily digests + student-at-risk analysis, costs could spiral. No cap was defined.

**Options Considered:**
1. **No limits** — simplest, but costs could spiral to $100+/month
2. **Hard monthly cap** — budget safety, but teachers hit the wall mid-month
3. **Cap + caching + rate limit + model selection** — layered controls, graceful degradation
4. **No AI in MVP** — eliminates cost risk, but fails course requirement

**Decision:**
Monthly cap of 1000 API calls. Per-user rate limit of 20 parses/day. Response caching for identical inputs (24h TTL). Haiku for link parsing (cheap + fast), Sonnet for digests (better reasoning). Graceful degradation: if AI is unavailable, manual input always works.

**Consequences:**
- Need a usage counter table or rate-limit middleware
- Cache layer (Redis or in-memory) for AI responses
- Two Claude model configurations instead of one
- Manual fallback must be tested and maintained

---

## Decision 011: Lesson Notes + Resources on LessonInstance

**Date:** 2026-03-20
**Status:** Accepted
**Context:** Teachers need to attach homework, external links, and notes to specific lessons. Currently LessonInstance only has meeting_url.

**Options:**
A) Add `notes` and `resources` columns to LessonInstance
B) Create a separate LessonResource table with FK to LessonInstance
C) Use a single `metadata` JSONB column for everything

**Decision:** Option A — add `notes` (TEXT) and `resources` (JSONB array) directly to LessonInstance.

**Rationale:** Simplest approach. Notes is a single text field. Resources is a small array (max 5 items). No need for a separate table or complex metadata. JSONB array gives flexibility for the resource format [{url, label}] without schema overhead.

**Consequences:**
- DB migration: `003_lesson_notes_resources.sql`
- TypeScript types updated with `LessonResource` interface
- Teacher UI needs edit form for notes + resources
- Student/Parent views need to display notes + resources below lesson info
- FOUNDER approved the DB schema change (2026-03-20)

---

## Decision 012: Weekly View for All Roles

**Date:** 2026-03-20
**Status:** Accepted
**Context:** Students, parents, and teachers can only see daily/per-class views. Users need weekly overview with day selection.

**Decision:** Add weekly view toggle to all 3 roles, reusing `/api/schedule/week` endpoint with different UI per role.

**Rationale:** The API already exists (D26). Only frontend work needed. Each role gets a tab/toggle for daily vs weekly. Parent additionally gets "all children" combined view with color-coding per child. Teacher gets multi-class filtering.

**Consequences:**
- New components: StudentWeekView, ParentWeekView, TeacherAllClassesView
- Color palette needed for child/class differentiation (max 8 colors)
- No new API endpoints needed — reuses `/api/schedule/week` and `/api/schedule/today`
