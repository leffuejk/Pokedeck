import type {
  ApiError as ApiErrorBody,
  ArchetypeDTO,
  CardDTO,
  CardDetailDTO,
  CoachMessageBody,
  CollectionItemDTO,
  CreateDeckBody,
  DeckAnalysisDTO,
  DeckDetailDTO,
  DeckDTO,
  Paginated,
  UpdateDeckCardBody,
  UpsertCollectionItemBody,
} from '@pokedeck/shared';

/** The signed-in user shape returned by GET /api/me. */
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

/** Thrown for any non-2xx API response. Carries the parsed error envelope when present. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, body: Partial<ApiErrorBody> | null, fallback: string) {
    super(body?.message ?? fallback);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error ?? 'unknown';
    this.details = body?.details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

const BASE = '/api';

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  query?: Record<string, string | number | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(BASE + path, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.pathname + url.search;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, query } = opts;
  const res = await fetch(buildUrl(path, query), {
    method,
    credentials: 'include',
    signal,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let parsed: Partial<ApiErrorBody> | null = null;
    try {
      parsed = (await res.json()) as Partial<ApiErrorBody>;
    } catch {
      parsed = null;
    }
    throw new ApiError(res.status, parsed, `Request failed: ${res.status} ${res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Typed API surface. Every method maps 1:1 to a documented route. */
export const api = {
  me: (signal?: AbortSignal) => request<{ user: User }>('/me', { signal }),

  cards: (
    params: { query?: string; type?: string; supertype?: string; page?: number },
    signal?: AbortSignal,
  ) => request<Paginated<CardDTO>>('/cards', { query: params, signal }),

  getCard: (id: string, signal?: AbortSignal) =>
    request<CardDetailDTO>(`/cards/${encodeURIComponent(id)}`, { signal }),

  getCollection: (signal?: AbortSignal) =>
    request<CollectionItemDTO[]>('/collection', { signal }),
  upsertCollection: (body: UpsertCollectionItemBody) =>
    request<CollectionItemDTO>('/collection', { method: 'PUT', body }),
  removeCollection: (cardId: string) =>
    request<void>(`/collection/${encodeURIComponent(cardId)}`, { method: 'DELETE' }),

  getDecks: (signal?: AbortSignal) => request<DeckDTO[]>('/decks', { signal }),
  createDeck: (body: CreateDeckBody) => request<DeckDetailDTO>('/decks', { method: 'POST', body }),
  getDeck: (id: string, signal?: AbortSignal) =>
    request<DeckDetailDTO>(`/decks/${encodeURIComponent(id)}`, { signal }),
  updateDeckCard: (id: string, body: UpdateDeckCardBody) =>
    request<DeckDetailDTO>(`/decks/${encodeURIComponent(id)}/cards`, { method: 'PUT', body }),
  deleteDeck: (id: string) =>
    request<void>(`/decks/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  analyzeDeck: (id: string) =>
    request<DeckAnalysisDTO>(`/decks/${encodeURIComponent(id)}/analyze`, { method: 'POST' }),
  getAnalyses: (id: string, signal?: AbortSignal) =>
    request<DeckAnalysisDTO[]>(`/decks/${encodeURIComponent(id)}/analyses`, { signal }),

  getArchetypes: (signal?: AbortSignal) => request<ArchetypeDTO[]>('/archetypes', { signal }),

  coach: (body: CoachMessageBody) =>
    request<{ threadId: string; reply: string }>('/coach', { method: 'POST', body }),
};
