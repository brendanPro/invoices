import { TemplateController } from './template.controller';
import { HttpHandler } from '../../lib/http-handler';
import { requireAuth } from '../../lib/auth-middleware';

export const config = {
  path: '/api/templates',
};

const ALLOWED_METHODS = ['GET', 'POST', 'DELETE', 'OPTIONS'];
const templateController = new TemplateController();

export default async (req: Request) => {
  const corsResponse = HttpHandler.handleCors(req);
  if (corsResponse) return corsResponse;

  const methodError = HttpHandler.validateMethod(req, ALLOWED_METHODS);
  if (methodError) return methodError;

  // Require authentication for all template operations
  const authResult = await requireAuth(req);
  if (!authResult.authenticated) {
    return authResult.response!;
  }

  try {
    switch (req.method) {
      case 'GET':
        const queryParams = HttpHandler.extractQueryParams(req);
        if (queryParams.has('id')) return await templateController.getTemplate(req);
        
        return await templateController.listTemplates();
        
      case 'POST':
        return await templateController.createTemplate(req);
      
      case 'DELETE':
        return await templateController.deleteTemplate(req);
      
      default:
        return HttpHandler.methodNotAllowed(ALLOWED_METHODS);
    }
  } catch (error) {
    console.error('Template endpoint error:', error);
    return HttpHandler.internalError('An unexpected error occurred');
  }
};