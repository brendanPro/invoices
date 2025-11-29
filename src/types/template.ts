import type { Template } from "@types/template";
import type { FieldType } from "@types/field";
import type { Field } from "@types/field";

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
  field?: Field;
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
  field?: Field;
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
  fields: Field[];
  template: Template;
}

export interface SaveConfigurationRequest {
  template_id: number;
  fields: Omit<Field, 'id' | 'template_id' | 'created_at'>[];
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
