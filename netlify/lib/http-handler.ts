import type { ApiResponse } from '../../src/types/index';

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  /**
   * Return a binary response with optional CORS and custom headers
   */
  static binary(
    data: BodyInit | null,
    contentType: string,
    options: HttpResponseOptions = {},
  ): Response {
    const { status = 200, headers = {}, cors = true } = options;
    const customHeaders: Record<string, string> = {
      'Content-Type': contentType,
      ...headers,
    };
    return new Response(data, {
      status,
      headers: this.buildHeaders(customHeaders, cors),
    });
  }

  /**
   * Return a PDF response with common headers
   */
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

  /**
   * Create a successful response
   */
  static success<T = any>(data: T, options: HttpResponseOptions = {}): Response {
    const { status = 200, headers = {}, cors = true } = options;

    const response: ApiResponse<T> = {
      success: true,
      data,
    };

    return new Response(JSON.stringify(response), {
      status,
      headers: this.buildHeaders(headers, cors),
    });
  }

  /**
   * Create an error response
   */
  static error(
    error: string | Error,
    status: number = 500,
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

  /**
   * Create a validation error response
   */
  static validationError(message: string, options: HttpResponseOptions = {}): Response {
    return this.error(message, 400, options);
  }

  /**
   * Create a not found error response
   */
  static notFound(
    message: string = 'Resource not found',
    options: HttpResponseOptions = {},
  ): Response {
    return this.error(message, 404, options);
  }

  /**
   * Create a method not allowed error response
   */
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
      status: 405,
      headers: this.buildHeaders(customHeaders, cors),
    });
  }

  /**
   * Create a CORS preflight response
   */
  static corsPreflight(options: HttpResponseOptions = {}): Response {
    const { headers = {}, cors = true } = options;

    return new Response('', {
      status: 200,
      headers: this.buildHeaders(headers, cors),
    });
  }

  /**
   * Create a created response (201)
   */
  static created<T = any>(data: T, options: HttpResponseOptions = {}): Response {
    return this.success(data, { ...options, status: 201 });
  }

  /**
   * Create a no content response (204)
   */
  static noContent(options: HttpResponseOptions = {}): Response {
    const { headers = {}, cors = true } = options;

    return new Response('', {
      status: 204,
      headers: this.buildHeaders(headers, cors),
    });
  }

  /**
   * Create a bad request response (400)
   */
  static badRequest(message: string = 'Bad request', options: HttpResponseOptions = {}): Response {
    return this.error(message, 400, options);
  }

  /**
   * Create an internal server error response (500)
   */
  static internalError(
    message: string = 'Internal server error',
    options: HttpResponseOptions = {},
  ): Response {
    return this.error(message, 500, options);
  }

  /**
   * Create an unauthorized response (401)
   */
  static unauthorized(
    message: string = 'Unauthorized',
    options: HttpResponseOptions = {},
  ): Response {
    return this.error(message, 401, options);
  }

  /**
   * Create a forbidden response (403)
   */
  static forbidden(message: string = 'Forbidden', options: HttpResponseOptions = {}): Response {
    return this.error(message, 403, options);
  }

  /**
   * Create a redirect response (302)
   */
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

  /**
   * Handle async operations with automatic error handling
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operation failed',
    options: HttpResponseOptions = {},
  ): Promise<Response> {
    try {
      const result = await operation();
      return this.success(result, options);
    } catch (error) {
      console.error('HttpHandler: Async operation failed:', error);
      return this.internalError(errorMessage, options);
    }
  }

  /**
   * Build headers with optional CORS
   */
  private static buildHeaders(
    customHeaders: Record<string, string> = {},
    cors: boolean = true,
  ): Record<string, string> {
    return cors
      ? { ...this.DEFAULT_CORS_HEADERS, ...customHeaders }
      : { 'Content-Type': 'application/json', ...customHeaders };
  }

  /**
   * Validate request method
   */
  static validateMethod(request: Request, allowedMethods: string[]): Response | null {
    if (!allowedMethods.includes(request.method)) {
      return this.methodNotAllowed(allowedMethods);
    }
    return null;
  }

  /**
   * Handle CORS preflight requests
   */
  static handleCors(request: Request): Response | null {
    if (request.method === 'OPTIONS') {
      return this.corsPreflight();
    }
    return null;
  }

  /**
   * Extract JSON body with error handling
   */
  static async extractJson<T = any>(request: Request): Promise<T> {
    try {
      return await request.json();
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  }

  /**
   * Extract query parameters
   */
  static extractQueryParams(request: Request): URLSearchParams {
    const url = new URL(request.url);
    return url.searchParams;
  }

  /**
   * Validate required fields in request body
   */
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

  /**
   * Validate field types
   */
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
