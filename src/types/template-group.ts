export interface TemplateFieldGroup {
  id: number;
  template_id: number;
  name: string;
  created_at: string;
}

export interface CreateGroupRequest {
  name: string;
}

export interface UpdateGroupRequest {
  name: string;
}

export interface MoveGroupRequest {
  dx: number;
  dy: number;
}
