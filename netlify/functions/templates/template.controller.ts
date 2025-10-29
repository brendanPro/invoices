import type { Template, CreateTemplateRequest } from '../../../src/types/index';
import { TemplateService } from './template.service';
import { HttpHandler } from '../../lib/http-handler';

export class TemplateController {
  private templateService: TemplateService;

  constructor() {
    this.templateService = new TemplateService();
  }

  /**
   * Handle GET request - List all templates filtered by user email
   */
  async listTemplates(userEmail: string): Promise<Response> {
    return HttpHandler.handleAsync(
      () => this.templateService.getAllTemplates(userEmail),
      'Failed to retrieve templates'
    );
  }

  /**
   * Handle POST request - Create new template
   */
  async createTemplate(req: Request, userEmail: string): Promise<Response> {
    try {
      const body = await HttpHandler.extractJson<CreateTemplateRequest>(req);
      const { name, fileData } = body;

      // Validate required fields
      const missingField = HttpHandler.validateRequiredFields(body, ['name', 'fileData']);
      if (missingField) {
        return HttpHandler.validationError(missingField);
      }

      // Validate field types
      const typeError = HttpHandler.validateFieldTypes(body, {
        name: 'string',
        fileData: 'string'
      });
      if (typeError) {
        return HttpHandler.validationError(typeError);
      }

      // Additional business validation
      if (!this.templateService.validateTemplateName(name)) {
        return HttpHandler.validationError('Template name must be a non-empty string (max 255 characters)');
      }

      if (!this.templateService.validateFileData(fileData)) {
        return HttpHandler.validationError('File data must be valid base64 encoded data');
      }

      const template = await this.templateService.createTemplate(name, fileData, userEmail);
      return HttpHandler.created(template);

    } catch (error) {
      console.error('Controller: Error creating template:', error);
      return HttpHandler.internalError('Failed to create template');
    }
  }

  /**
   * Handle DELETE request - Delete template by ID
   */
  async deleteTemplate(req: Request, userEmail: string): Promise<Response> {
    try {
      const queryParams = HttpHandler.extractQueryParams(req);
      const templateId = queryParams.get('id');

      // Validate template ID
      if (!templateId) {
        return HttpHandler.validationError('Template ID is required');
      }

      const id = parseInt(templateId, 10);
      if (isNaN(id) || id <= 0) {
        return HttpHandler.validationError('Template ID must be a valid positive integer');
      }

      // Check if template exists
      const templateExists = await this.templateService.templateExists(id, userEmail);
      if (!templateExists) {
        return HttpHandler.notFound('Template not found');
      }

      await this.templateService.deleteTemplate(id, userEmail);
      return HttpHandler.success({ message: 'Template deleted successfully' });

    } catch (error) {
      console.error('Controller: Error deleting template:', error);
      return HttpHandler.internalError('Failed to delete template');
    }
  }

  /**
   * Handle GET request - Get single template by ID filtered by user email
   */
  async getTemplate(req: Request, userEmail: string): Promise<Response> {
    try {
      const queryParams = HttpHandler.extractQueryParams(req);
      const templateId = queryParams.get('id');

      if (!templateId) {
        return HttpHandler.validationError('Template ID is required');
      }

      const id = parseInt(templateId, 10);
      if (isNaN(id) || id <= 0) {
        return HttpHandler.validationError('Template ID must be a valid positive integer');
      }

      const template = await this.templateService.getTemplateById(id, userEmail);
      if (!template) {
        return HttpHandler.notFound('Template not found');
      }

      return HttpHandler.success(template);

    } catch (error) {
      console.error('Controller: Error fetching template:', error);
      return HttpHandler.internalError('Failed to retrieve template');
    }
  }
}