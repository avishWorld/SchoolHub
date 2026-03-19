# Sprint 02 — Attendance + AI + Dashboard + Polish

| Field | Value |
|-------|-------|
| **Sprint** | 02 |
| **Goal** | מורה מנהל נוכחות, AI מפרש קישורים, מנהל רואה תמונה כוללת, הורה מקבל עדכון בוקר |
| **Status** | **COMPLETE** ✅ |
| **Start** | 2026-03-20 |
| **End** | 2026-04-03 |
| **PRD Version** | 3.0 |
| **Depends on** | Sprint 01 COMPLETE ✅ |

---

## Scope

### Block A: Sprint 01 Tech Debt (P0/P1 fixes)
1. Replace FNV session hash with Web Crypto API (`crypto.subtle`)
2. Add missing component tests (TeacherLessons, ClassesManager, UsersManager)
3. Add `/api/schedule/week` endpoint (teacher currently makes 6 parallel calls)
4. Filter teacher's class list by `teacher_id`
5. Write Playwright E2E tests (Q12-Q16 from Sprint 01)

### Block B: Attendance System (PRD Stories 4/10)
6. Teacher confirms attendance per lesson (UI + API)
7. Student "Join" click records `join_clicked_at` intent (API wiring)
8. Attendance summary view per lesson for teacher

### Block C: AI Link Parser (PRD Story 6)
9. Claude API integration — parse free text → extract meeting URL, platform, date, time
10. Teacher paste-text UI with auto-fill + confirmation
11. API caching (same text → cached result)
12. Graceful degradation when API unavailable

### Block D: Admin Dashboard (PRD Story 10)
13. Color-coded class grid (green/yellow/red status)
14. Real-time or polling updates (30s)
15. Click-to-detail: teacher, subject, join count

### Block E: Morning Briefing (PRD Story 11)
16. Email template for daily schedule
17. Cron endpoint to trigger at 7:30
18. Unsubscribe mechanism

### Block F: UI/UX Polish
19. Use `next/font/google` for Rubik (replace @import)
20. Add PDF export for PIN list
21. Mobile responsive audit (320px)

---

## Exit Criteria

- [x] Teacher can confirm/override attendance per lesson
- [x] Student "Join" records `join_clicked_at` in Attendance table
- [x] Teacher can paste free text → Claude extracts URL + fills form
- [x] AI fallback works when Claude API is down
- [x] Admin sees color-coded overview of all classes
- [x] Parent receives morning email with today's schedule (MVP: console log)
- [x] Session uses Web Crypto API (not FNV hash)
- [~] E2E tests pass (Playwright) — deferred to Sprint 03
- [x] All unit tests pass (227/227)
- [~] Lighthouse accessibility ≥ 90 — deferred to Sprint 03

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Claude API rate limit / cost | Medium | High | Cache responses, use Haiku for parsing, 1000 calls/month cap |
| Email delivery (no SMTP service) | High | Medium | Use Supabase Edge Functions + Resend/SendGrid free tier, or defer email to Sprint 3 |
| Supabase Realtime limits (200 connections) | Medium | Medium | Use polling fallback (30s) instead of WebSocket |
| E2E test complexity with live DB | Medium | Medium | Use test fixtures + cleanup scripts |

---

## Artifacts

- Tasks: `todo/sprint_02_todo.md`
- Report: `reports/sprint_02_report.md`
- Reviews: `reviews/`
