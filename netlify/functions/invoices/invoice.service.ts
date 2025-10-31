import { PDFDocument, rgb } from 'pdf-lib';
import { drizzleDb } from '../../lib/drizzle-db';
import { blobs } from '../../lib/blobs';
import type { Invoice, Template, TemplateField } from '../../../src/types/index';

export interface InvoiceWithTemplate {
  invoice: Invoice;
  pdfBlob: ArrayBuffer;
}

export class InvoiceService {
  /**
   * Create a new invoice
   */
  async createInvoice(templateId: number, invoiceData: Record<string, any>): Promise<Invoice> {
    try {
      // Validate template exists
      const template = await drizzleDb.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Create invoice in database
      const invoice = await drizzleDb.createInvoice(templateId, invoiceData);
      return invoice;
    } catch (error) {
      console.error('Service: Error creating invoice:', error);
      if (error instanceof Error && error.message === 'Template not found') {
        throw error;
      }
      throw new Error('Failed to create invoice');
    }
  }

  validateInvoiceData(invoiceData: Record<string, any>): boolean {
    return typeof invoiceData === 'object' && invoiceData !== null && !Array.isArray(invoiceData);
  }

  validateTemplateId(templateId: number): boolean {
    return Number.isInteger(templateId) && templateId > 0;
  }

  private generateInvoiceBlobKey(invoiceId: number): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    return `invoice_${invoiceId}_${timestamp}_${randomString}.pdf`;
  }

  private async generateInvoicePdf(
    templateBlob: ArrayBuffer,
    templateFields: TemplateField[],
    invoiceData: Record<string, any>,
  ): Promise<ArrayBuffer> {
    // Load PDF document
    const pdfDoc = await PDFDocument.load(templateBlob);
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();

    // Embed default font
    const font = await pdfDoc.embedFont('Helvetica');

    // Draw text for each field
    for (const field of templateFields) {
      const value = invoiceData[field.field_name];
      if (value !== undefined && value !== null && value !== '') {
        const textValue = String(value);

        const x = parseFloat(field.x_position.toString());
        const y = parseFloat(field.y_position.toString());
        const fontSize = parseFloat(field.font_size.toString());

        const pdfY = height - y - fontSize;

        page.drawText(textValue, {
          x,
          y: pdfY,
          size: fontSize,
          font,
          color: rgb(0, 0, 0), // Black text
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    ) as ArrayBuffer;
  }

  async getInvoiceWithTemplate(invoiceId: number, userEmail: string): Promise<InvoiceWithTemplate> {
    try {
      const invoice = await drizzleDb.getInvoiceById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const template = await drizzleDb.getTemplateById(invoice.template_id);
      if (!template) {
        throw new Error('Template not found');
      }

      if (template.user_email !== userEmail) {
        throw new Error('Invoice not found');
      }

      let pdfBlob: ArrayBuffer | null = null;
      let pdfBlobKey: string | undefined = invoice.pdf_blob_key;

      if (pdfBlobKey) {
        try {
          pdfBlob = await blobs.getTemplate(pdfBlobKey);
        } catch (error) {
          // If blob doesn't exist, generate it
          console.warn(`Invoice PDF blob not found at ${pdfBlobKey}, generating new one`);
          pdfBlobKey = undefined;
          pdfBlob = null;
        }
      }

      if (!pdfBlob) {
        const templateFields = await drizzleDb.getTemplateFields(template.id);
        const templateBlob = await blobs.getTemplate(template.blob_key);

        const generatedPdfBuffer = await this.generateInvoicePdf(
          templateBlob,
          templateFields,
          invoice.invoice_data,
        );

        pdfBlobKey = this.generateInvoiceBlobKey(invoiceId);
        await blobs.uploadTemplate(pdfBlobKey, generatedPdfBuffer);

        await drizzleDb.updateInvoicePdfBlobKey(invoiceId, pdfBlobKey);

        pdfBlob = generatedPdfBuffer;
      }

      return {
        invoice: { ...invoice, pdf_blob_key: pdfBlobKey },
        pdfBlob,
      };
    } catch (error) {
      console.error('Service: Error getting invoice with template:', error);
      if (
        error instanceof Error &&
        (error.message === 'Invoice not found' || error.message === 'Template not found')
      ) {
        throw error;
      }
      throw new Error('Failed to retrieve invoice data');
    }
  }

  async getAllInvoices(userEmail: string): Promise<Invoice[]> {
    try {
      return await drizzleDb.listInvoices(userEmail);
    } catch (error) {
      console.error('Service: Error fetching invoices from database:', error);
      throw new Error('Failed to retrieve invoices');
    }
  }

  async deleteInvoice(invoiceId: number, userEmail: string): Promise<void> {
    try {
      // Get invoice to find pdf_blob_key and validate ownership
      const invoice = await drizzleDb.getInvoiceById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Get template to validate ownership
      const template = await drizzleDb.getTemplateById(invoice.template_id);
      if (!template) {
        throw new Error('Template not found');
      }

      // Validate ownership: ensure the template belongs to the user
      if (template.user_email !== userEmail) {
        throw new Error('Invoice not found');
      }

      // Delete PDF blob if it exists
      if (invoice.pdf_blob_key) {
        try {
          await blobs.deleteTemplate(invoice.pdf_blob_key);
        } catch (error) {
          console.warn(
            `Failed to delete invoice PDF blob ${invoice.pdf_blob_key}, continuing with deletion`,
          );
          // Continue even if blob deletion fails - invoice will still be deleted from DB
        }
      }

      // Delete invoice from database
      await drizzleDb.deleteInvoice(invoiceId);
    } catch (error) {
      console.error('Service: Error deleting invoice:', error);
      if (
        error instanceof Error &&
        (error.message === 'Invoice not found' || error.message === 'Template not found')
      ) {
        throw error;
      }
      throw new Error('Failed to delete invoice');
    }
  }
}
