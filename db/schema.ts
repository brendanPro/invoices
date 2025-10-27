import { 
  integer, 
  pgTable, 
  varchar, 
  text, 
  timestamp, 
  decimal, 
  jsonb,
  pgEnum,
  unique,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enum for field types
export const fieldTypeEnum = pgEnum('field_type', ['text', 'number', 'date']);

// Templates table
export const templates = pgTable('templates', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  blob_key: varchar('blob_key', { length: 255 }).notNull().unique(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  blobKeyIdx: index('idx_templates_blob_key').on(table.blob_key),
}));

// Template fields table
export const templateFields = pgTable('template_fields', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  template_id: integer('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  field_name: varchar('field_name', { length: 255 }).notNull(),
  x_position: decimal('x_position', { precision: 10, scale: 2 }).notNull(),
  y_position: decimal('y_position', { precision: 10, scale: 2 }).notNull(),
  font_size: decimal('font_size', { precision: 5, scale: 2 }).default('12'),
  field_type: fieldTypeEnum('field_type').default('text'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  templateIdIdx: index('idx_template_fields_template_id').on(table.template_id),
  templateFieldUnique: unique('unique_template_field').on(table.template_id, table.field_name),
}));

// Invoices table
export const invoices = pgTable('invoices', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  template_id: integer('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  invoice_data: jsonb('invoice_data').notNull(),
  generated_at: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  pdf_blob_key: varchar('pdf_blob_key', { length: 255 }),
}, (table) => ({
  templateIdIdx: index('idx_invoices_template_id').on(table.template_id),
  generatedAtIdx: index('idx_invoices_generated_at').on(table.generated_at),
}));

// Define relations
export const templatesRelations = relations(templates, ({ many }) => ({
  fields: many(templateFields),
  invoices: many(invoices),
}));

export const templateFieldsRelations = relations(templateFields, ({ one }) => ({
  template: one(templates, {
    fields: [templateFields.template_id],
    references: [templates.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  template: one(templates, {
    fields: [invoices.template_id],
    references: [templates.id],
  }),
}));

// Export schema for Drizzle
export const schema = {
  templates,
  templateFields,
  invoices,
  fieldTypeEnum,
};

// Export relations
export const relationsSchema = {
  templatesRelations,
  templateFieldsRelations,
  invoicesRelations,
};