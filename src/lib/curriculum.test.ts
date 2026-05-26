import { describe, expect, it } from 'vitest';
import {
  getAreas,
  getCapacidades,
  getCompetencias,
  getCriterios,
  parseCurriculumCsv,
  uniqueSorted,
} from './curriculum';

const SAMPLE_CSV = `area,competencia,capacidad,criterio
Comunicación,Se comunica oralmente,Adapta su discurso,Identifica el propósito
Matemática,Resuelve problemas de cantidad,Traduce cantidades,Modela con operaciones
Comunicación,Escribe diversos textos,Organiza ideas,Utiliza conectores`;

describe('parseCurriculumCsv', () => {
  it('parses valid CSV into rows', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(rows).toHaveLength(3);
    expect(rows[0].area).toBe('Comunicación');
    expect(rows[2].criterio).toBe('Utiliza conectores');
  });

  it('skips empty lines', () => {
    const rows = parseCurriculumCsv(`${SAMPLE_CSV}\n\n\n`);
    expect(rows).toHaveLength(3);
  });

  it('returns empty array for empty input', () => {
    expect(parseCurriculumCsv('')).toHaveLength(0);
    expect(parseCurriculumCsv('header1,header2\n')).toHaveLength(0);
  });
});

describe('uniqueSorted', () => {
  it('deduplicates and sorts in Spanish locale', () => {
    expect(uniqueSorted(['b', 'a', 'b', 'Ábaco', 'c'])).toStrictEqual(['a', 'Ábaco', 'b', 'c']);
  });
});

describe('getAreas', () => {
  it('returns unique areas sorted', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(getAreas(rows)).toStrictEqual(['Comunicación', 'Matemática']);
  });
});

describe('getCompetencias', () => {
  it('returns competencias filtered by area', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(getCompetencias(rows, 'Comunicación')).toStrictEqual(['Escribe diversos textos', 'Se comunica oralmente']);
  });

  it('returns empty for unknown area', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(getCompetencias(rows, 'Inexistente')).toStrictEqual([]);
  });
});

describe('getCapacidades', () => {
  it('returns capacidades filtered by area + competencia', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(getCapacidades(rows, 'Comunicación', 'Se comunica oralmente')).toStrictEqual(['Adapta su discurso']);
  });
});

describe('getCriterios', () => {
  it('returns criterios filtered by full path', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(getCriterios(rows, 'Matemática', 'Resuelve problemas de cantidad', 'Traduce cantidades')).toStrictEqual([
      'Modela con operaciones',
    ]);
  });
});
