import type { CreateFieldRequest, Field, UpdateFieldRequest } from "@types/field";

export interface IFieldsService {
  createField(field: CreateFieldRequest): Promise<Field>;
  findFieldsByTemplateId(templateId: number): Promise<Field[]>;
  updateField(templateId: number, fieldId: number, fieldData: UpdateFieldRequest): Promise<Field>;
  deleteField(templateId: number, fieldId: number): Promise<void>;
}