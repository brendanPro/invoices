-- Add user_email column only if it doesn't exist (idempotent)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'templates' 
    AND column_name = 'user_email'
  ) THEN
    -- Add user_email column as nullable first (to handle existing data)
    ALTER TABLE "templates" ADD COLUMN "user_email" varchar(255);
    -- Update existing templates with a placeholder
    UPDATE "templates" SET "user_email" = 'migration-placeholder@example.com' WHERE "user_email" IS NULL;
    -- Now make it NOT NULL since all rows have a value
    ALTER TABLE "templates" ALTER COLUMN "user_email" SET NOT NULL;
  END IF;
END $$;--> statement-breakpoint
-- Create index only if it doesn't exist (idempotent)
CREATE INDEX IF NOT EXISTS "idx_templates_user_email" ON "templates" USING btree ("user_email");