import { HttpHandler, HttpMethod } from '@netlify/lib/http-handler';
import { FieldModule } from '@netlify/fields/field.module';
import { FieldService } from '@netlify/fields/field.service';
import { FieldsRepository } from '@netlify/fields/fields.repository';
import { requireAuth } from '@netlify/lib/auth-middleware';
import { TemplatesRepository } from '@netlify/templates/templates.repository';
import { TemplateService } from '@netlify/templates/template.service';

const templateService = new TemplateService(new TemplatesRepository(), new FieldService(new FieldsRepository()));
const fieldModule = new FieldModule(templateService);
const fieldController = fieldModule.controller;
const ALLOWED_METHODS = [HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE, HttpMethod.OPTIONS];

export default async (req: Request) => {
  try {
    const corsResponse = HttpHandler.handleCors(req);
    if (corsResponse) return corsResponse;
    const methodError = HttpHandler.validateMethod(req, ALLOWED_METHODS);
    if (methodError) return methodError;
    const authResult = await requireAuth(req);
    if (!authResult.authenticated) {
      return authResult.response!;
    }
    const userEmail = authResult.user!.email;
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const templateId = parseInt(pathParts[3]);

    if (isNaN(templateId)) {
      return HttpHandler.badRequest('Invalid template ID');
    }

    const templateExists = await templateService.templateExists(templateId, userEmail);
    if (!templateExists) {
      return HttpHandler.notFound('Template not found or access denied');
    }

    switch (req.method) {
      case HttpMethod.GET:
        return fieldController.getTemplateFields(templateId);

      case HttpMethod.POST:
        return fieldController.createTemplateField(req, templateId, userEmail);

      case HttpMethod.PUT:
        const updateFieldId = parseInt(pathParts[5]);
        if (isNaN(updateFieldId)) {
          return HttpHandler.badRequest('Invalid field ID');
        }
        return fieldController.updateTemplateField(req, templateId, updateFieldId, userEmail);

      case HttpMethod.DELETE:
        const fieldId = parseInt(pathParts[5]);
        if (isNaN(fieldId)) {
          return HttpHandler.badRequest('Invalid field ID');
        }

        return fieldController.deleteTemplateField(templateId, fieldId, userEmail);

      default:
        return HttpHandler.methodNotAllowed(ALLOWED_METHODS);
    }
  } catch (error) {
    console.error('Template fields endpoint error:', error);
    return HttpHandler.internalError('An unexpected error occurred');
  }
};
