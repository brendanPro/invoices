import jwt from 'jsonwebtoken';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export interface AuthTokenPayload {
  id: string;
  email: string;
  name: string;
  picture: string;
  googleAccessToken: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly googleClientId: string;
  private readonly googleClientSecret: string;
  private readonly googleRedirectUri: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.googleClientId = process.env.GOOGLE_CLIENT_ID || '';
    this.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || '';
  }

  isEmailAuthorized(email: string): boolean {
    const authorizedEmails = process.env.AUTHORIZED_EMAILS;
    
    if (!authorizedEmails) {
      console.warn('AUTHORIZED_EMAILS environment variable not set - allowing all emails');
      return true; // If no whitelist is set, allow all emails (for development)
    }
    
    const emailList = authorizedEmails.split(',').map(email => email.trim().toLowerCase());
    const normalizedEmail = email.toLowerCase();
    
    return emailList.includes(normalizedEmail);
  }

  createGoogleAuthUrl(): { authUrl: string; state: string } {
    const state = Math.random().toString(36).substring(2, 15);
    const scope = 'openid email profile';
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', this.googleClientId);
    authUrl.searchParams.set('redirect_uri', this.googleRedirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return {
      authUrl: authUrl.toString(),
      state: state
    };
  }

  async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.googleRedirectUri,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
    }

    return await response.json();
  }

  async getUserInfoFromGoogle(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status}`);
    }

    return await response.json();
  }

  createAuthToken(userInfo: GoogleUserInfo, googleAccessToken: string): string {
    const payload: AuthTokenPayload = {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      googleAccessToken: googleAccessToken,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  verifyAuthToken(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as AuthTokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    return await response.json();
  }
}
