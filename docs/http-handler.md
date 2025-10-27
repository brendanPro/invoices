# HTTP Handler Utility

## Overview

The `HttpHandler` is a comprehensive utility class that centralizes HTTP response handling, error management, CORS handling, and request validation. It provides a consistent API for building responses across all Netlify Functions.

## Features

- ✅ **Consistent Response Format**: Standardized success/error response structure
- ✅ **HTTP Status Codes**: Proper status codes for different scenarios
- ✅ **CORS Handling**: Built-in CORS support with preflight handling
- ✅ **Request Validation**: Utilities for validating request data
- ✅ **Error Handling**: Comprehensive error response management
- ✅ **TypeScript Support**: Full type safety and IntelliSense

## API Reference

### Success Responses

#### `HttpHandler.success<T>(data: T, options?: HttpResponseOptions): Response`
Creates a successful response with data.

```typescript
// Basic success response
const response = HttpHandler.success({ message: 'Success' });
// Status: 200

// Custom status code
const response = HttpHandler.success(data, { status: 201 });
// Status: 201
```

#### `HttpHandler.created<T>(data: T, options?: HttpResponseOptions): Response`
Creates a 201 Created response.

```typescript
const response = HttpHandler.created({ id: 1, name: 'New Item' });
// Status: 201
```

#### `HttpHandler.noContent(options?: HttpResponseOptions): Response`
Creates a 204 No Content response.

```typescript
const response = HttpHandler.noContent();
// Status: 204
```

### Error Responses

#### `HttpHandler.error(error: string | Error, status?: number, options?: HttpResponseOptions): Response`
Creates an error response.

```typescript
// String error
const response = HttpHandler.error('Something went wrong', 500);

// Error object
const response = HttpHandler.error(new Error('Database error'), 500);
```

#### `HttpHandler.validationError(message: string, options?: HttpResponseOptions): Response`
Creates a 400 Bad Request response for validation errors.

```typescript
const response = HttpHandler.validationError('Name is required');
// Status: 400
```

#### `HttpHandler.notFound(message?: string, options?: HttpResponseOptions): Response`
Creates a 404 Not Found response.

```typescript
const response = HttpHandler.notFound('User not found');
// Status: 404
```

#### `HttpHandler.methodNotAllowed(allowedMethods?: string[], options?: HttpResponseOptions): Response`
Creates a 405 Method Not Allowed response.

```typescript
const response = HttpHandler.methodNotAllowed(['GET', 'POST']);
// Status: 405, Headers: Allow: GET, POST
```

### CORS Handling

#### `HttpHandler.corsPreflight(options?: HttpResponseOptions): Response`
Creates a CORS preflight response.

```typescript
const response = HttpHandler.corsPreflight();
// Status: 200, CORS headers
```

#### `HttpHandler.handleCors(request: Request): Response | null`
Handles CORS preflight requests.

```typescript
const corsResponse = HttpHandler.handleCors(request);
if (corsResponse) {
  return corsResponse; // Handle OPTIONS request
}
```

### Request Utilities

#### `HttpHandler.extractJson<T>(request: Request): Promise<T>`
Extracts and parses JSON from request body.

```typescript
try {
  const data = await HttpHandler.extractJson<CreateUserRequest>(request);
} catch (error) {
  return HttpHandler.validationError('Invalid JSON');
}
```

#### `HttpHandler.extractQueryParams(request: Request): URLSearchParams`
Extracts query parameters from request URL.

```typescript
const params = HttpHandler.extractQueryParams(request);
const id = params.get('id');
```

### Validation Utilities

#### `HttpHandler.validateRequiredFields(body: Record<string, any>, requiredFields: string[]): string | null`
Validates that required fields are present and not empty.

```typescript
const error = HttpHandler.validateRequiredFields(body, ['name', 'email']);
if (error) {
  return HttpHandler.validationError(error);
}
```

#### `HttpHandler.validateFieldTypes(body: Record<string, any>, fieldTypes: Record<string, string>): string | null`
Validates field types.

```typescript
const error = HttpHandler.validateFieldTypes(body, {
  name: 'string',
  age: 'number',
  active: 'boolean'
});
if (error) {
  return HttpHandler.validationError(error);
}
```

### Method Validation

#### `HttpHandler.validateMethod(request: Request, allowedMethods: string[]): Response | null`
Validates HTTP method.

```typescript
const methodError = HttpHandler.validateMethod(request, ['GET', 'POST']);
if (methodError) {
  return methodError;
}
```

### Async Operation Handling

#### `HttpHandler.handleAsync<T>(operation: () => Promise<T>, errorMessage?: string, options?: HttpResponseOptions): Promise<Response>`
Handles async operations with automatic error handling.

```typescript
return HttpHandler.handleAsync(
  () => userService.createUser(userData),
  'Failed to create user'
);
```

## Response Format

All responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## CORS Headers

The HTTP handler automatically includes CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Content-Type: application/json
```

## Usage Examples

### Basic Controller Method
```typescript
async createUser(req: Request): Promise<Response> {
  try {
    const body = await HttpHandler.extractJson<CreateUserRequest>(req);
    
    // Validate required fields
    const missingField = HttpHandler.validateRequiredFields(body, ['name', 'email']);
    if (missingField) {
      return HttpHandler.validationError(missingField);
    }
    
    const user = await this.userService.createUser(body);
    return HttpHandler.created(user);
    
  } catch (error) {
    console.error('Error creating user:', error);
    return HttpHandler.internalError('Failed to create user');
  }
}
```

### Endpoint with Method Validation
```typescript
export default async (req: Request, context: any) => {
  // Handle CORS
  const corsResponse = HttpHandler.handleCors(req);
  if (corsResponse) return corsResponse;
  
  // Validate method
  const methodError = HttpHandler.validateMethod(req, ['GET', 'POST']);
  if (methodError) return methodError;
  
  // Route to controller
  switch (req.method) {
    case 'GET':
      return await controller.listUsers();
    case 'POST':
      return await controller.createUser(req);
  }
};
```

### Async Operation Handling
```typescript
async listUsers(): Promise<Response> {
  return HttpHandler.handleAsync(
    () => this.userService.getAllUsers(),
    'Failed to retrieve users'
  );
}
```

## Benefits

1. **Consistency**: All responses follow the same format
2. **DRY Principle**: No repeated response building code
3. **Type Safety**: Full TypeScript support
4. **Error Handling**: Centralized error management
5. **CORS Support**: Built-in CORS handling
6. **Validation**: Reusable validation utilities
7. **Testing**: Easy to mock and test
8. **Maintainability**: Single place to update response format

## Migration Guide

### Before (Manual Response Building)
```typescript
return new Response(JSON.stringify({
  success: true,
  data: templates
}), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }
});
```

### After (Using HttpHandler)
```typescript
return HttpHandler.success(templates);
```

The HTTP handler significantly reduces boilerplate code and ensures consistency across all endpoints.
