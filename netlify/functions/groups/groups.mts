import { HttpHandler, HttpMethod } from '@netlify/lib/http-handler';
import { GroupModule } from '@netlify/groups/group.module';
import { FieldService } from '@netlify/fields/field.service';
import { FieldsRepository } from '@netlify/fields/fields.repository';
import { TemplatesRepository } from '@netlify/templates/templates.repository';
import { TemplateService } from '@netlify/templates/template.service';
import { requireAuth } from '@netlify/lib/auth-middleware';

const templateService = new TemplateService(new TemplatesRepository(), new FieldService(new FieldsRepository()));
const groupModule = new GroupModule(templateService);
const groupController = groupModule.controller;

const ALLOWED_METHODS = [HttpMethod.GET, HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE, HttpMethod.PATCH, HttpMethod.OPTIONS];

// URL pattern: /api/templates/:templateId/groups/:groupId?/move?
const TEMPLATE_ID_PATH_INDEX = 3;
const GROUP_ID_PATH_INDEX = 5;
const ACTION_PATH_INDEX = 6;

export default async (req: Request) => {
  try {
    const corsResponse = HttpHandler.handleCors(req);
    if (corsResponse) return corsResponse;

    const methodError = HttpHandler.validateMethod(req, ALLOWED_METHODS);
    if (methodError) return methodError;

    const authResult = await requireAuth(req);
    if (!authResult.authenticated) return authResult.response!;

    const userEmail = authResult.user!.email;
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const templateId = parseInt(pathParts[TEMPLATE_ID_PATH_INDEX]);

    if (isNaN(templateId)) return HttpHandler.badRequest('Invalid template ID');

    const templateExists = await templateService.templateExists(templateId, userEmail);
    if (!templateExists) return HttpHandler.notFound('Template not found or access denied');

    const groupIdRaw = pathParts[GROUP_ID_PATH_INDEX];
    const groupId = groupIdRaw ? parseInt(groupIdRaw) : NaN;
    const action = pathParts[ACTION_PATH_INDEX];

    switch (req.method) {
      case HttpMethod.GET:
        return groupController.getGroups(templateId);

      case HttpMethod.POST:
        return groupController.createGroup(req, templateId, userEmail);

      case HttpMethod.PUT:
        if (isNaN(groupId)) return HttpHandler.badRequest('Invalid group ID');
        return groupController.updateGroup(req, templateId, groupId, userEmail);

      case HttpMethod.DELETE:
        if (isNaN(groupId)) return HttpHandler.badRequest('Invalid group ID');
        return groupController.deleteGroup(templateId, groupId, userEmail);

      case HttpMethod.PATCH:
        if (isNaN(groupId)) return HttpHandler.badRequest('Invalid group ID');
        if (action !== 'move') return HttpHandler.badRequest('Unknown action');
        return groupController.moveGroup(req, templateId, groupId, userEmail);

      default:
        return HttpHandler.methodNotAllowed(ALLOWED_METHODS);
    }
  } catch (error) {
    console.error('Groups endpoint error:', error);
    return HttpHandler.internalError('An unexpected error occurred');
  }
};

export const config = {
  path: '/api/templates/:templateId/groups/:groupId?/:action?',
};
