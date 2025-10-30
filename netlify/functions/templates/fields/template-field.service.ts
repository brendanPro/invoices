import { drizzleDb } from '../../../lib/drizzle-db';
import type { TemplateField, CreateTemplateFieldRequest } from '../../../../src/types/template';

export class TemplateFieldService {
  async getTemplateFields(templateId: number): Promise<TemplateField[]> {
    return await drizzleDb.getTemplateFields(templateId);
  }

  async createTemplateField(fieldData: CreateTemplateFieldRequest): Promise<TemplateField> {
    // Validate that the template belongs to the user
    const template = await drizzleDb.getTemplateById(fieldData.template_id);
    if (!template) {
      throw new Error('Template not found or access denied');
    }

    // Check if field name already exists for this template
    const existingField = await drizzleDb.getTemplateFieldByName(fieldData.template_id, fieldData.field_name);
    if (existingField) {
      throw new Error('Field name already exists for this template');
    }

    return await drizzleDb.createTemplateField({
      template_id: fieldData.template_id,
      field_name: fieldData.field_name,
      x_position: fieldData.x_position,
      y_position: fieldData.y_position,
      width: fieldData.width || 0,
      height: fieldData.height || 0,
      font_size: fieldData.font_size || 0,
      field_type: fieldData.field_type || 'text'
    });
  }

  async deleteTemplateField(templateId: number, fieldId: number): Promise<void> {
    // Validate that the template belongs to the user
    const template = await drizzleDb.getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found or access denied');
    }

    // Check if field exists and belongs to this template
    const field = await drizzleDb.getTemplateFieldById(fieldId);
    if (!field || field.template_id !== templateId) {
      throw new Error('Field not found');
    }

    await drizzleDb.deleteTemplateField(fieldId);
  }
}
