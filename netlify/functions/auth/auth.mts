import { AuthController } from './auth.controller';
import { HttpHandler, HttpMethod } from '@netlify/lib/http-handler';
import type { Config } from '@netlify/functions';

const BASE_PATH = '/api/auth';

export const config: Config = {
  path: '/api/auth/*',
};

const ALLOWED_METHODS = [HttpMethod.GET, HttpMethod.POST, HttpMethod.OPTIONS];
const authController = new AuthController();

enum AuthRoutes {
  LOGIN = `${BASE_PATH}/login`,
  CALLBACK = `${BASE_PATH}/callback`,
  USERINFO = `${BASE_PATH}/userinfo`,
  REFRESH = `${BASE_PATH}/refresh`
}

export default async (req: Request, context: any) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  console.log(req.method);
  // Handle CORS preflight requests
  if (req.method === HttpMethod.OPTIONS) {
    return HttpHandler.corsPreflight();
  }

  const corsResponse = HttpHandler.handleCors(req);
  if (corsResponse) return corsResponse;

  const methodError = HttpHandler.validateMethod(req, ALLOWED_METHODS);
  if (methodError) return methodError;

  try {
    // Route to appropriate handler based on path
    switch (pathname) {
      case AuthRoutes.LOGIN:
        return await authController.initiateLogin();
      
      case AuthRoutes.CALLBACK:
        return await authController.handleCallback(req);
      
      case AuthRoutes.USERINFO:
        return await authController.getUserInfo(req);
      
      case AuthRoutes.REFRESH:
        return await authController.refreshToken(req);
      
      default:
        return HttpHandler.notFound('Auth endpoint not found');
    }
  } catch (error) {
    console.error('Auth endpoint error:', error);
    return HttpHandler.internalError('An unexpected error occurred');
  }
};