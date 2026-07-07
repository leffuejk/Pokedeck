/** Centralised TanStack Query keys so invalidation stays consistent. */
export const qk = {
  me: ['me'] as const,
  cards: (params: Record<string, unknown>) => ['cards', params] as const,
  card: (id: string) => ['card', id] as const,
  collection: ['collection'] as const,
  decks: ['decks'] as const,
  deck: (id: string) => ['deck', id] as const,
  analyses: (id: string) => ['analyses', id] as const,
  archetypes: ['archetypes'] as const,
};
