-- Add user_email column as nullable first (to handle existing data)
ALTER TABLE "templates" ADD COLUMN "user_email" varchar(255);--> statement-breakpoint
-- Update existing templates with a placeholder (you should update these manually or delete them)
-- This allows the migration to proceed even if there's existing data
UPDATE "templates" SET "user_email" = 'migration-placeholder@example.com' WHERE "user_email" IS NULL;--> statement-breakpoint
-- Now make it NOT NULL since all rows have a value
ALTER TABLE "templates" ALTER COLUMN "user_email" SET NOT NULL;--> statement-breakpoint
-- Create index for better query performance
CREATE INDEX "idx_templates_user_email" ON "templates" USING btree ("user_email");