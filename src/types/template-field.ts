export interface TemplateField {
  id: number;
  template_id: number;
  field_name: string;
  x_position: string; // decimal as string
  y_position: string; // decimal as string
  width: string; // decimal as string
  height: string; // decimal as string
  font_size: string; // decimal as string
  field_type: 'text' | 'number' | 'date';
  created_at: string;
}

export interface CreateTemplateFieldRequest {
  template_id: number;
  field_name: string;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  font_size: number;
  field_type: 'text' | 'number' | 'date';
}

export interface FieldBounds {
  x: number; // top-left X in pixels
  y: number; // top-left Y in pixels
  width: number; // width in pixels
  height: number; // height in pixels
}

export interface FieldData {
  field_name: string;
  field_type: 'text' | 'number' | 'date';
  font_size: number;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
}
