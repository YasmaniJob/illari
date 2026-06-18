/** Ciclo I — Cuna (0 a 2 años) */
export const GRADOS_CICLO_I = ['9 meses', '18 meses', '24 meses', '36 meses'] as const;

/** Ciclo II — Jardín (3 a 5 años) */
export const GRADOS_CICLO_II = ['3 años', '4 años', '5 años'] as const;

/** Todos los grados en orden de menor a mayor */
export const GRADOS = [...GRADOS_CICLO_I, ...GRADOS_CICLO_II] as const;

export const SECCIONES = ['A', 'B', 'C', 'Única'] as const;

export type GradoCicloI = (typeof GRADOS_CICLO_I)[number];
export type GradoCicloII = (typeof GRADOS_CICLO_II)[number];
export type Grado = (typeof GRADOS)[number];
export type Seccion = (typeof SECCIONES)[number];

/** Devuelve el ciclo correspondiente a un grado */
export function getCicloForGrado(grado: string): 'ciclo-I' | 'ciclo-II' {
  return (GRADOS_CICLO_I as readonly string[]).includes(grado) ? 'ciclo-I' : 'ciclo-II';
}
