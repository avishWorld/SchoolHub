# Sprint 02 — Task List (PRD v3.0)

> CTO creates tasks. DEV checks them off. QA verifies.

## Dev TODO

| # | Task | Owner | Size | Status | Acceptance Criteria |
|---|------|-------|------|--------|---------------------|
| **Block A: Tech Debt** | | | | | |
| D24 | Replace FNV hash with Web Crypto API for session signing | DEV:backend | M | [x] | `crypto.subtle.sign` works in both Node.js and Edge Runtime. Session tokens verified correctly. All existing tests pass |
| D25 | Add component tests for TeacherLessons, ClassesManager, UsersManager | QA | M | [x] | ≥10 tests per component: render, CRUD operations, error states |
| D26 | Add `/api/schedule/week` endpoint | DEV:backend | S | [x] | GET `/api/schedule/week?class_id=X` returns 7 days of instances. Teacher uses this instead of 6 parallel calls |
| D27 | Filter teacher classes by teacher_id | DEV:backend | S | [x] | GET `/api/admin/classes` with teacher role returns only classes where teacher has templates |
| D28 | Write Playwright E2E tests (Q12-Q16) | QA | L | [ ] | 5 E2E scenarios: student login→join, parent picker, enrollment flow, teacher links, accessibility |
| D42 | Replace `window.location.href` with `useRouter().push()` | DEV:frontend | S | [x] | PIN login redirect uses Next.js client-side routing |
| **Block B: Attendance** | | | | | |
| D29 | Build attendance recording API (`/api/attendance`) | DEV:backend | M | [x] | POST `/api/attendance/:instanceId` records `join_clicked_at`. PUT `/api/attendance/:id/confirm` for teacher override. GET returns attendance list per lesson |
| D30 | Wire "Join" button to record attendance intent | DEV:frontend | S | [x] | StudentSchedule "Join" click → POST attendance → open URL. Already partially implemented, needs to work with real API |
| D31 | Build teacher attendance view per lesson | DEV:frontend | M | [x] | Teacher selects lesson instance → sees list of students (who clicked, who didn't) → can mark present/absent |
| **Block C: AI Link Parser** | | | | | |
| D32 | Build Claude API client (`src/lib/claude.ts`) | DEV:backend | M | [x] | `parseTextForMeetingLink(text)` → returns `{ url, platform, date?, time? }`. Uses Haiku model. Handles errors gracefully |
| D33 | Build AI parse endpoint (`/api/ai/parse-link`) | DEV:backend | M | [x] | POST with `{ text }` → Claude parses → returns extracted fields. Cached (same text → same result). Rate limited. 5s timeout |
| D34 | Build teacher paste-text UI | DEV:frontend | M | [x] | Teacher pastes WhatsApp message → API call → auto-fill form fields → teacher confirms → link saved. Fallback: manual input |
| **Block D: Admin Dashboard** | | | | | |
| D35 | Build admin overview API (`/api/dashboard/overview`) | DEV:backend | M | [x] | Returns per-class status: green (active+link), yellow (missing link), red (started without link). Includes join count |
| D36 | Build admin dashboard page | DEV:frontend | M | [x] | Color-coded class grid. Click → detail modal (teacher, subject, # joined). Auto-refresh every 30s |
| **Block E: Morning Briefing** | | | | | |
| D37 | Build morning briefing API (`/api/notifications/morning-briefing`) | DEV:backend | L | [x] | Generates email content per parent. Lists child's schedule + link status. Sends via email service or logs to console (if no SMTP) |
| D38 | Build unsubscribe mechanism | DEV:backend | S | [x] | User table gets `email_notifications` boolean. Unsubscribe link in email → toggles off |
| **Block F: Polish** | | | | | |
| D39 | Switch to `next/font/google` for Rubik | DEV:frontend | S | [x] | Replace `@import` in globals.css with next/font. Eliminates FOUT |
| D40 | Add PDF export for PIN list | DEV:frontend | M | [x] | Admin users page → "ייצוא PDF" button → generates PDF with name+PIN table |
| D41 | Mobile responsive audit + fixes | DEV:frontend | M | [x] | All pages usable at 320px. PIN input, schedule, admin panels all responsive |
| D42 | Replace `window.location.href` with `useRouter().push()` | DEV:frontend | S | [ ] | PIN login redirect uses Next.js client-side routing instead of full page reload |

---

## QA TODO

| # | Test Scenario | Type | Framework | Status | Expected Result |
|---|---------------|------|-----------|--------|-----------------|
| Q17 | Attendance — Join records intent | Unit | Vitest | [x] | POST creates Attendance record with join_clicked_at |
| Q18 | Attendance — Teacher confirms | Unit | Vitest | [x] | PUT changes status to present/absent |
| Q19 | AI — Claude extracts Zoom URL from Hebrew text | Unit | Vitest | [x] | Correct URL + platform returned |
| Q20 | AI — Cache returns same result for same input | Unit | Vitest | [x] | Second call doesn't hit Claude API |
| Q21 | AI — Graceful degradation | Unit | Vitest | [x] | API down → error message + manual input fallback |
| Q22 | Dashboard — Status colors correct | Unit | Vitest | [x] | Green/yellow/red match class state |
| Q23 | E2E: Student login → schedule → join | E2E | Playwright | [~] | Deferred — needs live server |
| Q24 | E2E: Teacher paste text → AI parse → link saved | E2E | Playwright | [~] | Deferred — needs live server |
| Q25 | E2E: Admin dashboard shows live status | E2E | Playwright | [~] | Deferred — needs live server |
| Q26 | Mobile responsive: PIN login on 320px | E2E | Playwright | [~] | Deferred — needs live server |
| Q27 | Session security: Web Crypto signatures | Unit | Vitest | [x] | Tokens signed and verified correctly cross-runtime |

---

## Status Key

- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done
- `[!]` — Blocked

## Notes

- **2026-03-20 — Block A Done (D24-D27 + D42):** Tech debt cleared. Web Crypto HMAC-SHA256 replaces FNV. 33 new component tests. /api/schedule/week. Teacher class filter. useRouter.
- **2026-03-20 — Block B Done (D29-D31):** Attendance API: POST intent, PUT confirm, GET list. AttendanceView UI with ✓/✗/⏰ buttons. 📋 button in TeacherLessons.
- **2026-03-20 — Block C Done (D32-D34):** Claude Haiku client with cache (1h TTL) + monthly cap (1000). /api/ai/parse-link. AiLinkParser paste-text UI with manual fallback. 8 tests.
- **2026-03-20 — Block D Done (D35-D36):** Admin overview API with green/yellow/red/gray status. DashboardOverview with summary bar + click-to-detail. 30s auto-refresh.
- **2026-03-20 — Block E Done (D37-D38):** Morning briefing API (logs to console MVP). HTML email template with schedule table + unsubscribe. `email_notifications` field + migration.
- **2026-03-20 — Block F Done (D39-D41):** next/font/google Rubik. PDF export for user list. Mobile responsive PIN boxes (320px).
- **2026-03-20 — QA Pass (Q17-Q22, Q27):** 14 new QA scenario tests. All pass.
- **D28 (Playwright E2E) deferred** — requires separate setup, tracked for Sprint 03.
- **Sprint 02 COMPLETE** — 227 tests, 20 suites, 21 API routes, 12 pages. Build clean.
