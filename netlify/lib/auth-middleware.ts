import { HttpHandler } from '@netlify/lib/http-handler';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthenticatedUser;
  response?: Response;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookieHeader = req.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    return cookies['nf_jwt'] || cookies['netlify-auth-token'] || null;
  }

  return null;
}


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

async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Check if the email is authorized
    if (!isEmailAuthorized(decoded.email)) {
      console.log(`Unauthorized email attempt: ${decoded.email}`);
      return null;
    }
    
    // Extract user information from JWT payload
    const user: AuthenticatedUser = {
      id: decoded.id,
      email: decoded.email,
      user_metadata: {
        full_name: decoded.name,
        avatar_url: decoded.picture,
      },
    };

    return user;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export async function requireAuth(req: Request): Promise<AuthResult> {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return {
        authenticated: false,
        response: HttpHandler.unauthorized('Authentication token required'),
      };
    }

    const user = await verifyToken(token);
    
    if (!user) {
      return {
        authenticated: false,
        response: HttpHandler.unauthorized('Invalid or expired authentication token'),
      };
    }

    return {
      authenticated: true,
      user,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      authenticated: false,
      response: HttpHandler.internalError('Authentication verification failed'),
    };
  }
}

export async function optionalAuth(req: Request): Promise<AuthResult> {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return {
        authenticated: false,
      };
    }

    const user = await verifyToken(token);
    
    if (!user) {
      return {
        authenticated: false,
      };
    }

    return {
      authenticated: true,
      user,
    };
  } catch (error) {
    console.error('Optional authentication error:', error);
    return {
      authenticated: false,
    };
  }
}
