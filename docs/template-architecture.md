# Template Module Architecture

## Overview

The Template module follows a clean architecture pattern with clear separation of concerns:

- **Controller Layer**: Handles HTTP routing, request validation, and response formatting
- **Service Layer**: Contains business logic and orchestrates data operations
- **Repository Layer**: Database and external service interactions (via `db` and `blobs` utilities)

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   templates.mts │    │ TemplateController│    │ TemplateService │
│   (Entry Point) │───▶│   (HTTP Layer)   │───▶│ (Business Logic)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │   db & blobs    │
                                               │ (Data Access)   │
                                               └─────────────────┘
```

## File Structure

```
netlify/functions/templates/
├── templates.mts                 # Main entry point and routing
├── template.controller.ts        # HTTP request handling
└── template.service.ts          # Business logic
```

## Layer Responsibilities

### 1. Entry Point (`templates.mts`)

**Responsibilities:**
- HTTP method routing
- CORS handling
- Request delegation to controller

**Key Features:**
- Clean switch statement for method routing
- Centralized CORS configuration
- Minimal logic - delegates to controller

### 2. Controller Layer (`template.controller.ts`)

**Responsibilities:**
- HTTP request/response handling
- Input validation
- Error handling and status codes
- Response formatting

**Key Features:**
- Comprehensive input validation
- Consistent error responses
- Proper HTTP status codes
- Separation of validation logic

**Methods:**
- `listTemplates()` - GET /api/templates
- `createTemplate(req)` - POST /api/templates
- `deleteTemplate(req)` - DELETE /api/templates?id=X

### 3. Service Layer (`template.service.ts`)

**Responsibilities:**
- Business logic implementation
- Data orchestration
- External service coordination
- Error handling and logging

**Key Features:**
- Pure business logic
- Database and blob service coordination
- Comprehensive error handling
- Utility methods for validation

**Methods:**
- `getAllTemplates()` - Retrieve all templates
- `createTemplate(name, fileData)` - Create new template
- `deleteTemplate(id)` - Delete template and cleanup
- `templateExists(id)` - Check template existence
- `getTemplateById(id)` - Get single template

## Design Patterns Used

### 1. Dependency Injection
The controller instantiates the service, allowing for easy testing and mocking.

### 2. Single Responsibility Principle
Each layer has a clear, single responsibility:
- Controller: HTTP concerns
- Service: Business logic
- Repository: Data access

### 3. Error Handling Strategy
- **Controller**: HTTP status codes and user-friendly messages
- **Service**: Business logic errors and logging
- **Repository**: Data access errors

### 4. Validation Strategy
- **Controller**: Input format validation
- **Service**: Business rule validation

## Error Handling

### Controller Level
```typescript
// Input validation errors (400)
if (!name) return this.createErrorResponse('Name required', 400);

// Business logic errors (404, 500)
if (!templateExists) return this.createErrorResponse('Not found', 404);
```

### Service Level
```typescript
// Database errors
catch (error) {
  console.error('Service: Error fetching templates:', error);
  throw new Error('Failed to retrieve templates');
}
```

## Testing Strategy

### Unit Tests
- **Controller Tests**: Mock service, test HTTP handling
- **Service Tests**: Mock repositories, test business logic

### Test Coverage
- ✅ Happy path scenarios
- ✅ Error handling
- ✅ Input validation
- ✅ Edge cases

## Benefits of This Architecture

### 1. Maintainability
- Clear separation of concerns
- Easy to modify individual layers
- Consistent error handling

### 2. Testability
- Each layer can be tested independently
- Easy mocking of dependencies
- Comprehensive test coverage

### 3. Scalability
- Easy to add new features
- Simple to extend validation
- Straightforward to add new endpoints

### 4. Code Quality
- TypeScript throughout
- Consistent naming conventions
- Comprehensive documentation

## Usage Examples

### Adding a New Endpoint

1. **Add method to service:**
```typescript
async updateTemplate(id: number, name: string): Promise<Template> {
  // Business logic here
}
```

2. **Add method to controller:**
```typescript
async updateTemplate(req: Request): Promise<Response> {
  // Validation and HTTP handling
}
```

3. **Add route to entry point:**
```typescript
case 'PUT':
  return await templateController.updateTemplate(req);
```

### Adding Validation

1. **Controller validation (format):**
```typescript
private validateUpdateInput(id: string, name: string): string | null {
  if (!id || isNaN(parseInt(id))) return 'Invalid ID';
  if (!name?.trim()) return 'Name required';
  return null;
}
```

2. **Service validation (business rules):**
```typescript
validateTemplateName(name: string): boolean {
  return name.length > 0 && name.length <= 255;
}
```

## Migration from Monolithic Function

The original `templates.mts` contained all logic in one file. The new architecture:

1. **Separates concerns** into logical layers
2. **Improves testability** with isolated components
3. **Enhances maintainability** with clear responsibilities
4. **Increases reusability** of business logic
5. **Provides better error handling** with consistent patterns

This architecture follows enterprise-level best practices and makes the codebase more professional and maintainable.
