import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CollectionItemDTO, UpsertCollectionItemBody } from '@pokedeck/shared';
import { api } from '../lib/api';
import { qk } from './queryKeys';

export function useCollection() {
  return useQuery({
    queryKey: qk.collection,
    queryFn: ({ signal }) => api.getCollection(signal),
    staleTime: 30 * 1000,
  });
}

/** Convenience: a Map of cardId -> owned quantity for O(1) lookups. */
export function useOwnedMap() {
  const { data } = useCollection();
  const map = new Map<string, number>();
  for (const item of data ?? []) map.set(item.cardId, item.quantity);
  return map;
}

export function useUpsertCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertCollectionItemBody) => api.upsertCollection(body),
    onSuccess: (item) => {
      qc.setQueryData<CollectionItemDTO[]>(qk.collection, (prev) => {
        const list = prev ? [...prev] : [];
        const idx = list.findIndex((i) => i.cardId === item.cardId);
        if (idx >= 0) list[idx] = item;
        else list.push(item);
        return list;
      });
      void qc.invalidateQueries({ queryKey: qk.collection });
    },
  });
}

export function useRemoveCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => api.removeCollection(cardId),
    onSuccess: (_res, cardId) => {
      qc.setQueryData<CollectionItemDTO[]>(qk.collection, (prev) =>
        (prev ?? []).filter((i) => i.cardId !== cardId),
      );
      void qc.invalidateQueries({ queryKey: qk.collection });
    },
  });
}
