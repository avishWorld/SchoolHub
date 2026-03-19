# [CTO] Code Review — D04 (PIN Login Page) + D05 (Auth API)

**Date:** 2026-03-19
**Reviewer:** [CTO]
**Scope:** D04 — PIN login frontend | D05 — auth backend API
**Verdict:** D04 APPROVE | D05 NOT STARTED

---

## Scope Summary

| Task | Status | Files |
|------|--------|-------|
| D04 — PIN login page (frontend) | **DONE** | `src/components/auth/PinLoginForm.tsx`, `src/app/page.tsx`, `src/components/auth/__tests__/PinLoginForm.test.tsx` |
| D05 — Auth API (`/api/auth/login`) | **NOT STARTED** | `src/app/api/auth/login/route.ts` does not exist |

---

## D04 — GOOD

1. **Individual digit inputs** — 6 separate `<input>` fields with auto-advance, backspace-to-previous, paste support. UX is polished and matches best practice for PIN/OTP entry.
2. **RTL-aware keyboard nav** — PIN container is `dir="ltr"` (numbers are always LTR) but ArrowLeft/Right correctly mapped for RTL context.
3. **Rate limiting UI** — Client-side attempt counter (5 max), lockout with countdown timer, inputs disabled during lockout. Also respects 429 from server with `locked_until` timestamp.
4. **Dual lockout paths** — Both client-side (5 failed 401s → local lock) and server-side (429 response → server-dictated lock) are handled. This is defense-in-depth.
5. **Error UX** — `role="alert"` for screen readers, error clears when user starts re-typing, distinct messages for invalid PIN vs network error vs lockout.
6. **Loading state** — Spinner SVG with "מתחבר..." text, all inputs disabled during fetch.
7. **Role-based redirect** — Clean `ROLE_REDIRECTS` map: student→/student, parent→/parent, teacher→/teacher, admin→/admin.
8. **Uses shadcn components** — Button and Card from design system, consistent with D02.
9. **Test coverage** — 25 tests covering: rendering, digit input, paste, submission, role redirects, error handling, rate limiting, accessibility. All pass.
10. **page.tsx is clean** — Server component imports the client PinLoginForm, no unnecessary `"use client"` on the page itself.

## D04 — BAD (minor issues, not blocking)

| # | Issue | Severity | Recommendation |
|---|-------|----------|----------------|
| 1 | `handleSubmit` uses `attempts` from closure, not functional updater | P2 | Use `setAttempts(prev => ...)` and compute lockout inside updater. Current code works because `useCallback` deps include `attempts`, but it creates a new function on every failed attempt, which cascades new refs to `handleDigitChange`, `handleKeyDown`, `handlePaste`. |
| 2 | `window.location.href = redirect` — hard navigation | P2 | Should use `next/navigation` `useRouter().push()` for client-side routing. Current approach causes full page reload. Acceptable for MVP but should be fixed before Sprint 2. |
| 3 | `MAX_ATTEMPTS` duplicated in test file | P3 | Export the constant from the component or a shared constants file. Test uses a local copy (`const MAX_ATTEMPTS = 5`) which could drift. |
| 4 | No `<form>` element wrapping inputs | P3 | Native form submission (Enter key) is handled manually via `onKeyDown`. A `<form onSubmit>` would be more semantic and better for accessibility tools. |
| 5 | Inline Tailwind classes on digit inputs are long | P3 | Consider extracting to a `cn()` call or a component variable. Readability issue only. |

## D04 — UGLY (watch items)

1. **No API endpoint exists** — Frontend calls `/api/auth/login` which doesn't exist yet (D05). The form will fail with 404 in the actual app. This is expected given task ordering but D05 must be done next for the login flow to work end-to-end.
2. **Client-side lockout is bypassable** — A user can clear localStorage/refresh to reset the attempt counter. Server-side rate limiting (D05) is the real security boundary. The client-side lockout is UX-only, which is fine.
3. **`isLocked` computed on every render** — `const isLocked = lockEndTime !== null && Date.now() < lockEndTime` is called during render but `Date.now()` changes. It's recalculated correctly because the countdown timer re-renders every second, so it works, but it's a subtle pattern.
4. **No `aria-live` region** — The error `role="alert"` is good but appears/disappears. Consider `aria-live="polite"` on a persistent container for smoother screen reader experience.

## D05 — NOT REVIEWED

D05 was not implemented. `src/app/api/auth/login/route.ts` does not exist. This is the next task to implement.

---

## Test Results

| Metric | Value |
|--------|-------|
| `npm run build` | PASS (0 errors, 0 warnings) |
| `npm run test` | 39/39 pass (3 suites) |
| Build size | 10.1 kB (/ route), 97.3 kB first load JS |
| Test suites | `utils.test.ts` (5), `database.test.ts` (9), `PinLoginForm.test.tsx` (25) |

## Infrastructure Changes

| Change | Reason |
|--------|--------|
| Added `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` | Component testing |
| Added `jsdom` to devDependencies | Was missing, required by vitest jsdom environment |
| Created `src/test-setup.ts` | jest-dom matchers for vitest |
| Updated `vitest.config.ts` setupFiles | Points to test-setup.ts |

---

## Action Items

| Priority | Item | Owner | Target |
|----------|------|-------|--------|
| P0 | Implement D05 — auth API | DEV:backend | Next task |
| P2 | Switch `window.location.href` to `useRouter().push()` | DEV:frontend | Before Sprint 2 |
| P2 | Refactor `handleSubmit` to use functional `setAttempts` | DEV:frontend | Before Sprint 2 |
| P3 | Export constants from shared file | DEV | Nice-to-have |
| P3 | Wrap inputs in `<form>` element | DEV:frontend | Nice-to-have |
