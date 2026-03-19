-- Sprint 03+: Add homeroom teacher flag to user table (Decision 013)
-- is_homeroom_teacher: true = מחנך, false = מורה מקצועי
-- Only relevant for role='teacher'. Admin sets this.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_homeroom_teacher BOOLEAN DEFAULT false;

COMMENT ON COLUMN "user".is_homeroom_teacher IS 'True = homeroom teacher (מחנך), can approve enrollment. False = subject teacher (מורה מקצועי).';
