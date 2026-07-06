import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DeckDetailDTO, UpdateDeckCardBody } from '@pokedeck/shared';
import { api } from '../lib/api';
import { qk } from './queryKeys';

export function useDeck(id: string | undefined) {
  return useQuery({
    queryKey: qk.deck(id ?? ''),
    queryFn: ({ signal }) => api.getDeck(id as string, signal),
    enabled: Boolean(id),
  });
}

export function useUpdateDeckCard(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateDeckCardBody) => api.updateDeckCard(deckId, body),
    onSuccess: (deck: DeckDetailDTO) => {
      qc.setQueryData(qk.deck(deckId), deck);
      void qc.invalidateQueries({ queryKey: qk.decks });
    },
  });
}
