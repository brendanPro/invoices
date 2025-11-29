import { eq, desc } from 'drizzle-orm';
import { db } from '@db/index';
import { templates, invoices } from '@db/schema';
import type { Invoice } from '@/types/index';
import type { IInvoicesRepository } from '@netlify/invoices/IInvoicesRepository';

function transformInvoice(drizzleInvoice: any): Invoice {
  return {
    id: drizzleInvoice.id,
    template_id: drizzleInvoice.template_id,
    invoice_data: drizzleInvoice.invoice_data,
    generated_at: drizzleInvoice.generated_at.toISOString(),
    pdf_blob_key: drizzleInvoice.pdf_blob_key ?? undefined,
    template_name: drizzleInvoice.template_name ?? undefined,
  };
}

export class InvoicesRepository implements IInvoicesRepository {
  async create(
    templateId: number,
    invoiceData: Record<string, any>,
    pdfBlobKey?: string,
  ): Promise<Invoice> {
    const insertResult = await db.insert(invoices)
      .values({
        template_id: templateId,
        invoice_data: invoiceData,
        pdf_blob_key: pdfBlobKey,
      })
      .returning();

    const invoiceId = insertResult[0].id;

    const result = await db.select({
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
  }

  async findById(id: number): Promise<Invoice | null> {
    const result = await db.select({
        id: invoices.id,
        template_id: invoices.template_id,
        invoice_data: invoices.invoice_data,
        generated_at: invoices.generated_at,
        pdf_blob_key: invoices.pdf_blob_key,
        template_name: templates.name,
      })
      .from(invoices)
      .leftJoin(templates, eq(invoices.template_id, templates.id))
      .where(eq(invoices.id, id))
      .limit(1);
    return result[0] ? transformInvoice(result[0]) : null;
  }

  async findAll(userEmail: string): Promise<Invoice[]> {
    const result = await db.select({
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
  }

//   TBD do we need this?
  async findByTemplateId(templateId: number): Promise<Invoice[]> {
    const result = await db.select({
        id: invoices.id,
        template_id: invoices.template_id,
        invoice_data: invoices.invoice_data,
        generated_at: invoices.generated_at,
        pdf_blob_key: invoices.pdf_blob_key,
        template_name: templates.name,
      })
      .from(invoices)
      .leftJoin(templates, eq(invoices.template_id, templates.id))
      .where(eq(invoices.template_id, templateId))
      .orderBy(desc(invoices.generated_at));

    return result.map(transformInvoice);
  }

  async updatePdfBlobKey(invoiceId: number, pdfBlobKey: string): Promise<Invoice | null> {
    const result = await db.update(invoices)
      .set({ pdf_blob_key: pdfBlobKey })
      .where(eq(invoices.id, invoiceId))
      .returning();

    if (result.length === 0) return null;

    const invoiceWithTemplate = await db.select({
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
  }

  async delete(invoiceId: number): Promise<Invoice | null> {
    const result = await db.delete(invoices).where(eq(invoices.id, invoiceId)).returning();
    return result[0] ? transformInvoice(result[0]) : null;
  }
}

