# [CTO] Code Review — D05 + D06 + D07

**Date:** 2026-03-19
**Reviewer:** [CTO]
**Scope:** Auth API, middleware, admin schedule builder, template API, instance auto-generation
**Verdict:** APPROVE

---

## Scope Summary

| Task | Status | Key Files |
|------|--------|-----------|
| D05 — PIN Auth API | **DONE** | `route.ts`, `rate-limit.ts`, `session.ts` |
| D06 — Admin schedule builder | **DONE** | `middleware.ts`, `DashboardShell.tsx`, `ScheduleBuilder.tsx`, role pages |
| D07 — Template API + instances | **DONE** | `schedule.ts`, `templates/route.ts`, `[classId]/route.ts`, admin APIs |

---

## GOOD

### D05 — Auth API
1. **Clean auth flow** — PIN → bcrypt compare → signed session cookie → role redirect. Simple and correct.
2. **Rate limiter is solid** — in-memory Map with IP tracking, periodic cleanup, exported `resetRateLimiter()` for tests. Well-documented limitation (single-instance only).
3. **Session design** — HMAC-SHA256 signed tokens, httpOnly + Secure + SameSite cookies, 7-day expiry. Not JWT but appropriate for this app's scope.
4. **Defense-in-depth** — Client-side lockout (D04) + server-side rate limit (D05) + bcrypt cost 12. Three layers.
5. **Error messages in Hebrew** — consistent user-facing language throughout.
6. **Test coverage** — 37 tests across 3 suites (rate-limit, session, route). Covers happy path, validation, rate limiting, multi-device, DB errors.

### D06 — Middleware + Schedule Builder
7. **Middleware architecture** — clean separation: public paths → session check → role check → header injection. Session data forwarded via `x-user-*` headers.
8. **DashboardShell reusable** — shared layout component with nav + user info + logout. Will serve all 4 roles.
9. **ScheduleBuilder UX** — class selector, 6-day Israeli week grid, inline create/edit/delete, modal form. Proper Hebrew labels and aria-labels throughout.
10. **Placeholder pages** — student/teacher/parent pages created with session guards. Prevents dead-end routes.

### D07 — Template API + Instance Generation
11. **Pure utility functions** — `getDatesForDay`, `buildInstanceInserts` are pure functions with no side effects. Easy to test, easy to reason about.
12. **Instance deduplication** — `existingDates` Set prevents double-generation. Smart design.
13. **Admin helper APIs** — GET `/api/admin/classes` and `/api/admin/users` complete the D06 ↔ D07 contract.
14. **Propagation logic** — Day-of-week change on template generates new instances without touching existing ones.

## BAD (issues found, non-blocking)

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| 1 | `[classId]` route overloaded | P2 | GET uses it as classId, PUT/DELETE use it as templateId. Confusing. Should be separate routes: `/api/schedule/templates?class_id=X` for listing, `/api/schedule/templates/:templateId` for mutations. |
| 2 | `as never` type casts in Supabase calls | P2 | 4 occurrences of `as never` to bypass Supabase's typed client. Root cause: the `Database` type's table names don't match Supabase's generic inference. Fix: regenerate types with `supabase gen types` when connected to a real project. |
| 3 | Login fetches ALL active users | P2 | `select().eq("is_active", true)` loads every user into memory for bcrypt comparison. Fine for <100 users but won't scale. Future: add a PIN prefix lookup or move comparison to a Supabase RPC function. |
| 4 | No delete confirmation in ScheduleBuilder | P3 | `handleDelete` fires immediately without confirmation dialog. User could accidentally delete a template. |
| 5 | `eslint-disable-next-line` in ScheduleBuilder | P3 | `react-hooks/exhaustive-deps` suppressed for initial data load. Acceptable but should use a `useRef` flag pattern instead. |
| 6 | `act(...)` warnings in ScheduleBuilder tests | P3 | React warns about state updates outside `act()`. Tests pass but stderr is noisy. Wrap async operations properly. |
| 7 | Time selector only shows full hours | P3 | HOURS array is `07:00` to `18:00` in 1-hour increments. Real schools have 8:30, 9:15, etc. Should allow finer granularity (15-min or free-form input). |

## UGLY (watch items)

1. **No audit logging yet** — D05/D07 don't write to `AdminAuditLog`. Template create/update/delete should be logged. Target: D16.
2. **No school_id scoping on templates** — Template API doesn't filter by `school_id`. Currently relies on class_id belonging to the right school. Could be exploited if a user knows another school's class IDs. Fix when implementing multi-school.
3. **In-memory rate limiter resets on deploy** — Acceptable for MVP. Document that production needs Redis/DB-backed rate limiting.
4. **Middleware runs on every request** — The `matcher` regex matches broadly. Could add explicit exclusions for API routes that don't need session headers.

---

## Test Results

| Metric | Value |
|--------|-------|
| `npm run build` | **PASS** (0 errors, 0 warnings) |
| `npm run test` | **105/105 pass** (9 suites) |
| Routes | 8 API routes + 4 pages + middleware |

### Test Breakdown

| Suite | Tests | Coverage |
|-------|-------|----------|
| `utils.test.ts` | 5 | cn() utility |
| `database.test.ts` | 9 | Type validation |
| `rate-limit.test.ts` | 10 | Rate limiter logic |
| `session.test.ts` | 9 | Token create/verify/expiry |
| `middleware.test.ts` | 5 | Session verification for routes |
| `route.test.ts` (login) | 18 | Full auth flow + rate limiting |
| `PinLoginForm.test.tsx` | 25 | PIN UI component |
| `ScheduleBuilder.test.tsx` | 14 | Schedule builder UI |
| `schedule.test.ts` | 10 | Date generation + instance building |

---

## Action Items

| Priority | Item | Owner | Target |
|----------|------|-------|--------|
| P2 | Refactor `[classId]` route to separate listing vs. mutation | DEV:backend | Before Sprint 2 |
| P2 | Fix Supabase `as never` casts with proper generated types | DEV:backend | When Supabase connected |
| P2 | Optimize login to not fetch all users | DEV:backend | When >100 users |
| P3 | Add delete confirmation to ScheduleBuilder | DEV:frontend | D08 or later |
| P3 | Allow 15-min time granularity in schedule form | DEV:frontend | D12 |
| P3 | Fix `act()` warnings in ScheduleBuilder tests | QA | Nice-to-have |
