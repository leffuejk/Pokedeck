import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../lib/api';
import { qk } from './queryKeys';

/**
 * Fetches the current user. A 401 is a normal "signed-out" state, not an error to retry,
 * so it resolves to `null` rather than throwing.
 */
export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: async ({ signal }) => {
      try {
        const { user } = await api.me(signal);
        return user;
      } catch (err) {
        if (err instanceof ApiError && err.isUnauthorized) return null;
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
