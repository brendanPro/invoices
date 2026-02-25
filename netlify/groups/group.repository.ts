import { eq, sql } from 'drizzle-orm';
import { db } from '@db/index';
import { templateFieldGroups, templateFields } from '@db/schema';
import type { TemplateFieldGroup, CreateGroupRequest, UpdateGroupRequest } from '@shared/group';
import type { IGroupRepository } from '@netlify/groups/IGroupRepository';

type DrizzleGroup = typeof templateFieldGroups.$inferSelect;

function transformGroup(row: DrizzleGroup): TemplateFieldGroup {
  return {
    id: row.id,
    template_id: row.template_id,
    name: row.name,
    created_at: row.created_at.toISOString(),
  };
}

export class GroupRepository implements IGroupRepository {
  async create(data: CreateGroupRequest): Promise<TemplateFieldGroup> {
    const result = await db
      .insert(templateFieldGroups)
      .values({ template_id: data.template_id, name: data.name })
      .returning();
    return transformGroup(result[0]);
  }

  async findByTemplateId(templateId: number): Promise<TemplateFieldGroup[]> {
    const result = await db
      .select()
      .from(templateFieldGroups)
      .where(eq(templateFieldGroups.template_id, templateId))
      .orderBy(templateFieldGroups.name);
    return result.map(transformGroup);
  }

  async findById(groupId: number): Promise<TemplateFieldGroup | null> {
    const result = await db
      .select()
      .from(templateFieldGroups)
      .where(eq(templateFieldGroups.id, groupId))
      .limit(1);
    return result.length > 0 ? transformGroup(result[0]) : null;
  }

  async update(groupId: number, data: UpdateGroupRequest): Promise<TemplateFieldGroup | null> {
    const result = await db
      .update(templateFieldGroups)
      .set({ name: data.name })
      .where(eq(templateFieldGroups.id, groupId))
      .returning();
    return result[0] ? transformGroup(result[0]) : null;
  }

  async delete(groupId: number): Promise<void> {
    await db.delete(templateFieldGroups).where(eq(templateFieldGroups.id, groupId));
  }

  async moveAllFields(groupId: number, dx: number, dy: number): Promise<void> {
    await db
      .update(templateFields)
      .set({
        x_position: sql`${templateFields.x_position} + ${dx}`,
        y_position: sql`${templateFields.y_position} + ${dy}`,
      })
      .where(eq(templateFields.group_id, groupId));
  }
}
