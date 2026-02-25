import type { ApiResponse } from '@/types/index';
import { AppError } from '@netlify/lib/errors';
import { HttpStatus } from '@shared/http-status';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

export interface HttpResponseOptions {
  status?: number;
  headers?: Record<string, string>;
  cors?: boolean;
}

export class HttpHandler {
  private static readonly DEFAULT_CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Content-Type': 'application/json',
  };

  static binary(
    data: BodyInit | null,
    contentType: string,
    options: HttpResponseOptions = {},
  ): Response {
    const { status = HttpStatus.OK, headers = {}, cors = true } = options;
    const customHeaders: Record<string, string> = {
      'Content-Type': contentType,
      ...headers,
    };
    return new Response(data, {
      status,
      headers: this.buildHeaders(customHeaders, cors),
    });
  }

  static pdf(data: BodyInit | null, filename: string, options: HttpResponseOptions = {}): Response {
    const cacheHeaders: Record<string, string> = {
      'Content-Disposition': `inline; filename="${filename}.pdf"`,
      'Cache-Control': 'public, max-age=3600',
    };
    const merged: HttpResponseOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...cacheHeaders,
      },
    };
    return this.binary(data, 'application/pdf', merged);
  }

  static success<T = any>(data: T, options: HttpResponseOptions = {}): Response {
    const { status = HttpStatus.OK, headers = {}, cors = true } = options;

    const response: ApiResponse<T> = {
      success: true,
      data,
    };

    return new Response(JSON.stringify(response), {
      status,
      headers: this.buildHeaders(headers, cors),
    });
  }

  static error(
    error: string | Error,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    options: HttpResponseOptions = {},
  ): Response {
    const { headers = {}, cors = true } = options;

    const errorMessage = error instanceof Error ? error.message : String(error);

    const response: ApiResponse = {
      success: false,
      error: errorMessage,
    };

    return new Response(JSON.stringify(response), {
      status,
      headers: this.buildHeaders(headers, cors),
    });
  }

  static validationError(message: string, options: HttpResponseOptions = {}): Response {
    return this.error(message, HttpStatus.BAD_REQUEST, options);
  }

  static notFound(
    message: string = 'Resource not found',
    options: HttpResponseOptions = {},
  ): Response {
    return this.error(message, HttpStatus.NOT_FOUND, options);
  }

  static methodNotAllowed(
    allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE'],
    options: HttpResponseOptions = {},
  ): Response {
    const { headers = {}, cors = true } = options;

    const response: ApiResponse = {
      success: false,
      error: 'Method not allowed',
    };

    const customHeaders = {
      ...headers,
      Allow: allowedMethods.join(', '),
    };

    return new Response(JSON.stringify(response), {
      status: HttpStatus.METHOD_NOT_ALLOWED,
      headers: this.buildHeaders(customHeaders, cors),
    });
  }

  static corsPreflight(options: HttpResponseOptions = {}): Response {
    const { headers = {}, cors = true } = options;

    return new Response('', {
      status: HttpStatus.OK,
      headers: this.buildHeaders(headers, cors),
    });
  }

  static created<T = any>(data: T, options: HttpResponseOptions = {}): Response {
    return this.success(data, { ...options, status: HttpStatus.CREATED });
  }

  static noContent(options: HttpResponseOptions = {}): Response {
    const { headers = {}, cors = true } = options;

    return new Response('', {
      status: HttpStatus.NO_CONTENT,
      headers: this.buildHeaders(headers, cors),
    });
  }

  static badRequest(message: string = 'Bad request', options: HttpResponseOptions = {}): Response {
    return this.error(message, HttpStatus.BAD_REQUEST, options);
  }

  static internalError(
    message: string = 'Internal server error',
    options: HttpResponseOptions = {},
  ): Response {
    return this.error(message, HttpStatus.INTERNAL_SERVER_ERROR, options);
  }

  static unauthorized(
    message: string = 'Unauthorized',
    options: HttpResponseOptions = {},
  ): Response {
    return this.error(message, HttpStatus.UNAUTHORIZED, options);
  }

  static forbidden(message: string = 'Forbidden', options: HttpResponseOptions = {}): Response {
    return this.error(message, HttpStatus.FORBIDDEN, options);
  }

  static redirect(url: string, options: HttpResponseOptions = {}): Response {
    const { headers = {}, cors = true } = options;

    const customHeaders = {
      Location: url,
      ...headers,
    };
    return new Response(null, {
      status: 302,
      headers: this.buildHeaders(customHeaders, cors),
    });
  }

  static fromAppError(error: AppError, options: HttpResponseOptions = {}): Response {
    return this.error(error.message, error.statusCode, options);
  }

  static async handleAsync<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operation failed',
    options: HttpResponseOptions = {},
  ): Promise<Response> {
    try {
      const result = await operation();
      return this.success(result, options);
    } catch (error) {
      if (error instanceof AppError) {
        return this.fromAppError(error, options);
      }
      console.error('HttpHandler: Async operation failed:', error);
      return this.internalError(errorMessage, options);
    }
  }

  private static buildHeaders(
    customHeaders: Record<string, string> = {},
    cors: boolean = true,
  ): Record<string, string> {
    return cors
      ? { ...this.DEFAULT_CORS_HEADERS, ...customHeaders }
      : { 'Content-Type': 'application/json', ...customHeaders };
  }

  static validateMethod(request: Request, allowedMethods: string[]): Response | null {
    if (!allowedMethods.includes(request.method)) {
      return this.methodNotAllowed(allowedMethods);
    }
    return null;
  }

  static handleCors(request: Request): Response | null {
    if (request.method === 'OPTIONS') {
      return this.corsPreflight();
    }
    return null;
  }

  static async extractJson<T = any>(request: Request): Promise<T> {
    try {
      return await request.json();
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  }

  static extractQueryParams(request: Request): URLSearchParams {
    const url = new URL(request.url);
    return url.searchParams;
  }

  static validateRequiredFields(
    body: Record<string, any>,
    requiredFields: string[],
  ): string | null {
    for (const field of requiredFields) {
      if (!body[field] || (typeof body[field] === 'string' && body[field].trim() === '')) {
        return `Field '${field}' is required`;
      }
    }
    return null;
  }

  static validateFieldTypes(
    body: Record<string, any>,
    fieldTypes: Record<string, string>,
  ): string | null {
    for (const [field, expectedType] of Object.entries(fieldTypes)) {
      const value = body[field];
      if (value !== undefined && typeof value !== expectedType) {
        return `Field '${field}' must be of type ${expectedType}`;
      }
    }
    return null;
  }
}
