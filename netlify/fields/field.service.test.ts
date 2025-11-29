import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { Field, CreateFieldRequest } from '@types/field';
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
      };
      const mockField: Field = {
        id: 1,
        ...fieldData,
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
});

