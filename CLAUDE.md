# SchoolHub — Claude Code Project Context

> **Stack:** Next.js 14 + TypeScript + Tailwind CSS + Supabase + Claude API
> **Purpose:** פורטל לימוד בית-ספרי מרכזי — נקודת כניסה אחת לשיעורים מקוונים עבור תלמידים, מורים, הורים ומנהלים.
>
> This file is auto-loaded by Claude Code CLI when you open this project directory.
> It is the single source of truth for Claude's project awareness.

---

## 1. Project Identity

| Field | Value |
|---|---|
| **Name** | SchoolHub |
| **Purpose** | פורטל לימוד בית-ספרי מרכזי — נקודת כניסה אחת לשיעורים מקוונים |
| **Current sprint** | Sprint 03 |
| **Dev port** | 3000 |

---

## 2. Key Commands

```bash
# Development
npm run dev                        # Start dev server
npm run build                      # Production build
npm run test                       # Run unit tests
npm run lint                       # Lint / type check

# E2E Testing (Playwright)
npx playwright test                # Run all E2E tests
npx playwright test --ui           # Interactive UI mode
npx playwright test --debug        # Debug mode
```

> E2E tests auto-start the dev server if `webServer` is configured in `playwright.config.ts`.

---

## 3. Definition of Done

```
A FEATURE IS "DONE" ONLY WHEN:
  1. Code works — dev server runs without errors
  2. Unit tests pass — ≥80% coverage for business logic, ≥60% for infrastructure
  3. E2E pass — browser tests on affected flows (if UI changed)
  4. No regressions — existing tests still pass
  5. Accessibility — Lighthouse score ≥ 90 (if UI changed)
  6. Reviewed — CTO has reviewed using Good/Bad/Ugly protocol
  7. Screenshots — captured for GUI changes (tests/screenshots/)
  8. Docs updated — ARCHITECTURE.md / DECISIONS.md if design changed
```

**NEVER mark done based on "it compiles" alone.**

---

## 4. Project Structure

```
SchoolHub/
├── CLAUDE.md                # This file — project context for Claude
├── AGENTS.md                # Role definitions (CTO, DEV, QA)
├── README.md                # Project README
├── .env.example             # Environment variables template
├── playwright.config.ts     # Playwright E2E configuration
│
├── .claude/
│   ├── settings.local.json  # Tool permissions for Claude
│   └── commands/            # Slash commands
│
├── backend/
│   ├── AGENTS.md            # Backend domain rules
│   └── modules/
│       └── _example/        # Reference module (copy to start new)
│           ├── README.md
│           ├── src/          # Models, services, API routes
│           └── tests/        # unit/ and integration/
│
├── frontend/
│   ├── AGENTS.md            # Frontend domain rules
│   └── modules/
│       └── _example/        # Reference module (copy to start new)
│           ├── README.md
│           ├── src/          # Components, hooks, utils
│           └── tests/        # unit/ and integration/
│
├── tests/
│   ├── e2e/                 # Playwright E2E test files
│   └── screenshots/         # GUI screenshots (captured by tests)
│
└── docs/
    ├── PRD.md               # Product requirements
    ├── ARCHITECTURE.md      # Technical architecture
    ├── DECISIONS.md         # Decision log
    ├── knowledge/           # Research, references, domain knowledge
    ├── ui/
    │   └── UI_KIT.md        # Design system tokens
    └── sprints/
        ├── sprint_01/       # Sprint 01 — COMPLETE ✅ (23/23 dev, 11/16 QA)
        ├── sprint_02/       # Sprint 02 — COMPLETE ✅ (18/20 dev, 7/11 QA)
        └── sprint_03/       # Sprint 03 — COMPLETE ✅ (24/26 dev, 12/15 QA)
```

---

## 5. Environment Variables

Copy `.env.example` → `.env`. Required:

```
ANTHROPIC_API_KEY=sk-ant-...      # Claude API key
NEXT_PUBLIC_SUPABASE_URL=...      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=... # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=...     # Supabase service role (server only)
```

---

## 6. Available Commands

| Command | Purpose |
|---|---|
| `/project:cto` | Activate CTO role — architecture & planning |
| `/project:dev` | Activate DEV role — implementation |
| `/project:qa` | Activate QA role — testing & quality |
| `/project:plan` | Force plan mode before complex work |
| `/project:test` | Run full test suite |
| `/project:e2e` | Run Playwright E2E browser tests |

---

## 7. Role Tags

| Tag | Who |
|---|---|
| `[CTO]` | Architecture, tech decisions, code review |
| `[DEV]` | Implementation, features, bug fixes |
| `[DEV:backend]` | Backend module implementation |
| `[DEV:frontend]` | Frontend module implementation |
| `[QA]` | Testing, quality gates, bug discovery |
| `[FOUNDER]` | Human operator — final decision maker |

> Reading order: domain `AGENTS.md` (e.g., `backend/AGENTS.md`) → root `AGENTS.md` → `docs/PRD.md`

---

## 8. Testing Strategy

| Level | Location | Tool | When |
|-------|----------|------|------|
| **Unit** | `*/modules/*/tests/unit/` | Vitest | Every feature |
| **Integration** | `*/modules/*/tests/integration/` | Vitest | Cross-module features |
| **E2E** | `tests/e2e/` | Playwright | Every UI change |
| **Screenshots** | `tests/screenshots/` | Playwright | Every UI change |

---

## 9. What NOT to Do

- Do NOT silently expand scope beyond the current task
- Do NOT add dependencies without discussing with the team
- Do NOT mark features done without actually testing them
- Do NOT skip writing tests for new logic
- Do NOT hardcode secrets or credentials
- Do NOT import directly across modules — use shared interfaces

---

## 10. Domain Context

**Language:** Hebrew (RTL) primary, English secondary
**Users:** Students, Parents, Teachers, School Admins
**PRD Version:** 3.0 (see `docs/PRD.md`)

### Key Concepts
- **PIN-based login:** 6-digit PIN only, bcrypt cost 12, 7-day session, multi-device
- **LessonTemplate + LessonInstance:** Template = recurring ("Math every Tuesday 8:00"). Instance = specific date. Teacher sets recurring link on template or per-instance. "Copy from last week" clones links. Instance also has `notes` (text) and `resources` (JSONB array of {url, label}) — Decision 011.
- **Enrollment via invite links:** Teacher sends `schoolhub.app/join/{token}` → parent/student self-registers → waiting list → **homeroom teacher** approves → PIN auto-generated
- **Teacher types:** `is_homeroom_teacher` boolean on User. Homeroom (מחנך) = manages class + approves enrollment. Subject (מקצועי) = teaches in class, adds own lessons only. Decision 013.
- **Attendance = intent + confirmation:** Click "Join" records intent (join_clicked_at). Teacher confirms actual attendance. AI uses confirmed data.
- **Integration:** Zoom & Microsoft Teams meeting links
- **AI:** Claude API — Haiku for link parsing, Sonnet for digests. Monthly cap 1000 calls, caching, graceful degradation.

### Data Model (11 tables)
School, User, Student, ParentStudent, Class, LessonTemplate, LessonInstance, Attendance, Invitation, EnrollmentRequest, AdminAuditLog

### Key Decisions (see `docs/DECISIONS.md`)
- Decision 006: Two-table lesson model (template + instance)
- Decision 007: Attendance = intent + confirmation
- Decision 008: 6-digit PIN only (not 4-6)
- Decision 009: school_id on core + enrollment tables only
- Decision 010: AI cost controls (cap, cache, fallback)
- Decision 011: Lesson notes + resources on LessonInstance (JSONB)
- Decision 012: Weekly view for all roles
- Decision 013: Homeroom teacher (מחנך) vs subject teacher (מקצועי) — `is_homeroom_teacher` boolean

### Sprint Status
- **Sprint 01:** COMPLETE ✅ — 23/23 dev, 11/16 QA. Foundation: PIN login, schedule builder, dashboards, enrollment, seed data.
- **Sprint 02:** COMPLETE ✅ — 18/20 dev, 7/11 QA. Features: attendance, AI link parser, admin dashboard, morning briefing, polish.
- **Sprint 03:** COMPLETE ✅ — 24/26 dev, 12/15 QA. Weekly views, lesson notes+resources, daily digest AI (Sonnet), smart reminders, student-at-risk, schedule OCR (Vision), teacher roles (homeroom/subject), Vercel deploy, Resend email.
- **Total:** 66 dev tasks done, 246 unit tests, 25 API routes, 15 pages, 19/19 PRD stories complete.

### Architecture Notes
- **Session:** Web Crypto API HMAC-SHA256 (works in Edge Runtime + Node.js). Cookie set directly on NextResponse, NOT via `cookies()` API.
- **Hebrew in headers:** Use `encodeURIComponent()` for HTTP header values, `toBase64()`/`fromBase64()` for cookie payloads.
- **Supabase types:** Use `as never` casts for insert/update until real generated types are connected.
- **RTL inputs:** Use `data-pin-digit` attribute to exclude specific inputs from global `text-align: right` override.
- **Claude AI:** Use Haiku for link parsing (fast+cheap), Sonnet for insights. Cache responses, 1000 calls/month cap.
- **Font:** `next/font/google` Rubik with `--font-rubik` CSS variable (no @import, no FOUT).
