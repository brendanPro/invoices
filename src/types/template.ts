// Template-related types

export interface Template {
  id: number;
  name: string;
  blob_key: string;
  user_email: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateField {
  id: number;
  template_id: number;
  field_name: string;
  x_position: number;
  y_position: number;
  font_size: number;
  width: number;
  height: number;
  field_type: 'text' | 'number' | 'date';
  created_at: string;
}

// Template field types
export type FieldType = 'text' | 'number' | 'date';

// Template creation and update requests
export interface CreateTemplateRequest {
  name: string;
  fileData: string; // Base64 encoded file data
}

export interface CreateTemplateResponse {
  success: boolean;
  template?: Template;
  name?: string;
  error?: string;
}

export interface UpdateTemplateRequest {
  id: number;
  name?: string;
}

export interface UpdateTemplateResponse {
  success: boolean;
  template?: Template;
  error?: string;
}

// Template field requests and responses
export interface CreateTemplateFieldRequest {
  template_id: number;
  field_name: string;
  x_position: number;
  y_position: number;
  width?: number;
  height?: number;
  font_size?: number;
  field_type?: FieldType;
}

export interface CreateTemplateFieldResponse {
  success: boolean;
  field?: TemplateField;
  error?: string;
}

export interface UpdateTemplateFieldRequest {
  field_id: number;
  field_name: string;
  x_position?: number;
  y_position?: number;
  font_size?: number;
  field_type?: FieldType;
}

export interface UpdateTemplateFieldResponse {
  success: boolean;
  field?: TemplateField;
  error?: string;
}

export interface DeleteTemplateFieldRequest {
  field_id: number;
}

export interface DeleteTemplateFieldResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Template listing and filtering
export interface ListTemplatesRequest {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: 'name' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface ListTemplatesResponse {
  success: boolean;
  templates?: Template[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

// Template configuration
export interface TemplateConfiguration {
  template_id: number;
  fields: TemplateField[];
  template: Template;
}

export interface SaveConfigurationRequest {
  template_id: number;
  fields: Omit<TemplateField, 'id' | 'template_id' | 'created_at'>[];
}

export interface SaveConfigurationResponse {
  success: boolean;
  configuration?: TemplateConfiguration;
  error?: string;
}

export interface GetConfigurationRequest {
  template_id: number;
}

export interface GetConfigurationResponse {
  success: boolean;
  configuration?: TemplateConfiguration;
  error?: string;
}
