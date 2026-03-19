# Sprint 03 — Weekly Views + Lesson Content + Advanced AI

| Field | Value |
|-------|-------|
| **Sprint** | 03 |
| **Goal** | כל תפקיד רואה תצוגה שבועית, מורה מוסיף הערות/קישורים לשיעור, AI מתקדם |
| **Status** | **COMPLETE** ✅ |
| **Start** | 2026-03-21 |
| **End** | 2026-04-04 |
| **PRD Version** | 3.0 + Stories 12-15 |
| **Depends on** | Sprint 02 COMPLETE ✅ |

---

## Scope

### Block A: Weekly Views (Stories 12-14)
1. Student weekly schedule view + day selection
2. Parent weekly view + "all children together" with color-coding
3. Teacher multi-class view + daily/weekly toggle + class filtering

### Block B: Lesson Content (Story 15)
4. DB migration: notes + resources on LessonInstance
5. Teacher UI: add/edit notes + external links per lesson
6. Student/Parent view: display notes + resources
7. API: CRUD for notes + resources

### Block C: Advanced AI (PRD Features 12-15)
8. Daily Digest AI (Sonnet) — insights for admin
9. Smart Reminders — missing link notifications
10. Student at Risk — attendance pattern detection
11. Schedule OCR — image upload → Claude Vision → auto-fill templates

### Block D: Deployment
12. Playwright E2E tests
13. Vercel deployment prep
14. Real email integration (Resend)

---

## Exit Criteria

- [x] Student can toggle daily/weekly view and select specific day
- [x] Parent can see all children together with color differentiation
- [x] Teacher can see all classes, filter, toggle daily/weekly
- [x] Teacher can add notes + external links to any lesson
- [x] Student/Parent see notes + resources in lesson detail
- [x] AI daily digest generates insights for admin
- [x] Smart reminders notify teacher about missing links
- [x] Student at risk detection works
- [x] All unit tests pass (246/246)
- [~] E2E tests — deferred (Playwright needs live server)
- [x] Homeroom vs subject teacher permissions
- [x] Join form shows class name + teacher
- [x] Vercel deployment config + Resend email

---

## Artifacts

- Tasks: `todo/sprint_03_todo.md`
- Report: `reports/sprint_03_report.md`
- Reviews: `reviews/`
