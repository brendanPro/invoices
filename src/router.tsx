import { createRouter, createRoute, createRootRoute, redirect, useNavigate } from '@tanstack/react-router';
import React from 'react';
import { Login } from '@/pages/Login';
import { Dashboard } from './pages/Dashboard';
import { handleAuthCallback } from '@/lib/auth';

// Define the auth context type
interface AuthContext {
  isAuthenticated: boolean;
  user: any;
}

// Root route (no auth check - let individual routes handle it)
const rootRoute = createRootRoute({});

// Login route (public)
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
  beforeLoad: ({ context }: { context: { auth?: AuthContext } }) => {
    // Redirect to dashboard if already authenticated
    if (context.auth?.isAuthenticated) {
      throw redirect({
        to: '/dashboard',
      });
    }
  },
});


// OAuth callback component
function AuthCallbackComponent() {
  const navigate = useNavigate();
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Auth callback: Starting callback handling');
        console.log('Auth callback: Current URL:', window.location.href);
        
        const success = handleAuthCallback();
        console.log('Auth callback: Success:', success);
        
        if (success) {
          console.log('Auth callback: Navigating to dashboard');
          // Navigate to dashboard after successful authentication
          navigate({ to: '/dashboard' });
        } else {
          console.log('Auth callback: Authentication failed, navigating to login');
          setError('Authentication failed');
          // Navigate to login if authentication failed
          navigate({ to: '/login' });
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        navigate({ to: '/login' });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// OAuth callback route (public)
const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/callback',
  component: AuthCallbackComponent,
});

// Dashboard route (protected)
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: Dashboard,
  beforeLoad: ({ context }: { context: { auth?: AuthContext } }) => {
    // Require authentication for dashboard
    if (!context.auth?.isAuthenticated) {
      throw redirect({
        to: '/login',
      });
    }
  },
});

// Index route redirects to dashboard
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: ({ context }: { context: { auth?: AuthContext } }) => {
    // Redirect to dashboard if authenticated, otherwise to login
    if (context.auth?.isAuthenticated) {
      throw redirect({
        to: '/dashboard',
      });
    } else {
      throw redirect({
        to: '/login',
      });
    }
  },
});

// Create the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authCallbackRoute,
  dashboardRoute,
]);

// Create the router
export const router = createRouter({
  routeTree,
  context: {
    auth: undefined as AuthContext | undefined,
  },
});

// Declare module augmentation for TypeScript
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
