/**
 * Utilidades comunes del servidor para Mi Wawita
 */

/** Formatea una fecha ISO en hora de Perú (es-PE) de manera consistente */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(iso));
}
