import { HttpHandler, HttpMethod } from '../../lib/http-handler';
import { requireAuth } from '../../lib/auth-middleware';
import { blobs } from '../../lib/blobs';
import { drizzleDb } from '../../lib/drizzle-db';

export const config = {
  path: '/api/pdf',
};

const ALLOWED_METHODS = [HttpMethod.GET, HttpMethod.OPTIONS];

export default async (req: Request) => {
  try {
    const corsResponse = HttpHandler.handleCors(req);
    if (corsResponse) return corsResponse;

    const methodError = HttpHandler.validateMethod(req, ALLOWED_METHODS);
    if (methodError) return methodError;

    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    if (!email) {
      return HttpHandler.badRequest('Email is required');
    }
    const templateId = url.searchParams.get('template_id');
    if (!templateId) {
      return HttpHandler.badRequest('Template ID is required');
    }

    const id = parseInt(templateId, 10);
    if (isNaN(id)) {
      return HttpHandler.badRequest('Invalid template ID');
    }

    // Verify template ownership
    const template = await drizzleDb.getTemplateById(id);
    if (!template) {
      return HttpHandler.notFound('Template not found or access denied');
    }

    // Get PDF blob from storage
    const blobKey = template.blob_key;
    const pdfBlob = await blobs.getTemplate(blobKey);

    if (!pdfBlob) {
      return HttpHandler.notFound('PDF file not found');
    }

    // Return PDF using HttpHandler helper
    return HttpHandler.pdf(pdfBlob, template.name);
  } catch (error) {
    console.error('PDF endpoint error:', error);
    return HttpHandler.internalError('An unexpected error occurred');
  }
};
