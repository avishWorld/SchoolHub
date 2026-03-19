# [CTO] Code Review — Sprint 02 Blocks A + B + C

**Date:** 2026-03-20
**Reviewer:** [CTO]
**Scope:** Block A (Tech Debt), Block B (Attendance), Block C (AI Link Parser)
**Verdict:** APPROVE

---

## Scope Summary

| Block | Tasks | Status | Key Deliverables |
|-------|-------|--------|-----------------|
| A — Tech Debt | D24-D27, D42 | **5/5 DONE** | Web Crypto session, /week endpoint, teacher filter, component tests, useRouter |
| B — Attendance | D29-D31 | **3/3 DONE** | POST intent, PUT confirm, GET list, AttendanceView UI |
| C — AI Parser | D32-D34 | **3/3 DONE** | Claude client, /api/ai/parse-link, paste-text UI |

---

## GOOD

### Block A — Tech Debt
1. **Web Crypto API migration is clean** — `crypto.subtle.importKey` + `crypto.subtle.sign` using HMAC-SHA256. Works in both Node.js and Edge Runtime. The async migration touched 6 files cleanly.
2. **`/api/schedule/week` eliminates N+1 problem** — Teacher page went from 6 parallel fetches to 1. Correct week boundary calculation (Sunday–Saturday).
3. **Teacher class filtering is precise** — Queries `lesson_template.teacher_id` → extracts unique `class_id` → fetches only those classes. Admin path unchanged.
4. **33 component tests fill the gap** — TeacherLessons (11), ClassesManager (11), UsersManager (11). Each covers render, CRUD, error states, empty states. CTO P1 from Sprint 01 resolved.
5. **`useRouter().push()` replaces `window.location.href`** — proper client-side routing. No full page reload on login.

### Block B — Attendance
6. **Attendance API follows PRD exactly** — intent (`join_clicked_at`) via POST, confirmation via PUT, full list via GET. Upsert pattern is correct (check existing → update or create).
7. **Teacher attendance view is intuitive** — green dot = joined, gray = didn't. ✓/✗/⏰ buttons for present/absent/late. Status badges with colors.
8. **Parent attendance support** — POST accepts `student_id` in body for parent-initiated joins. Correct role branching.
9. **📋 button cleanly integrated** — AttendanceView opens inline below the weekly grid. No page navigation needed.

### Block C — AI Link Parser
10. **Claude client design is solid** — 3-layer defense: input validation → cache check → monthly cap check → API call. Graceful degradation at every layer.
11. **Caching works correctly** — same text → same result, 1-hour TTL, max 500 entries. Prevents duplicate API costs.
12. **Monthly cap tracking** — 1000 calls/month, resets on month change. Matches PRD requirement exactly.
13. **System prompt is well-crafted** — forces JSON-only response, includes both Hebrew and English, provides clear example. Reduces hallucination risk.
14. **8 Claude tests with full SDK mock** — covers extraction, empty input, cache, error, missing key, model selection. All without actual API calls.
15. **Paste-text UI has manual fallback** — if AI fails, teacher sees a manual URL input field. Zero dead-ends.

---

## BAD (issues, non-blocking)

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| 1 | AttendanceView uses `useState` for initialization | P2 | `useState(() => { loadAttendance(); })` is an anti-pattern. Should use `useEffect`. Works but React docs discourage side effects in lazy initializers. |
| 2 | No tests for AttendanceView or AiLinkParser components | P2 | Two new UI components with 0 tests. AttendanceView has CRUD mutations, AiLinkParser has complex state. Should have render + interaction tests. |
| 3 | Monthly call counter resets on server restart | P3 | In-memory `monthlyCallCount` doesn't persist. A deploy mid-month resets the counter. Fine for MVP but could overspend. Future: store in DB. |
| 4 | `Anthropic` client created on every call | P3 | `new Anthropic({ apiKey })` inside `parseTextForMeetingLink`. Should be a singleton or cached instance. Minor perf impact. |
| 5 | AI parser `AbortController` created but not passed to Anthropic SDK | P3 | `const controller = new AbortController()` in the API route is created but never used (Anthropic SDK has its own timeout). Dead code. |
| 6 | `cache.keys().next().value` for eviction | P3 | Evicts the oldest entry when cache exceeds 500. `Map.keys()` iteration may not work in Edge Runtime (same issue as Sprint 01). Should use `Array.from()`. |

## UGLY (watch items)

1. **No attendance tests at all** — Block B has 3 API routes and 1 UI component, but 0 dedicated tests. All 3 routes handle upsert logic, role checks, and multi-query joins. This is the riskiest untested area.
2. **Claude Haiku model string `"claude-3-5-haiku-latest"`** — using `latest` tag means the model could change without notice. Consider pinning to a specific version for deterministic behavior.
3. **AI parser doesn't validate JSON structure** — `JSON.parse(content.text)` trusts Claude's output is well-formed JSON with the exact expected fields. Should validate with a schema or at least check required fields exist.

---

## Test Results

| Metric | Value |
|--------|-------|
| `npm run build` | **PASS** |
| `npm run test` | **213/213** (19 suites) |
| New in Block A | +34 tests (D25 component tests + D24 session) |
| New in Block C | +8 tests (Claude client) |
| New in Block B | 0 tests ⚠️ |

### Test Coverage Map — Sprint 02 So Far

| Area | Tests | Status |
|------|-------|--------|
| Session (Web Crypto) | 10 | ✅ |
| TeacherLessons | 11 | ✅ |
| ClassesManager | 11 | ✅ |
| UsersManager | 11 | ✅ |
| Claude client | 8 | ✅ |
| QA scenarios | 28 | ✅ |
| **Attendance API** | **0** | ⚠️ Missing |
| **AttendanceView** | **0** | ⚠️ Missing |
| **AiLinkParser** | **0** | ⚠️ Missing |

---

## Action Items

| Priority | Item | Owner | Target |
|----------|------|-------|--------|
| **P1** | Add tests for attendance API routes (POST, PUT/confirm, GET) | DEV/QA | Before Block D |
| P2 | Fix `useState` initializer → `useEffect` in AttendanceView | DEV | Block D |
| P2 | Add tests for AttendanceView + AiLinkParser components | QA | Block F |
| P2 | Remove dead `AbortController` code from parse-link route | DEV | Block D |
| P3 | Pin Claude model version instead of `latest` | DEV | Nice-to-have |
| P3 | Add JSON schema validation for Claude response | DEV | Nice-to-have |
| P3 | Use `Array.from()` for cache eviction | DEV | Nice-to-have |
