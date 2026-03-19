# Sprint 01 — Foundation + PIN Login + Schedule + Enrollment

| Field | Value |
|-------|-------|
| **Sprint** | 01 |
| **Goal** | בית ספר אחד יכול להגדיר מערכת שעות, להזמין הורים בקישור, ולהתחיל ללמוד |
| **Status** | **COMPLETE** ✅ |
| **Start** | 2026-03-17 |
| **End** | 2026-03-31 |
| **PRD Version** | 3.0 |

---

## Scope

1. Initialize Next.js project with TypeScript, Tailwind, shadcn/ui, RTL, WCAG AA
2. Set up Supabase — DB schema (11 tables: School, User, Student, ParentStudent, Class, LessonTemplate, LessonInstance, Attendance, Invitation, EnrollmentRequest, AdminAuditLog), RLS policies
3. Build PIN login flow with rate limiting + session management (6-digit PIN, 7-day session)
4. Build weekly schedule builder (admin creates LessonTemplates → auto-generates LessonInstances)
5. Build student daily schedule view with status colors and real-time updates
6. Build parent child picker + schedule switching (client-side, no reload)
7. Build teacher lesson management (add/edit meeting link, recurring links, "copy from last week")
8. Build Admin panel — manage classes, users, PINs (generate/reset/export), audit log
9. Build enrollment flow — invite link generation, public join page, waiting list, approval
10. Seed data for testing (school, classes, users, parents, lesson templates/instances, sample invitations)

---

## Exit Criteria

- [ ] Dev server runs without errors
- [ ] PIN login works for student, parent, teacher, admin (6-digit, rate limiting, 7-day session)
- [ ] Admin can create weekly schedule (LessonTemplates) for a class
- [ ] LessonInstances auto-generated from templates for current + next week
- [ ] Student sees today's schedule with "Join" button and status colors
- [ ] Parent can switch between children without page reload
- [ ] Teacher can add a Zoom/Teams link to a lesson (with URL validation + recurring option)
- [ ] Teacher can "copy from last week" to fill this week's links
- [ ] Admin can create classes, add users, generate PINs, export PIN list
- [ ] Admin actions logged in audit trail
- [ ] Teacher can generate invite link, parent can self-register, teacher can approve → PIN generated
- [ ] All core flows have unit tests
- [ ] E2E test: login → see schedule → click join (student + parent flows)
- [ ] E2E test: invite link → register → approve → receive PIN → login
- [ ] Lighthouse accessibility score ≥ 90
- [ ] Code reviewed

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Supabase free tier limits (200 Realtime connections) | Medium | High | Use polling fallback; upgrade to Pro ($25/mo) if needed |
| RTL styling issues | Medium | Medium | Use Tailwind RTL plugin, test early |
| LessonTemplate → Instance generation complexity | Medium | Medium | Start with simple weekly generation, no exceptions |
| Schedule creation is tedious without AI import | High | Medium | Sprint 3 adds AI OCR import; manual grid builder for now |
| PIN brute force on leaked DB | Low | High | 6-digit only + bcrypt cost 12 + rate limit |

---

## Demo Script (Sprint Completion)

To verify this sprint delivers value, walk through these scenarios:

1. **Admin Setup:** Admin logs in → creates class "ז'2" → creates weekly schedule (Math Tu 8:00, English We 9:00) → verifies instances auto-generated
2. **Enrollment:** Teacher generates invite link → opens in incognito → parent registers with child name → teacher approves → PIN displayed
3. **Parent Login:** Parent enters 6-digit PIN → sees child picker (if multi-child) → views today's schedule → sees status colors (green/gray/warning)
4. **Teacher Links:** Teacher logs in → selects class → adds Zoom link → marks as recurring → clicks "Copy from last week" → links auto-filled
5. **Student Join:** Student enters PIN → sees today's schedule → clicks "Join" → Zoom opens in new tab → intent recorded
6. **Admin Audit:** Admin views audit log → sees all actions from steps 1-5

---

## Artifacts

- Tasks: `todo/sprint_01_todo.md`
- Report: `reports/sprint_01_report.md`
- Review: `reviews/sprint_01_review.md`
