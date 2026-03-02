import { useState, useCallback, useRef } from 'react';
import { ApiError, isApiError } from '../services/api';
import * as authService from '../services/authService';

type Status = 'idle' | 'loading' | 'success' | 'error';

/**
 * Generic hook that wraps an async API call with loading / error /
 * success state tracking, automatic 401 retry, and AbortController
 * cancellation on unmount or re-invocation.
 *
 * Usage:
 *   const { execute, isLoading, error } = useApiCall(chatService.sendQuery);
 *   const result = await execute('How to get a loan?');
 */
export function useApiCall<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<ApiError | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      // Abort any in-flight request
      controllerRef.current?.abort();
      controllerRef.current = new AbortController();

      setStatus('loading');
      setError(null);

      try {
        const result = await fn(...args);
        setStatus('success');
        return result;
      } catch (err) {
        // Auto-refresh session on 401 and retry once
        if (isApiError(err) && err.status === 401) {
          try {
            await authService.initSession();
            const result = await fn(...args);
            setStatus('success');
            return result;
          } catch {
            // fall through to error handling
          }
        }

        const apiErr: ApiError = isApiError(err)
          ? err
          : { status: 0, code: 'UNKNOWN', message: String(err) };

        setStatus('error');
        setError(apiErr);
        return null;
      }
    },
    [fn],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setStatus('idle');
  }, []);

  return {
    execute,
    status,
    error,
    reset,
    cancel,
    isLoading: status === 'loading',
    isError: status === 'error',
    isSuccess: status === 'success',
  };
}
