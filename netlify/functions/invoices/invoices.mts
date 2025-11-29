import { HttpHandler, HttpMethod } from '@netlify/lib/http-handler';
import { requireAuth } from '@netlify/lib/auth-middleware';
import { InvoiceModule } from '@netlify/invoices/invoice.module';  
import { TemplateService } from '@netlify/templates/template.service';
import { TemplatesRepository } from '@netlify/templates/templates.repository';
import { FieldService } from '@netlify/fields/field.service';
import { FieldsRepository } from '@netlify/fields/fields.repository';

export const config = {
  path: ['/api/invoices', '/api/invoices/:invoice_id'],
};

const ALLOWED_METHODS = [HttpMethod.GET, HttpMethod.POST, HttpMethod.DELETE, HttpMethod.OPTIONS];
const templateService = new TemplateService(new TemplatesRepository(), new FieldService(new FieldsRepository()));
const invoiceModule = new InvoiceModule(templateService);
const invoiceController = invoiceModule.controller;

export default async (req: Request) => {
  const corsResponse = HttpHandler.handleCors(req);
  if (corsResponse) return corsResponse;

  const methodError = HttpHandler.validateMethod(req, ALLOWED_METHODS);
  if (methodError) return methodError;

  const authResult = await requireAuth(req);
  if (!authResult.authenticated) {
    return authResult.response!;
  }
  const userEmail = authResult.user!.email;

  try {
    switch (req.method) {
      case HttpMethod.GET:
        return await invoiceController.getInvoice(req, userEmail);

      case HttpMethod.POST:
        return await invoiceController.createInvoice(req);

      case HttpMethod.DELETE:
        return await invoiceController.deleteInvoice(req, userEmail);

      default:
        return HttpHandler.methodNotAllowed(ALLOWED_METHODS);
    }
  } catch (error) {
    console.error('Invoice endpoint error:', error);
    return HttpHandler.internalError('An unexpected error occurred');
  }
};
