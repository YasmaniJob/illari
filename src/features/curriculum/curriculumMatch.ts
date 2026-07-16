import type { CurriculumRow } from '@/features/curriculum/curriculum';

export interface ExtractedScanFields {
  titulo?: string;
  grado?: string;
  seccion?: string;
  area?: string;
  competencia?: string;
  capacidad?: string;
  criterio?: string;
}

export interface MatchedField<T = string> {
  value: T;
  confidence: number;
  source: 'catalog' | 'extracted' | 'empty';
}

export interface MatchedScanResult {
  titulo: MatchedField;
  grado: MatchedField;
  seccion: MatchedField;
  area: MatchedField;
  competencia: MatchedField;
  capacidad: MatchedField;
  criterio: MatchedField;
  row: CurriculumRow | null;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(' ')
      .filter((t) => t.length > 0),
  );
}

/** Similitud 0–1 por solapamiento de tokens + inclusión */
export function similarityScore(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.92;

  const ta = tokenSet(na);
  const tb = tokenSet(nb);
  if (ta.size === 0 || tb.size === 0) return 0;

  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter++;
  }
  return inter / Math.max(ta.size, tb.size);
}

export function bestMatch(query: string | undefined, candidates: string[], minScore = 0.35): MatchedField | null {
  if (!query?.trim()) return null;

  let best = { value: '', score: 0 };
  for (const c of candidates) {
    const score = similarityScore(query, c);
    if (score > best.score) best = { value: c, score };
  }

  if (best.score < minScore) return null;
  return {
    value: best.value,
    confidence: Math.round(best.score * 100) / 100,
    source: 'catalog',
  };
}

function fieldOrEmpty(matched: MatchedField | null, fallback?: string): MatchedField {
  if (matched) return matched;
  if (fallback?.trim()) {
    return {
      value: fallback.trim(),
      confidence: 0.4,
      source: 'extracted',
    };
  }
  return { value: '', confidence: 0, source: 'empty' };
}

export function matchScanToCurriculum(
  extracted: ExtractedScanFields,
  curriculum: CurriculumRow[],
  gradoOptions: string[],
  seccionOptions: string[],
): MatchedScanResult {
  const areas = [...new Set(curriculum.map((r) => r.area))];
  const allCompetencias = [...new Set(curriculum.map((r) => r.competencia))];

  const areaMatch =
    bestMatch(extracted.area, areas) ?? (extracted.competencia ? bestMatch(extracted.competencia, areas, 0.2) : null);

  const area = areaMatch?.value ?? '';
  const competenciasInArea = area
    ? curriculum.filter((r) => r.area === area).map((r) => r.competencia)
    : allCompetencias;

  const competenciaMatch = bestMatch(extracted.competencia, [...new Set(competenciasInArea)]);

  const competencia = competenciaMatch?.value ?? '';
  const capacidadesInBranch = curriculum
    .filter((r) => (!area || r.area === area) && (!competencia || r.competencia === competencia))
    .map((r) => r.capacidad);

  const capacidadMatch = bestMatch(extracted.capacidad, [...new Set(capacidadesInBranch)]);

  const capacidad = capacidadMatch?.value ?? '';
  const criteriosInBranch = curriculum
    .filter(
      (r) =>
        (!area || r.area === area) &&
        (!competencia || r.competencia === competencia) &&
        (!capacidad || r.capacidad === capacidad),
    )
    .map((r) => r.criterio);

  const criterioMatch = bestMatch(extracted.criterio, [...new Set(criteriosInBranch)]);

  const row =
    area && competencia && capacidad && criterioMatch?.value
      ? (curriculum.find(
          (r) =>
            r.area === area &&
            r.competencia === competencia &&
            r.capacidad === capacidad &&
            r.criterio === criterioMatch.value,
        ) ?? null)
      : null;

  return {
    titulo: extracted.titulo?.trim()
      ? { value: extracted.titulo.trim(), confidence: 0.85, source: 'extracted' as const }
      : { value: '', confidence: 0, source: 'empty' as const },
    grado: fieldOrEmpty(bestMatch(extracted.grado, gradoOptions, 0.5), extracted.grado),
    seccion: fieldOrEmpty(bestMatch(extracted.seccion, seccionOptions, 0.5), extracted.seccion),
    area: fieldOrEmpty(areaMatch, extracted.area),
    competencia: fieldOrEmpty(competenciaMatch, extracted.competencia),
    capacidad: fieldOrEmpty(capacidadMatch, extracted.capacidad),
    criterio: fieldOrEmpty(criterioMatch, extracted.criterio),
    row,
  };
}
