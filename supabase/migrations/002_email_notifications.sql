-- Add email_notifications column to user table (default true for parents)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
