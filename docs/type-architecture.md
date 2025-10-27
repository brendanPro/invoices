# Type Architecture

## Overview

The type system has been refactored into a modular, organized structure that separates concerns and provides better maintainability. All types are now organized into logical modules with a central index file for easy imports.

## Type Structure

```
src/types/
├── index.ts          # Central export file
├── api.ts            # API response types and common interfaces
├── template.ts       # Template-related types
└── invoice.ts        # Invoice-related types
```

## Type Modules

### 1. API Types (`api.ts`)

**Purpose**: Common API response patterns and HTTP-related types

**Key Types**:
- `ApiResponse<T>` - Standard API response wrapper
- `ApiError` - Error response structure
- `ApiSuccess<T>` - Success response structure
- `HttpStatus` - HTTP status code enum
- `PaginatedResponse<T>` - Paginated data response
- `ValidationError` - Validation error structure
- `ValidationErrorResponse` - Validation error response

**Usage**:
```typescript
import type { ApiResponse, HttpStatus } from '@/types/index';

const response: ApiResponse<User[]> = await fetch('/api/users');
```

### 2. Template Types (`template.ts`)

**Purpose**: All template and template field related types

**Key Types**:
- `Template` - Template entity
- `TemplateField` - Template field entity
- `FieldType` - Field type union
- `CreateTemplateRequest` - Template creation request
- `CreateTemplateResponse` - Template creation response
- `UpdateTemplateRequest` - Template update request
- `CreateTemplateFieldRequest` - Field creation request
- `TemplateConfiguration` - Template configuration structure
- `ListTemplatesRequest` - Template listing request
- `ListTemplatesResponse` - Template listing response

**Usage**:
```typescript
import type { Template, CreateTemplateRequest } from '@/types/index';

const template: Template = {
  id: 1,
  name: 'Invoice Template',
  blob_key: 'template_123.pdf',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};
```

### 3. Invoice Types (`invoice.ts`)

**Purpose**: All invoice generation and management related types

**Key Types**:
- `Invoice` - Invoice entity
- `GenerateInvoiceRequest` - Invoice generation request
- `GenerateInvoiceResponse` - Invoice generation response
- `InvoiceFormData` - Form data structure
- `InvoiceFieldValidation` - Field validation rules
- `ListInvoicesRequest` - Invoice listing request
- `ListInvoicesResponse` - Invoice listing response
- `InvoiceStats` - Invoice statistics
- `InvoiceStatsResponse` - Statistics response

**Usage**:
```typescript
import type { Invoice, GenerateInvoiceRequest } from '@/types/index';

const invoiceRequest: GenerateInvoiceRequest = {
  template_id: 1,
  invoice_data: {
    customer_name: 'John Doe',
    amount: 1000
  }
};
```

## Central Index (`index.ts`)

**Purpose**: Single import point for all types

**Features**:
- Re-exports all types from individual modules
- Provides convenient grouped exports
- Maintains backward compatibility
- Enables tree-shaking for better bundle size

**Usage**:
```typescript
// Import specific types
import type { Template, ApiResponse } from '@/types/index';

// Import multiple types from same module
import type { 
  Template, 
  TemplateField, 
  CreateTemplateRequest 
} from '@/types/index';
```

## Benefits of New Structure

### 1. **Separation of Concerns**
- API types are separate from business logic types
- Template types are isolated from invoice types
- Clear boundaries between different domains

### 2. **Better Maintainability**
- Easy to find and update specific type categories
- Reduced coupling between different type modules
- Clear ownership of types

### 3. **Improved Developer Experience**
- IntelliSense works better with focused imports
- Easier to understand what types are available
- Better code organization

### 4. **Scalability**
- Easy to add new type modules as the project grows
- Clear patterns for extending existing types
- Consistent structure across all modules

### 5. **Type Safety**
- All types are properly exported and imported
- No circular dependencies
- Consistent type definitions across the codebase

## Migration Guide

### Before (Single File)
```typescript
// Old way - everything in one file
import type { Template, ApiResponse, Invoice } from '@/types/invoice';
```

### After (Modular Structure)
```typescript
// New way - organized imports
import type { Template, ApiResponse, Invoice } from '@/types/index';

// Or more specific imports
import type { Template } from '@/types/template';
import type { ApiResponse } from '@/types/api';
import type { Invoice } from '@/types/invoice';
```

## Type Naming Conventions

### Request/Response Pairs
- `CreateXRequest` / `CreateXResponse`
- `UpdateXRequest` / `UpdateXResponse`
- `DeleteXRequest` / `DeleteXResponse`
- `ListXRequest` / `ListXResponse`

### Entity Types
- `Template` - Template entity
- `TemplateField` - Template field entity
- `Invoice` - Invoice entity

### Configuration Types
- `XConfiguration` - Configuration structure
- `SaveXConfigurationRequest` - Save configuration request
- `GetXConfigurationResponse` - Get configuration response

### Utility Types
- `XFormData` - Form data structure
- `XFieldValidation` - Field validation rules
- `XStats` - Statistics structure

## Best Practices

### 1. **Import Strategy**
```typescript
// Prefer specific imports for better tree-shaking
import type { Template } from '@/types/template';

// Use index imports for multiple types from different modules
import type { Template, ApiResponse, Invoice } from '@/types/index';
```

### 2. **Type Extensions**
```typescript
// Extend existing types when needed
interface ExtendedTemplate extends Template {
  customField: string;
}
```

### 3. **Generic Types**
```typescript
// Use generics for reusable patterns
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### 4. **Union Types**
```typescript
// Use union types for limited options
type FieldType = 'text' | 'number' | 'date';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
```

## Future Enhancements

### 1. **Type Validation**
- Add runtime validation using Zod schemas
- Generate TypeScript types from Zod schemas
- Ensure type safety at runtime

### 2. **API Documentation**
- Generate API documentation from types
- Use JSDoc comments for better IntelliSense
- Create type documentation automatically

### 3. **Testing Types**
- Add type tests to ensure type compatibility
- Test type transformations and mappings
- Validate type exports and imports

The new type architecture provides a solid foundation for the invoice generation system with clear separation of concerns, better maintainability, and improved developer experience.
