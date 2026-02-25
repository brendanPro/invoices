import { blobs } from '@netlify/lib/blobs';
import type { Invoice } from '@/types/index';
import type { IInvoicesRepository } from '@netlify/invoices/IInvoicesRepository';
import type { ITemplateService } from '@netlify/templates/ITemplateService';
import type { IInvoiceService, InvoiceWithTemplate } from '@netlify/invoices/IInvoiceService';
import type { IPdfGeneratorService } from '@netlify/pdf/IPdfGeneratorService';
import { NotFoundError } from '@netlify/lib/errors';

export class InvoiceService implements IInvoiceService {
  private readonly repository: IInvoicesRepository;
  private readonly templateService: ITemplateService;
  private readonly pdfGenerator: IPdfGeneratorService;

  constructor(
    repository: IInvoicesRepository,
    templateService: ITemplateService,
    pdfGenerator: IPdfGeneratorService,
  ) {
    this.repository = repository;
    this.templateService = templateService;
    this.pdfGenerator = pdfGenerator;
  }

  async createInvoice(templateId: number, invoiceData: Record<string, any>, userEmail: string): Promise<Invoice> {
    try {
      const templateExists = await this.templateService.templateExists(templateId, userEmail);
      if (!templateExists) throw new NotFoundError('Template not found');

      return await this.repository.create(templateId, invoiceData);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Service: Error creating invoice:', error);
      throw new Error('Failed to create invoice');
    }
  }

  async getInvoiceWithTemplate(invoiceId: number, userEmail: string): Promise<InvoiceWithTemplate> {
    try {
      const invoice = await this.repository.findById(invoiceId);
      if (!invoice) throw new NotFoundError('Invoice not found');

      const template = await this.templateService.getTemplateByIdWithFields(invoice.template_id, userEmail);
      if (!template) throw new NotFoundError('Invoice not found');
      if (template.user_email !== userEmail) throw new NotFoundError('Invoice not found');

      let pdfBlob: ArrayBuffer | null = null;
      let pdfBlobKey: string | undefined = invoice.pdf_blob_key;

      if (pdfBlobKey) {
        try {
          pdfBlob = await blobs.getTemplate(pdfBlobKey);
        } catch {
          console.warn(`Invoice PDF blob not found at ${pdfBlobKey}, generating new one`);
          pdfBlobKey = undefined;
          pdfBlob = null;
        }
      }

      if (!pdfBlob) {
        const templateBlob = await blobs.getTemplate(template.blob_key);
        const generatedPdfBuffer = await this.pdfGenerator.generate(
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
      if (error instanceof NotFoundError) throw error;
      console.error('Service: Error getting invoice with template:', error);
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
      if (!invoice) throw new NotFoundError('Invoice not found');

      const template = await this.templateService.getTemplateById(invoice.template_id, userEmail);
      if (!template || template.user_email !== userEmail) throw new NotFoundError('Invoice not found');

      if (invoice.pdf_blob_key) {
        try {
          await blobs.deleteTemplate(invoice.pdf_blob_key);
        } catch {
          console.warn(`Failed to delete invoice PDF blob ${invoice.pdf_blob_key}, continuing with deletion`);
        }
      }

      await this.repository.delete(invoiceId);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Service: Error deleting invoice:', error);
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
}
