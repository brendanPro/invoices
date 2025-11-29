-- Add color column only if it doesn't exist (idempotent migration)
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'template_fields' 
    AND column_name = 'color'
  ) THEN
    ALTER TABLE "template_fields" ADD COLUMN "color" varchar(7) DEFAULT '#000000';
  END IF;
END $$;