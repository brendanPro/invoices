import { AuthService } from './auth.service';
import { HttpHandler } from '../../lib/http-handler';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async initiateLogin(): Promise<Response> {
    try {
      const { authUrl, state } = this.authService.createGoogleAuthUrl();
      
      return HttpHandler.success({
        authUrl: authUrl,
        state: state
      });
    } catch (error) {
      console.error('Auth controller: Login initiation failed:', error);
      return HttpHandler.internalError('Failed to initiate login');
    }
  }

  async handleCallback(req: Request): Promise<Response> {
    const frontendUrl = process.env.BUN_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

    try {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');



      if (error) {
        console.error('OAuth error:', error);
        const errorUrl = `${frontendUrl}/callback?error=${encodeURIComponent(error)}`;
        return HttpHandler.redirect(errorUrl);
      }

      if (!code) {
        const errorUrl = `${frontendUrl}/callback?error=missing_code`;
        return HttpHandler.redirect(errorUrl);
      }

      const tokenResponse = await this.authService.exchangeCodeForToken(code);
      const userInfo = await this.authService.getUserInfoFromGoogle(tokenResponse.access_token);

      if (!this.authService.isEmailAuthorized(userInfo.email)) {
        console.log(`Unauthorized email attempt: ${userInfo.email}`);
        const errorUrl = `${frontendUrl}/callback?error=unauthorized_email`;
        return HttpHandler.redirect(errorUrl);
      }

      const authToken = this.authService.createAuthToken(userInfo, tokenResponse.access_token);
      const redirectUrl = `${frontendUrl}/callback?token=${encodeURIComponent(authToken)}&user=${encodeURIComponent(JSON.stringify(userInfo))}`;
      
      return HttpHandler.redirect(redirectUrl);
    } catch (error) {
      console.error('Auth controller: Token exchange failed:', error);
      const errorUrl = `${frontendUrl}/callback?error=token_exchange_failed`;
      
      return HttpHandler.redirect(errorUrl);
    }
  }

  /**
   * Handle user info request - validate token and return user data
   */
  async getUserInfo(req: Request): Promise<Response> {
    try {
      const authHeader = req.headers.get('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return HttpHandler.unauthorized('Missing or invalid authorization header');
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const decoded = this.authService.verifyAuthToken(token);
      
      return HttpHandler.success({
        id: decoded.id,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      });
    } catch (error) {
      console.error('Auth controller: Token verification failed:', error);
      return HttpHandler.unauthorized('Invalid or expired token');
    }
  }

  async refreshToken(req: Request): Promise<Response> {
    try {
      const body = await HttpHandler.extractJson<{ refreshToken: string }>(req);
      
      if (!body.refreshToken) {
        return HttpHandler.validationError('Refresh token is required');
      }

      const tokenResponse = await this.authService.refreshAccessToken(body.refreshToken);
      
      return HttpHandler.success({
        access_token: tokenResponse.access_token,
        expires_in: tokenResponse.expires_in,
        token_type: tokenResponse.token_type,
      });
    } catch (error) {
      console.error('Auth controller: Token refresh failed:', error);
      return HttpHandler.internalError('Failed to refresh token');
    }
  }
}
