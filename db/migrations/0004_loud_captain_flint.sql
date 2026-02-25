CREATE TABLE "template_field_groups" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "template_field_groups_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"template_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "template_fields" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "template_field_groups" ADD CONSTRAINT "template_field_groups_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_template_field_groups_template_id" ON "template_field_groups" USING btree ("template_id");--> statement-breakpoint
ALTER TABLE "template_fields" ADD CONSTRAINT "template_fields_group_id_template_field_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."template_field_groups"("id") ON DELETE set null ON UPDATE no action;