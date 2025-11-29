-- Add width column only if it doesn't exist (idempotent)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'template_fields' 
    AND column_name = 'width'
  ) THEN
    ALTER TABLE "template_fields" ADD COLUMN "width" numeric(10, 2) NOT NULL;
  END IF;
END $$;--> statement-breakpoint
-- Add height column only if it doesn't exist (idempotent)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'template_fields' 
    AND column_name = 'height'
  ) THEN
    ALTER TABLE "template_fields" ADD COLUMN "height" numeric(10, 2) NOT NULL;
  END IF;
END $$;