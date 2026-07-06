import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { qk } from './queryKeys';

export function useArchetypes() {
  return useQuery({
    queryKey: qk.archetypes,
    queryFn: ({ signal }) => api.getArchetypes(signal),
    staleTime: 10 * 60 * 1000,
  });
}
