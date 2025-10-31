import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../db';
import { templates, templateFields, invoices } from '../../db/schema';
import type { Template, TemplateField, Invoice } from '../../src/types/index';

// Transform Drizzle results to match our types
function transformTemplate(drizzleTemplate: any): Template {
  return {
    id: drizzleTemplate.id,
    name: drizzleTemplate.name,
    blob_key: drizzleTemplate.blob_key,
    user_email: drizzleTemplate.user_email,
    created_at: drizzleTemplate.created_at.toISOString(),
    updated_at: drizzleTemplate.updated_at.toISOString(),
  };
}

function transformTemplateField(drizzleField: any): TemplateField {
  return {
    id: drizzleField.id,
    template_id: drizzleField.template_id,
    field_name: drizzleField.field_name,
    x_position: drizzleField.x_position.toString(),
    y_position: drizzleField.y_position.toString(),
    width: drizzleField.width.toString(),
    height: drizzleField.height.toString(),
    font_size: drizzleField.font_size.toString(),
    field_type: drizzleField.field_type,
    created_at: drizzleField.created_at.toISOString(),
  };
}

function transformInvoice(drizzleInvoice: any): Invoice {
  return {
    id: drizzleInvoice.id,
    template_id: drizzleInvoice.template_id,
    invoice_data: drizzleInvoice.invoice_data,
    generated_at: drizzleInvoice.generated_at.toISOString(),
    pdf_blob_key: drizzleInvoice.pdf_blob_key,
    template_name: drizzleInvoice.template_name,
  };
}

// Database utility functions using Drizzle ORM
export const drizzleDb = {
  // Template operations
  async createTemplate(name: string, blobKey: string, userEmail: string): Promise<Template> {
    const result = await db
      .insert(templates)
      .values({
        name,
        blob_key: blobKey,
        user_email: userEmail,
      })
      .returning();

    return transformTemplate(result[0]);
  },

  async getTemplateById(id: number): Promise<Template | null> {
    const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
    return result[0] ? transformTemplate(result[0]) : null;
  },

  async listTemplates(userEmail: string): Promise<Template[]> {
    const result = await db
      .select()
      .from(templates)
      .where(eq(templates.user_email, userEmail))
      .orderBy(desc(templates.created_at));
    return result.map(transformTemplate);
  },

  async deleteTemplate(id: number, userEmail: string): Promise<Template | null> {
    const result = await db
      .delete(templates)
      .where(and(eq(templates.id, id), eq(templates.user_email, userEmail)))
      .returning();
    return result[0] ? transformTemplate(result[0]) : null;
  },

  async templateExists(id: number, userEmail: string): Promise<boolean> {
    const result = await db
      .select({ id: templates.id })
      .from(templates)
      .where(and(eq(templates.id, id), eq(templates.user_email, userEmail)))
      .limit(1);
    return result.length > 0;
  },

  async getTemplateFields(templateId: number): Promise<TemplateField[]> {
    const result = await db
      .select()
      .from(templateFields)
      .where(eq(templateFields.template_id, templateId))
      .orderBy(templateFields.field_name);

    return result.map(transformTemplateField);
  },

  async createTemplateField(fieldData: {
    template_id: number;
    field_name: string;
    x_position: number;
    y_position: number;
    width: number;
    height: number;
    font_size: number;
    field_type: 'text' | 'number' | 'date';
  }): Promise<TemplateField> {
    const result = await db
      .insert(templateFields)
      .values({
        template_id: fieldData.template_id,
        field_name: fieldData.field_name,
        x_position: fieldData.x_position.toString(),
        y_position: fieldData.y_position.toString(),
        width: fieldData.width.toString(),
        height: fieldData.height.toString(),
        font_size: fieldData.font_size.toString(),
        field_type: fieldData.field_type,
      })
      .returning();

    return transformTemplateField(result[0]);
  },

  async getTemplateFieldById(fieldId: number): Promise<TemplateField | null> {
    const result = await db
      .select()
      .from(templateFields)
      .where(eq(templateFields.id, fieldId))
      .limit(1);

    return result.length > 0 ? transformTemplateField(result[0]) : null;
  },

  async getTemplateFieldByName(
    templateId: number,
    fieldName: string,
  ): Promise<TemplateField | null> {
    const result = await db
      .select()
      .from(templateFields)
      .where(
        and(eq(templateFields.template_id, templateId), eq(templateFields.field_name, fieldName)),
      )
      .limit(1);

    return result.length > 0 ? transformTemplateField(result[0]) : null;
  },

  async updateTemplateField(
    fieldId: number,
    fieldData: {
      field_name?: string;
      x_position?: number;
      y_position?: number;
      font_size?: number;
      field_type?: 'text' | 'number' | 'date';
    },
  ): Promise<TemplateField | null> {
    const updateData: any = {};

    if (fieldData.field_name !== undefined) updateData.field_name = fieldData.field_name;
    if (fieldData.x_position !== undefined) updateData.x_position = fieldData.x_position.toString();
    if (fieldData.y_position !== undefined) updateData.y_position = fieldData.y_position.toString();
    if (fieldData.font_size !== undefined) updateData.font_size = fieldData.font_size.toString();
    if (fieldData.field_type !== undefined) updateData.field_type = fieldData.field_type;

    const result = await db
      .update(templateFields)
      .set(updateData)
      .where(eq(templateFields.id, fieldId))
      .returning();

    return result[0] ? transformTemplateField(result[0]) : null;
  },

  async deleteTemplateField(fieldId: number): Promise<TemplateField | null> {
    const result = await db
      .delete(templateFields)
      .where(eq(templateFields.id, fieldId))
      .returning();

    return result[0] ? transformTemplateField(result[0]) : null;
  },

  async deleteTemplateFields(templateId: number): Promise<void> {
    await db.delete(templateFields).where(eq(templateFields.template_id, templateId));
  },

  // Invoice operations
  async createInvoice(
    templateId: number,
    invoiceData: Record<string, any>,
    pdfBlobKey?: string,
  ): Promise<Invoice> {
    const insertResult = await db
      .insert(invoices)
      .values({
        template_id: templateId,
        invoice_data: invoiceData,
        pdf_blob_key: pdfBlobKey,
      })
      .returning();

    const invoiceId = insertResult[0].id;

    // Fetch the invoice with template name using join
    const result = await db
      .select({
        id: invoices.id,
        template_id: invoices.template_id,
        invoice_data: invoices.invoice_data,
        generated_at: invoices.generated_at,
        pdf_blob_key: invoices.pdf_blob_key,
        template_name: templates.name,
      })
      .from(invoices)
      .leftJoin(templates, eq(invoices.template_id, templates.id))
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    return transformInvoice(result[0]);
  },

  async getInvoiceById(id: number): Promise<Invoice | null> {
    const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    return result[0] ? transformInvoice(result[0]) : null;
  },

  async listInvoices(userEmail: string): Promise<Invoice[]> {
    const result = await db
      .select({
        id: invoices.id,
        template_id: invoices.template_id,
        invoice_data: invoices.invoice_data,
        generated_at: invoices.generated_at,
        pdf_blob_key: invoices.pdf_blob_key,
        template_name: templates.name,
      })
      .from(invoices)
      .leftJoin(templates, eq(invoices.template_id, templates.id))
      .where(eq(templates.user_email, userEmail))
      .orderBy(desc(invoices.generated_at));

    return result.map(transformInvoice);
  },

  async getInvoicesByTemplate(templateId: number): Promise<Invoice[]> {
    const result = await db
      .select()
      .from(invoices)
      .where(eq(invoices.template_id, templateId))
      .orderBy(desc(invoices.generated_at));

    return result.map(transformInvoice);
  },

  async updateInvoicePdfBlobKey(invoiceId: number, pdfBlobKey: string): Promise<Invoice | null> {
    const result = await db
      .update(invoices)
      .set({ pdf_blob_key: pdfBlobKey })
      .where(eq(invoices.id, invoiceId))
      .returning();

    if (result.length === 0) {
      return null;
    }

    // Fetch with template name
    const invoiceWithTemplate = await db
      .select({
        id: invoices.id,
        template_id: invoices.template_id,
        invoice_data: invoices.invoice_data,
        generated_at: invoices.generated_at,
        pdf_blob_key: invoices.pdf_blob_key,
        template_name: templates.name,
      })
      .from(invoices)
      .leftJoin(templates, eq(invoices.template_id, templates.id))
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    return invoiceWithTemplate[0] ? transformInvoice(invoiceWithTemplate[0]) : null;
  },

  async deleteInvoice(invoiceId: number): Promise<Invoice | null> {
    const result = await db.delete(invoices).where(eq(invoices.id, invoiceId)).returning();
    return result[0] ? transformInvoice(result[0]) : null;
  },

  // Configuration operations (combining template and fields)
  async getTemplateConfiguration(
    templateId: number,
    userEmail: string,
  ): Promise<{
    template: Template;
    fields: TemplateField[];
  } | null> {
    const template = await this.getTemplateById(templateId, userEmail);
    if (!template) return null;

    const fields = await this.getTemplateFields(templateId);

    return { template, fields };
  },
};

// Export the database utilities
export { drizzleDb as db };
