import { eq, desc, and } from 'drizzle-orm';
import { db } from '@db/index';
import { templates } from '@db/schema';
import type { Template } from '@/types/index';
import type { ITemplatesRepository } from '@netlify/templates/ITemplatesRepository';

function transformTemplate(drizzleTemplate: any): Template {
  return {
    id: drizzleTemplate.id,
    name: drizzleTemplate.name,
    blob_key: drizzleTemplate.blob_key,
    user_email: drizzleTemplate.user_email,
    created_at: drizzleTemplate.created_at.toISOString(),
    updated_at: drizzleTemplate.updated_at.toISOString(),
  };
}

export class TemplatesRepository implements ITemplatesRepository {
  async create(name: string, blobKey: string, userEmail: string): Promise<Template> {
    const result = await db.insert(templates)
      .values({
        name,
        blob_key: blobKey,
        user_email: userEmail,
      })
      .returning();

    return transformTemplate(result[0]);
  }

  async findById(id: number): Promise<Template | null> {
    const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
    return result[0] ? transformTemplate(result[0]) : null;
  }

  async findAll(userEmail: string): Promise<Template[]> {
    const result = await db.select()
      .from(templates)
      .where(eq(templates.user_email, userEmail))
      .orderBy(desc(templates.created_at));
    return result.map(transformTemplate);
  }

  async delete(id: number, userEmail: string): Promise<Template | null> {
    const result = await db.delete(templates)
      .where(and(eq(templates.id, id), eq(templates.user_email, userEmail)))
      .returning();
    return result[0] ? transformTemplate(result[0]) : null;
  }

  async exists(id: number, userEmail?: string): Promise<boolean> {
    const result = await db.select({ id: templates.id })
      .from(templates)
      .where(and(eq(templates.id, id), userEmail ? eq(templates.user_email, userEmail) : undefined))
      .limit(1);
    return result.length > 0;
  }
}

