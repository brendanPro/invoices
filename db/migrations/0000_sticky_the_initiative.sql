CREATE TYPE "public"."field_type" AS ENUM('text', 'number', 'date');--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "invoices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"template_id" integer NOT NULL,
	"invoice_data" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pdf_blob_key" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "template_fields" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "template_fields_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"template_id" integer NOT NULL,
	"field_name" varchar(255) NOT NULL,
	"x_position" numeric(10, 2) NOT NULL,
	"y_position" numeric(10, 2) NOT NULL,
	"font_size" numeric(5, 2) DEFAULT '12',
	"field_type" "field_type" DEFAULT 'text',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unique_template_field" UNIQUE("template_id","field_name")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "templates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"blob_key" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "templates_blob_key_unique" UNIQUE("blob_key")
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_fields" ADD CONSTRAINT "template_fields_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_invoices_template_id" ON "invoices" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_generated_at" ON "invoices" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "idx_template_fields_template_id" ON "template_fields" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_templates_blob_key" ON "templates" USING btree ("blob_key");