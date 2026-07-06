import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { qk } from './queryKeys';

export interface CardFilters {
  query?: string;
  type?: string;
  supertype?: string;
  page?: number;
}

export function useCards(filters: CardFilters) {
  const params = {
    query: filters.query || undefined,
    type: filters.type || undefined,
    supertype: filters.supertype || undefined,
    page: filters.page ?? 1,
  };
  return useQuery({
    queryKey: qk.cards(params),
    queryFn: ({ signal }) => api.cards(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}
