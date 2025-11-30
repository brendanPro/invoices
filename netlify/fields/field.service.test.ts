import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { Field, CreateFieldRequest, UpdateFieldRequest } from '@types/field';
import { FieldService } from '@netlify/fields/field.service';
import type { IFieldsRepository } from '@netlify/fields/IFieldsRepository';

const mockFieldsRepository: IFieldsRepository = {
  findByTemplateId: mock<(templateId: number) => Promise<Field[]>>(() => Promise.resolve([])),
  findById: mock<(fieldId: number) => Promise<Field | null>>(() => Promise.resolve(null)),
  findByTemplateIdAndName: mock<(templateId: number, fieldName: string) => Promise<Field | null>>(() => Promise.resolve(null)),
  create: mock<(field: CreateFieldRequest) => Promise<Field>>(() => Promise.resolve({} as Field)),
  update: mock<(fieldId: number, fieldData: any) => Promise<Field | null>>(() => Promise.resolve(null)),
  delete: mock<(fieldId: number) => Promise<Field | null>>(() => Promise.resolve(null)),
  deleteByTemplateId: mock<(templateId: number) => Promise<void>>(() => Promise.resolve()),
};

describe('FieldService', () => {
  let fieldService: FieldService;

  beforeEach(() => {
    for (const key in mockFieldsRepository) {
      (mockFieldsRepository as any)[key].mockClear();
    }

    fieldService = new FieldService(mockFieldsRepository);
  });

  describe('findFieldsByTemplateId', () => {
    it('should return all fields for a template', async () => {
      const templateId = 1;
      const mockFields: Field[] = [
        {
          id: 1,
          template_id: templateId,
          field_name: 'Field 1',
          x_position: 10,
          y_position: 20,
          width: 100,
          height: 30,
          font_size: 12,
          field_type: 'text',
          color: '#000000',
          created_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          template_id: templateId,
          field_name: 'Field 2',
          x_position: 10,
          y_position: 60,
          width: 100,
          height: 30,
          font_size: 12,
          field_type: 'number',
          color: '#000000',
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockFieldsRepository.findByTemplateId.mockResolvedValue(mockFields);

      const result = await fieldService.findFieldsByTemplateId(templateId);

      expect(result).toEqual(mockFields);
      expect(mockFieldsRepository.findByTemplateId).toHaveBeenCalledTimes(1);
      expect(mockFieldsRepository.findByTemplateId).toHaveBeenCalledWith(templateId);
    });

    it('should return empty array when no fields exist', async () => {
      const templateId = 999;
      mockFieldsRepository.findByTemplateId.mockResolvedValue([]);

      const result = await fieldService.findFieldsByTemplateId(templateId);

      expect(result).toEqual([]);
      expect(mockFieldsRepository.findByTemplateId).toHaveBeenCalledWith(templateId);
    });
  });

  describe('createField', () => {
    it('should create a field successfully', async () => {
      const fieldData: CreateFieldRequest = {
        template_id: 1,
        field_name: 'Test Field',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
      };
      const mockField: Field = {
        id: 1,
        ...fieldData,
        color: '#000000',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      mockFieldsRepository.findByTemplateIdAndName.mockResolvedValue(null);
      mockFieldsRepository.create.mockResolvedValue(mockField);

      const result = await fieldService.createField(fieldData);

      expect(result).toEqual(mockField);
      expect(mockFieldsRepository.findByTemplateIdAndName).toHaveBeenCalledTimes(1);
      expect(mockFieldsRepository.findByTemplateIdAndName).toHaveBeenCalledWith(
        fieldData.template_id,
        fieldData.field_name
      );
      expect(mockFieldsRepository.create).toHaveBeenCalledTimes(1);
      expect(mockFieldsRepository.create).toHaveBeenCalledWith(fieldData);
    });

    it('should throw error when field name already exists', async () => {
      const fieldData: CreateFieldRequest = {
        template_id: 1,
        field_name: 'Existing Field',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
      };
      const existingField: Field = {
        id: 1,
        template_id: 1,
        field_name: 'Existing Field',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      mockFieldsRepository.findByTemplateIdAndName.mockResolvedValue(existingField);

      await expect(fieldService.createField(fieldData)).rejects.toThrow(
        'Field name already exists for this template'
      );
      expect(mockFieldsRepository.findByTemplateIdAndName).toHaveBeenCalledWith(
        fieldData.template_id,
        fieldData.field_name
      );
      expect(mockFieldsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteField', () => {
    it('should delete a field successfully', async () => {
      const templateId = 1;
      const fieldId = 1;
      const mockField: Field = {
        id: fieldId,
        template_id: templateId,
        field_name: 'Test Field',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      mockFieldsRepository.findById.mockResolvedValue(mockField);
      mockFieldsRepository.delete.mockResolvedValue(mockField);

      await fieldService.deleteField(templateId, fieldId);

      expect(mockFieldsRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockFieldsRepository.findById).toHaveBeenCalledWith(fieldId);
      expect(mockFieldsRepository.delete).toHaveBeenCalledTimes(1);
      expect(mockFieldsRepository.delete).toHaveBeenCalledWith(fieldId);
    });

    it('should throw error when field is not found', async () => {
      const templateId = 1;
      const fieldId = 999;

      mockFieldsRepository.findById.mockResolvedValue(null);

      await expect(fieldService.deleteField(templateId, fieldId)).rejects.toThrow(
        'Field not found'
      );
      expect(mockFieldsRepository.findById).toHaveBeenCalledWith(fieldId);
      expect(mockFieldsRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error when field belongs to different template', async () => {
      const templateId = 1;
      const fieldId = 1;
      const mockField: Field = {
        id: fieldId,
        template_id: 2, // Different template
        field_name: 'Test Field',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      mockFieldsRepository.findById.mockResolvedValue(mockField);

      await expect(fieldService.deleteField(templateId, fieldId)).rejects.toThrow(
        'Field not found'
      );
      expect(mockFieldsRepository.findById).toHaveBeenCalledWith(fieldId);
      expect(mockFieldsRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateField', () => {
    it('should update a field successfully', async () => {
      const templateId = 1;
      const fieldId = 1;
      const existingField: Field = {
        id: fieldId,
        template_id: templateId,
        field_name: 'Old Name',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
        created_at: '2024-01-01T00:00:00.000Z',
      };
      const updateData: UpdateFieldRequest = {
        field_name: 'New Name',
        font_size: 14,
        color: '#FF0000',
      };
      const updatedField: Field = {
        ...existingField,
        ...updateData,
        font_size: updateData.font_size!,
      };

      mockFieldsRepository.findById.mockResolvedValue(existingField);
      mockFieldsRepository.findByTemplateIdAndName.mockResolvedValue(null);
      mockFieldsRepository.update.mockResolvedValue(updatedField);

      const result = await fieldService.updateField(templateId, fieldId, updateData);

      expect(result).toEqual(updatedField);
      expect(mockFieldsRepository.findById).toHaveBeenCalledTimes(1);
      expect(mockFieldsRepository.findById).toHaveBeenCalledWith(fieldId);
      expect(mockFieldsRepository.update).toHaveBeenCalledTimes(1);
      expect(mockFieldsRepository.update).toHaveBeenCalledWith(fieldId, updateData);
    });

    it('should update field when name is not changed', async () => {
      const templateId = 1;
      const fieldId = 1;
      const existingField: Field = {
        id: fieldId,
        template_id: templateId,
        field_name: 'Test Field',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
        created_at: '2024-01-01T00:00:00.000Z',
      };
      const updateData: UpdateFieldRequest = {
        field_name: 'Test Field', // Same name
        font_size: 14,
      };
      const updatedField: Field = {
        ...existingField,
        font_size: 14,
      };

      mockFieldsRepository.findById.mockResolvedValue(existingField);
      mockFieldsRepository.update.mockResolvedValue(updatedField);

      const result = await fieldService.updateField(templateId, fieldId, updateData);

      expect(result).toEqual(updatedField);
      // Should not check for duplicate name when name is unchanged
      expect(mockFieldsRepository.findByTemplateIdAndName).not.toHaveBeenCalled();
      expect(mockFieldsRepository.update).toHaveBeenCalledWith(fieldId, updateData);
    });

    it('should update partial fields (only position)', async () => {
      const templateId = 1;
      const fieldId = 1;
      const existingField: Field = {
        id: fieldId,
        template_id: templateId,
        field_name: 'Test Field',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
        created_at: '2024-01-01T00:00:00.000Z',
      };
      const updateData: UpdateFieldRequest = {
        x_position: 50,
        y_position: 60,
      };
      const updatedField: Field = {
        ...existingField,
        x_position: 50,
        y_position: 60,
      };

      mockFieldsRepository.findById.mockResolvedValue(existingField);
      mockFieldsRepository.update.mockResolvedValue(updatedField);

      const result = await fieldService.updateField(templateId, fieldId, updateData);

      expect(result).toEqual(updatedField);
      expect(mockFieldsRepository.update).toHaveBeenCalledWith(fieldId, updateData);
    });

    it('should throw error when field is not found', async () => {
      const templateId = 1;
      const fieldId = 999;
      const updateData: UpdateFieldRequest = {
        field_name: 'New Name',
      };

      mockFieldsRepository.findById.mockResolvedValue(null);

      await expect(fieldService.updateField(templateId, fieldId, updateData)).rejects.toThrow(
        'Field not found'
      );
      expect(mockFieldsRepository.findById).toHaveBeenCalledWith(fieldId);
      expect(mockFieldsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when field belongs to different template', async () => {
      const templateId = 1;
      const fieldId = 1;
      const existingField: Field = {
        id: fieldId,
        template_id: 2, // Different template
        field_name: 'Test Field',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
        created_at: '2024-01-01T00:00:00.000Z',
      };
      const updateData: UpdateFieldRequest = {
        field_name: 'New Name',
      };

      mockFieldsRepository.findById.mockResolvedValue(existingField);

      await expect(fieldService.updateField(templateId, fieldId, updateData)).rejects.toThrow(
        'Field not found'
      );
      expect(mockFieldsRepository.findById).toHaveBeenCalledWith(fieldId);
      expect(mockFieldsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when new field name already exists', async () => {
      const templateId = 1;
      const fieldId = 1;
      const existingField: Field = {
        id: fieldId,
        template_id: templateId,
        field_name: 'Old Name',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
        created_at: '2024-01-01T00:00:00.000Z',
      };
      const updateData: UpdateFieldRequest = {
        field_name: 'Existing Name',
      };
      const conflictingField: Field = {
        id: 2, // Different field
        template_id: templateId,
        field_name: 'Existing Name',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
        created_at: '2024-01-01T00:00:00.000Z',
      };

      mockFieldsRepository.findById.mockResolvedValue(existingField);
      mockFieldsRepository.findByTemplateIdAndName.mockResolvedValue(conflictingField);

      await expect(fieldService.updateField(templateId, fieldId, updateData)).rejects.toThrow(
        'Field name already exists for this template'
      );
      expect(mockFieldsRepository.findByTemplateIdAndName).toHaveBeenCalledWith(
        templateId,
        'Existing Name'
      );
      expect(mockFieldsRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when update fails', async () => {
      const templateId = 1;
      const fieldId = 1;
      const existingField: Field = {
        id: fieldId,
        template_id: templateId,
        field_name: 'Test Field',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
        created_at: '2024-01-01T00:00:00.000Z',
      };
      const updateData: UpdateFieldRequest = {
        font_size: 14,
      };

      mockFieldsRepository.findById.mockResolvedValue(existingField);
      mockFieldsRepository.update.mockResolvedValue(null); // Update returns null

      await expect(fieldService.updateField(templateId, fieldId, updateData)).rejects.toThrow(
        'Failed to update field'
      );
      expect(mockFieldsRepository.update).toHaveBeenCalledWith(fieldId, updateData);
    });

    it('should allow updating name to same name (no conflict)', async () => {
      const templateId = 1;
      const fieldId = 1;
      const existingField: Field = {
        id: fieldId,
        template_id: templateId,
        field_name: 'Test Field',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
        created_at: '2024-01-01T00:00:00.000Z',
      };
      const updateData: UpdateFieldRequest = {
        field_name: 'Test Field', // Same name as existing
        font_size: 14,
      };
      const updatedField: Field = {
        ...existingField,
        font_size: 14,
      };

      mockFieldsRepository.findById.mockResolvedValue(existingField);
      mockFieldsRepository.update.mockResolvedValue(updatedField);

      const result = await fieldService.updateField(templateId, fieldId, updateData);

      expect(result).toEqual(updatedField);
      // Should NOT check for duplicate when name is unchanged
      expect(mockFieldsRepository.findByTemplateIdAndName).not.toHaveBeenCalled();
      expect(mockFieldsRepository.update).toHaveBeenCalledWith(fieldId, updateData);
    });

    it('should update all field properties', async () => {
      const templateId = 1;
      const fieldId = 1;
      const existingField: Field = {
        id: fieldId,
        template_id: templateId,
        field_name: 'Old Name',
        x_position: 10,
        y_position: 20,
        width: 100,
        height: 30,
        font_size: 12,
        field_type: 'text',
        color: '#000000',
        created_at: '2024-01-01T00:00:00.000Z',
      };
      const updateData: UpdateFieldRequest = {
        field_name: 'New Name',
        x_position: 50,
        y_position: 60,
        width: 200,
        height: 40,
        font_size: 16,
        field_type: 'number',
        color: '#FF0000',
      };
      const updatedField: Field = {
        ...existingField,
        field_name: 'New Name',
        x_position: 50,
        y_position: 60,
        width: 200,
        height: 40,
        font_size: 16,
        field_type: 'number',
        color: '#FF0000',
      };

      mockFieldsRepository.findById.mockResolvedValue(existingField);
      mockFieldsRepository.findByTemplateIdAndName.mockResolvedValue(null);
      mockFieldsRepository.update.mockResolvedValue(updatedField);

      const result = await fieldService.updateField(templateId, fieldId, updateData);

      expect(result).toEqual(updatedField);
      expect(mockFieldsRepository.update).toHaveBeenCalledWith(fieldId, updateData);
    });
  });
});

