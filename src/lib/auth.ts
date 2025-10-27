// Backend-side Google OAuth 2.0 Authentication Implementation
// Frontend calls backend /auth/login to initiate OAuth flow
// Backend handles all Google OAuth interactions

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  authToken: string;
  expires_at: number;
}

// Storage keys
const STORAGE_KEY = 'invoice_generator_auth';
const TOKEN_KEY = 'invoice_generator_token';

// Helper functions for session storage
const setSessionItem = (key: string, value: string) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(key, value);
    // Dispatch custom event for same-tab sessionStorage changes
    window.dispatchEvent(new CustomEvent('sessionStorageChange', {
      detail: { key, newValue: value }
    }));
  }
};

const getSessionItem = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(key);
  }
  return null;
};

const removeSessionItem = (key: string) => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(key);
    // Dispatch custom event for same-tab sessionStorage changes
    window.dispatchEvent(new CustomEvent('sessionStorageChange', {
      detail: { key, newValue: null }
    }));
  }
};

/**
 * Initialize authentication (no external dependencies)
 */
export function initAuth(): Promise<void> {
  return new Promise((resolve) => {
    // Just resolve - no need to handle callback here
    // Callback handling is done by the router component
    resolve();
  });
}

/**
 * Get current user from sessionStorage
 */
export function getCurrentUser(): AuthUser | null {
  try {
    const userData = getSessionItem(STORAGE_KEY);
    if (!userData) {
      console.log('Auth: No user data in sessionStorage');
      return null;
    }

    const user: AuthUser = JSON.parse(userData);
    
    // Check if token is expired
    if (user.expires_at && user.expires_at < Date.now()) {
      console.log('Auth: Token expired, clearing session');
      // Clear expired data without triggering logout redirect
      removeSessionItem(STORAGE_KEY);
      removeSessionItem(TOKEN_KEY);
      return null;
    }

    console.log('Auth: User found in sessionStorage:', user.email);
    return user;
  } catch (error) {
    console.error('Auth: Error parsing user data:', error);
    return null;
  }
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

/**
 * Login with Google OAuth 2.0 via backend
 */
export function loginWithGoogle(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const backendUrl = process.env.BUN_PUBLIC_BACKEND_URL || 'http://localhost:8888';
      
      // Call backend to get OAuth URL
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to initiate login');
      }

      const result = await response.json();
      
      if (!result.success || !result.data.authUrl) {
        throw new Error('Invalid login response');
      }

      // Store state for verification (optional)
      if (result.data.state) {
        localStorage.setItem('oauth_state', result.data.state);
      }

      // Redirect to Google OAuth URL provided by backend
      window.location.href = result.data.authUrl;
    } catch (error) {
      console.error('Login initiation failed:', error);
      reject(error);
    }
  });
}

/**
 * Handle OAuth callback from backend
 */
export function handleAuthCallback(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const user = urlParams.get('user');
  const error = urlParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    
    // Handle specific error types
    if (error === 'unauthorized_email') {
      console.error('Your email address is not authorized to access this application');
      // You could show a specific error message to the user here
    }
    
    return false;
  }

  if (!token || !user) {
    return false;
  }

  try {
    // Parse user data from backend
    const userData = JSON.parse(decodeURIComponent(user));
    
    // Store the auth token and user data
    const authUser: AuthUser = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      authToken: token,
      expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };

    setSessionItem(STORAGE_KEY, JSON.stringify(authUser));
    setSessionItem(TOKEN_KEY, token);
    
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    return true;
  } catch (err) {
    console.error('Token storage failed:', err);
    return false;
  }
}

/**
 * Logout current user
 */
export function logout(): Promise<void> {
  removeSessionItem(STORAGE_KEY);
  removeSessionItem(TOKEN_KEY);
  removeSessionItem('oauth_state');
  
  // Redirect to login page
  window.location.href = '/login';
  
  return Promise.resolve();
}

/**
 * Get JWT token for API requests
 */
export function getJWTToken(): string | null {
  const user = getCurrentUser();
  return user?.authToken || null;
}

/**
 * Set up authentication event listeners (simplified for direct OAuth)
 */
export function setupAuthListeners(
  onLogin: (user: AuthUser) => void,
  onLogout: () => void,
  onError: (error: Error) => void
): () => void {
  // For direct OAuth, we don't need complex event listeners
  // The auth state is managed through localStorage and page navigation
  
  // Check if user is already logged in
  const user = getCurrentUser();
  if (user) {
    onLogin(user);
  }

  // Return cleanup function (no-op for direct OAuth)
  return () => {};
}
