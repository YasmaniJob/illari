export interface CurriculumRow {
  ciclo: string;
  edad: string;
  area: string;
  competencia: string;
  capacidad: string;
  criterio: string;
}

/**
 * Parsea una línea CSV respetando el estándar RFC 4180:
 * los campos pueden estar entre comillas dobles y contener comas internas.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      // Campo entrecomillado
      let field = '';
      i++; // saltar la comilla de apertura
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            // Comilla escapada
            field += '"';
            i += 2;
          } else {
            // Comilla de cierre
            i++;
            break;
          }
        } else {
          field += line[i++];
        }
      }
      fields.push(field.trim());
      // Saltar la coma separadora
      if (line[i] === ',') i++;
    } else {
      // Campo sin comillas: leer hasta la siguiente coma
      const end = line.indexOf(',', i);
      if (end === -1) {
        fields.push(line.slice(i).trim());
        break;
      }
      fields.push(line.slice(i, end).trim());
      i = end + 1;
    }
  }
  return fields;
}

export function parseCurriculumCsv(raw: string): CurriculumRow[] {
  const lines = raw.trim().split(/\r?\n/);
  const [header, ...rows] = lines;
  const cols = parseCsvLine(header);

  return rows
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const parts = parseCsvLine(line);
      const row: Record<string, string> = {};
      cols.forEach((col, i) => {
        row[col] = (parts[i] ?? '').trim();
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

/**
 * Obtiene las capacidades asociadas a una competencia y área.
 *
 * @warning EVITAR filtrar por 'edad' en interfaces de planificación de sesiones.
 * Las capacidades son estructurales y fijas para cada competencia en toda la Educación Inicial.
 * Filtrar por edad limita al docente, ocultando capacidades oficiales solo porque no tienen
 * desempeños asignados para esa edad en el CSV.
 */
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
