import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { qk } from './queryKeys';

export function useCardDetail(cardId: string | null) {
  return useQuery({
    queryKey: qk.card(cardId ?? ''),
    queryFn: ({ signal }) => api.getCard(cardId!, signal),
    enabled: cardId !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
