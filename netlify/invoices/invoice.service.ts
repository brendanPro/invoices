import { PDFDocument, rgb } from 'pdf-lib';
import { blobs } from '@netlify/lib/blobs';
import type { Invoice, TemplateField } from '@/types/index';
import type { IInvoicesRepository } from '@netlify/invoices/IInvoicesRepository';
import type { ITemplateService } from '@netlify/templates/ITemplateService';
import type { IInvoiceService, InvoiceWithTemplate } from '@netlify/invoices/IInvoiceService';

export class InvoiceService implements IInvoiceService {
  private readonly repository: IInvoicesRepository;
  private readonly templateService: ITemplateService;
  constructor(repository: IInvoicesRepository, templateService: ITemplateService) {
    this.repository = repository;
    this.templateService = templateService;
  }

  async createInvoice(templateId: number, invoiceData: Record<string, any>): Promise<Invoice> {
    try {
      const templateExists = await this.templateService.templateExists(templateId);
      if (!templateExists) throw new Error('Template not found');

      const invoice = await this.repository.create(templateId, invoiceData);
      return invoice;
    } catch (error) {
      console.error('Service: Error creating invoice:', error);
      if (error instanceof Error && error.message === 'Template not found') {
        throw error;
      }
      throw new Error('Failed to create invoice');
    }
  }

  async getInvoiceWithTemplate(invoiceId: number, userEmail: string): Promise<InvoiceWithTemplate> {
    try {
      const invoice = await this.repository.findById(invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      const template = await this.templateService.getTemplateByIdWithFields(invoice.template_id, userEmail);
      if (!template) throw new Error('Template not found');
      if (template.user_email !== userEmail) throw new Error('Invoice not found');

      let pdfBlob: ArrayBuffer | null = null;
      let pdfBlobKey: string | undefined = invoice.pdf_blob_key;

      if (pdfBlobKey) {
        try {
          pdfBlob = await blobs.getTemplate(pdfBlobKey);
        } catch (error) {
          console.warn(`Invoice PDF blob not found at ${pdfBlobKey}, generating new one`);
          pdfBlobKey = undefined;
          pdfBlob = null;
        }
      }

      if (!pdfBlob) {
        const templateBlob = await blobs.getTemplate(template.blob_key);

        const generatedPdfBuffer = await this.generateInvoicePdf(
          templateBlob,
          template.fields,
          invoice.invoice_data,
        );

        pdfBlobKey = this.generateInvoiceBlobKey(invoiceId);
        await blobs.uploadTemplate(pdfBlobKey, generatedPdfBuffer);
        await this.repository.updatePdfBlobKey(invoiceId, pdfBlobKey);
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
      return await this.repository.findAll(userEmail);
    } catch (error) {
      console.error('Service: Error fetching invoices from database:', error);
      throw new Error('Failed to retrieve invoices');
    }
  }

  async deleteInvoice(invoiceId: number, userEmail: string): Promise<void> {
    try {
      const invoice = await this.repository.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const template = await this.templateService.getTemplateById(invoice.template_id, userEmail);
      if (!template) {
        throw new Error('Template not found');
      }

      if (template.user_email !== userEmail) {
        throw new Error('Invoice not found');
      }

      if (invoice.pdf_blob_key) {
        try {
          await blobs.deleteTemplate(invoice.pdf_blob_key);
        } catch (error) {
          console.warn(
            `Failed to delete invoice PDF blob ${invoice.pdf_blob_key}, continuing with deletion`,
          );
        }
      }

      await this.repository.delete(invoiceId);
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

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    // Remove # if present and normalize
    const cleanHex = hex.replace('#', '').toLowerCase();

    // Validate hex format (should be 6 characters)
    if (cleanHex.length !== 6 || !/^[0-9a-f]{6}$/.test(cleanHex)) {
      console.warn(`Invalid hex color: ${hex}, defaulting to black`);
      return { r: 0, g: 0, b: 0 };
    }

    // Parse hex values (0-255 range, convert to 0-1 range for pdf-lib)
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    return { r, g, b };
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

        // Use field color or default to black
        const colorHex = field.color || '#000000';
        const colorRgb = this.hexToRgb(colorHex);

        page.drawText(textValue, {
          x,
          y: pdfY,
          size: fontSize,
          font,
          color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    ) as ArrayBuffer;
  }
}
