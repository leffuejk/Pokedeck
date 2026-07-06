import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateDeckBody } from '@pokedeck/shared';
import { api } from '../lib/api';
import { qk } from './queryKeys';

export function useDecks() {
  return useQuery({
    queryKey: qk.decks,
    queryFn: ({ signal }) => api.getDecks(signal),
    staleTime: 30 * 1000,
  });
}

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDeckBody) => api.createDeck(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.decks });
    },
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDeck(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.decks });
    },
  });
}
