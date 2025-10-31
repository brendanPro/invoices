import type { Invoice } from '../../../src/types/invoice';
import { InvoiceService } from './invoice.service';
import { HttpHandler } from '../../lib/http-handler';

interface CreateInvoiceRequest {
  template_id: number;
  invoice_data: Record<string, any>;
}

export class InvoiceController {
  private invoiceService: InvoiceService;

  constructor() {
    this.invoiceService = new InvoiceService();
  }

  /**
   * Extract invoice ID from request URL
   */
  private getInvoiceId(req: Request): number | Response | null {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // /api/invoices -> ['api', 'invoices'] - no ID
    // /api/invoices/:invoice_id -> ['api', 'invoices', ':invoice_id'] - has ID
    if (pathParts.length < 3) {
      return null; // No invoice ID in path
    }

    const invoiceId = pathParts[2]; // Skip 'api' and 'invoices'

    const id = parseInt(invoiceId, 10);
    if (isNaN(id) || id <= 0) {
      return HttpHandler.validationError('Invoice ID must be a valid positive integer');
    }

    return id;
  }

  async getInvoice(req: Request, userEmail: string): Promise<Response> {
    try {
      const invoiceId = this.getInvoiceId(req);

      if (invoiceId instanceof Response) {
        return invoiceId;
      }

      if (invoiceId === null) {
        // No invoice ID provided - list all invoices for the user
        return await this.listInvoices(userEmail);
      }

      // Get invoice with template and PDF blob (validates ownership)
      const { invoice, pdfBlob } = await this.invoiceService.getInvoiceWithTemplate(
        invoiceId,
        userEmail,
      );

      // Return PDF blob
      return HttpHandler.pdf(pdfBlob, `invoice-${invoice.id}`);
    } catch (error) {
      console.error('Controller: Error getting invoice:', error);
      if (
        error instanceof Error &&
        (error.message === 'Invoice not found' || error.message === 'Template not found')
      ) {
        return HttpHandler.notFound(error.message);
      }
      return HttpHandler.internalError('Failed to retrieve invoice');
    }
  }

  async listInvoices(userEmail: string): Promise<Response> {
    return HttpHandler.handleAsync(
      () => this.invoiceService.getAllInvoices(userEmail),
      'Failed to retrieve invoices',
    );
  }

  async createInvoice(req: Request): Promise<Response> {
    try {
      const body = await HttpHandler.extractJson<CreateInvoiceRequest>(req);
      const { template_id, invoice_data } = body;

      // Validate required fields
      const missingField = HttpHandler.validateRequiredFields(body, [
        'template_id',
        'invoice_data',
      ]);
      if (missingField) {
        return HttpHandler.validationError(missingField);
      }

      // Validate field types
      const typeError = HttpHandler.validateFieldTypes(body, {
        template_id: 'number',
        invoice_data: 'object',
      });
      if (typeError) {
        return HttpHandler.validationError(typeError);
      }

      // Additional business validation
      if (!this.invoiceService.validateTemplateId(template_id)) {
        return HttpHandler.validationError('Template ID must be a valid positive integer');
      }

      if (!this.invoiceService.validateInvoiceData(invoice_data)) {
        return HttpHandler.validationError('Invoice data must be a valid object');
      }

      const invoice = await this.invoiceService.createInvoice(template_id, invoice_data);
      return HttpHandler.created(invoice);
    } catch (error) {
      console.error('Controller: Error creating invoice:', error);
      if (error instanceof Error && error.message === 'Template not found') {
        return HttpHandler.notFound('Template not found');
      }
      return HttpHandler.internalError('Failed to create invoice');
    }
  }

  async deleteInvoice(req: Request, userEmail: string): Promise<Response> {
    try {
      const invoiceId = this.getInvoiceId(req);

      if (invoiceId instanceof Response) {
        return invoiceId;
      }

      if (invoiceId === null) {
        return HttpHandler.validationError('Invoice ID is required');
      }

      await this.invoiceService.deleteInvoice(invoiceId, userEmail);
      return HttpHandler.success({ message: 'Invoice deleted successfully' });
    } catch (error) {
      console.error('Controller: Error deleting invoice:', error);
      if (
        error instanceof Error &&
        (error.message === 'Invoice not found' || error.message === 'Template not found')
      ) {
        return HttpHandler.notFound('Invoice not found');
      }
      return HttpHandler.internalError('Failed to delete invoice');
    }
  }
}
