import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchStudents, saveStudents } from '@/shared/client/api-client';

export function useStudentsList(grado?: string | null, seccion?: string | null) {
  return useQuery({
    queryKey: ['students', grado, seccion],
    queryFn: () => fetchStudents(grado!, seccion!),
    enabled: Boolean(grado && seccion),
  });
}

interface SaveStudentsParams {
  grado: string;
  seccion: string;
  names: string[];
}

export function useSaveStudentsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ grado, seccion, names }: SaveStudentsParams) => saveStudents(grado, seccion, names),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['students', variables.grado, variables.seccion],
      });
    },
  });
}
