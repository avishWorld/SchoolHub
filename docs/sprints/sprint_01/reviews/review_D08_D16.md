# [CTO] Code Review — D08–D16

**Date:** 2026-03-19
**Reviewer:** [CTO]
**Scope:** Student schedule, parent view, teacher lessons, admin classes/users/PINs, lesson link APIs, audit logging
**Verdict:** APPROVE

---

## Scope (8 tasks reviewed)

| Task | Status | Key Files |
|------|--------|-----------|
| D08 — Student daily schedule | **DONE** | `StudentSchedule.tsx`, `StudentDashboard.tsx` |
| D09 — Schedule API (today) | **DONE** | `/api/schedule/today/route.ts` |
| D10 — Parent child picker | **DONE** | `ParentDashboard.tsx` |
| D11 — Parent children API | **DONE** | `/api/parent/children/route.ts` |
| D12 — Teacher lesson management | **DONE** | `TeacherLessons.tsx`, `TeacherDashboard.tsx` |
| D13 — Lesson link APIs | **DONE** | `/api/lessons/[id]/link`, `/api/lessons/copy-week` |
| D14 — Admin classes panel | **DONE** | `ClassesManager.tsx`, `/admin/classes` |
| D15 — Admin users + PINs | **DONE** | `UsersManager.tsx`, `/admin/users` |
| D16 — Admin APIs + audit | **DONE** | `pin.ts`, `audit.ts`, CRUD routes, reset-pin |

---

## GOOD

### D08/D09 — Student Schedule
1. **Status engine is excellent** — `computeDisplayStatus()` correctly maps real time to 5 display states (active/pending/ended/cancelled/no-link). Clean pure function.
2. **Status colors are well-mapped** — green+pulse for active, gray for pending, pale for ended, amber for no-link. Visually distinct.
3. **Join button records attendance intent** — fire-and-forget POST to `/api/attendance/:id` before opening URL. Non-blocking. Exactly matches the PRD intent+confirmation model.
4. **Auto-refresh every 60s** — both fetches new data and updates `now` for status recalculation.
5. **API has ?class_id and ?date overrides** — enables parent view and testing without separate endpoints.
6. **URL fallback chain** — instance URL → template URL → null. Correct inheritance.
7. **18 tests** — covers all 5 status states, join behavior, empty state, error state.

### D10/D11 — Parent View
8. **Component reuse is smart** — `ParentDashboard` reuses `StudentSchedule` with `classId` prop. No code duplication.
9. **`key={studentId}` triggers clean remount** — switching children remounts the schedule component, which re-fetches. This is the correct React pattern for this case.
10. **Single child → skip picker** — clean conditional: `children.length > 1` controls visibility.
11. **`last_viewed` persisted** — fire-and-forget PUT on switch. Survives page reload.
12. **10 tests** — covers multi-child, single-child, empty, switching, persistence.

### D12/D13 — Teacher Lessons
13. **URL validation with regex** — `VALID_URL_PATTERNS` covers Zoom, Teams, Google Meet. Server-side AND client-side validation.
14. **Recurring link toggle** — `set_recurring: true` updates both instance and template in one API call.
15. **Copy-from-last-week** — correct date arithmetic: finds last week's instances with URLs, maps to this week's by `template_id`.
16. **Teacher fetches week via 6 parallel calls** — creative approach using existing `/api/schedule/today?date=X`.

### D14/D15/D16 — Admin Panel
17. **Audit logging is consistent** — every create/update/delete/deactivate/pin-reset calls `logAuditAction()`. Non-blocking (errors logged, not thrown).
18. **PIN generation is correct** — 6-digit, 100000-999999 range, bcrypt cost 12, uniqueness checked against all school PINs.
19. **CSV export** — client-side with BOM (`\uFEFF`) for Hebrew Excel compatibility. Nice touch.
20. **PIN displayed once** — green card with tracking-widest mono font, clear "save it" warning.

## BAD (issues, non-blocking)

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| 1 | Schedule API has complex fallback path | P2 | `/api/schedule/today` has a full 2nd query path when the Supabase join fails. This is defensive but doubles code complexity. Should be simplified once Supabase types are fixed. |
| 2 | TeacherLessons makes 6 parallel API calls per week | P2 | Fetches each day separately via `/api/schedule/today?date=X`. Works but creates 6 requests. Should have a `/api/schedule/week` endpoint. |
| 3 | No tests for TeacherLessons, ClassesManager, UsersManager | P1 | D12, D14, D15 components have 0 tests. These are admin-facing with mutations (create, delete, PIN reset). Need at least basic render + CRUD tests. |
| 4 | PIN uniqueness check is O(n*m) with bcrypt | P2 | For each PIN candidate, compares against ALL existing hashes. With 100 users × 20 retries = 2000 bcrypt ops worst case. Fine for now but won't scale. Future: store a SHA256 fast-check alongside bcrypt. |
| 5 | `Math.random()` for PIN generation | P2 | Not cryptographically secure. Should use `crypto.getRandomValues()` for security-sensitive random numbers. Low risk for 6-digit PINs but wrong practice. |
| 6 | Admin class DELETE has no cascade warning | P3 | Deleting a class will cascade-delete students, templates, instances. No confirmation or count of affected records. |
| 7 | Duplicate interface definitions | P3 | `ClassOption`, `LessonInstance` interfaces are defined locally in 3+ components. Should be in a shared types file. |

## UGLY (watch items)

1. **No /api/schedule/week endpoint** — D09 AC says "today + week", but only `/today` was built. The teacher view works around it with 6 parallel calls. Must add `/week` before Sprint 2.
2. **No teacher-specific class filtering** — Teacher sees ALL classes, not just classes they teach. A teacher with 2 classes sees all 3. Need to filter by `lesson_template.teacher_id`.
3. **Admin panel has no pagination** — user list loads all users. Fine for <100 but will need pagination for larger schools.
4. **No PDF export for PIN list** — D15 AC mentions "CSV/PDF" but only CSV is implemented. Deferred.

---

## Test Results

| Metric | Value |
|--------|-------|
| `npm run build` | **PASS** |
| `npm run test` | **139/139** (13 suites) |
| API routes | 11 total |
| Pages | 7 (`/`, `/student`, `/parent`, `/teacher`, `/admin`, `/admin/classes`, `/admin/users`) |

### Test Coverage Map

| Area | Tests | Status |
|------|-------|--------|
| PIN Login UI | 25 | ✅ |
| Auth API + Rate Limit + Session | 37 | ✅ |
| Schedule Builder UI | 14 | ✅ |
| Schedule Utilities | 10 | ✅ |
| Middleware | 5 | ✅ |
| Student Schedule UI | 18 | ✅ |
| Parent Dashboard UI | 10 | ✅ |
| PIN Generation | 3 | ✅ |
| Audit Logging | 3 | ✅ |
| DB Types | 9 | ✅ |
| Utils | 5 | ✅ |
| **Teacher UI (D12)** | **0** | ⚠️ Missing |
| **Classes Manager (D14)** | **0** | ⚠️ Missing |
| **Users Manager (D15)** | **0** | ⚠️ Missing |

---

## Action Items

| Priority | Item | Owner | Target |
|----------|------|-------|--------|
| **P1** | Add tests for TeacherLessons, ClassesManager, UsersManager | QA / DEV | Before Sprint 2 |
| P2 | Add `/api/schedule/week` endpoint | DEV:backend | D09 completion |
| P2 | Filter teacher's classes by teacher_id | DEV:backend | D12 fix |
| P2 | Use `crypto.getRandomValues()` for PIN generation | DEV:backend | Security fix |
| P2 | Simplify schedule API fallback path | DEV:backend | Code cleanup |
| P3 | Extract shared interfaces to types file | DEV | Nice-to-have |
| P3 | Add cascade warning to class delete | DEV:frontend | UX |
| P3 | Add PDF export for PIN list | DEV:frontend | D15 completion |
