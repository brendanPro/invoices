import type { Field } from "./field";

export interface Template {
  id: number;
  name: string;
  blob_key: string;
  user_email: string;
  created_at: string;
  updated_at: string;
  fields: Field[];
}

