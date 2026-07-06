import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DeckAnalysisDTO } from '@pokedeck/shared';
import { api } from '../lib/api';
import { qk } from './queryKeys';

export function useAnalyses(deckId: string | undefined) {
  return useQuery({
    queryKey: qk.analyses(deckId ?? ''),
    queryFn: ({ signal }) => api.getAnalyses(deckId as string, signal),
    enabled: Boolean(deckId),
  });
}

/** The freshest analysis for a deck, if any. */
export function useLatestAnalysis(deckId: string | undefined) {
  const query = useAnalyses(deckId);
  const latest: DeckAnalysisDTO | undefined = query.data?.[0];
  return { ...query, latest };
}

export function useAnalyzeDeck(deckId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.analyzeDeck(deckId),
    onSuccess: (analysis) => {
      qc.setQueryData<DeckAnalysisDTO[]>(qk.analyses(deckId), (prev) => [
        analysis,
        ...(prev ?? []),
      ]);
      void qc.invalidateQueries({ queryKey: qk.analyses(deckId) });
    },
  });
}
