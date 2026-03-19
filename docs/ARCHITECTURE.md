# Technical Architecture

> CTO-owned document. Updated whenever the system structure changes.

---

## 1. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14 + TypeScript + Tailwind CSS | App Router, SSR, RSC, built-in API routes, excellent DX |
| **Backend** | Next.js API Routes + Server Actions | No separate server needed, same deployment |
| **Database** | Supabase (PostgreSQL) | Free tier, real-time subscriptions, Row Level Security, auth |
| **AI/LLM** | Claude API (Anthropic) | Course requirement — link analysis, pattern detection |
| **Hosting** | Vercel | Free tier, native Next.js support, edge functions |
| **Styling** | Tailwind CSS + shadcn/ui | RTL support, accessible components, rapid development |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────┐
│                   Client                     │
│         (Next.js App — Browser/Mobile)       │
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Student  │ │ Teacher  │ │ Admin        │ │
│  │ /Parent  │ │ Dashboard│ │ Dashboard    │ │
│  │ Portal   │ │          │ │              │ │
│  └────┬─────┘ └────┬─────┘ └──────┬───────┘ │
└───────┼─────────────┼──────────────┼─────────┘
        │             │              │
        ▼             ▼              ▼
┌─────────────────────────────────────────────┐
│           Next.js API Routes                 │
│         (Server-side logic)                  │
│                                              │
│  ┌────────┐ ┌────────┐ ┌──────────┐ ┌───────┐ │
│  │ Auth   │ │Lessons │ │ Admin    │ │  AI   │ │
│  │ (PIN)  │ │Service │ │ Service  │ │Service│ │
│  └───┬────┘ └───┬────┘ └────┬─────┘ └──┬────┘ │
└───────┼─────────────┼──────────────┼─────────┘
        │             │              │
        ▼             ▼              ▼
┌───────────────┐ ┌──────────┐ ┌────────────┐
│   Supabase    │ │ Claude   │ │ External   │
│  (PostgreSQL) │ │ API      │ │ (Zoom/     │
│  + Realtime   │ │          │ │  Teams)    │
└───────────────┘ └──────────┘ └────────────┘
```

---

## 3. Key Components

### Component 1: Auth Module (PIN-based)
- **Purpose:** כניסה פשוטה עם PIN — בלי רישום, בלי סיסמה
- **Location:** `backend/modules/auth/`
- **How:** PIN → lookup in DB → return user + role → set session cookie
- **Depends on:** Supabase

### Component 2: Schedule Module
- **Purpose:** ניהול מערכת שעות שבועית (LessonTemplate) + שיעורים ספציפיים (LessonInstance) + קישורים
- **Location:** `backend/modules/schedule/`
- **How:** Admin creates weekly templates → system auto-generates instances → teacher adds links (recurring or per-instance) → students see daily view. "Copy from last week" clones links.
- **Depends on:** Auth, Supabase

### Component 3: Dashboard Module
- **Purpose:** דאשבורד מנהל — תצוגה בזמן אמת של סטטוס בית הספר
- **Location:** `backend/modules/dashboard/`
- **How:** Aggregates schedule data, attendance, missing links
- **Depends on:** Schedule, Auth, Supabase Realtime

### Component 4: Admin Module
- **Purpose:** ניהול משתמשים, כיתות, מקצועות ו-PINs
- **Location:** `backend/modules/admin/`
- **How:** CRUD for schools, classes, users. Auto-generate unique PINs. Export PIN lists.
- **Depends on:** Auth, Supabase

### Component 5: Enrollment Module
- **Purpose:** הצטרפות לכיתה דרך קישור הזמנה — רישום עצמי + רשימת המתנה + אישור
- **Location:** `backend/modules/enrollment/`
- **How:** Teacher/Admin generates invite link → parent/student self-registers → enters waiting list → teacher approves → PIN auto-generated
- **Depends on:** Auth, Admin, Supabase

### Component 6: AI Service
- **Purpose:** ניתוח קישורים, זיהוי דפוסי היעדרות
- **Location:** `backend/modules/ai/`
- **How:** Claude API — receives text, extracts Zoom/Teams URLs, detects patterns
- **Depends on:** Claude API, Schedule

---

## 4. Data Model

```
School
  - id: uuid (PK)
  - name: string
  - created_at: timestamp

User
  - id: uuid (PK)
  - school_id: uuid (FK → School)
  - name: string
  - role: enum (student, parent, teacher, admin)
  - pin: string (hashed, 6 digits, bcrypt cost 12)
  - email: string? (optional, for teachers/admins)
  - phone: string? (optional — for parents, students with own phone)
  - is_active: boolean (default true — deactivation without deletion)
  - created_at: timestamp

Student
  - id: uuid (PK)
  - user_id: uuid (FK → User)
  - class_id: uuid (FK → Class)

ParentStudent (join table — supports "child picker" flow)
  - id: uuid (PK)
  - parent_id: uuid (FK → User where role=parent)
  - student_id: uuid (FK → Student)
  - last_viewed: boolean (default false) — remembers last child viewed

Class
  - id: uuid (PK)
  - school_id: uuid (FK → School)
  - name: string (e.g., "ז'2", "ח'1")
  - grade: integer

LessonTemplate (recurring definition — "Math, every Tuesday at 8:00")
  - id: uuid (PK)
  - class_id: uuid (FK → Class)
  - teacher_id: uuid (FK → User where role=teacher)
  - subject: string (e.g., "מתמטיקה", "אנגלית")
  - day_of_week: integer (0-6)
  - start_time: time
  - duration_minutes: integer
  - meeting_url: string? (recurring Zoom/Teams link)
  - meeting_type: enum (zoom, teams, other)?
  - is_recurring_link: boolean (default false — if true, link auto-fills all instances)
  - created_at: timestamp

LessonInstance (specific occurrence — "Math, Tuesday March 18 at 8:00")
  - id: uuid (PK)
  - template_id: uuid (FK → LessonTemplate)
  - date: date
  - meeting_url: string? (override — if null, inherits from template)
  - status: enum (scheduled, active, completed, cancelled)
  - cancelled_reason: string?
  - created_at: timestamp

Attendance (intent + confirmation model)
  - id: uuid (PK)
  - lesson_instance_id: uuid (FK → LessonInstance)
  - student_id: uuid (FK → Student)
  - join_clicked_at: timestamp? (student clicked "Join" in SchoolHub)
  - status: enum (unknown, present, absent, late) (teacher confirms)
  - confirmed_by: uuid? (FK → User, teacher who confirmed)
  - confirmed_at: timestamp?

AdminAuditLog
  - id: uuid (PK)
  - school_id: uuid (FK → School)
  - user_id: uuid (FK → User, who performed the action)
  - action: string (e.g., "create_user", "reset_pin", "approve_enrollment")
  - target_type: string (e.g., "user", "class", "enrollment_request")
  - target_id: uuid
  - details: jsonb? (additional context)
  - created_at: timestamp

Invitation (enrollment link per class)
  - id: uuid (PK)
  - class_id: uuid (FK → Class)
  - school_id: uuid (FK → School)
  - token: string (12-char alphanumeric, unique)
  - created_by: uuid (FK → User, teacher/admin)
  - expires_at: timestamp? (null = no expiry)
  - is_active: boolean (default true)
  - created_at: timestamp

EnrollmentRequest (waiting list)
  - id: uuid (PK)
  - invitation_id: uuid (FK → Invitation)
  - name: string
  - role: enum (parent, student)
  - phone: string?
  - email: string?
  - children_names: string[] (for parents — names of children to enroll)
  - status: enum (pending, approved, rejected)
  - reviewed_by: uuid? (FK → User, teacher/admin who approved/rejected)
  - reviewed_at: timestamp?
  - created_at: timestamp
```

---

## 5. API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login` | Login with PIN → return session | Public |
| POST | `/api/auth/logout` | End session | Any |
| GET | `/api/schedule/today` | Get today's lessons for current user | Student/Parent |
| GET | `/api/schedule/week` | Get weekly schedule | Student/Parent |
| GET | `/api/schedule/templates/:classId` | Get weekly schedule templates for a class | Teacher/Admin |
| POST | `/api/schedule/templates` | Create a lesson template (recurring) | Admin |
| PUT | `/api/schedule/templates/:id` | Update template (propagates to future instances) | Admin/Teacher |
| POST | `/api/lessons/:id/link` | Add/update meeting link to a lesson instance | Teacher |
| POST | `/api/lessons/copy-week` | Copy last week's links to this week | Teacher |
| PUT | `/api/lessons/:id/cancel` | Cancel a specific lesson instance | Teacher/Admin |
| GET | `/api/dashboard/overview` | School-wide status | Admin |
| GET | `/api/dashboard/attendance` | Attendance stats | Admin |
| POST | `/api/ai/parse-link` | Extract Zoom/Teams URL from text | Teacher |
| GET | `/api/admin/classes` | List all classes | Admin |
| POST | `/api/admin/classes` | Create a new class | Admin |
| GET | `/api/admin/users` | List users (filterable by role) | Admin |
| POST | `/api/admin/users` | Create user (student/teacher/parent) + auto-generate PIN | Admin |
| PUT | `/api/admin/users/:id` | Update user details | Admin |
| POST | `/api/admin/users/:id/reset-pin` | Reset PIN for a user | Admin |
| GET | `/api/admin/pins/export` | Export PIN list (CSV/print) | Admin |
| GET | `/api/parent/children` | Get linked children for parent | Parent |
| POST | `/api/enrollment/invite` | Create invitation link for a class | Teacher/Admin |
| DELETE | `/api/enrollment/invite/:id` | Revoke an invitation link | Teacher/Admin |
| GET | `/api/enrollment/invite/:token` | Get class info from invite token (public join page) | Public |
| POST | `/api/enrollment/request` | Submit enrollment request (parent/student self-registration) | Public |
| GET | `/api/enrollment/requests` | List pending enrollment requests for teacher's classes | Teacher/Admin |
| PUT | `/api/enrollment/requests/:id` | Approve or reject an enrollment request | Teacher/Admin |
| POST | `/api/attendance/:instanceId` | Record join intent (student clicked "Join") | Student/Parent |
| PUT | `/api/attendance/:id/confirm` | Teacher confirms/overrides attendance status | Teacher |
| GET | `/api/admin/audit-log` | View admin action history | Admin |
| POST | `/api/notifications/morning-briefing` | Trigger morning briefing emails (cron job) | System |

---

## 6. Folder Structure (Target)

```
SchoolHub/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (RTL, fonts)
│   ├── page.tsx                  # Landing → PIN login
│   ├── student/
│   │   └── page.tsx              # Student daily schedule
│   ├── teacher/
│   │   ├── page.tsx              # Teacher dashboard
│   │   └── lessons/
│   │       └── page.tsx          # Manage lessons
│   ├── parent/
│   │   └── page.tsx              # Parent child picker + schedule
│   ├── join/
│   │   └── [token]/
│   │       └── page.tsx          # Public enrollment page (from invite link)
│   ├── admin/
│   │   ├── page.tsx              # Admin dashboard (status overview)
│   │   ├── classes/
│   │   │   └── page.tsx          # Manage classes
│   │   ├── schedule/
│   │   │   └── page.tsx          # Weekly schedule builder (template management)
│   │   ├── users/
│   │   │   └── page.tsx          # Manage students, teachers, parents
│   │   ├── pins/
│   │   │   └── page.tsx          # Generate / export PINs
│   │   ├── enrollment/
│   │   │   └── page.tsx          # Pending enrollment requests
│   │   └── audit/
│   │       └── page.tsx          # Admin action history
│   └── api/
│       ├── auth/
│       ├── schedule/
│       ├── lessons/
│       ├── dashboard/
│       └── ai/
├── components/                   # Shared UI components
│   ├── ui/                       # shadcn/ui components
│   ├── schedule/                 # Schedule-specific components
│   └── layout/                   # Header, sidebar, etc.
├── lib/                          # Shared utilities
│   ├── supabase.ts               # Supabase client
│   ├── claude.ts                 # Claude API client
│   └── utils.ts                  # General utilities
├── types/                        # TypeScript type definitions
└── styles/                       # Global styles (RTL, fonts)
```

---

## 7. Key Decisions

See `docs/DECISIONS.md` for the full decision log.

### Summary:
1. **Next.js over separate frontend+backend** — simpler deployment, single codebase
2. **Supabase over Firebase** — PostgreSQL, Row Level Security, free tier sufficient
3. **PIN auth over email/password** — target audience (parents/kids) needs simplicity
4. **shadcn/ui over Material UI** — better Tailwind integration, accessible, customizable
