import type { CreateFieldRequest, Field, UpdateFieldRequest } from '@shared/field';
import type { IFieldsService } from '@netlify/fields/IFieldsService';
import type { IFieldsRepository } from '@netlify/fields/IFieldsRepository';
import { ConflictError, NotFoundError } from '@netlify/lib/errors';

export class FieldService implements IFieldsService {
  private readonly repository: IFieldsRepository;

  constructor(repository: IFieldsRepository) {
    this.repository = repository;
  }

  async findFieldsByTemplateId(templateId: number): Promise<Field[]> {
    return this.repository.findByTemplateId(templateId);
  }

  async createField(fieldData: CreateFieldRequest): Promise<Field> {
    const existingField = await this.repository.findByTemplateIdAndName(
      fieldData.template_id,
      fieldData.field_name,
    );
    if (existingField) throw new ConflictError('Field name already exists for this template');

    return this.repository.create(fieldData);
  }

  async updateField(templateId: number, fieldId: number, fieldData: UpdateFieldRequest): Promise<Field> {
    const field = await this.repository.findById(fieldId);
    if (!field || field.template_id !== templateId) throw new NotFoundError('Field not found');

    if (fieldData.field_name !== undefined && fieldData.field_name !== field.field_name) {
      const existing = await this.repository.findByTemplateIdAndName(templateId, fieldData.field_name);
      if (existing && existing.id !== fieldId) {
        throw new ConflictError('Field name already exists for this template');
      }
    }

    const updatedField = await this.repository.update(fieldId, fieldData);
    if (!updatedField) throw new NotFoundError('Field not found');

    return updatedField;
  }

  async deleteField(templateId: number, fieldId: number): Promise<void> {
    const field = await this.repository.findById(fieldId);
    if (!field || field.template_id !== templateId) throw new NotFoundError('Field not found');

    await this.repository.delete(fieldId);
  }
}
