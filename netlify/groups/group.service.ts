import type { TemplateFieldGroup, CreateGroupRequest, UpdateGroupRequest } from '@shared/group';
import type { IGroupService } from '@netlify/groups/IGroupService';
import type { IGroupRepository } from '@netlify/groups/IGroupRepository';
import { ConflictError, NotFoundError } from '@netlify/lib/errors';

export class GroupService implements IGroupService {
  private readonly repository: IGroupRepository;

  constructor(repository: IGroupRepository) {
    this.repository = repository;
  }

  async createGroup(data: CreateGroupRequest): Promise<TemplateFieldGroup> {
    const existing = await this.repository.findByTemplateId(data.template_id);
    const nameConflict = existing.some((g) => g.name === data.name);
    if (nameConflict) throw new ConflictError('A group with this name already exists for this template');

    return this.repository.create(data);
  }

  async getGroupsByTemplateId(templateId: number): Promise<TemplateFieldGroup[]> {
    return this.repository.findByTemplateId(templateId);
  }

  async updateGroup(templateId: number, groupId: number, data: UpdateGroupRequest): Promise<TemplateFieldGroup> {
    const group = await this.repository.findById(groupId);
    if (!group || group.template_id !== templateId) throw new NotFoundError('Group not found');

    if (data.name !== group.name) {
      const existing = await this.repository.findByTemplateId(templateId);
      const nameConflict = existing.some((g) => g.name === data.name && g.id !== groupId);
      if (nameConflict) throw new ConflictError('A group with this name already exists for this template');
    }

    const updated = await this.repository.update(groupId, data);
    if (!updated) throw new NotFoundError('Group not found');
    return updated;
  }

  async deleteGroup(templateId: number, groupId: number): Promise<void> {
    const group = await this.repository.findById(groupId);
    if (!group || group.template_id !== templateId) throw new NotFoundError('Group not found');
    await this.repository.delete(groupId);
  }

  async moveGroup(templateId: number, groupId: number, dx: number, dy: number): Promise<void> {
    const group = await this.repository.findById(groupId);
    if (!group || group.template_id !== templateId) throw new NotFoundError('Group not found');
    await this.repository.moveAllFields(groupId, dx, dy);
  }
}
