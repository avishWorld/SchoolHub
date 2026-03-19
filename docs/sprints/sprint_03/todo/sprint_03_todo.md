# Sprint 03 — Task List

> CTO creates tasks. DEV checks them off. QA verifies.

## Dev TODO

| # | Task | Owner | Size | Status | Acceptance Criteria |
|---|------|-------|------|--------|---------------------|
| **Block A: Weekly Views** | | | | | |
| D55 | Student weekly schedule component + day picker | DEV:frontend | M | [x] | Toggle daily/weekly. Weekly = 6-day grid with subject+time+status colors. Click day → daily detail. Week navigation prev/next. |
| D56 | Parent weekly view + "all children together" mode | DEV:frontend | L | [x] | Toggle daily/weekly. "כל הילדים" mode: each child gets unique color (bg tint). Filter by child or show all. Combined schedule sorted by time. |
| D57 | Teacher multi-class view + filtering | DEV:frontend | L | [x] | Toggle daily/weekly. Multi-select checkboxes for classes. "All classes" default. Each class has color tag. Daily view = sorted by time. Weekly = grid per class. |
| **Block B: Lesson Content** | | | | | |
| D58 | Run DB migration 003 (notes + resources) | DEV:backend | S | [x] | Run `003_lesson_notes_resources.sql` in Supabase. Verify columns exist. |
| D59 | Build notes + resources API | DEV:backend | M | [x] | PUT `/api/lessons/:id/content` — update notes (text, max 500) + resources (array of {url, label}, max 5). Validate URLs. |
| D60 | Teacher UI: edit notes + resources per lesson | DEV:frontend | M | [x] | In TeacherLessons, expand a lesson → text area for notes + add/remove resource links. Save button. |
| D61 | Student/Parent view: display notes + resources | DEV:frontend | M | [x] | StudentSchedule shows notes below time/teacher. Resource links as clickable chips. Opens in new tab. |
| **Block C: Advanced AI** | | | | | |
| D62 | Daily Digest API (Claude Sonnet) | DEV:backend | L | [x] | POST `/api/ai/daily-digest` — analyzes today's data → generates Hebrew insights (attendance trends, missing links, active classes). Uses Sonnet model. |
| D63 | Daily Digest admin page | DEV:frontend | M | [x] | Admin sees AI-generated summary card with bullet points. Refresh button. Date selector. |
| D64 | Smart Reminders (missing link notifications) | DEV:backend | M | [x] | GET `/api/notifications/reminders` — finds lessons starting in <30 min without links. Returns list of teacher + lesson. |
| D65 | Reminders in-app notification UI | DEV:frontend | M | [x] | Teacher dashboard shows yellow banner: "⚠️ חסר קישור לשיעור X בעוד 30 דקות". Dismissible. |
| D66 | Student at Risk algorithm | DEV:backend | L | [x] | GET `/api/ai/at-risk` — finds students with <50% join rate in last 7 days. Returns list with name, class, join %, last active. |
| D67 | Student at Risk admin report | DEV:frontend | M | [x] | Admin page with table of at-risk students. Color-coded severity. Click → detail. |
| D68 | Schedule OCR — image upload UI | DEV:frontend | M | [x] | Teacher/admin uploads image of schedule → preview → confirm. Drag-and-drop or file picker. |
| D69 | Schedule OCR — Claude Vision API | DEV:backend | L | [x] | POST `/api/ai/ocr-schedule` — sends image to Claude Vision → extracts class, subjects, times → returns structured data. |
| D70 | Schedule OCR — auto-fill templates | DEV:frontend | M | [x] | OCR result displayed as editable table → confirm → creates LessonTemplates + instances via existing API. |
| **Block D: Deployment** | | | | | |
| D71 | Write Playwright E2E tests | QA | L | [ ] | 5+ E2E scenarios covering login, schedule, enrollment, AI, attendance. |
| D72 | Vercel deployment config | DEV | M | [x] | `vercel.json`, env vars configured, build succeeds on Vercel. Edge Runtime compatible. |
| D73 | Real email integration (Resend) | DEV:backend | M | [x] | Morning briefing sends actual emails via Resend free tier (100/day). |

---

## QA TODO

| # | Test Scenario | Type | Framework | Status | Expected Result |
|---|---------------|------|-----------|--------|-----------------|
| Q28 | Student weekly view — all days shown | Unit | Vitest | [ ] | 6-day grid renders correctly |
| Q29 | Parent all-children view — color coding | Unit | Vitest | [ ] | Each child has unique color |
| Q30 | Teacher multi-class filter | Unit | Vitest | [ ] | Checkbox filters work, grid updates |
| Q31 | Notes + resources save and display | Unit | Vitest | [ ] | PUT saves, GET returns, student sees |
| Q32 | Daily digest — AI generates insights | Unit | Vitest | [ ] | Sonnet returns structured Hebrew text |
| Q33 | Student at risk — detection logic | Unit | Vitest | [ ] | <50% join rate flagged correctly |
| Q34 | OCR — image → structured data | Unit | Vitest | [ ] | Claude Vision returns parseable schedule |
| Q35 | E2E: Full flow with weekly views | E2E | Playwright | [ ] | Login → weekly → click day → join |
| Q36 | E2E: Teacher adds notes + student sees them | E2E | Playwright | [ ] | Note saved → visible in student view |

---

## Notes

_(Add notes, blockers, decisions here as you work)_
- **Decision 011:** notes + resources on LessonInstance. FOUNDER approved DB change 2026-03-20.
- **Decision 012:** Weekly views for all roles. Reuses /api/schedule/week endpoint.
