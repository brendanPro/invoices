import { HttpHandler } from '@netlify/lib/http-handler';
import type { IFieldsService } from '@netlify/fields/IFieldsService';
import type { ITemplateService } from '@netlify/templates/ITemplateService';
import type { CreateFieldRequest } from '@types/field';

export class FieldController {
  private fieldService: IFieldsService;
  private templateService: ITemplateService;

  constructor(fieldService: IFieldsService, templateService: ITemplateService) {
    this.fieldService = fieldService;
    this.templateService = templateService;
  }

  async getTemplateFields(templateId: number): Promise<Response> {
    return HttpHandler.handleAsync(
      () => this.fieldService.findFieldsByTemplateId(templateId),
      'Failed to retrieve template fields',
    );
  }

  async createTemplateField(req: Request, templateId: number, userEmail: string): Promise<Response> {
    try {
      // Validate template exists and user has access
      const templateExists = await this.templateService.templateExists(templateId, userEmail);
      if (!templateExists) {
        return HttpHandler.notFound('Template not found or access denied');
      }

      const body = await req.json();

      const { field_name, x_position, y_position, width, height, font_size, field_type } = body;

      if (
        !field_name ||
        x_position === undefined ||
        y_position === undefined ||
        width === undefined ||
        height === undefined ||
        font_size === undefined ||
        !field_type
      ) {
        return HttpHandler.badRequest('Missing required fields');
      }

      const fieldData: CreateFieldRequest = {
        template_id: templateId,
        field_name,
        x_position: parseFloat(x_position),
        y_position: parseFloat(y_position),
        width: parseFloat(width),
        height: parseFloat(height),
        font_size: parseFloat(font_size),
        field_type,
      };

      return HttpHandler.handleAsync(
        () => this.fieldService.createField(fieldData),
        'Failed to create template field',
      );
    } catch (error) {
      console.error('Create template field error:', error);
      if (error instanceof Error && error.message === 'Field name already exists for this template') {
        return HttpHandler.validationError(error.message);
      }
      return HttpHandler.badRequest('Invalid request body');
    }
  }

  async deleteTemplateField(templateId: number, fieldId: number, userEmail: string): Promise<Response> {
    // Validate template exists and user has access
    const templateExists = await this.templateService.templateExists(templateId, userEmail);
    if (!templateExists) {
      return HttpHandler.notFound('Template not found or access denied');
    }

    return HttpHandler.handleAsync(
      () => this.fieldService.deleteField(templateId, fieldId),
      'Failed to delete template field',
    );
  }
}
