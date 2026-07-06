import { useMutation } from '@tanstack/react-query';
import type { CoachMessageBody } from '@pokedeck/shared';
import { api } from '../lib/api';

export function useCoach() {
  return useMutation({
    mutationFn: (body: CoachMessageBody) => api.coach(body),
  });
}
