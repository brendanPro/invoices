import { HttpHandler } from '@netlify/lib/http-handler';
import type { IFieldsService } from '@netlify/fields/IFieldsService';
import type { ITemplateService } from '@netlify/templates/ITemplateService';
import type { CreateFieldRequest, UpdateFieldRequest } from '@shared/field';
import { AppError, NotFoundError } from '@netlify/lib/errors';

export class FieldController {
  private readonly fieldService: IFieldsService;
  private readonly templateService: ITemplateService;

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
      await this.validateTemplateAccess(templateId, userEmail);

      const body = await req.json();
      const { field_name, x_position, y_position, width, height, font_size, field_type, color, group_id } = body;

      if (!field_name || x_position === undefined || y_position === undefined ||
          width === undefined || height === undefined || font_size === undefined || !field_type) {
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
        color: this.normalizeColor(color),
        group_id: typeof group_id === 'number' ? group_id : null,
      };

      return HttpHandler.handleAsync(
        () => this.fieldService.createField(fieldData),
        'Failed to create template field',
      );
    } catch (error) {
      if (error instanceof AppError) return HttpHandler.fromAppError(error);
      console.error('Create template field error:', error);
      return HttpHandler.badRequest('Invalid request body');
    }
  }

  async updateTemplateField(req: Request, templateId: number, fieldId: number, userEmail: string): Promise<Response> {
    try {
      await this.validateTemplateAccess(templateId, userEmail);

      const body = await req.json();
      const { field_name, x_position, y_position, width, height, font_size, field_type, color, group_id } = body;

      const updateData: UpdateFieldRequest = {};
      if (field_name !== undefined) updateData.field_name = field_name;
      if (x_position !== undefined) updateData.x_position = parseFloat(x_position);
      if (y_position !== undefined) updateData.y_position = parseFloat(y_position);
      if (width !== undefined) updateData.width = parseFloat(width);
      if (height !== undefined) updateData.height = parseFloat(height);
      if (font_size !== undefined) updateData.font_size = parseFloat(font_size);
      if (field_type !== undefined) updateData.field_type = field_type;
      if (color !== undefined) updateData.color = this.normalizeColor(color);
      if ('group_id' in body) updateData.group_id = typeof group_id === 'number' ? group_id : null;

      return HttpHandler.handleAsync(
        () => this.fieldService.updateField(templateId, fieldId, updateData),
        'Failed to update template field',
      );
    } catch (error) {
      if (error instanceof AppError) return HttpHandler.fromAppError(error);
      console.error('Update template field error:', error);
      return HttpHandler.badRequest('Invalid request body');
    }
  }

  async deleteTemplateField(templateId: number, fieldId: number, userEmail: string): Promise<Response> {
    try {
      await this.validateTemplateAccess(templateId, userEmail);
      return HttpHandler.handleAsync(
        () => this.fieldService.deleteField(templateId, fieldId),
        'Failed to delete template field',
      );
    } catch (error) {
      if (error instanceof AppError) return HttpHandler.fromAppError(error);
      console.error('Delete template field error:', error);
      return HttpHandler.internalError('Failed to delete template field');
    }
  }

  private async validateTemplateAccess(templateId: number, userEmail: string): Promise<void> {
    const exists = await this.templateService.templateExists(templateId, userEmail);
    if (!exists) throw new NotFoundError('Template not found or access denied');
  }

  private normalizeColor(color: unknown): string {
    return typeof color === 'string' && color.trim() ? color.trim() : '#000000';
  }
}
