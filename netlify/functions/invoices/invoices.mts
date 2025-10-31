import { InvoiceController } from './invoice.controller';
import { HttpHandler, HttpMethod } from '../../lib/http-handler';
import { requireAuth } from '../../lib/auth-middleware';

export const config = {
  path: ['/api/invoices', '/api/invoices/:invoice_id'],
};

const ALLOWED_METHODS = [HttpMethod.GET, HttpMethod.POST, HttpMethod.DELETE, HttpMethod.OPTIONS];
const invoiceController = new InvoiceController();

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
