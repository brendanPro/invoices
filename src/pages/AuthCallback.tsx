import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthCallback } from '@/hooks/useAuthCallback';

/**
 * AuthCallback Page Component
 * Follows Single Responsibility Principle - only handles UI rendering and navigation
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const { isLoading, isSuccess, error } = useAuthCallback();

  useEffect(() => {
    if (!isLoading) {
      if (isSuccess) {
        navigate({ to: '/dashboard' });
      } else {
        navigate({ to: '/login' });
      }
    }
  }, [isLoading, isSuccess, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {isLoading && (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Completing authentication...</p>
          </>
        )}
        
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
