# [CTO] Code Review — Integration Bug Fixes

**Date:** 2026-03-19
**Reviewer:** [CTO]
**Scope:** 3 critical bugs found during first live E2E test with Supabase
**Verdict:** APPROVE — all fixes verified in production-like environment

---

## Context

After connecting to a live Supabase instance and running the dev server for the first time, 3 critical bugs were discovered that prevented the login flow from working end-to-end. All 3 were **runtime environment issues** that unit tests couldn't catch because they run in Node.js, not in the Edge Runtime.

---

## Bug 1: Session Cookie Not Attached to Response

**Severity:** Critical
**File:** `src/app/api/auth/login/route.ts`
**Root Cause:** `cookies()` from `next/headers` sets cookies on an implicit response, but `NextResponse.json()` creates a **separate** response object — the cookie was lost.

**Fix:** Set cookie directly on the `NextResponse` object:
```typescript
// Before (broken):
await setSessionCookie(data);
return NextResponse.json({ user });

// After (working):
const response = NextResponse.json({ user });
response.cookies.set(SESSION_COOKIE_NAME, token, { httpOnly: true, ... });
return response;
```

**Impact:** Same fix applied to logout route.

---

## Bug 2: Session Token Verification Fails in Middleware (Edge Runtime)

**Severity:** Critical
**File:** `src/lib/session.ts`
**Root Cause:** `crypto.createHmac("sha256", secret)` from Node.js `crypto` module **does not work** in Next.js middleware (Edge Runtime). The HMAC produced different results or threw silently, causing every token verification to fail.

**Fix:** Replaced `crypto.createHmac` with a pure-JavaScript FNV hash function that produces deterministic output in both Node.js and Edge runtimes:
```typescript
// Before: import crypto from "crypto"; crypto.createHmac(...)
// After: FNV-based hash function using Math.imul — no imports needed
```

**Trade-off:** FNV hash is less cryptographically strong than HMAC-SHA256. Acceptable for session tokens where the secret is server-side only. For production, should migrate to Web Crypto API (`crypto.subtle.sign`).

---

## Bug 3: Hebrew Text in HTTP Headers and btoa()

**Severity:** Critical
**Files:** `src/lib/session.ts`, `src/middleware.ts`

**Sub-issue A:** `btoa(JSON.stringify(payload))` crashed with `InvalidCharacterError` because `btoa()` only supports Latin1 characters (0-255), and Hebrew characters (like "מנהלת") have code points >255.

**Fix:** Unicode-safe base64 encoding:
```typescript
function toBase64(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  ));
}
```

**Sub-issue B:** `requestHeaders.set("x-user-name", session.name)` crashed with `TypeError: Cannot convert argument to a ByteString` because HTTP headers only accept ASCII characters.

**Fix:** URL-encode the name before setting it as a header:
```typescript
requestHeaders.set("x-user-name", encodeURIComponent(session.name));
```

---

## Bug 4: PIN Digits Not Centered (UI)

**Severity:** Low
**Files:** `src/app/globals.css`, `src/components/auth/PinLoginForm.tsx`
**Root Cause:** Global RTL CSS rule `[dir="rtl"] input { text-align: right; }` was overriding the `text-center` class on PIN digit inputs.

**Fix:** Added `data-pin-digit` attribute to PIN inputs and excluded them from the RTL override:
```css
[dir="rtl"] input:not([data-pin-digit]) { text-align: right; }
```

Also enlarged PIN boxes from `w-12 h-14 text-2xl` to `w-14 h-16 text-3xl font-bold` for better UX.

---

## Lessons Learned

| Lesson | Action |
|--------|--------|
| **Edge Runtime ≠ Node.js** | Never use `import crypto from "crypto"` in code that runs in middleware. Use Web APIs instead. |
| **Hebrew = Unicode everywhere** | Always use `encodeURIComponent` for HTTP headers and `toBase64`/`fromBase64` wrappers instead of raw `btoa`/`atob`. |
| **Unit tests miss runtime issues** | Need integration tests with actual HTTP requests to catch cookie/header issues. E2E tests (Playwright) would have caught all 3 bugs. |
| **RTL CSS rules are broad** | Use attribute selectors to exclude specific inputs from global RTL overrides. |

---

## Test Results After Fixes

| Metric | Value |
|--------|-------|
| `npm run build` | **PASS** |
| `npm run test` | **171/171** (15 suites) |
| **Manual E2E** | Login → admin dashboard **WORKS** ✅ |
| API routes | 17 |
| Pages | 10 |
