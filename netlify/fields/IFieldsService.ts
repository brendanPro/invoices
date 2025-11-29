import type { CreateFieldRequest, Field } from "@types/field";

export interface IFieldsService {
  createField(field: CreateFieldRequest): Promise<Field>;
  findFieldsByTemplateId(templateId: number): Promise<Field[]>;
  deleteField(templateId: number, fieldId: number): Promise<void>;
}