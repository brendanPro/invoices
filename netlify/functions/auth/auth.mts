import { HttpHandler } from '../../lib/http-handler';
import jwt from 'jsonwebtoken';

/**
 * Check if email is in the authorized whitelist
 */
function isEmailAuthorized(email: string): boolean {
  const authorizedEmails = process.env.AUTHORIZED_EMAILS;
  
  if (!authorizedEmails) {
    console.warn('AUTHORIZED_EMAILS environment variable not set - allowing all emails');
    return true; // If no whitelist is set, allow all emails (for development)
  }
  
  const emailList = authorizedEmails.split(',').map(email => email.trim().toLowerCase());
  const normalizedEmail = email.toLowerCase();
  
  return emailList.includes(normalizedEmail);
}

// Consolidated auth functions handler
export default async (req: Request, context: any) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return HttpHandler.corsPreflight();
  }

  // Route to appropriate handler based on path
  if (pathname === '/api/auth/login') {
    return handleLogin(req, context);
  } else if (pathname === '/api/auth/callback') {
    return handleCallback(req, context);
  } else if (pathname === '/api/auth/userinfo') {
    return handleUserInfo(req, context);
  } else if (pathname === '/api/auth/refresh') {
    return handleRefresh(req, context);
  } else {
    return HttpHandler.notFound('Auth endpoint not found');
  }
};

// Login handler - initiates OAuth flow
async function handleLogin(req: Request, context: any) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return HttpHandler.internalError('Google OAuth not configured');
    }

    // Generate state parameter for security
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store state in a secure way (in production, use Redis or database)
    // For now, we'll include it in the redirect URL
    const scope = 'openid email profile';
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    // Return the OAuth URL for the frontend to redirect to
    return HttpHandler.success({
      authUrl: authUrl.toString(),
      state: state
    });
  } catch (error) {
    console.error('Login initiation failed:', error);
    return HttpHandler.internalError('Failed to initiate login');
  }
}

// OAuth callback handler
async function handleCallback(req: Request, context: any) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      const frontendUrl = process.env.BUN_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
      const errorUrl = `${frontendUrl}/auth/callback?error=${encodeURIComponent(error)}`;
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': errorUrl,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
      });
    }

    // Validate required parameters
    if (!code) {
      const frontendUrl = process.env.BUN_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
      const errorUrl = `${frontendUrl}/auth/callback?error=missing_code`;
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': errorUrl,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
      });
    }

    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken(code);
    
    // Get user info from Google
    const userInfo = await getUserInfoFromGoogle(tokenResponse.access_token);
    
    // Check if email is authorized
    if (!isEmailAuthorized(userInfo.email)) {
      console.log(`Unauthorized email attempt: ${userInfo.email}`);
      const frontendUrl = process.env.BUN_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
      const errorUrl = `${frontendUrl}/auth/callback?error=unauthorized_email`;
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': errorUrl,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
      });
    }
    
    // Create custom auth token
    const authToken = createAuthToken(userInfo, tokenResponse.access_token);
    
    // Redirect to frontend with auth token
    const frontendUrl = process.env.BUN_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${encodeURIComponent(authToken)}&user=${encodeURIComponent(JSON.stringify(userInfo))}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
    });
  } catch (error) {
    console.error('Token exchange failed:', error);
    const frontendUrl = process.env.BUN_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    const errorUrl = `${frontendUrl}/auth/callback?error=token_exchange_failed`;
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': errorUrl,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      },
    });
  }
}

// User info handler - validates custom auth token
async function handleUserInfo(req: Request, context: any) {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return HttpHandler.unauthorized('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify custom auth token
    const decoded = verifyAuthToken(token);
    
    return HttpHandler.success(decoded);
  } catch (error) {
    console.error('Token verification failed:', error);
    return HttpHandler.unauthorized('Invalid or expired token');
  }
}

// Token refresh handler
async function handleRefresh(req: Request, context: any) {
  if (req.method !== 'POST') {
    return HttpHandler.methodNotAllowed(['POST']);
  }

  try {
    const { refresh_token } = await req.json();
    
    if (!refresh_token) {
      return HttpHandler.badRequest('Refresh token is required');
    }

    const tokenResponse = await refreshAccessToken(refresh_token);
    
    return HttpHandler.success(tokenResponse);
  } catch (error) {
    console.error('Token refresh failed:', error);
    return HttpHandler.unauthorized('Failed to refresh access token');
  }
}

// Helper functions
function createAuthToken(userInfo: any, googleAccessToken: string): string {
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  
  const payload = {
    id: userInfo.id,
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    googleAccessToken: googleAccessToken,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
  };

  return jwt.sign(payload, jwtSecret);
}

function verifyAuthToken(token: string): any {
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  
  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Return user info without sensitive data
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

async function exchangeCodeForToken(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth configuration');
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const tokenData = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenData,
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
  }

  return await response.json();
}

async function getUserInfoFromGoogle(accessToken: string) {
  const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';
  
  const response = await fetch(userInfoUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid or expired access token');
    }
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  const userInfo = await response.json();
  
  // Return standardized user info
  return {
    id: userInfo.id,
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    verified_email: userInfo.verified_email,
  };
}

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth configuration');
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const tokenData = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenData,
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
  }

  return await response.json();
}

export const config = {
  path: '/api/auth/*',
};
