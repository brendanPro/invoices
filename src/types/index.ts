// Central export file for all types
// This provides a single import point for all type definitions

// API types
export * from './api';

// Template types
export * from './template';

// Invoice types
export * from './invoice';

// Re-export commonly used types for convenience
export type {
  ApiResponse,
  ApiError,
  ApiSuccess,
  HttpStatus,
  PaginatedResponse,
  ValidationError,
  ValidationErrorResponse,
} from './api';

export type {
  Template,
  TemplateField,
  FieldType,
  CreateTemplateRequest,
  CreateTemplateResponse,
  UpdateTemplateRequest,
  UpdateTemplateResponse,
  CreateTemplateFieldRequest,
  CreateTemplateFieldResponse,
  UpdateTemplateFieldRequest,
  UpdateTemplateFieldResponse,
  DeleteTemplateFieldRequest,
  DeleteTemplateFieldResponse,
  ListTemplatesRequest,
  ListTemplatesResponse,
  TemplateConfiguration,
  SaveConfigurationRequest,
  SaveConfigurationResponse,
  GetConfigurationRequest,
  GetConfigurationResponse,
} from './template';

export type {
  Invoice,
  GenerateInvoiceRequest,
  GenerateInvoiceResponse,
  InvoiceFormData,
  InvoiceFieldValidation,
  ListInvoicesRequest,
  ListInvoicesResponse,
  InvoiceStats,
  InvoiceStatsResponse,
} from './invoice';
