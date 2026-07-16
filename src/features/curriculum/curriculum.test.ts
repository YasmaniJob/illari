import { describe, expect, it } from 'vitest';
import {
  getAreas,
  getCapacidades,
  getCompetencias,
  getCriterios,
  getEdades,
  parseCurriculumCsv,
  uniqueSorted,
} from '@/features/curriculum/curriculum';

const SAMPLE_CSV = `ciclo,edad,area,competencia,capacidad,criterio
ciclo-II,3 años,Comunicación,Se comunica oralmente,Adapta su discurso,Identifica el propósito
ciclo-II,5 años,Matemática,Resuelve problemas de cantidad,Traduce cantidades,Modela con operaciones
ciclo-II,4 años,Comunicación,Escribe diversos textos,Organiza ideas,Utiliza conectores
ciclo-I,2 años,Personal Social,Construye su identidad,Se valora a sí mismo,Reconoce su nombre y características`;

describe('parseCurriculumCsv', () => {
  it('parses valid CSV into rows', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(rows).toHaveLength(4);
    expect(rows[0].area).toBe('Comunicación');
    expect(rows[0].ciclo).toBe('ciclo-II');
    expect(rows[0].edad).toBe('3 años');
    expect(rows[3].criterio).toBe('Reconoce su nombre y características');
  });

  it('skips empty lines', () => {
    const rows = parseCurriculumCsv(`${SAMPLE_CSV}\n\n\n`);
    expect(rows).toHaveLength(4);
  });

  it('returns empty array for empty input', () => {
    expect(parseCurriculumCsv('')).toHaveLength(0);
    expect(parseCurriculumCsv('header1,header2\n')).toHaveLength(0);
  });
  it('parses quoted fields containing commas (RFC 4180)', () => {
    const csv = `ciclo,edad,area,competencia,capacidad,criterio
ciclo-I,3 años,Matemática,"Resuelve problemas de forma, movimiento y localización",Modela objetos con formas geométricas,Describe relaciones espaciales`;
    const rows = parseCurriculumCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].competencia).toBe('Resuelve problemas de forma, movimiento y localización');
    expect(rows[0].capacidad).toBe('Modela objetos con formas geométricas');
    expect(rows[0].criterio).toBe('Describe relaciones espaciales');
  });
});

describe('uniqueSorted', () => {
  it('deduplicates and sorts in Spanish locale', () => {
    expect(uniqueSorted(['b', 'a', 'b', 'Ábaco', 'c'])).toStrictEqual(['a', 'Ábaco', 'b', 'c']);
  });
});

describe('getEdades', () => {
  it('returns edades in curricular order', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(getEdades(rows)).toStrictEqual(['2 años', '3 años', '4 años', '5 años']);
  });
});

describe('getAreas', () => {
  it('returns unique areas sorted without filter', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(getAreas(rows)).toStrictEqual(['Comunicación', 'Matemática', 'Personal Social']);
  });

  it('filters areas by edad', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(getAreas(rows, '3 años')).toStrictEqual(['Comunicación']);
  });
});

describe('getCompetencias', () => {
  it('returns competencias filtered by area', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(getCompetencias(rows, 'Comunicación')).toStrictEqual(['Escribe diversos textos', 'Se comunica oralmente']);
  });

  it('filters competencias by area and edad', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(getCompetencias(rows, 'Comunicación', '3 años')).toStrictEqual(['Se comunica oralmente']);
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

  it('filters by edad when provided', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(getCapacidades(rows, 'Comunicación', 'Se comunica oralmente', '3 años')).toStrictEqual([
      'Adapta su discurso',
    ]);
    expect(getCapacidades(rows, 'Comunicación', 'Se comunica oralmente', '5 años')).toStrictEqual([]);
  });
});

describe('getCriterios', () => {
  it('returns criterios filtered by full path', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(getCriterios(rows, 'Matemática', 'Resuelve problemas de cantidad', 'Traduce cantidades')).toStrictEqual([
      'Modela con operaciones',
    ]);
  });

  it('filters criterios by edad', () => {
    const rows = parseCurriculumCsv(SAMPLE_CSV);
    expect(
      getCriterios(rows, 'Matemática', 'Resuelve problemas de cantidad', 'Traduce cantidades', '5 años'),
    ).toStrictEqual(['Modela con operaciones']);
    expect(
      getCriterios(rows, 'Matemática', 'Resuelve problemas de cantidad', 'Traduce cantidades', '3 años'),
    ).toStrictEqual([]);
  });
});
