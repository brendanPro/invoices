export type FieldType = 'text' | 'number' | 'date';

export interface Field {
  id: number;
  template_id: number;
  field_name: string;
  x_position: number;
  y_position: number;
  font_size: number;
  width: number;
  height: number;
  field_type: FieldType;
  created_at: string;
}

export type CreateFieldRequest = Pick<Field, 
  'template_id' | 
  'field_name'  | 
  'x_position'  | 
  'y_position'  |
  'width'       |
  'height'      |
  'font_size'   | 
  'field_type'
>;

export type UpdateFieldRequest = Partial<Pick<Field, 
  'field_name'  | 
  'x_position'  | 
  'y_position'  |
  'width'       |
  'height'      |
  'font_size'   | 
  'field_type'
>>;