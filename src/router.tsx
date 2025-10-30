import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router';
import { Login } from '@/pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AuthCallback } from './pages/AuthCallback';
import { TemplateWorkflow } from './pages/TemplateWorkflow';
import type { AuthUser } from '@/lib/auth';

interface AuthContext {
  isAuthenticated: boolean;
  user: AuthUser | null;
}

const rootRoute = createRootRoute({});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
  beforeLoad: ({ context }: { context: { auth?: AuthContext } }) => {
    if (context.auth?.isAuthenticated) {
      throw redirect({
        to: '/dashboard',
      });
    }
  },
});

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/callback',
  component: AuthCallback,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: Dashboard,
  beforeLoad: ({ context }: { context: { auth?: AuthContext } }) => {
    if (!context.auth?.isAuthenticated) {
      throw redirect({
        to: '/login',
      });
    }
  },
});

const templateWorkflowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/templates',
  component: TemplateWorkflow,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      templateId: search.templateId ? Number(search.templateId) : undefined,
    } as { templateId?: number };
  },
  beforeLoad: ({ context }: { context: { auth?: AuthContext } }) => {
    if (!context.auth?.isAuthenticated) {
      throw redirect({
        to: '/login',
      });
    }
  },
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: ({ context }: { context: { auth?: AuthContext } }) => {
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  authCallbackRoute,
  dashboardRoute,
  templateWorkflowRoute,
]);

export const router = createRouter({
  routeTree,
  context: {
    auth: undefined as AuthContext | undefined,
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
