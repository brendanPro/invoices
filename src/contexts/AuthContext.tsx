import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { 
  initAuth, 
  getCurrentUser, 
  isLoggedIn, 
  loginWithGoogle, 
  logout as authLogout,
  setupAuthListeners,
  handleAuthCallback,
  type AuthUser 
} from '@/lib/auth';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Initialize authentication and check current user
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Initializing auth...');
        setIsLoading(true);
        setError(null);

        // Initialize authentication (no external dependencies)
        await initAuth();
        
        // Check if user is already logged in
        const isLoggedInUser = isLoggedIn();
        console.log('AuthContext: User logged in?', isLoggedInUser);
        
        if (isLoggedInUser) {
          const currentUser = getCurrentUser();
          console.log('AuthContext: Setting user:', currentUser?.email);
          setUser(currentUser);
        } else {
          console.log('AuthContext: No user found, setting to null');
          setUser(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
      } finally {
        setIsLoading(false);
        console.log('AuthContext: Initialization complete');
      }
    };

    initializeAuth();
  }, []);

  // Set up authentication event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cleanup = setupAuthListeners(
      (user) => {
        setUser(user);
        setError(null);
      },
      () => {
        setUser(null);
        setError(null);
      },
      (err) => {
        console.error('Auth error:', err);
        setError(err.message);
      }
    );

    // Listen for storage changes (when auth callback updates sessionStorage)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'invoice_generator_auth' && e.newValue) {
        try {
          const user = JSON.parse(e.newValue);
          setUser(user);
          setError(null);
        } catch (err) {
          console.error('Failed to parse user data from storage:', err);
        }
      } else if (e.key === 'invoice_generator_auth' && !e.newValue) {
        setUser(null);
      }
    };

    // Custom event listener for sessionStorage changes (since storage event doesn't fire for same-tab changes)
    const handleCustomStorageChange = (e: CustomEvent) => {
      if (e.detail?.key === 'invoice_generator_auth') {
        if (e.detail.newValue) {
          try {
            const user = JSON.parse(e.detail.newValue);
            setUser(user);
            setError(null);
          } catch (err) {
            console.error('Failed to parse user data from sessionStorage:', err);
          }
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sessionStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      cleanup();
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sessionStorageChange', handleCustomStorageChange as EventListener);
    };
  }, []);

  const login = async () => {
    try {
      setError(null);
      await loginWithGoogle();
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await authLogout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
