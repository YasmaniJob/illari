export interface CurriculumRow {
  ciclo: string;
  edad: string;
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
      // Split only on the first N-1 commas (last field may contain commas)
      const parts = line.split(',');
      const row: Record<string, string> = {};
      cols.forEach((col, i) => {
        // Join remaining parts into the last column
        row[col] = (i === cols.length - 1 ? parts.slice(i).join(',') : (parts[i] ?? '')).trim();
      });
      return row as unknown as CurriculumRow;
    });
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'es'));
}

export function getAreas(data: CurriculumRow[], edad?: string): string[] {
  const filtered = edad ? data.filter((r) => r.edad === edad) : data;
  return uniqueSorted(filtered.map((r) => r.area));
}

export function getCompetencias(data: CurriculumRow[], area: string, edad?: string): string[] {
  const filtered = data.filter((r) => r.area === area && (!edad || r.edad === edad));
  return uniqueSorted(filtered.map((r) => r.competencia));
}

export function getCapacidades(data: CurriculumRow[], area: string, competencia: string, edad?: string): string[] {
  const filtered = data.filter((r) => r.area === area && r.competencia === competencia && (!edad || r.edad === edad));
  return uniqueSorted(filtered.map((r) => r.capacidad));
}

export function getCriterios(
  data: CurriculumRow[],
  area: string,
  competencia: string,
  capacidad: string,
  edad?: string,
): string[] {
  const filtered = data.filter(
    (r) => r.area === area && r.competencia === competencia && r.capacidad === capacidad && (!edad || r.edad === edad),
  );
  return uniqueSorted(filtered.map((r) => r.criterio));
}

/** Edades disponibles en el dataset, en orden curricular */
const EDAD_ORDER = ['1 año', '2 años', '3 años', '4 años', '5 años'];

export function getEdades(data: CurriculumRow[]): string[] {
  const present = new Set(data.map((r) => r.edad));
  return EDAD_ORDER.filter((e) => present.has(e));
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
  evidencia?: string;
  createdAt: string;
  status: 'active' | 'completed';
}

/** Sesiones: usar `src/lib/api/client.ts` (Turso vía API). Sin localStorage. */
