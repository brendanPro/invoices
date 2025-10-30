import { TemplateController } from './template.controller';
import { HttpHandler, HttpMethod } from '../../lib/http-handler';
import { requireAuth } from '../../lib/auth-middleware';
import fields from './fields/fields.mts';

export const config = {
  path: [
    '/api/templates',
    '/api/templates/:template_id',
    '/api/templates/:template_id/fields',
    '/api/templates/:template_id/fields/:field_id',
    '/api/templates/:template_id/pdf',
  ],
};

const ALLOWED_METHODS = [HttpMethod.GET, HttpMethod.POST, HttpMethod.DELETE, HttpMethod.OPTIONS];
const templateController = new TemplateController();

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

  if (await shouldForwardToFields(req, userEmail)) return await fields(req);
  try {
    switch (req.method) {
      case HttpMethod.GET:
        const queryParams = HttpHandler.extractQueryParams(req);
        if (queryParams.has('id')) return await templateController.getTemplate(req, userEmail);

        return await templateController.listTemplates(userEmail);

      case HttpMethod.POST:
        return await templateController.createTemplate(req, userEmail);

      case HttpMethod.DELETE:
        return await templateController.deleteTemplate(req, userEmail);

      default:
        return HttpHandler.methodNotAllowed(ALLOWED_METHODS);
    }
  } catch (error) {
    console.error('Template endpoint error:', error);
    return HttpHandler.internalError('An unexpected error occurred');
  }
};

const shouldForwardToFields = async (req: Request, userEmail: string) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const templateExists = await templateController.isTemplateExists(req, userEmail);
  return pathParts[4] === 'fields' && templateExists;
};
