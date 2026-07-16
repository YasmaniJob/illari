import { useMemo } from 'react';
import type { CurriculumRow } from '@/features/curriculum/curriculum';
import { getAreas, getCapacidades, getCompetencias, getCriterios } from '@/features/curriculum/curriculum';
import CustomSelect from '@/shared/client/ui/CustomSelect';

export interface CurricularValues {
  area: string;
  competencia: string;
  capacidad: string;
  criterio: string;
}

interface CurricularFieldsEditorProps {
  curriculum: CurriculumRow[];
  values: CurricularValues;
  onChange: (values: CurricularValues) => void;
}

export default function CurricularFieldsEditor({ curriculum, values, onChange }: CurricularFieldsEditorProps) {
  const areas = useMemo(() => getAreas(curriculum), [curriculum]);
  const competencias = useMemo(
    () => (values.area ? getCompetencias(curriculum, values.area) : []),
    [curriculum, values.area],
  );
  const capacidades = useMemo(
    () => (values.area && values.competencia ? getCapacidades(curriculum, values.area, values.competencia) : []),
    [curriculum, values.area, values.competencia],
  );
  const criterios = useMemo(
    () =>
      values.area && values.competencia && values.capacidad
        ? getCriterios(curriculum, values.area, values.competencia, values.capacidad)
        : [],
    [curriculum, values.area, values.competencia, values.capacidad],
  );

  function patch(partial: Partial<CurricularValues>) {
    onChange({ ...values, ...partial });
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-lilac-100 bg-lilac-100/30 p-4">
      <p className="text-base font-extrabold text-warm-900">
        Currículo CNEB <span className="font-semibold text-warm-600">(editable)</span>
      </p>
      <CustomSelect
        label="Área"
        value={values.area}
        options={areas}
        onChange={(area) => patch({ area, competencia: '', capacidad: '', criterio: '' })}
      />
      <CustomSelect
        label="Competencia"
        value={values.competencia}
        options={competencias}
        disabled={!values.area}
        onChange={(competencia) => patch({ competencia, capacidad: '', criterio: '' })}
      />
      <CustomSelect
        label="Capacidad"
        value={values.capacidad}
        options={capacidades}
        disabled={!values.competencia}
        onChange={(capacidad) => patch({ capacidad, criterio: '' })}
      />
      <CustomSelect
        label="Criterio / desempeño"
        value={values.criterio}
        options={criterios}
        disabled={!values.capacidad}
        onChange={(criterio) => patch({ criterio })}
      />
    </div>
  );
}
