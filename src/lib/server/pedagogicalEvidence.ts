import type { CurriculumRow, SessionConfig } from '../curriculum';
import { groqGenerateJson } from './groq';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface EvidenciaCAI {
  contexto: string;
  accion: string;
  interpretacion: string;
  interpretacionSugerida: string;
  intervencion: string;
  retroalimentacion: string;
}

export interface EvidenciaResult {
  cai?: EvidenciaCAI;
  studentNameMatch?: string;
  error?: string;
}

// ─── Construcción del catálogo para el prompt ─────────────────────────────────

/**
 * Toma las filas del CSV filtradas por la edad/grado de la sesión y construye
 * el bloque de texto que se inyecta en el prompt.
 * Solo incluye competencia, capacidad y criterio — exactamente como están en el CSV.
 */
function buildCurriculumBlock(rows: CurriculumRow[]): string {
  if (rows.length === 0) return '(Sin entradas curriculares para este grado)';

  // Agrupa por área → competencia → capacidades/criterios
  const byArea = new Map<string, Map<string, { capacidad: string; criterio: string }[]>>();

  for (const r of rows) {
    if (!byArea.has(r.area)) byArea.set(r.area, new Map());
    const byComp = byArea.get(r.area)!;
    if (!byComp.has(r.competencia)) byComp.set(r.competencia, []);
    byComp.get(r.competencia)!.push({ capacidad: r.capacidad, criterio: r.criterio });
  }

  const lines: string[] = [];
  for (const [area, comps] of byArea) {
    lines.push(`ÁREA: ${area}`);
    for (const [comp, items] of comps) {
      lines.push(`  Competencia: ${comp}`);
      for (const { capacidad, criterio } of items) {
        lines.push(`    Capacidad: ${capacidad}`);
        lines.push(`    Criterio/Desempeño: ${criterio}`);
      }
    }
  }
  return lines.join('\n');
}

// ─── Sistema de prompt ────────────────────────────────────────────────────────

function buildSystemPrompt(curriculumBlock: string, edad: string): string {
  return `Eres un asistente de documentación pedagógica para docentes de educación inicial en Perú.
Tu única función es ayudar a estructurar la observación del docente usando la estructura C+A+I.

REGLA ABSOLUTA — SOLO PUEDES USAR EL SIGUIENTE CATÁLOGO CURRICULAR:
El catálogo corresponde a la edad/grado "${edad}" del Programa Curricular de Educación Inicial (CNEB).
NO puedes inferir, parafrasear, ni usar competencias, capacidades o criterios que no estén en este catálogo.
Si la observación no se relaciona con ninguna entrada del catálogo, debes indicarlo explícitamente.

=== CATÁLOGO CURRICULAR PARA ${edad.toUpperCase()} ===
${curriculumBlock}
=== FIN DEL CATÁLOGO ===

ESTRUCTURA DE RESPUESTA — C+A+I + INTERVENCION + INTERPRETACION SUGERIDA:
1. CONTEXTO (C): Describe brevemente la situación del aula en la que ocurrió la observación. 
   - Usa lo que el docente describió. No inventes.
   
2. ACCIÓN DEL NIÑO/A (A): Describe la acción concreta y observable que realizó o dijo el niño/a.
   - Copia o parafrasea mínimamente lo que el docente reportó.
   - No interpretes aún, solo describe el hecho.

3. INTERPRETACIÓN CURRICULAR (I): Vincula la acción con UNA entrada exacta del catálogo.
   - Cita textualmente el área, competencia, capacidad y criterio/desempeño del catálogo que corresponde.
   - Si no hay coincidencia exacta en el catálogo, escribe: "No se encontró en el catálogo un desempeño que corresponda a esta observación para ${edad}."
   - NO uses competencias o criterios que no estén en el catálogo.

4. INTERPRETACIÓN PEDAGÓGICA SUGERIDA: Explica brevemente qué aprendizajes o nociones está demostrando el niño/a mediante su acción específica (por ejemplo, relacionando sus movimientos, la manipulación de objetos o interacciones con sus habilidades en desarrollo).

5. INTERVENCIÓN PEDAGÓGICA: Describe brevemente cómo debe intervenir el docente en ese momento para complejizar el aprendizaje o enriquecer el desarrollo de la competencia (por ejemplo, planteando una pregunta retadora, agregando nuevos materiales o proponiendo un reto relacionado).

6. RETROALIMENTACIÓN: Una sola oración en primera persona sobre qué hará el docente a continuación para dar continuidad al aprendizaje en la próxima sesión.

REGLAS DE VALIDACIÓN DE ESTUDIANTE:
- Se te dará una lista de estudiantes. Si el registro menciona un nombre que NO está en la lista, responde solo con el campo "error".
- Si el nombre mencionado SÍ está en la lista pero es diferente al seleccionado, incluye "studentNameMatch".

FORMATO DE RESPUESTA — solo JSON válido:
Error de estudiante: { "error": "No veo a [Nombre] en la lista de estudiantes." }
Respuesta correcta: {
  "contexto": "...",
  "accion": "...",
  "interpretacion": "...",
  "interpretacionSugerida": "...",
  "intervencion": "...",
  "retroalimentacion": "...",
  "studentNameMatch": "NombreOpcional"
}`;
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function generatePedagogicalEvidence(
  session: SessionConfig,
  observationText: string,
  curriculumRows: CurriculumRow[],
  studentName?: string,
  source: 'text' | 'voice' = 'text',
  studentsList?: string[],
  previousNote?: EvidenciaCAI,
): Promise<EvidenciaResult> {
  const edad = session.grado ?? '—';

  // Filtrar el catálogo por la edad exacta de la sesión
  const rowsForGrado = curriculumRows.filter((r) => {
    // El grado puede ser "3 años, 4 años (A)" — extraemos las edades
    return edad.includes(r.edad);
  });

  const curriculumBlock = buildCurriculumBlock(rowsForGrado);
  const systemPrompt = buildSystemPrompt(curriculumBlock, edad);

  const who = studentName ? `Estudiante seleccionado: "${studentName}"` : 'Observación grupal';
  const listStr = studentsList && studentsList.length > 0 ? JSON.stringify(studentsList) : '[]';

  const previousSection = previousNote
    ? `\nNota C+A+I previa sobre este estudiante:
- Contexto: "${previousNote.contexto}"
- Acción: "${previousNote.accion}"
- Interpretación: "${previousNote.interpretacion}"
- Retroalimentación: "${previousNote.retroalimentacion}"

Integra la nueva observación con la nota previa en un resumen compacto (máx. 2 oraciones por campo).\n`
    : '';

  const userPrompt = `Sesión: "${session.titulo || session.area}"
Edad/Grado: ${edad} · Sección: ${session.seccion ?? '—'}
Lista de estudiantes: ${listStr}
${who}
${previousSection}Registro docente (${source === 'voice' ? 'voz' : 'texto'}): "${observationText}"

Aplica la estructura C+A+I usando SOLO el catálogo curricular proporcionado.`;

  const data = await groqGenerateJson(systemPrompt, userPrompt);

  if (data.error) {
    return { error: String(data.error) };
  }

  return {
    cai: {
      contexto: String(data.contexto ?? ''),
      accion: String(data.accion ?? ''),
      interpretacion: String(data.interpretacion ?? ''),
      interpretacionSugerida: String(data.interpretacionSugerida ?? ''),
      intervencion: String(data.intervencion ?? ''),
      retroalimentacion: String(data.retroalimentacion ?? ''),
    },
    studentNameMatch: data.studentNameMatch ? String(data.studentNameMatch) : undefined,
  };
}
