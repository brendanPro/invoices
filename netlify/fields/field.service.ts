import type { CreateFieldRequest, Field, UpdateFieldRequest } from '@types/field';
import type { IFieldsService } from '@netlify/fields/IFieldsService';
import type { IFieldsRepository } from '@netlify/fields/IFieldsRepository';


export class FieldService implements IFieldsService {
  private repository: IFieldsRepository;

  constructor(repository: IFieldsRepository) {
    this.repository = repository;
  }

  async findFieldsByTemplateId(templateId: number): Promise<Field[]> {
    return await this.repository.findByTemplateId(templateId);
  }

  async createField(fieldData: CreateFieldRequest): Promise<Field> {
    const existingField = await this.repository.findByTemplateIdAndName(fieldData.template_id, fieldData.field_name);
    if (existingField) {
      throw new Error('Field name already exists for this template');
    }

    return await this.repository.create(fieldData);
  }

  async updateField(
    templateId: number,
    fieldId: number,
    fieldData: UpdateFieldRequest,
  ): Promise<Field> {
    // Verify field exists and belongs to template
    const field = await this.repository.findById(fieldId);
    if (!field || field.template_id !== templateId) {
      throw new Error('Field not found');
    }

    // If updating field name, check for duplicates
    if (fieldData.field_name !== undefined && fieldData.field_name !== field.field_name) {
      const existingField = await this.repository.findByTemplateIdAndName(templateId, fieldData.field_name);
      if (existingField && existingField.id !== fieldId) {
        throw new Error('Field name already exists for this template');
      }
    }

    const updatedField = await this.repository.update(fieldId, fieldData);
    if (!updatedField) {
      throw new Error('Failed to update field');
    }

    return updatedField;
  }

  async deleteField(templateId: number, fieldId: number): Promise<void> {
    const field = await this.repository.findById(fieldId);
    if (!field || field.template_id !== templateId) {
      throw new Error('Field not found');
    }

    await this.repository.delete(fieldId);
  }
}
