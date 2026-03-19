# Product Requirements Document (PRD)

**Version:** 3.0
**Last Updated:** 2026-03-17
**Author:** [CTO] + [FOUNDER]
**Status:** Draft — Pending FOUNDER approval

---

## 1. Product Vision & Strategy

### 1.1 Vision Statement

**SchoolHub** הופך לימוד מרחוק מכאוס של קישורים לחוויה מסודרת בלחיצה אחת — עבור כל הורה, תלמיד, מורה ומנהל בבית הספר.

### 1.2 One-Line Description

פורטל לימוד בית-ספרי מרכזי — נקודת כניסה אחת לשיעורים מקוונים עבור תלמידים, מורים, הורים ומנהלים.

### 1.3 Problem Statement

בעת לימוד מרחוק, כל מורה מנהל באופן עצמאי את השיעורים המקוונים שלו — שולח קישורי Zoom/Teams דרך ערוצים שונים (WhatsApp, אימייל, מערכת בית הספר). התוצאה:

- **הורים** מנסים לעקוב אחר עשרות הודעות מערוצים שונים, מנהלים 2-3 ילדים בו-זמנית
- **תלמידים** מפספסים שיעורים כי אין נקודת כניסה אחת
- **מורים** מבצעים ניהול ידני של קישורים ונוכחות, מדביקים אותו קישור 5 פעמים בשבוע
- **מנהלי בית ספר** חסרים תמונה כוללת ויכולת התערבות בזמן אמת

### 1.4 Strategic Goals (12 Months)

| # | Goal | Measurable Target |
|---|------|-------------------|
| 1 | Validate product-market fit in one school | 80% weekly active usage after 4 weeks |
| 2 | Demonstrate AI adds real value (course requirement) | 3 AI features live, each solving a problem regex/SQL can't |
| 3 | Prove the platform can scale to multiple schools | DB + API architecture supports multi-tenant |
| 4 | Build a foundation for commercial SaaS | Clean codebase, CI/CD, test coverage > 80% |

### 1.5 Competitive Landscape

| Solution | What It Does | Why It's Not Enough |
|----------|-------------|---------------------|
| **Mashov** | ניהול בית ספרי (ציונים, נוכחות, הודעות) | אין ניהול שיעורים מקוונים, ממשק מיושן, אין קישורי Zoom |
| **Google Classroom** | ניהול מטלות + Meets | מורכב מדי להורים לא טכניים, דורש חשבון Google, אין PIN |
| **ClassDojo** | תקשורת הורה-מורה | מוקד על התנהגות, לא על שיעורים מקוונים |
| **WhatsApp Groups** | קבוצת כיתה | כאוס — קישורים נקברים בהודעות, אין מבנה, אין נוכחות |

**SchoolHub's UVP:** Login-in-4-seconds PIN access + one-click join + AI-powered link parsing = Zero friction for non-technical parents.

### 1.6 Target Users

| Role | Pain Point | Primary Action |
|------|-----------|----------------|
| **הורה** | עוקב אחר קישורים מ-5 ערוצים שונים, מנהל 2-3 ילדים בו-זמנית | צפייה בלוח שיעורים של הילדים, מעבר בין ילדים |
| **תלמיד** | לא מוצא קישור נכון, מפספס שיעורים, אין נקודת כניסה אחת | הצטרפות לשיעור בלחיצה אחת |
| **מורה** | שולח קישורים בנפרד לכל כיתה, אין בקרת נוכחות, ניהול ידני | הוספת קישור שיעור, צפייה בנוכחות |
| **מנהל בית ספר** | אין תמונה כוללת, אין מעקב, אין יכולת התערבות בזמן אמת | ניהול משתמשים, צפייה בסטטוס כללי |

### 1.7 Tenant Model

MVP תומך ב-**בית ספר אחד** (single-tenant). מבנה ה-DB מכין ל-multi-tenant (school_id בכל טבלה) אבל ה-UI לא כולל בחירת בית ספר ב-Sprint 1.

> **Decision:** school_id נוסף לטבלאות ראשיות בלבד (School, User, Class) — לא לכל טבלה. טבלאות כמו LessonTemplate, LessonInstance ו-Attendance מקבלות school context דרך JOIN. זה מפחית 50% מהמורכבות בכל query ב-MVP.

---

## 2. Core Features

| # | Feature | Description | Priority | Sprint |
|---|---------|-------------|----------|--------|
| 1 | **כניסה עם PIN** | תלמיד/הורה מקליד קוד PIN פשוט ורואה מיד את לוח השיעורים | Must Have | 1 |
| 2 | **מערכת שעות שבועית** | מנהל/מורה מגדיר מערכת שעות שבועית לכל כיתה — שיעורים חוזרים עם מקצוע, שעה ומורה | Must Have | 1 |
| 3 | **לוח שיעורים יומי** | תצוגה יומית עם כפתור "הצטרף" לכל שיעור (Zoom/Teams) | Must Have | 1 |
| 4 | **מעבר בין ילדים (הורה)** | הורה עם מספר ילדים רואה בוחר ילדים ומחליף ביניהם | Must Have | 1 |
| 5 | **ניהול שיעורים למורה** | מורה מוסיף/עורך קישור שיעור, תומך בקישור חוזר + "העתק משבוע שעבר" | Must Have | 1 |
| 6 | **Admin panel — ניהול משתמשים** | מנהל יוצר/עורך משתמשים, כיתות, PINs, מקצועות | Must Have | 1 |
| 7 | **הצטרפות לכיתה בקישור (Enrollment)** | מורה/מנהל שולח קישור הזמנה, הורה/תלמיד נרשם ← ממתין לאישור ← PIN נוצר | Must Have | 1 |
| 8 | **דאשבורד מנהל (בסיסי)** | תצוגת סטטוס כיתות: פעיל / חסר קישור / לא התחיל | Must Have | 2 |
| 9 | **מעקב נוכחות** | לחיצה על "הצטרף" = סימון intent (לא נוכחות סופית). מורה מאשר/מתקן | Must Have | 2 |
| 10 | **ניתוח קישורים עם AI** | מורה מדביק טקסט חופשי → AI מחלץ קישור, פלטפורמה, תאריך, שעה | Must Have | 2 |
| 11 | **Morning Briefing (email)** | סיכום בוקר ב-7:30: "היום ליואב 4 שיעורים, הכל מוכן ✓" או "חסר קישור למתמטיקה ⚠" | Must Have | 2 |
| 12 | **AI Daily Digest למנהל** | סיכום יומי חכם: שיעורים בעייתיים, דפוסי היעדרות, המלצות פעולה | Nice to Have | 3 |
| 13 | **תזכורות (push/email)** | תזכורת 5 דקות לפני שיעור | Nice to Have | 3 |
| 14 | **AI זיהוי תלמיד בסיכון** | ניתוח דפוסי היעדרות, התראה למחנך על תלמיד שמפסיד שיעורים | Nice to Have | 3 |
| 15 | **AI ייבוא מערכת שעות מתמונה** | מנהל מצלם את המערכת המודפסת → Claude OCR → מילוי אוטומטי | Nice to Have | 3 |

---

## 3. User Stories

### Story 1: כניסת תלמיד/הורה עם PIN
> As a **הורה עם 2 ילדים בבית**,
> I want to **הקליד קוד PIN אחד ולראות מיד את לוח השיעורים של הילד**,
> so that **לא אצטרך לזכור אימיילים, סיסמאות, או לחפש קישורים בערוצים שונים**.

**Acceptance Criteria:**
- [ ] הורה מזין PIN של 6 ספרות ומגיע ללוח שיעורים
- [ ] PIN שגוי מציג הודעת שגיאה ברורה בעברית
- [ ] 5 ניסיונות כושלים → נעילה ל-5 דקות (rate limiting, server-side)
- [ ] לא נדרשת רישום או סיסמה מורכבת
- [ ] ה-PIN מאוחסן כ-hash ב-DB (bcrypt, cost factor 12)
- [ ] Session נשמר 7 ימים (cookie httpOnly + secure). אחרי 7 ימים → חוזר למסך PIN
- [ ] ניתן לפתוח session על 2 מכשירים בו-זמנית (אותו PIN)
- [ ] Logout מוחק את ה-session מהמכשיר הנוכחי בלבד

> **Security Note:** PIN של 6 ספרות = 1,000,000 אפשרויות. בשילוב rate limiting (5 ניסיונות / 5 דקות) ו-server-side throttle, brute force דורש ~694 ימים. לגישה ל-DB ישירות: bcrypt cost 12 מייצר ~3.4 שעות brute force per PIN. עדיין לא מושלם — שלב הבא יהיה PIN + שם משפחה.

### Story 2: מנהל/מורה מגדיר מערכת שעות שבועית
> As a **מנהל בית ספר**,
> I want to **להגדיר מערכת שעות שבועית לכל כיתה — מקצועות, שעות ומורים**,
> so that **התלמידים וההורים יראו אוטומטית את לוח השיעורים שלהם מבלי שאצטרך ליצור כל שיעור ידנית**.

**Acceptance Criteria:**
- [ ] מנהל בוחר כיתה ורואה grid שבועי (ימים × שעות)
- [ ] גורר ושם (או לוחץ) כדי ליצור slot: מקצוע + מורה + שעת התחלה + משך
- [ ] שיעור חוזר (recurring) = ברירת מחדל. שיעור חד-פעמי = option
- [ ] המערכת מייצרת instance של כל שיעור חוזר אוטומטית (LessonTemplate → LessonInstance)
- [ ] מורה יכול לערוך את השיעורים שלו (אבל לא של מורים אחרים)
- [ ] מנהל יכול לערוך כל שיעור
- [ ] שינוי ב-template משפיע על כל ה-instances העתידיים (לא על עבר)
- [ ] AI import: מנהל מעלה תמונה של מערכת שעות מודפסת → Claude מנתח → מציע מילוי (Sprint 3)

### Story 3: הורה מחליף בין ילדים
> As a **הורה עם 3 ילדים בכיתות שונות**,
> I want to **לעבור בין לוחות השיעורים של הילדים שלי בלחיצה אחת**,
> so that **אוכל לנהל את כולם ממסך אחד בלי להתנתק ולהתחבר מחדש**.

**Acceptance Criteria:**
- [ ] לאחר כניסה, הורה רואה רשימת ילדים מקושרים אליו
- [ ] לחיצה על שם ילד מציגה את לוח השיעורים שלו
- [ ] מעבר בין ילדים ללא טעינה מחדש של הדף (client-side switch)
- [ ] הילד האחרון שנצפה נשמר (כדי שבכניסה הבאה יפתח ישר)
- [ ] אם להורה ילד אחד בלבד — דילוג על מסך הבחירה, ישר ללוח

### Story 4: הצטרפות לשיעור בלחיצה אחת
> As a **תלמיד**,
> I want to **לראות את השיעורים של היום וללחוץ "הצטרף"**,
> so that **אגיע לשיעור ב-Zoom/Teams ישירות בלי לחפש קישורים**.

**Acceptance Criteria:**
- [ ] לוח שיעורים יומי מציג שם מקצוע, שעה, ושם מורה
- [ ] כפתור "הצטרף" פותח את הקישור ב-tab חדש
- [ ] שיעור שעדיין לא התחיל מסומן בצבע שונה (אפור)
- [ ] שיעור פעיל כרגע מודגש (ירוק + אנימציית pulse)
- [ ] שיעור שעבר מסומן כ"הסתיים" (חיוור)
- [ ] שיעור בלי קישור מציג "המורה עדיין לא הוסיף קישור" במקום כפתור
- [ ] לחיצה על "הצטרף" מסמנת intent נוכחות (join_clicked_at timestamp)
- [ ] הסטטוסים מתעדכנים לפי שעה אמיתית (לא רק בטעינה — setInterval כל 60 שניות)

### Story 5: מורה מוסיף קישור שיעור
> As a **מורה**,
> I want to **להוסיף קישור Zoom/Teams לשיעור שלי בשניות**,
> so that **כל התלמידים בכיתה יראו אותו אוטומטית בלוח שלהם**.

**Acceptance Criteria:**
- [ ] מורה רואה את המערכת השבועית שלו עם כל הכיתות
- [ ] מדביק קישור Zoom/Teams — המערכת מאמתת שזה URL תקין
- [ ] validation: רק קישורי zoom.us/* או teams.microsoft.com/* מתקבלים (+ אזהרה על "other")
- [ ] הקישור מופיע מיד בלוח השיעורים של כל תלמיד רלוונטי
- [ ] אפשרות לערוך או למחוק קישור
- [ ] **Recurring link:** מורה יכול לסמן קישור כ"חוזר" — אותו קישור ימלא את כל ה-instances העתידיים
- [ ] **"העתק משבוע שעבר":** כפתור שמעתיק את כל הקישורים מהשבוע הקודם לשבוע הנוכחי
- [ ] אם קישור לא הוסף 30 דקות לפני השיעור — מופיעה תזכורת למורה (in-app notification)

### Story 6: מורה מדביק טקסט חופשי (AI Link Parser)
> As a **מורה שקיבל הודעה בוואטסאפ עם פרטי שיעור**,
> I want to **להדביק את כל ההודעה והמערכת תחלץ ממנה את הקישור, התאריך והשעה**,
> so that **לא אצטרך להעתיק קישור ידנית ולמלא כל שדה בנפרד**.

**Acceptance Criteria:**
- [ ] שדה "הדבק טקסט" שמקבל טקסט חופשי (עד 2000 תווים)
- [ ] Claude API מנתח ומחזיר: meeting URL, platform type, date, time
- [ ] המערכת ממלאת אוטומטית את השדות ומבקשת אישור מהמורה
- [ ] אם לא נמצא קישור — הודעה ברורה "לא מצאתי קישור בטקסט"
- [ ] עובד עם עברית ואנגלית
- [ ] **Fallback:** אם Claude API לא זמין — המורה ממלא ידנית (graceful degradation)
- [ ] **Cache:** אם אותו טקסט בדיוק נשלח שוב — מחזיר תוצאה מ-cache (חיסכון API calls)
- [ ] Response time: מקסימום 5 שניות (עם loading indicator)

### Story 7: ניהול משתמשים (Admin)
> As a **מנהל בית ספר**,
> I want to **להוסיף תלמידים, מורים וכיתות למערכת ולייצר PINs**,
> so that **כולם יוכלו להתחבר ולהשתמש ב-SchoolHub**.

**Acceptance Criteria:**
- [ ] מנהל יוצר כיתה (שם + שכבה)
- [ ] מנהל מוסיף תלמיד לכיתה (שם + הורה/ים)
- [ ] מנהל מוסיף מורה (שם + מקצועות + כיתות)
- [ ] מנהל יכול להגדיר **מורה מחליף** (substitute) לכיתה ספציפית — המחליף יכול להוסיף קישורים
- [ ] המערכת מייצרת PINs ייחודיים אוטומטית (6 ספרות, ללא כפילויות per school)
- [ ] אפשרות להדפיס/להוריד רשימת PINs (לחלוקה להורים) — PDF או CSV
- [ ] מנהל יכול לאפס PIN של משתמש
- [ ] מנהל יכול להשבית (deactivate) משתמש בלי למחוק אותו
- [ ] **Audit log:** כל פעולת admin (יצירה, עריכה, מחיקה, איפוס PIN) נרשמת עם timestamp + user

### Story 8: הצטרפות לכיתה דרך קישור הזמנה (Enrollment)
> As a **מורה שמכין כיתה ללמידה מרחוק**,
> I want to **לשלוח קישור הזמנה לקבוצת ה-WhatsApp של הכיתה**,
> so that **כל הורה ילחץ, ירשום את עצמו ואת ילדו, ואני אאשר אותם — בלי שאצטרך להקליד כל משתמש ידנית**.

**Acceptance Criteria:**
- [ ] מורה/מנהל יוצר קישור הזמנה לכיתה ספציפית מהמערכת
- [ ] הקישור נראה כך: `schoolhub.app/join/{token}` — קצר, ניתן להעתקה ולשליחה
- [ ] כל מי שלוחץ על הקישור מגיע לטופס הרשמה קצר (שם, תפקיד, טלפון/אימייל)
- [ ] הורה יכול לרשום ילד אחד או יותר באותו טופס
- [ ] תלמיד יכול לרשום את עצמו ישירות (עם טלפון או אימייל שלו)
- [ ] לאחר שליחת הטופס — הנרשם נכנס ל**רשימת המתנה** ורואה הודעת "ממתין לאישור"
- [ ] מורה/מנהל רואה רשימת ממתינים ויכול: לאשר ✓ / לדחות ✗ / לשאול שאלה
- [ ] אישור → המערכת מייצרת PIN אוטומטית ושולחת אותו (אימייל + מוצג על המסך)
- [ ] ניתן לבטל/לחדש קישור הזמנה (למניעת שימוש לא מורשה)
- [ ] קישור יכול להיות עם תפוגה (ברירת מחדל: 30 יום) או ללא תפוגה
- [ ] **OG meta tags:** דף ה-join מציג בתצוגה מקדימה (WhatsApp/Telegram) שם כללי "הצטרפו ל-SchoolHub" — ללא שם כיתה ספציפי (פרטיות)
- [ ] **Rate limit on join page:** מקסימום 10 submissions per IP per hour (anti-spam)

### Story 9: הורה עם ריבוי ילדים וריבוי אמצעי קשר
> As a **הורה עם 3 ילדים בכיתות שונות**,
> I want to **להירשם פעם אחת ולקשר את כל הילדים שלי — גם אם הם נרשמו דרך קישורים שונים**,
> so that **אוכל לנהל את כולם ממקום אחד, עם PIN אחד**.

**Acceptance Criteria:**
- [ ] כשהורה נרשם דרך קישור כיתה — המערכת בודקת אם כבר קיים הורה עם אותו טלפון/אימייל
- [ ] אם ההורה כבר קיים — מציעה "האם להוסיף את הילד לחשבון הקיים שלך?"
- [ ] אימות: שליחת קוד חד-פעמי ל-email/SMS לאשר שזה אותו הורה (לא רק match על שם)
- [ ] הורה אחד יכול להיות מקושר לילדים בכיתות שונות (ParentStudent join table)
- [ ] לכל ילד יכולים להיות 2+ הורים (אבא, אמא, אפוטרופוס)
- [ ] לתלמיד יכול להיות טלפון ואימייל משלו (בנוסף לזה של ההורה)
- [ ] כל המידע הזה נשמר ב-DB אבל לא חייב להיות חובה — טלפון OR אימייל מספיק

### Story 10: דאשבורד מנהל (בסיסי)
> As a **מנהל בית ספר**,
> I want to **לראות בדף אחד אילו כיתות פעילות ואיפה חסרים קישורים**,
> so that **אוכל להתערב ולטפל בבעיות לפני שתלמידים מפספסים שיעורים**.

**Acceptance Criteria:**
- [ ] תצוגת grid של כל הכיתות עם סטטוס צבעוני (ירוק/צהוב/אדום)
- [ ] ירוק = שיעור פעיל עם קישור, צהוב = חסר קישור, אדום = שיעור התחיל בלי קישור
- [ ] לחיצה על כיתה מציגה פירוט (מורה, מקצוע, מספר תלמידים שלחצו "הצטרף")
- [ ] מספרים מתעדכנים בזמן אמת (Supabase Realtime, polling fallback כל 30 שניות)

### Story 11: Morning Briefing — סיכום בוקר להורה
> As a **הורה**,
> I want to **לקבל כל בוקר הודעה קצרה עם לוח השיעורים של הילד**,
> so that **אדע שהכל מוכן בלי לפתוח את האפליקציה**.

**Acceptance Criteria:**
- [ ] בשעה 7:30 (configurable) נשלח email לכל הורה רשום עם email
- [ ] ההודעה כוללת: שם ילד, רשימת שיעורים היום, סטטוס (✓ יש קישור / ⚠ חסר קישור)
- [ ] אם חסר קישור — ההודעה מדגישה את זה בצבע אדום
- [ ] כפתור "פתח ב-SchoolHub" עם deep link ישיר ללוח היומי
- [ ] הורה יכול לבטל את הסיכום (unsubscribe) בלחיצה

### Story 12: תלמיד — תצוגה שבועית + בחירת יום
> As a **תלמיד**,
> I want to **לראות את המערכת השבועית שלי ולבחור יום ספציפי**,
> so that **אוכל לתכנן את השבוע ולדעת מה מחכה לי**.

**Acceptance Criteria:**
- [ ] תלמיד רואה תצוגה יומית (ברירת מחדל — היום) + אפשרות למעבר לשבועי
- [ ] בתצוגה שבועית — גריד של כל הימים עם שם מקצוע + שעה + מורה
- [ ] ניתן ללחוץ על יום ספציפי לראות פירוט (כולל כפתור הצטרף)
- [ ] חצי ניווט: "הקודם / הבא" לדפדוף בין שבועות
- [ ] סטטוס צבעים גם בתצוגה שבועית (ירוק, אפור, חיוור, אזהרה)

### Story 13: הורה — תצוגה שבועית + כל הילדים יחד
> As a **הורה עם כמה ילדים**,
> I want to **לראות את המערכת השבועית של כל הילדים יחד, כל ילד בצבע אחר**,
> so that **אוכל לתכנן את השבוע לכל המשפחה במבט אחד**.

**Acceptance Criteria:**
- [ ] הורה רואה תצוגה יומית (ברירת מחדל) + אפשרות שבועי
- [ ] מצב "כל הילדים יחד" — כל ילד בצבע רקע שונה (כחול, ירוק, סגול...)
- [ ] ניתן לסנן לילד בודד או לראות את כולם
- [ ] בתצוגה שבועית — שיעורים ממוינים לפי שעה, עם תג צבע של הילד
- [ ] לחיצה על שיעור מראה פירוט + כפתור הצטרף

### Story 14: מורה — כל הכיתות יחד + סינון יומי/שבועי
> As a **מורה שמלמד כמה כיתות**,
> I want to **לראות את כל הכיתות שלי יחד בתצוגה יומית או שבועית, עם אפשרות לסנן כיתה ספציפית**,
> so that **אוכל לנהל את כל השיעורים שלי ממקום אחד**.

**Acceptance Criteria:**
- [ ] מורה רואה כל הכיתות יחד (ברירת מחדל) — כל כיתה בצבע/תג
- [ ] Toggle: תצוגה יומית / שבועית
- [ ] Multi-select לכיתות: סמן אילו כיתות להציג (checkbox per class)
- [ ] בתצוגה יומית — רשימה ממוינת לפי שעה עם תג כיתה
- [ ] בתצוגה שבועית — גריד עם כל הכיתות הנבחרות
- [ ] ניתן להוסיף/לערוך קישור ישירות מהתצוגה

### Story 15: מורה — הערות, שיעורי בית וקישורים לשיעור
> As a **מורה**,
> I want to **להוסיף הערות, שיעורי בית וקישורים לאתרים חיצוניים לכל שיעור**,
> so that **התלמידים יראו מה צריך להכין ואיפה יש חומר נוסף**.

**Acceptance Criteria:**
- [ ] מורה יכול להוסיף שדה "הערות" (טקסט חופשי, עד 500 תווים) לכל שיעור (instance)
- [ ] מורה יכול להוסיף קישורים לאתרים חיצוניים (URL + תיאור) — עד 5 קישורים per שיעור
- [ ] תלמיד רואה את ההערות והקישורים בתצוגת השיעור (מתחת לכפתור הצטרף)
- [ ] הורה רואה את אותו מידע בתצוגה שלו
- [ ] קישורים נפתחים ב-tab חדש
- [ ] ניתן לערוך/למחוק הערות וקישורים

---

## 4. Enrollment & Access Control

> **עיקרון מנחה:** קל להצטרף, קשה להיכנס ללא אישור.

### 4.1 איך נפתח בית ספר / כיתה?

```
1. מנהל בית הספר → נכנס ל-SchoolHub → יוצר בית ספר + כיתות + מערכת שעות
2. מנהל/מורה → יוצר "קישור הזמנה" לכל כיתה
3. קישור נשלח להורים/תלמידים (WhatsApp, אימייל, מודפס)
4. הורה/תלמיד → לוחץ על הקישור → ממלא טופס קצר → ממתין לאישור
5. מורה/מנהל → מאשר → PIN נוצר אוטומטית → הנרשם מקבל הודעה
```

### 4.2 Invitation Link — מנגנון הקישור

| Property | Value |
|----------|-------|
| **פורמט** | `schoolhub.app/join/{random-token}` |
| **Token** | 12 תווים, אלפא-נומרי, ייחודי, URL-safe |
| **תפוגה** | ברירת מחדל 30 יום, ניתן לשנות (7/14/30/ללא) |
| **פעולות** | יצירה, ביטול, חידוש, עותק ל-clipboard |
| **מגבלה** | קישור אחד פעיל per class (יצירת חדש מבטל את הקודם) |
| **QR** | אפשרות להציג QR Code (להדפסה) — Nice to Have |
| **Privacy** | OG meta tags מציגים שם כללי בלבד — לא שם כיתה |

### 4.3 Registration Form (טופס הצטרפות)

הטופס מותאם לפי תפקיד הנרשם:

**הורה:**
| שדה | חובה? | הערה |
|------|--------|------|
| שם מלא | כן | |
| טלפון | כן (או אימייל) | לפחות אמצעי קשר אחד |
| אימייל | כן (או טלפון) | |
| שמות ילדים בכיתה | כן (לפחות 1) | אפשר להוסיף כמה |

**תלמיד (רישום עצמי):**
| שדה | חובה? | הערה |
|------|--------|------|
| שם מלא | כן | |
| טלפון | לא | אם יש לתלמיד טלפון משלו |
| אימייל | לא | אם יש לתלמיד אימייל משלו |

### 4.4 Approval Flow (רשימת המתנה)

```
[נרשם חדש] → ⏳ Pending (רשימת המתנה)
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   ✓ Approved   ✗ Rejected   ? More Info
        │           │           │
   PIN נוצר    הודעת דחייה   מורה שולח
   ונשלח        (עם סיבה)    שאלה/הבהרה
```

**מי מאשר?**
- מורה — מאשר עבור הכיתות שלו
- מנהל — מאשר עבור כל הכיתות בבית הספר
- אופציה עתידית: אישור אוטומטי אם הילד מופיע ברשימת כיתה שהועלתה מראש (Bulk Enrollment)

### 4.5 Security & Access Control

| Concern | Solution |
|---------|----------|
| **מישהו שמקבל קישור ללא הרשאה** | הקישור מוביל רק לרשימת המתנה — לא לכניסה ישירה |
| **קישור נפרץ/הודלף** | מורה/מנהל יכול לבטל קישור ולייצר חדש בלחיצה |
| **זהות מזויפת** | מורה מכיר את ההורים/תלמידים ומאשר ידנית |
| **ריבוי הורים** | ParentStudent join table — כמה הורים per תלמיד |
| **תלמיד עם טלפון** | User.phone field — תלמיד יכול לקבל PIN ישירות |
| **תלמיד שעובר כיתה** | מנהל מעביר תלמיד — ההורים נשארים מקושרים |
| **Spam submissions** | Rate limit: 10 per IP per hour + CAPTCHA after 3 submissions |
| **OG preview leak** | Generic meta tags — no class/school name in preview |

---

## 5. Data Model (Conceptual)

### 5.1 Lesson Structure: Template vs Instance

```
LessonTemplate (the recurring definition)
  - id, class_id, subject, teacher_id
  - day_of_week (0-6), start_time, duration_minutes
  - meeting_link (if recurring), is_recurring_link: boolean

LessonInstance (a specific occurrence)
  - id, template_id, date
  - meeting_link (override — if null, inherits from template)
  - status: enum (scheduled, active, completed, cancelled)
  - cancelled_reason: string?
```

> **Why two tables?** A template defines "Math, every Tuesday at 8:00." An instance is "Math, Tuesday March 18 at 8:00." The teacher sets a recurring Zoom link on the template; it auto-fills every instance. But if one Tuesday is cancelled or has a different link, only that instance changes.

### 5.2 Attendance: Intent vs Confirmed

```
Attendance
  - id, lesson_instance_id, student_id
  - join_clicked_at: timestamp?     (student clicked "Join" in SchoolHub)
  - status: enum (unknown, present, absent, late)   (teacher confirms)
  - confirmed_by: uuid?             (teacher who confirmed)
  - confirmed_at: timestamp?
```

> **Why not "click = present"?** Because a click proves intent, not attendance. The teacher sees who clicked and can confirm. In Sprint 2, the default is: clicked = present. Teacher can override to absent if the student didn't actually stay.

---

## 6. Out of Scope (MVP)

- אין צ'אט פנימי בין משתמשים
- אין מערכת ציונים או מטלות
- אין שילוב עם מערכת ניהול בית ספר קיימת (משו"ב, ניהול בית ספרי)
- אין אפליקציית מובייל נייטיבית (web responsive בלבד)
- אין הקלטת שיעורים
- אין זיהוי פנים לנוכחות
- אין תמיכה ב-SSO מוסדי
- אין multi-tenant UI (תמיכה בבית ספר אחד ב-MVP, DB מוכן להרחבה)
- אין WhatsApp integration אוטומטי (דורש WhatsApp Business API בתשלום) — הקישור נשלח ידנית ע"י המורה
- אין אישור אוטומטי של נרשמים (כל נרשם חייב אישור ידני של מורה/מנהל ב-MVP)
- אין SMS אוטומטי לשליחת PIN (ב-MVP ה-PIN מוצג על המסך + אימייל אם זמין)
- אין ייבוא CSV/תמונה של רשימות כיתות (Bulk Enrollment — Sprint 3)
- אין delegation/substitute model מלא (מנהל ממלא ידנית ב-MVP)

---

## 7. Success Criteria

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Login speed | הורה עם PIN מגיע ללוח שיעורים תוך **3 שניות** | E2E test timing |
| Link add speed | מורה מוסיף קישור תוך **15 שניות** | E2E test timing |
| Link add (recurring) | מורה מגדיר קישור חוזר ומכסה שבוע שלם תוך **60 שניות** | E2E test timing |
| Admin overview | מנהל רואה סטטוס כל הכיתות ב**דף אחד** | Manual QA |
| Scale | המערכת תומכת ב-**200 משתמשים** בו-זמנית (free tier) | Load test (k6) |
| Coverage | כל 4 סוגי המשתמשים יכולים להשלים את הפעולה העיקרית | E2E tests per role |
| Accessibility | ניגודיות WCAG AA, תמיכה ב-screen reader, גודל טקסט מינימלי 16px | Lighthouse audit ≥ 90 |
| Mobile | שימושי במסך 320px ומעלה | Responsive E2E test |
| Enrollment | הורה מצטרף דרך קישור תוך **60 שניות** (כולל מילוי טופס) | E2E test timing |
| AI reliability | Smart Link Parser מחלץ נכון ב-**90%+** מהמקרים | Test suite with 50 sample texts |
| Uptime | **99.5%** availability during school hours (8:00-15:00) | Monitoring (UptimeRobot/similar) |

---

## 8. Technical Requirements & Constraints

### 8.1 Stack

- **Must use:** Claude API (Anthropic) — דרישת קורס
- **Must use:** Web-based (responsive) — חייב לעבוד בנייד בלי אפליקציה
- **Must not use:** שירותים בתשלום מעבר ל-Claude API (Supabase free tier, Vercel free tier)
- **Must support:** עברית (RTL) כשפה ראשית, אנגלית כמשנית
- **Must be:** נגיש — WCAG 2.1 AA minimum (ניגודיות, screen reader, keyboard navigation)

### 8.2 Security

| Requirement | Implementation |
|-------------|---------------|
| PIN storage | bcrypt, cost factor 12 |
| Rate limiting | 5 attempts / 5 minutes per IP (server-side) |
| Sessions | httpOnly + Secure cookies, 7-day expiry |
| Transport | HTTPS only (Vercel handles TLS) |
| Input sanitization | Server-side validation on all inputs, parameterized queries |
| Enrollment tokens | 12-char crypto-random, URL-safe, with optional expiry |
| Audit trail | Admin actions logged: who, what, when (admin_audit_log table) |

### 8.3 Performance

| Metric | Target |
|--------|--------|
| TTFB (Time to First Byte) | < 200ms |
| LCP (Largest Contentful Paint) | < 1.5s |
| Concurrent users (free tier) | 200 |
| Concurrent Realtime connections | 200 (Supabase free tier limit) |
| API response time (non-AI) | < 300ms p95 |
| AI response time (Claude) | < 5s with loading indicator |

### 8.4 AI Cost Management

| Control | Implementation |
|---------|---------------|
| **Monthly budget cap** | Maximum 1000 Claude API calls/month (configurable) |
| **Caching** | Identical inputs cached for 24h (hash-based) |
| **Fallback** | If AI unavailable → manual input mode (graceful degradation) |
| **Rate limit per user** | Maximum 20 AI parses per teacher per day |
| **Model selection** | Use claude-haiku for link parsing (cheap + fast), claude-sonnet for digests |

### 8.5 Privacy & Compliance

| Requirement | Implementation |
|-------------|---------------|
| Israeli Privacy Law | Privacy policy page explaining what data is collected and why |
| Data retention | Attendance data retained for current school year + 1 year archive |
| Right to deletion | Admin can permanently delete a user and all associated data |
| Children's data | Minimal data collection: name + class. Phone/email optional |
| Encryption at rest | Supabase encrypts all data at rest by default |

---

## 9. AI Integration Points

ה-AI אינו תוספת — הוא פותר בעיות שלא ניתן לפתור בלוגיקה רגילה:

| Feature | What Plain Code Can't Do | AI Role | Model | Sprint |
|---------|------------------------|---------|-------|--------|
| **Smart Link Parser** | מורה מדביק הודעת וואטסאפ בעברית עם קישור, תאריך ושעה בפורמטים שונים — regex לא מכסה את כל הווריאציות | Claude מנתח טקסט חופשי, מחלץ URL + תאריך + שעה + פלטפורמה, ומציע מילוי אוטומטי | Haiku | 2 |
| **Daily Digest** | מנהל צריך לא רק מספרים אלא insights: "שלושת התלמידים שהכי מפסידים השבוע", "מורה X לא הוסיף קישורים ביומיים האחרונים" | Claude מייצר סיכום טקסטואלי עם המלצות פעולה מתוך נתוני הנוכחות | Sonnet | 3 |
| **Student at Risk** | זיהוי דפוסים מורכבים: תלמיד שנעדר רק משיעורי מתמטיקה, או שנוכח אבל מתנתק אחרי 5 דקות — SQL פשוט לא תופס את זה | Claude מנתח דפוסי התנהגות ומסמן תלמידים שדורשים תשומת לב | Sonnet | 3 |
| **Schedule OCR Import** | מנהל מצלם מערכת שעות מודפסת — מבנה של טבלה בתמונה, עברית, פורמטים שונים | Claude Vision מנתח תמונה ומייצר JSON של שיעורים | Sonnet | 3 |

---

## 10. Sprint Roadmap

### Sprint 1: Foundation + PIN Login + Schedule + Enrollment
**Goal:** בית ספר אחד יכול להגדיר מערכת שעות, להזמין הורים בקישור, ולהתחיל ללמוד.

**Delivers:** Features 1-7 (PIN, Schedule, Daily View, Child Switch, Teacher Links, Admin, Enrollment)

### Sprint 2: Attendance + AI + Morning Briefing
**Goal:** מורה מנהל נוכחות, AI מפרש קישורים, הורים מקבלים עדכון בוקר.

**Delivers:** Features 8-11 (Dashboard, Attendance, AI Link Parser, Morning Briefing)

### Sprint 3: Advanced AI + Scale
**Goal:** AI שמייצר insights, זיהוי תלמידים בסיכון, ייבוא מערכת מתמונה.

**Delivers:** Features 12-15 (Daily Digest, Reminders, Student at Risk, Schedule OCR)

---

## 11. Wireframe Flows (Text)

### Flow 1: Student Login → Join Class
```
[PIN Screen] → Enter 6 digits → [Daily Schedule]
                                      │
                                      ├── 08:00 מתמטיקה — גב' כהן [הצטרף ▶]
                                      ├── 09:00 אנגלית — מר לוי [טרם התחיל]
                                      ├── 10:00 מדעים — גב' אברהם [חסר קישור]
                                      └── 11:00 היסטוריה — מר דוד [הסתיים ✓]
```

### Flow 2: Parent with Multiple Children
```
[PIN Screen] → Enter PIN → [Child Picker]
                              │
                              ├── 👦 יואב — כיתה ז'2
                              ├── 👧 נועה — כיתה ד'1
                              └── 👶 עומר — כיתה ב'3
                              │
                              └── Select child → [Daily Schedule for that child]
```

### Flow 3: Admin Creates Weekly Schedule
```
[Admin Dashboard] → [Classes] → Select class → [Weekly Schedule Grid]
                                                    │
                                                    ├── Drag to create slot
                                                    │   ├── Subject: מתמטיקה
                                                    │   ├── Teacher: גב' כהן
                                                    │   ├── Time: 08:00-08:45
                                                    │   └── Recurring: ✓
                                                    │
                                                    └── (or) Import from photo → AI fills grid
```

### Flow 4: Teacher Add Link
```
[Teacher Dashboard] → Select class → [Weekly Schedule Grid]
                                        │
                                        ├── Click empty slot → [Add Link Modal]
                                        │                        ├── Paste URL
                                        │                        ├── (or) Paste free text → AI extracts
                                        │                        ├── ☑ Recurring link
                                        │                        └── Confirm → Saved ✓
                                        │
                                        ├── [Copy from last week] → All links filled ✓
                                        │
                                        └── Click existing → [Edit/Delete]
```

### Flow 5: Enrollment — Teacher Sends Invite
```
[Teacher Dashboard] → [My Classes] → Select class → [Generate Invite Link]
                                                        │
                                                        ├── 🔗 Copy link → Send via WhatsApp/Email
                                                        └── (optional) Show QR Code

--- Parent clicks the link ---

[Join Page: schoolhub.app/join/abc123] → [Registration Form]
                                            │
                                            ├── שם: יעל כהן
                                            ├── תפקיד: הורה
                                            ├── טלפון: 054-xxx
                                            ├── ילדים: [יואב] [+ הוסף ילד]
                                            └── [שלח בקשה]
                                                  │
                                                  ▼
                                          [⏳ ממתין לאישור]

--- Teacher sees pending list ---

[Teacher Dashboard] → [Pending Requests (3)]
                        ├── יעל כהן (הורה של יואב) — [✓ אשר] [✗ דחה]
                        ├── דנה לוי (הורה של נועה ואור) — [✓ אשר] [✗ דחה]
                        └── עמית ברק (תלמיד) — [✓ אשר] [✗ דחה]
                        │
                        └── Approve → PIN generated → Notification sent
```

### Flow 6: Admin Setup
```
[Admin Dashboard] → [Sidebar]
                      ├── כיתות → Create/Edit classes
                      ├── מערכת שעות → Weekly schedule builder
                      ├── תלמידים → Add students to classes
                      ├── מורים → Add teachers + assign subjects
                      ├── PINs → Generate / reset / print
                      ├── הרשמות → Pending enrollment requests
                      ├── סטטוס → Live classroom status grid
                      └── יומן פעולות → Audit log
```

---

## 12. Known Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Supabase free tier connection limit (200) | System unusable at scale | High | Polling fallback for Realtime; upgrade to Pro if needed ($25/mo) |
| Teacher forgets to add link | Students stuck with "no link" | High | Morning Briefing alerts parent; 30-min reminder to teacher; recurring links reduce frequency |
| PIN brute force on leaked DB | Unauthorized access to all accounts | Low | 6-digit PINs + bcrypt cost 12; roadmap: PIN + family name |
| Claude API downtime | AI features unavailable | Medium | Graceful degradation: manual input always available |
| Claude API costs exceed budget | Unexpected charges | Medium | Monthly cap (1000 calls), caching, rate limit per user |
| Israeli privacy law compliance | Legal risk | Medium | Privacy policy page, minimal data collection, right-to-deletion |
| WhatsApp link preview leaks class info | Privacy concern | Low | Generic OG meta tags; no class-specific info in preview |

---

## Appendix A: Changes from PRD v2.0

| Change | Rationale |
|--------|-----------|
| Added Product Vision & Strategy (Section 1) | PRD lacked direction — no competitive analysis, no 12-month goals |
| Added Story 2: Weekly Schedule creation | Show-stopper gap — entire product depends on a schedule that nobody created |
| Changed PIN from 4-6 to 6 digits only | 4-digit PIN = 10K combos = trivially brute-forceable on leaked DB |
| Added LessonTemplate/LessonInstance model | Lesson was ambiguous — recurring vs one-time was undefined |
| Added recurring links + "copy from last week" | Teacher workload was 40+ manual actions/week with no bulk tools |
| Changed attendance from "click = present" to "click = intent" | Click proves intent, not attendance — teacher confirms |
| Added session management (7 days, multi-device) | Was completely undefined |
| Added Morning Briefing (Feature 11) | System was passive — parents had to remember to check |
| Added AI cost management section | AI costs were unbounded — no cap, no cache, no fallback |
| Reduced concurrent user target to 200 (free tier reality) | 500 was unrealistic on Supabase free tier |
| Added audit trail to Admin story | Legal/compliance gap — no record of who did what |
| Added Known Risks table | No risk assessment existed |
| Added Privacy & Compliance section | Children's data requires legal disclosure |
| Simplified multi-tenant: school_id on main tables only | Full multi-tenant prep on every table = premature optimization |
| Added competitive landscape | No differentiation was stated |
| Added OG meta tag privacy for join links | WhatsApp preview could leak class name |
