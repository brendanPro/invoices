// Invoice-related types

export interface Invoice {
  id: number;
  template_id: number;
  invoice_data: Record<string, any>;
  generated_at: string;
  pdf_blob_key?: string;
  template_name?: string;
}

// Invoice generation requests and responses
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

// Invoice data structure for form handling
export interface InvoiceFormData {
  [key: string]: string | number | Date;
}

// Invoice field validation
export interface InvoiceFieldValidation {
  field_name: string;
  required: boolean;
  type: 'text' | 'number' | 'date';
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  pattern?: string;
}

// Invoice listing and filtering
export interface ListInvoicesRequest {
  page?: number;
  limit?: number;
  template_id?: number;
  search?: string;
  sort_by?: 'generated_at' | 'template_name';
  sort_order?: 'asc' | 'desc';
  date_from?: string;
  date_to?: string;
}

export interface ListInvoicesResponse {
  success: boolean;
  invoices?: Invoice[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

// Invoice statistics
export interface InvoiceStats {
  total_invoices: number;
  invoices_this_month: number;
  invoices_this_year: number;
  most_used_template?: {
    template_id: number;
    template_name: string;
    count: number;
  };
}

export interface InvoiceStatsResponse {
  success: boolean;
  stats?: InvoiceStats;
  error?: string;
}