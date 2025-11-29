import type { CreateFieldRequest, Field, UpdateFieldRequest } from "@types/field";

export interface IFieldsRepository {
  create(field: CreateFieldRequest): Promise<Field>;
  findByTemplateId(templateId: number): Promise<Field[]>;
  findById(fieldId: number): Promise<Field | null>;
  findByTemplateIdAndName(templateId: number, fieldName: string): Promise<Field | null>;
  update(fieldId: number, fieldData: UpdateFieldRequest): Promise<Field | null>;
  delete(fieldId: number): Promise<Field | null>;
  deleteByTemplateId(templateId: number): Promise<void>;
}