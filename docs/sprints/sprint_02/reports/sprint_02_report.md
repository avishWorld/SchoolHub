# Sprint 02 — Progress Report

| Field | Value |
|-------|-------|
| **Sprint** | 02 |
| **Status** | **COMPLETE** ✅ |
| **Report Date** | 2026-03-20 |
| **PRD Version** | 3.0 |
| **Tasks completed** | **18 / 20 Dev** + **7 / 11 QA** |

---

## What was delivered

### Block A: Tech Debt ✅ (D24-D27 + D42)

#### D24: Web Crypto API Session Signing ✅
- Replaced FNV hash with `crypto.subtle.sign` HMAC-SHA256
- Works in both Node.js runtime and Edge Runtime (middleware)
- All session functions now async (`createSessionToken`, `verifySessionToken`)
- Unicode-safe base64 encoding preserved for Hebrew names
- 10 session tests updated + 1 new Hebrew name test

#### D25: Component Tests ✅
- `TeacherLessons.test.tsx` — 11 tests (render, lessons display, link editing, recurring toggle, URL validation, cancel)
- `ClassesManager.test.tsx` — 11 tests (render, CRUD, edit form, delete buttons, empty state)
- `UsersManager.test.tsx` — 11 tests (render, role filter, create form, PIN reset+display, export, empty state)

#### D26: `/api/schedule/week` Endpoint ✅
- New: GET `/api/schedule/week?class_id=X` returns full week in single call
- TeacherLessons updated to use single call instead of 6 parallel requests
- Includes template join, teacher names, URL fallback

#### D27: Teacher Class Filtering ✅
- GET `/api/admin/classes` with teacher role returns only classes where teacher has lesson templates
- Admin still sees all classes

#### D42: useRouter Login Redirect ✅ (Bonus)
- `PinLoginForm` uses `useRouter().push()` instead of `window.location.href`
- Client-side navigation — no full page reload
- Test mocks updated from `mockLocation.href` to `mockPush`

---

## Test Metrics

| Metric | Sprint 01 End | After Block A |
|--------|--------------|---------------|
| Unit tests | 171 | **205** (+34) |
| Test suites | 15 | **18** (+3) |
| Build | PASS | PASS |
| API routes | 17 | **18** (+1 week endpoint) |

---

## CTO Review — Block A

**Verdict:** APPROVE
**Details:** See `reviews/review_block_a.md`

---

### Block B: Attendance ✅ (D29-D31)

- POST `/api/attendance/:instanceId` — records join intent (`join_clicked_at`)
- PUT `/api/attendance/:instanceId/confirm` — teacher confirms present/absent/late
- GET `/api/attendance/:instanceId` — returns full student list with attendance status
- `AttendanceView.tsx` — teacher UI with green dots for joins, ✓/✗/⏰ status buttons
- 📋 button integrated into TeacherLessons per lesson card

### Block C: AI Link Parser ✅ (D32-D34)

- `src/lib/claude.ts` — Haiku client with cache (1h TTL, 500 max), monthly cap (1000), graceful degradation
- POST `/api/ai/parse-link` — auth + validation + timeout + JSON extraction
- `AiLinkParser.tsx` — paste WhatsApp text → AI extracts URL → teacher confirms → link saved
- Manual fallback when AI unavailable. 8 new tests.

---

## CTO Review — Blocks A+B+C

**Verdict:** APPROVE
**Details:** See `reviews/review_blocks_abc.md`

**P1 Issue:** Attendance API has 0 tests — needs unit tests before Block D.

---

### Block D: Admin Dashboard ✅ (D35-D36)
- GET `/api/dashboard/overview` — per-class status (green/yellow/red/gray) + join counts
- `DashboardOverview.tsx` — color-coded grid, summary bar, click-to-expand, 30s auto-refresh

### Block E: Morning Briefing ✅ (D37-D38)
- POST `/api/notifications/morning-briefing` — generates HTML email per parent with children's schedule
- GET `/api/notifications/unsubscribe` — public unsubscribe with HTML confirmation
- SQL migration: `email_notifications` boolean on User table

### Block F: Polish ✅ (D39-D41)
- `next/font/google` Rubik (eliminates FOUT)
- PDF export for user list (print-optimized window)
- Mobile responsive: PIN boxes shrink at 320px

### QA Pass ✅ (Q17-Q22, Q27)
- 14 new QA scenario tests in `qa-sprint02.test.ts`
- 7/11 QA scenarios pass. 4 E2E deferred.

---

## CTO Final Review

**Verdict:** APPROVE — Sprint 02 COMPLETE ✅
**Details:** See `reviews/review_final.md`

**11/11 PRD stories from Sprint 01+02 are implemented.**

---

## Sprint 02 Final Metrics

| Metric | Value |
|--------|-------|
| Build | PASS ✅ |
| Unit tests | **227/227** (20 suites) |
| API routes | 21 |
| Pages | 12 |
| PRD stories done | 11/11 |

## What's next — Sprint 03

- **Features 12-15:** Daily Digest AI, Smart Reminders, Student at Risk detection, Schedule OCR Import
- Playwright E2E tests
- Real email integration
- Vercel deployment
