import type { CurriculumRow } from '../curriculum';
import { uniqueSorted } from '../curriculum';

/** Resumen del catálogo para el prompt de visión (sin enviar CSV completo) */
export function buildCatalogPromptAppendix(curriculum: CurriculumRow[]): string {
  const areas = uniqueSorted(curriculum.map((r) => r.area));

  // Prefer Ciclo II rows for the sample (more common in jardín)
  const cicloII = curriculum.filter((r) => r.ciclo === 'ciclo-II');
  const sample = (cicloII.length > 0 ? cicloII : curriculum)
    .slice(0, 8)
    .map(
      (r) =>
        `- [${r.edad}] ${r.area} | ${r.competencia.slice(0, 60)}… | ${r.capacidad.slice(0, 50)}… | ${r.criterio.slice(0, 50)}…`,
    );

  return `
Áreas válidas: ${areas.join(', ')}.
Ejemplos del catálogo CNEB (usa redacción cercana si aparece en la imagen):
${sample.join('\n')}
El campo "criterio" corresponde al desempeño o indicador de evaluación.
Los grados/edades válidos son: 1 año, 2 años (Ciclo I) y 3 años, 4 años, 5 años (Ciclo II).`;
}

export function validateCurricularRow(
  area: string,
  competencia: string,
  capacidad: string,
  criterio: string,
  curriculum: CurriculumRow[],
): boolean {
  return curriculum.some(
    (r) => r.area === area && r.competencia === competencia && r.capacidad === capacidad && r.criterio === criterio,
  );
}
