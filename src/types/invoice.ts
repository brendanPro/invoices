// TypeScript types for the invoice generation system

export interface Template {
  id: number;
  name: string;
  blob_key: string;
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
  field_type: 'text' | 'number' | 'date';
  created_at: string;
}

export interface Invoice {
  id: number;
  template_id: number;
  invoice_data: Record<string, any>;
  generated_at: string;
  pdf_blob_key?: string;
  template_name?: string;
}

export interface CreateTemplateRequest {
  name: string;
  file: File;
}

export interface CreateTemplateResponse {
  success: boolean;
  template?: Template;
  error?: string;
}

export interface CreateTemplateFieldRequest {
  template_id: number;
  field_name: string;
  x_position: number;
  y_position: number;
  font_size?: number;
  field_type?: 'text' | 'number' | 'date';
}

export interface UpdateTemplateFieldRequest {
  field_id: number;
  field_name?: string;
  x_position?: number;
  y_position?: number;
  font_size?: number;
  field_type?: 'text' | 'number' | 'date';
}

export interface GenerateInvoiceRequest {
  template_id: number;
  invoice_data: Record<string, any>;
}

export interface GenerateInvoiceResponse {
  success: boolean;
  pdf_url?: string;
  invoice?: Invoice;
  error?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
