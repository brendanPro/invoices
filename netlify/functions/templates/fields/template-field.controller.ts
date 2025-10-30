import { HttpHandler } from '../../../lib/http-handler';
import { TemplateFieldService } from './template-field.service';
import type { CreateTemplateFieldRequest } from '../../../../src/types/template';

export class TemplateFieldController {
  private templateFieldService: TemplateFieldService;

  constructor() {
    this.templateFieldService = new TemplateFieldService();
  }

  async getTemplateFields(templateId: number): Promise<Response> {
    return HttpHandler.handleAsync(
      () => this.templateFieldService.getTemplateFields(templateId),
      'Failed to retrieve template fields',
    );
  }

  async createTemplateField(req: Request, templateId: number): Promise<Response> {
    try {
      const body = await req.json();

      // Validate required fields
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

      const fieldData: CreateTemplateFieldRequest = {
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
        () => this.templateFieldService.createTemplateField(fieldData),
        'Failed to create template field',
      );
    } catch (error) {
      console.error('Create template field error:', error);
      return HttpHandler.badRequest('Invalid request body');
    }
  }

  async deleteTemplateField(templateId: number, fieldId: number): Promise<Response> {
    return HttpHandler.handleAsync(
      () => this.templateFieldService.deleteTemplateField(templateId, fieldId),
      'Failed to delete template field',
    );
  }
}
