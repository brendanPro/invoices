export interface TemplateFieldGroup {
  id: number;
  template_id: number;
  name: string;
  created_at: string;
}

export type CreateGroupRequest = Pick<TemplateFieldGroup, 'template_id' | 'name'>;

export type UpdateGroupRequest = { name: string };

export type MoveGroupRequest = { dx: number; dy: number };
