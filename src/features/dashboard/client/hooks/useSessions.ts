import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSession, fetchActiveSession, fetchSessions, patchSession } from '@/shared/client/api-client';

export function useActiveSessions() {
  return useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: async () => {
      const res = await fetchSessions({ status: 'active' });
      return res.sessions;
    },
  });
}

export function useActiveSession() {
  return useQuery({
    queryKey: ['session', 'active'],
    queryFn: () => fetchActiveSession(),
  });
}

export function useCompletedSessions(limit = 10) {
  return useInfiniteQuery({
    queryKey: ['sessions', 'completed'],
    queryFn: async ({ pageParam = 0 }) => {
      return fetchSessions({ status: 'completed', limit, offset: pageParam });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const currentOffset = allPages.flatMap((page) => page.sessions).length;
      return currentOffset < lastPage.total ? currentOffset : undefined;
    },
  });
}

export function useCreateSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });
}

interface PatchSessionParams {
  sessionId: string;
  updates: Parameters<typeof patchSession>[1];
}

export function usePatchSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, updates }: PatchSessionParams) => patchSession(sessionId, updates),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
      void queryClient.invalidateQueries({ queryKey: ['session'] });
      void queryClient.invalidateQueries({ queryKey: ['students', data.grado, data.seccion] });
    },
  });
}
