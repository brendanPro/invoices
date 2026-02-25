import type { TemplateFieldGroup, CreateGroupRequest, UpdateGroupRequest } from '@shared/group';

export interface IGroupRepository {
  create(data: CreateGroupRequest): Promise<TemplateFieldGroup>;
  findByTemplateId(templateId: number): Promise<TemplateFieldGroup[]>;
  findById(groupId: number): Promise<TemplateFieldGroup | null>;
  update(groupId: number, data: UpdateGroupRequest): Promise<TemplateFieldGroup | null>;
  delete(groupId: number): Promise<void>;
  moveAllFields(groupId: number, dx: number, dy: number): Promise<void>;
}
