import { HttpHandler, HttpMethod } from '@netlify/lib/http-handler';
import { requireAuth } from '@netlify/lib/auth-middleware';
import { TemplateModule } from '@netlify/templates/templates.module';
import fields from '../fields/fields.mts';
import { FieldService } from '@netlify/fields/field.service';
import { FieldsRepository } from '@netlify/fields/fields.repository';

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
const templateModule = new TemplateModule(new FieldService(new FieldsRepository()));
const templateController = templateModule.controller;

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
