-- Sprint 03: Add notes and resources to lesson_instance (Story 15)
-- Decision: approved by FOUNDER 2026-03-20

ALTER TABLE lesson_instance ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
ALTER TABLE lesson_instance ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT NULL;
-- resources format: [{"url": "https://...", "label": "שיעורי בית"}, ...]

COMMENT ON COLUMN lesson_instance.notes IS 'Teacher notes for this lesson (free text, max 500 chars)';
COMMENT ON COLUMN lesson_instance.resources IS 'Array of {url, label} objects for external links, homework, etc.';
