export const GRADOS = ['3 años', '4 años', '5 años'] as const;
export const SECCIONES = ['A', 'B', 'C', 'Única'] as const;

export type Grado = (typeof GRADOS)[number];
export type Seccion = (typeof SECCIONES)[number];
