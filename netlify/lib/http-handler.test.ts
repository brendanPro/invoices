import { describe, it, expect } from 'bun:test';
import { HttpHandler } from '@netlify/lib/http-handler';

describe('HttpHandler', () => {
  describe('success responses', () => {
    it('should create a successful response with data', async () => {
      const data = { message: 'Success' };
      const response = HttpHandler.success(data);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(data);
    });

    it('should create a created response (201)', async () => {
      const data = { id: 1, name: 'Test' };
      const response = HttpHandler.created(data);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(data);
    });

    it('should create a no content response (204)', () => {
      const response = HttpHandler.noContent();

      expect(response.status).toBe(204);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('error responses', () => {
    it('should create an error response with string message', async () => {
      const response = HttpHandler.error('Test error', 400);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Test error');
    });

    it('should create an error response with Error object', async () => {
      const error = new Error('Test error');
      const response = HttpHandler.error(error, 500);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Test error');
    });

    it('should create validation error response', async () => {
      const response = HttpHandler.validationError('Validation failed');

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Validation failed');
    });

    it('should create not found error response', async () => {
      const response = HttpHandler.notFound('Resource not found');

      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Resource not found');
    });

    it('should create method not allowed error response', async () => {
      const response = HttpHandler.methodNotAllowed(['GET', 'POST']);

      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('GET, POST');
    });
  });

  describe('CORS handling', () => {
    it('should create CORS preflight response', () => {
      const response = HttpHandler.corsPreflight();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
    });

    it('should handle CORS preflight request', () => {
      const request = new Request('https://example.com/api/test', { method: 'OPTIONS' });
      const response = HttpHandler.handleCors(request);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(200);
    });

    it('should return null for non-OPTIONS request', () => {
      const request = new Request('https://example.com/api/test', { method: 'GET' });
      const response = HttpHandler.handleCors(request);

      expect(response).toBeNull();
    });
  });

  describe('method validation', () => {
    it('should validate allowed methods', () => {
      const request = new Request('https://example.com/api/test', { method: 'GET' });
      const response = HttpHandler.validateMethod(request, ['GET', 'POST']);

      expect(response).toBeNull();
    });

    it('should return error for disallowed methods', () => {
      const request = new Request('https://example.com/api/test', { method: 'PUT' });
      const response = HttpHandler.validateMethod(request, ['GET', 'POST']);

      expect(response).not.toBeNull();
      expect(response!.status).toBe(405);
    });
  });

  describe('request utilities', () => {
    it('should extract JSON from request', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await HttpHandler.extractJson(request);
      expect(data).toEqual({ test: 'data' });
    });

    it('should throw error for invalid JSON', async () => {
      const request = new Request('https://example.com/api/test', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      await expect(HttpHandler.extractJson(request)).rejects.toThrow('Invalid JSON in request body');
    });

    it('should extract query parameters', () => {
      const request = new Request('https://example.com/api/test?id=123&name=test');
      const params = HttpHandler.extractQueryParams(request);

      expect(params.get('id')).toBe('123');
      expect(params.get('name')).toBe('test');
    });
  });

  describe('validation utilities', () => {
    it('should validate required fields', () => {
      const body = { name: 'Test', email: 'test@example.com' };
      const result = HttpHandler.validateRequiredFields(body, ['name', 'email']);

      expect(result).toBeNull();
    });

    it('should return error for missing required fields', () => {
      const body = { name: 'Test' };
      const result = HttpHandler.validateRequiredFields(body, ['name', 'email']);

      expect(result).toBe("Field 'email' is required");
    });

    it('should return error for empty string fields', () => {
      const body = { name: '', email: 'test@example.com' };
      const result = HttpHandler.validateRequiredFields(body, ['name', 'email']);

      expect(result).toBe("Field 'name' is required");
    });

    it('should validate field types', () => {
      const body = { name: 'Test', age: 25 };
      const result = HttpHandler.validateFieldTypes(body, {
        name: 'string',
        age: 'number'
      });

      expect(result).toBeNull();
    });

    it('should return error for wrong field types', () => {
      const body = { name: 'Test', age: '25' };
      const result = HttpHandler.validateFieldTypes(body, {
        name: 'string',
        age: 'number'
      });

      expect(result).toBe("Field 'age' must be of type number");
    });
  });

  describe('async handling', () => {
    it('should handle successful async operations', async () => {
      const operation = async () => 'Success';
      const response = await HttpHandler.handleAsync(operation, 'Operation failed');

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBe('Success');
    });

    it('should handle failed async operations', async () => {
      const operation = async () => {
        throw new Error('Operation failed');
      };
      const response = await HttpHandler.handleAsync(operation, 'Custom error message');

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Custom error message');
    });
  });
});
