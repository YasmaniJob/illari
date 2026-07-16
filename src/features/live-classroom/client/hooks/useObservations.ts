import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchObservations, patchObservation, postEvidence } from '@/shared/client/api-client';

export function useObservationsList(sessionId?: string | null) {
  return useQuery({
    queryKey: ['observations', sessionId],
    queryFn: () => fetchObservations(sessionId!),
    enabled: Boolean(sessionId),
  });
}

export function useAddObservationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postEvidence,
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['observations', variables.sessionId],
      });
    },
  });
}

export function usePatchAIFieldMutation(sessionId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: 'contexto' | 'accion' | 'interpretacion' | 'retroalimentacion' | 'intervencion' | 'interpretacionSugerida';
      value: string;
    }) => {
      if (field === 'retroalimentacion') {
        return patchObservation(id, 'retroalimentacion', value);
      }

      // Get observations from query cache to construct updated evidence payload
      const cached = queryClient.getQueryData<any[]>(['observations', sessionId]) || [];
      const obs = cached.find((m) => m.id === id);
      if (obs && obs.cai) {
        const updatedCai = { ...obs.cai, [field]: value };
        const { retroalimentacion: _r, ...rest } = updatedCai;
        return patchObservation(id, 'evidencia', JSON.stringify(rest));
      }
      return patchObservation(id, 'evidencia', JSON.stringify({ [field]: value }));
    },
    onMutate: async ({ id, field, value }) => {
      if (!sessionId) return;
      await queryClient.cancelQueries({ queryKey: ['observations', sessionId] });
      const previousObservations = queryClient.getQueryData(['observations', sessionId]);

      queryClient.setQueryData(['observations', sessionId], (old: any[] | undefined) => {
        if (!old) return [];
        return old.map((m) => {
          if (m.type !== 'ai' || m.id !== id) return m;
          return {
            ...m,
            cai: {
              ...m.cai,
              [field]: value,
            },
          };
        });
      });

      return { previousObservations };
    },
    onError: (_err, _variables, context) => {
      if (sessionId && context?.previousObservations) {
        queryClient.setQueryData(['observations', sessionId], context.previousObservations);
      }
    },
    onSettled: () => {
      if (sessionId) {
        void queryClient.invalidateQueries({ queryKey: ['observations', sessionId] });
      }
    },
  });
}
