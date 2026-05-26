export interface CurriculumRow {
  area: string;
  competencia: string;
  capacidad: string;
  criterio: string;
}

export function parseCurriculumCsv(raw: string): CurriculumRow[] {
  const lines = raw.trim().split(/\r?\n/);
  const [header, ...rows] = lines;
  const cols = header.split(',').map((c) => c.trim());

  return rows
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = line.split(',').map((v) => v.trim());
      const row: Record<string, string> = {};
      cols.forEach((col, i) => {
        row[col] = values[i] ?? '';
      });
      return row as unknown as CurriculumRow;
    });
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'es'));
}

export function getAreas(data: CurriculumRow[]): string[] {
  return uniqueSorted(data.map((r) => r.area));
}

export function getCompetencias(data: CurriculumRow[], area: string): string[] {
  return uniqueSorted(data.filter((r) => r.area === area).map((r) => r.competencia));
}

export function getCapacidades(data: CurriculumRow[], area: string, competencia: string): string[] {
  return uniqueSorted(data.filter((r) => r.area === area && r.competencia === competencia).map((r) => r.capacidad));
}

export function getCriterios(data: CurriculumRow[], area: string, competencia: string, capacidad: string): string[] {
  return uniqueSorted(
    data
      .filter((r) => r.area === area && r.competencia === competencia && r.capacidad === capacidad)
      .map((r) => r.criterio),
  );
}

export interface SessionConfig {
  id: string;
  titulo?: string;
  grado?: string;
  seccion?: string;
  area: string;
  competencia: string;
  capacidad: string;
  criterio: string;
  createdAt: string;
  status: 'active' | 'completed';
}

/** Sesiones: usar `src/lib/api/client.ts` (Turso vía API). Sin localStorage. */
