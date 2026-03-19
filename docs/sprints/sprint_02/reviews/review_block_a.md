# [CTO] Code Review — Sprint 02 Block A (Tech Debt)

**Date:** 2026-03-20
**Reviewer:** [CTO]
**Scope:** D24 (Web Crypto), D25 (Component Tests), D26 (Week Endpoint), D27 (Teacher Filter), D42 (useRouter)
**Verdict:** APPROVE

---

## Scope Summary

| Task | Status | Impact |
|------|--------|--------|
| D24 — Web Crypto API | **DONE** | Security: HMAC-SHA256 replaces FNV hash. Cross-runtime compatible. |
| D25 — Component Tests | **DONE** | Quality: 33 new tests for 3 previously untested components |
| D26 — Week Endpoint | **DONE** | Performance: 1 API call replaces 6 parallel calls |
| D27 — Teacher Filter | **DONE** | Correctness: Teachers see only their classes |
| D42 — useRouter | **DONE** | UX: Client-side navigation, no full reload |

---

## GOOD

1. **Web Crypto API is the correct choice** — `crypto.subtle.sign("HMAC", key, data)` produces real HMAC-SHA256, is available in both Node.js 18+ and Edge Runtime, and is the W3C standard. The FNV hash was a workaround; now we have proper cryptographic signing.

2. **Async migration done cleanly** — `createSessionToken` and `verifySessionToken` are now async. All callers updated: middleware (`await`), login route (`await`), 3 test files. No sync/async mismatches.

3. **Unicode handling preserved** — `toBase64`/`fromBase64` wrappers with `encodeURIComponent` still handle Hebrew names correctly. The Hebrew name test (`"מנהלת — שרה"`) explicitly verifies this.

4. **`/api/schedule/week` is efficient** — single query for templates + single query for instances + single query for teachers. 3 queries total instead of 6×3 = 18 from the old parallel approach.

5. **Teacher class filtering is correct** — queries `lesson_template` for the teacher's ID, extracts unique `class_id` values, then fetches only those classes. Admin path unchanged.

6. **Component tests are thorough** — each component has 11 tests covering: loading state, data display, CRUD forms, edit/delete buttons, error states, empty states.

## BAD (minor)

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| 1 | `token.lastIndexOf(".")` vs `token.indexOf(".")` | P3 | Changed from `indexOf` to `lastIndexOf` in D24. Both work because the payload is base64 (which CAN contain `.` but our payload is `btoa(encodeURIComponent(...))` which won't). Not a bug, but the comment should explain why. |
| 2 | No test for Web Crypto in actual Edge Runtime | P2 | Tests run in jsdom (Node.js), which has `globalThis.crypto.subtle`. Real Edge Runtime compatibility verified manually (login works). Should add an integration test. |
| 3 | D28 (Playwright E2E) deferred | P2 | This was a Block A task but skipped. Tracked in todo. Needs dedicated setup. |

## UGLY

1. **The session.ts `sign()` function does manual ArrayBuffer→base64** — `for (let i = 0; i < bytes.length; i++) { binary += String.fromCharCode(bytes[i]); }` then `btoa(binary)`. This works but is verbose. Could use a helper or `Buffer.from(sig).toString('base64url')` in Node.js — but that wouldn't work in Edge Runtime. Current approach is correct for cross-runtime.

---

## Test Results

| Metric | Value |
|--------|-------|
| `npm run build` | **PASS** |
| `npm run test` | **205/205** (18 suites) |
| New tests in Block A | +34 |

---

## Action Items

| Priority | Item | Owner | Target |
|----------|------|-------|--------|
| P2 | Write Playwright E2E tests (D28) | QA | Block A completion |
| P3 | Add comment explaining `lastIndexOf` choice | DEV | Nice-to-have |
