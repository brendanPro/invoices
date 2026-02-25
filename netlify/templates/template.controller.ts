import type { CreateTemplateRequest } from '@/types/index';
import type { ITemplateService } from '@netlify/templates/ITemplateService';
import { HttpHandler } from '@netlify/lib/http-handler';
import { AppError, ValidationError } from '@netlify/lib/errors';

export class TemplateController {
  private templateService: ITemplateService;

  constructor(templateService: ITemplateService) {
    this.templateService = templateService;
  }

  async listTemplates(userEmail: string): Promise<Response> {
    return HttpHandler.handleAsync(
      () => this.templateService.getAllTemplates(userEmail),
      'Failed to retrieve templates',
    );
  }

  async createTemplate(req: Request, userEmail: string): Promise<Response> {
    try {
      const body = await HttpHandler.extractJson<CreateTemplateRequest>(req);
      const { name, fileData } = body;

      const missingField = HttpHandler.validateRequiredFields(body, ['name', 'fileData']);
      if (missingField) return HttpHandler.validationError(missingField);

      const typeError = HttpHandler.validateFieldTypes(body, { name: 'string', fileData: 'string' });
      if (typeError) return HttpHandler.validationError(typeError);

      if (!this.templateService.validateTemplateName(name)) {
        return HttpHandler.validationError('Template name must be a non-empty string (max 255 characters)');
      }

      if (!this.templateService.validateFileData(fileData)) {
        return HttpHandler.validationError('File data must be valid base64 encoded data');
      }

      const template = await this.templateService.createTemplate(name, fileData, userEmail);
      return HttpHandler.created(template);
    } catch (error) {
      if (error instanceof AppError) return HttpHandler.fromAppError(error);
      console.error('Controller: Error creating template:', error);
      return HttpHandler.internalError('Failed to create template');
    }
  }

  async deleteTemplate(req: Request, userEmail: string): Promise<Response> {
    try {
      const queryParams = HttpHandler.extractQueryParams(req);
      const templateId = queryParams.get('id');

      if (!templateId) return HttpHandler.validationError('Template ID is required');

      const id = parseInt(templateId, 10);
      if (isNaN(id) || id <= 0) {
        return HttpHandler.validationError('Template ID must be a valid positive integer');
      }

      const templateExists = await this.templateService.templateExists(id, userEmail);
      if (!templateExists) return HttpHandler.notFound('Template not found');

      await this.templateService.deleteTemplate(id, userEmail);
      return HttpHandler.success({ message: 'Template deleted successfully' });
    } catch (error) {
      if (error instanceof AppError) return HttpHandler.fromAppError(error);
      console.error('Controller: Error deleting template:', error);
      return HttpHandler.internalError('Failed to delete template');
    }
  }

  async getTemplate(req: Request, userEmail: string): Promise<Response> {
    try {
      const id = this.extractTemplateId(req);
      const template = await this.templateService.getTemplateById(id, userEmail);
      if (!template) return HttpHandler.notFound('Template not found');
      return HttpHandler.success(template);
    } catch (error) {
      if (error instanceof AppError) return HttpHandler.fromAppError(error);
      console.error('Controller: Error fetching template:', error);
      return HttpHandler.internalError('Failed to retrieve template');
    }
  }

  private extractTemplateId(req: Request): number {
    const url = new URL(req.url);
    const templateId = url.pathname.split('/')[3];

    if (!templateId) throw new ValidationError('Template ID is required');

    const id = parseInt(templateId, 10);
    if (isNaN(id) || id <= 0) throw new ValidationError('Template ID must be a valid positive integer');

    return id;
  }
}
