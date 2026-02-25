import { HttpHandler } from '@netlify/lib/http-handler';
import type { IInvoiceService } from '@netlify/invoices/IInvoiceService';
import type { GenerateInvoiceRequest } from '@/types/index';
import { AppError, ValidationError } from '@netlify/lib/errors';

export class InvoiceController {
  private invoiceService: IInvoiceService;

  constructor(invoiceService: IInvoiceService) {
    this.invoiceService = invoiceService;
  }

  async getInvoice(req: Request, userEmail: string): Promise<Response> {
    try {
      const invoiceId = this.extractInvoiceId(req);

      if (invoiceId === null) {
        return await this.listInvoices(userEmail);
      }

      const { invoice, pdfBlob } = await this.invoiceService.getInvoiceWithTemplate(invoiceId, userEmail);
      return HttpHandler.pdf(pdfBlob, `invoice-${invoice.id}`);
    } catch (error) {
      if (error instanceof AppError) return HttpHandler.fromAppError(error);
      console.error('Controller: Error getting invoice:', error);
      return HttpHandler.internalError('Failed to retrieve invoice');
    }
  }

  async listInvoices(userEmail: string): Promise<Response> {
    return HttpHandler.handleAsync(
      () => this.invoiceService.getAllInvoices(userEmail),
      'Failed to retrieve invoices',
    );
  }

  async createInvoice(req: Request, userEmail: string): Promise<Response> {
    try {
      const body = await HttpHandler.extractJson<GenerateInvoiceRequest>(req);
      const { template_id, invoice_data } = body;

      const missingField = HttpHandler.validateRequiredFields(body, ['template_id', 'invoice_data']);
      if (missingField) return HttpHandler.validationError(missingField);

      const typeError = HttpHandler.validateFieldTypes(body, { template_id: 'number', invoice_data: 'object' });
      if (typeError) return HttpHandler.validationError(typeError);

      if (!this.invoiceService.validateTemplateId(template_id)) {
        return HttpHandler.validationError('Template ID must be a valid positive integer');
      }

      if (!this.invoiceService.validateInvoiceData(invoice_data)) {
        return HttpHandler.validationError('Invoice data must be a valid object');
      }

      const invoice = await this.invoiceService.createInvoice(template_id, invoice_data, userEmail);
      return HttpHandler.created(invoice);
    } catch (error) {
      if (error instanceof AppError) return HttpHandler.fromAppError(error);
      console.error('Controller: Error creating invoice:', error);
      return HttpHandler.internalError('Failed to create invoice');
    }
  }

  async deleteInvoice(req: Request, userEmail: string): Promise<Response> {
    try {
      const invoiceId = this.extractInvoiceId(req);

      if (invoiceId === null) {
        return HttpHandler.validationError('Invoice ID is required');
      }

      await this.invoiceService.deleteInvoice(invoiceId, userEmail);
      return HttpHandler.success({ message: 'Invoice deleted successfully' });
    } catch (error) {
      if (error instanceof AppError) return HttpHandler.fromAppError(error);
      console.error('Controller: Error deleting invoice:', error);
      return HttpHandler.internalError('Failed to delete invoice');
    }
  }

  private extractInvoiceId(req: Request): number | null {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts.length < 3) return null;

    const id = parseInt(pathParts[2], 10);
    if (isNaN(id) || id <= 0) throw new ValidationError('Invoice ID must be a valid positive integer');

    return id;
  }
}
