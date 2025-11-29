import { eq, and } from 'drizzle-orm';
import { db } from '@db/index';
import { templateFields } from '@db/schema';
import type { CreateFieldRequest, Field, UpdateFieldRequest } from '@types/field';
import type { IFieldsRepository } from '@netlify/fields/IFieldsRepository';

function transformField(drizzleField: any): Field {
  return {
    id: drizzleField.id,
    template_id: drizzleField.template_id,
    field_name: drizzleField.field_name,
    x_position: drizzleField.x_position.toString(),
    y_position: drizzleField.y_position.toString(),
    width: drizzleField.width.toString(),
    height: drizzleField.height.toString(),
    font_size: drizzleField.font_size.toString(),
    field_type: drizzleField.field_type,
    color: drizzleField.color || '#000000',
    created_at: drizzleField.created_at.toISOString(),
  };
}

export class FieldsRepository implements IFieldsRepository {
  async create(fieldData: CreateFieldRequest): Promise<Field> {
    // Ensure color is a valid hex string
    const colorValue = (fieldData.color && typeof fieldData.color === 'string' && fieldData.color.trim())
      ? fieldData.color.trim()
      : '#000000';

    const result = await db.insert(templateFields)
      .values({
        template_id: fieldData.template_id,
        field_name: fieldData.field_name,
        x_position: fieldData.x_position.toString(),
        y_position: fieldData.y_position.toString(),
        width: fieldData.width.toString(),
        height: fieldData.height.toString(),
        font_size: fieldData.font_size.toString(),
        field_type: fieldData.field_type,
        color: colorValue,
      })
      .returning();

    return transformField(result[0]);
  }

  async findByTemplateId(templateId: number): Promise<Field[]> {
    const result = await db.select()
      .from(templateFields)
      .where(eq(templateFields.template_id, templateId))
      .orderBy(templateFields.field_name);

    return result.map(transformField);
  }

  async findById(fieldId: number): Promise<Field | null> {
    const result = await db.select()
      .from(templateFields)
      .where(eq(templateFields.id, fieldId))
      .limit(1);

    return result.length > 0 ? transformField(result[0]) : null;
  }

  async findByTemplateIdAndName(
    templateId: number,
    fieldName: string,
  ): Promise<Field | null> {
    const result = await db.select()
      .from(templateFields)
      .where(
        and(eq(templateFields.template_id, templateId), eq(templateFields.field_name, fieldName)),
      )
      .limit(1);

    return result.length > 0 ? transformField(result[0]) : null;
  }

  async update(
    fieldId: number,
    fieldData: UpdateFieldRequest,
  ): Promise<Field | null> {
    const updateData: any = {};

    if (fieldData.field_name !== undefined) updateData.field_name = fieldData.field_name;
    if (fieldData.x_position !== undefined) updateData.x_position = fieldData.x_position.toString();
    if (fieldData.y_position !== undefined) updateData.y_position = fieldData.y_position.toString();
    if (fieldData.font_size !== undefined) updateData.font_size = fieldData.font_size.toString();
    if (fieldData.field_type !== undefined) updateData.field_type = fieldData.field_type;
    if (fieldData.color !== undefined) updateData.color = fieldData.color;

    const result = await db.update(templateFields)
      .set(updateData)
      .where(eq(templateFields.id, fieldId))
      .returning();

    return result[0] ? transformField(result[0]) : null;
  }

  async delete(fieldId: number): Promise<Field | null> {
    const result = await db.delete(templateFields)
      .where(eq(templateFields.id, fieldId))
      .returning();

    return result[0] ? transformField(result[0]) : null;
  }

  async deleteByTemplateId(templateId: number): Promise<void> {
    await db.delete(templateFields).where(eq(templateFields.template_id, templateId));
  }
}

