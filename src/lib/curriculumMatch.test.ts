import { describe, expect, it } from 'vitest';
import { bestMatch, matchScanToCurriculum, similarityScore } from './curriculumMatch';

describe('similarityScore', () => {
  it('returns 1 for exact match', () => {
    expect(similarityScore('Comunicación', 'Comunicación')).toBe(1);
  });

  it('returns high score for substring inclusion', () => {
    expect(similarityScore('Se comunica oralmente', 'comunica')).toBe(0.92);
  });

  it('returns 0 for empty strings', () => {
    expect(similarityScore('', 'test')).toBe(0);
    expect(similarityScore('test', '')).toBe(0);
  });

  it('handles accented characters via NFD normalization', () => {
    expect(similarityScore('Comunicación', 'Comunicacion')).toBeGreaterThanOrEqual(0.9);
  });

  it('scores partial token overlap proportionally', () => {
    const score = similarityScore('Resuelve problemas de cantidad', 'Resuelve problemas');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe('bestMatch', () => {
  const candidates = ['Comunicación', 'Matemática', 'Ciencia y Tecnología'];

  it('returns null for undefined query', () => {
    expect(bestMatch(undefined, candidates)).toBeNull();
  });

  it('returns null for empty query', () => {
    expect(bestMatch('', candidates)).toBeNull();
  });

  it('finds exact match with confidence 1', () => {
    const result = bestMatch('Matemática', candidates);
    expect(result?.value).toBe('Matemática');
    expect(result?.confidence).toBe(1);
    expect(result?.source).toBe('catalog');
  });

  it('finds fuzzy match with lower confidence', () => {
    const result = bestMatch('Mate', candidates);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0.35);
  });

  it('returns null when below minScore', () => {
    const result = bestMatch('xyzxyz', candidates, 0.5);
    expect(result).toBeNull();
  });
});

describe('matchScanToCurriculum', () => {
  const curriculum = [
    {
      ciclo: 'ciclo-II',
      edad: '3 años',
      area: 'Comunicación',
      competencia: 'Se comunica oralmente',
      capacidad: 'Adapta su discurso',
      criterio: 'Identifica el propósito',
    },
    {
      ciclo: 'ciclo-II',
      edad: '4 años',
      area: 'Matemática',
      competencia: 'Resuelve problemas de cantidad',
      capacidad: 'Traduce cantidades',
      criterio: 'Modela con operaciones',
    },
  ];

  const grados = ['9 meses', '18 meses', '24 meses', '36 meses', '3 años', '4 años', '5 años'];
  const secciones = ['A', 'B', 'C', 'Única'];

  it('matches all fields when extracted data aligns', () => {
    const result = matchScanToCurriculum(
      {
        area: 'Comunicación',
        competencia: 'Se comunica oralmente',
        capacidad: 'Adapta su discurso',
        criterio: 'Identifica el propósito',
      },
      curriculum,
      grados,
      secciones,
    );
    expect(result.area.value).toBe('Comunicación');
    expect(result.area.confidence).toBe(1);
    expect(result.row).not.toBeNull();
  });

  it('returns empty fields for empty extraction', () => {
    const result = matchScanToCurriculum({}, curriculum, grados, secciones);
    expect(result.area.source).toBe('empty');
    expect(result.competencia.source).toBe('empty');
    expect(result.row).toBeNull();
  });

  it('preserves extracted titulo', () => {
    const result = matchScanToCurriculum({ titulo: 'Mi sesión de prueba' }, curriculum, grados, secciones);
    expect(result.titulo.value).toBe('Mi sesión de prueba');
    expect(result.titulo.confidence).toBe(0.85);
  });

  it('matches grado and seccion', () => {
    const result = matchScanToCurriculum({ grado: '4 años', seccion: 'B' }, curriculum, grados, secciones);
    expect(result.grado.value).toBe('4 años');
    expect(result.seccion.value).toBe('B');
  });
});
