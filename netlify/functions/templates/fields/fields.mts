import { HttpHandler, HttpMethod } from '../../../lib/http-handler';
import { TemplateFieldController } from './template-field.controller';

const templateFieldController = new TemplateFieldController();
const ALLOWED_METHODS = [HttpMethod.GET, HttpMethod.POST, HttpMethod.DELETE, HttpMethod.OPTIONS];
export default async (req: Request) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const templateId = parseInt(pathParts[3]);

    if (isNaN(templateId)) {
      return HttpHandler.badRequest('Invalid template ID');
    }

    switch (req.method) {
      case HttpMethod.GET:
        return templateFieldController.getTemplateFields(templateId);

      case HttpMethod.POST:
        return templateFieldController.createTemplateField(req, templateId);

      case HttpMethod.DELETE:
        const fieldId = parseInt(pathParts[5]);
        if (isNaN(fieldId)) {
          return HttpHandler.badRequest('Invalid field ID');
        }

        return templateFieldController.deleteTemplateField(templateId, fieldId);

      default:
        return HttpHandler.methodNotAllowed(ALLOWED_METHODS);
    }
  } catch (error) {
    console.error('Template fields endpoint error:', error);
    return HttpHandler.internalError('An unexpected error occurred');
  }
};
