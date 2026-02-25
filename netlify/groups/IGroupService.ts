import type { TemplateFieldGroup, CreateGroupRequest, UpdateGroupRequest } from '@shared/group';

export interface IGroupService {
  createGroup(data: CreateGroupRequest): Promise<TemplateFieldGroup>;
  getGroupsByTemplateId(templateId: number): Promise<TemplateFieldGroup[]>;
  updateGroup(templateId: number, groupId: number, data: UpdateGroupRequest): Promise<TemplateFieldGroup>;
  deleteGroup(templateId: number, groupId: number): Promise<void>;
  moveGroup(templateId: number, groupId: number, dx: number, dy: number): Promise<void>;
}
