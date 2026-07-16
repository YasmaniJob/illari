import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionConfig } from '@/features/curriculum/curriculum';
import type { ChatMessage } from '@/features/live-classroom/client/components/ChatFeed';
import type { StudentDto } from '@/shared/client/api-client';
import {
  fetchActiveSession,
  fetchObservations,
  fetchStudents,
  isLoggedIn,
  patchObservation,
  postEvidence,
} from '@/shared/client/api-client';

export interface AulaData {
  session: SessionConfig | null;
  messages: ChatMessage[];
  students: StudentDto[];
  loggedIn: boolean;
}

export function useAulaInit() {
  return useQuery<AulaData>({
    queryKey: ['aula', 'init'],
    queryFn: async () => {
      const logged = await isLoggedIn();
      if (logged) {
        const res = await fetch('/api/aula/init', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al iniciar aula');
        return {
          session: data.session as SessionConfig | null,
          messages: data.messages as ChatMessage[],
          students: data.students as StudentDto[],
          loggedIn: true,
        };
      }

      const session = await fetchActiveSession();
      if (!session) {
        return { session: null, messages: [], students: [], loggedIn: false };
      }
      const [messages, students] = await Promise.all([
        fetchObservations(session.id),
        session.grado && session.seccion ? fetchStudents(session.grado, session.seccion) : Promise.resolve([]),
      ]);
      return {
        session,
        messages,
        students,
        loggedIn: false,
      };
    },
  });
}

export function useAulaAddObservationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postEvidence,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['aula', 'init'] });
    },
  });
}

interface PatchAIFieldParams {
  id: string;
  field: 'contexto' | 'accion' | 'interpretacion' | 'retroalimentacion' | 'intervencion' | 'interpretacionSugerida';
  value: string;
}

export function useAulaPatchAIFieldMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, field, value }: PatchAIFieldParams) => {
      if (field === 'retroalimentacion') {
        return patchObservation(id, 'retroalimentacion', value);
      }

      const cached = queryClient.getQueryData<AulaData>(['aula', 'init']);
      const obs = cached?.messages?.find((m) => m.id === id);
      if (obs && obs.type === 'ai' && obs.cai) {
        const updatedCai = { ...obs.cai, [field]: value };
        const { retroalimentacion: _r, ...rest } = updatedCai;
        return patchObservation(id, 'evidencia', JSON.stringify(rest));
      }
      return patchObservation(id, 'evidencia', JSON.stringify({ [field]: value }));
    },
    onMutate: async ({ id, field, value }) => {
      await queryClient.cancelQueries({ queryKey: ['aula', 'init'] });
      const previousData = queryClient.getQueryData<AulaData>(['aula', 'init']);

      queryClient.setQueryData<AulaData>(['aula', 'init'], (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: old.messages.map((m) => {
            if (m.type !== 'ai' || m.id !== id) return m;
            return {
              ...m,
              cai: {
                ...m.cai,
                [field]: value,
              },
            };
          }),
        };
      });

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['aula', 'init'], context.previousData);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['aula', 'init'] });
    },
  });
}
