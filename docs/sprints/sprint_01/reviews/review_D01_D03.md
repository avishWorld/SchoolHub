# [CTO] Code Review — D01 + D02 + D03

**Date:** 2026-03-19
**Reviewer:** [CTO]
**Scope:** Project init, shadcn/ui + RTL, Supabase schema
**Verdict:** APPROVE (after P0 fixes applied)

---

## GOOD — What works well

1. **RTL + Hebrew** — `lang="he" dir="rtl"` correct, CSS overrides for inputs, 16px min font
2. **SQL Schema** — 11 tables with correct ENUMs, foreign keys with CASCADE, UNIQUE constraints on critical pairs, proper indexes
3. **LessonTemplate/Instance pattern** — clean separation of recurring definition vs specific occurrence, link inheritance
4. **Attendance intent + confirmation** — join_clicked_at + status + confirmed_by fields
5. **TypeScript types** — complete mirror of SQL schema, proper Insert/Update omit patterns
6. **Supabase client** — correct browser (anon) vs server (service_role) separation
7. **shadcn/ui components** — proper forwardRef, CVA variants, displayName
8. **Seed data** — real bcrypt hashes, all FK references valid, PIN reference table documented
9. **RLS defense-in-depth** — anon key locked to invitation read + enrollment insert only

## BAD → Fixed

| # | Issue | Fix |
|---|-------|-----|
| 1 | Missing npm deps in package.json | Added 6 packages |
| 2 | Font CSS vars undefined | Added @import + --font-rubik |
| 3 | RLS documentation unclear | Rewrote security architecture comment |
| 4 | Placeholder seed hashes | Generated real bcrypt hashes |
| 5 | Zero test files | Created 2 suites, 14 tests |
| 6 | jsdom missing | Installed |

## UGLY — Watch in D04+

1. **No API routes yet** — all backend logic is in SQL/types, no runtime code
2. **Font loading via @import** — will cause FOUT. Switch to next/font on local machine
3. **No Claude API client** — needed for Sprint 2
4. **No i18n** — Hebrew hardcoded, no translation infrastructure
5. **Test coverage at minimum** — types + utils only, no component tests
6. **Seed data needs attendance records** for testing intent+confirmation flow

## Fix List Applied

| Priority | Issue | Status |
|----------|-------|--------|
| P0 | Missing npm deps | ✅ Fixed |
| P0 | Font CSS vars | ✅ Fixed |
| P0 | RLS docs | ✅ Fixed |
| P0 | Seed hashes | ✅ Fixed |
| P0 | Test files | ✅ Fixed |
| P0 | jsdom | ✅ Fixed |
| P1 | Server-only boundary | Deferred to D04 |
| P1 | PIN CHECK constraint | Deferred to D04 |
| P2 | Lighthouse CI | Deferred |
| P2 | i18n strategy | Deferred to Sprint 2 |
