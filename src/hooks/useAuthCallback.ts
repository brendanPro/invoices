import { useEffect, useState } from 'react';
import { handleAuthCallback } from '@/lib/auth';

export interface AuthCallbackResult {
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}

/**
 * Hook to handle OAuth callback processing
 * Follows Single Responsibility Principle - only handles callback logic
 */
export function useAuthCallback(): AuthCallbackResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = () => {
      try {
        setIsLoading(true);
        setError(null);

        const success = handleAuthCallback();

        if (success) {
          setIsSuccess(true);
        } else {
          // Check URL params for error details
          const urlParams = new URLSearchParams(window.location.search);
          const errorParam = urlParams.get('error');
          
          if (errorParam === 'unauthorized_email') {
            setError('Your email address is not authorized to access this application');
          } else {
            setError('Authentication failed. Please try again.');
          }
          setIsSuccess(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setIsSuccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    processCallback();
  }, []);

  return {
    isLoading,
    isSuccess,
    error,
  };
}
