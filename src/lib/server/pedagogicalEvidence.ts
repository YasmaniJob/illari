import type { SessionConfig } from '../curriculum';
import { groqGenerateJson } from './groq';

const SYSTEM_PROMPT = `Eres un asistente de documentación pedagógica para docentes de educación inicial en Perú (CNEB).
Tu función es ayudar a la docente a redactar sus notas del Cuaderno de Campo en PRIMERA PERSONA, como si ella misma las hubiera escrito.

REGLAS DE VALIDACIÓN DE ESTUDIANTE:
1. Se te proporcionará una lista de estudiantes inscritos en la sección (ej. ["Clady", "Pilar"]).
2. Si el registro del docente menciona o se refiere explícitamente a un nombre de niño/a (insensible a mayúsculas/minúsculas y acentos, ej. "carlos", "Carlos", "Karla") que NO coincide con ningún estudiante de la lista proporcionada, debes detenerte y responder ÚNICAMENTE con el campo "error" indicando qué nombre no figura en la lista. Ejemplo:
   { "error": "No veo a Carlos en la lista de estudiantes." }
3. Si el registro se refiere a un estudiante que SÍ está en la lista (ej. "Carlos"), pero es diferente al "Estudiante seleccionado" actual (ej. "Clady"), debes procesar la evidencia y la retroalimentación normalmente para ese alumno, pero debes incluir el campo "studentNameMatch" con el nombre exacto del estudiante encontrado de la lista (ej. "Carlos").
4. Si el registro no menciona ningún nombre o se refiere al seleccionado, no incluyas "studentNameMatch" ni "error".

REGLAS DE REDACCIÓN PEDAGÓGICA (Si no hay error):
- Escribe SIEMPRE en primera persona: "Observé que...", "Noté que...", "Registré...", "Identifiqué..."
- NUNCA uses segunda persona ni te dirijas a la docente ("Maestra, podrías...", "te sugiero...", "podrías...")
- La evidencia describe lo que la docente observó, relacionándolo con la competencia, capacidad y criterio de evaluación del CNEB
- La retroalimentación es una nota personal en primera persona sobre qué hará después: "Para la próxima sesión plantearé...", "Buscaré acercar a...", "Propondré..."
- Redacción natural y fluida, sin listas, sin subtítulos, sin viñetas
- MÁXIMO 3 ORACIONES POR CAMPO — siempre conciso y resumido, incluso si hay muchas observaciones acumuladas
- La evidencia debe referenciar implícitamente la competencia y capacidad en juego (sin copiarlas literalmente)
- No repitas la observación textual del docente; reelabórala con lenguaje pedagógico propio

CUANDO SE PROPORCIONA UNA NOTA PREVIA:
- Se te entregará la nota pedagógica ya existente sobre ese estudiante ("Nota previa")
- Tu tarea es INTEGRAR la nueva observación con la nota previa, produciendo UNA SOLA nota unificada
- El resultado debe ser un RESUMEN COMPACTO que capture lo más significativo de ambas observaciones
- Elimina redundancias y mantén la coherencia narrativa
- No menciones que estás resumiendo o integrando notas; escribe como si fuera una sola observación continua
- Mantén el límite de MÁXIMO 3 ORACIONES por campo

Responde SOLO un JSON válido:
Si hay error: { "error": "No veo a [Nombre] en la lista de estudiantes." }
Si es correcto: { "evidencia": "...", "retroalimentacion": "...", "studentNameMatch": "NombreDelEstudianteOpcional" }`;

export async function generatePedagogicalEvidence(
  session: SessionConfig,
  observationText: string,
  studentName?: string,
  source: 'text' | 'voice' = 'text',
  studentsList?: string[],
  previousNote?: { evidencia: string; retroalimentacion: string },
): Promise<{ evidencia?: string; retroalimentacion?: string; studentNameMatch?: string; error?: string }> {
  const who = studentName ? `Estudiante seleccionado: "${studentName}"` : 'Observación grupal (sin estudiante seleccionado)';
  const listStr = studentsList && studentsList.length > 0 ? JSON.stringify(studentsList) : '[]';

  const previousSection = previousNote
    ? `\nNota previa existente sobre este estudiante:
- Evidencia: "${previousNote.evidencia}"
- Retroalimentación: "${previousNote.retroalimentacion}"

Integra la nueva observación con la nota previa y genera un RESUMEN COMPACTO (máx. 3 oraciones por campo).\n`
    : '';

  const userPrompt = `Sesión: "${session.titulo || session.area}"
Área curricular: ${session.area}
Competencia CNEB: ${session.competencia}
Capacidad: ${session.capacidad ?? '—'}
Criterio de evaluación: ${session.criterio ?? '—'}
Edad/Grado: ${session.grado ?? '—'} · Sección: ${session.seccion ?? '—'}

Lista de estudiantes en esta sección: ${listStr}
${who}
${previousSection}Registro docente (${source === 'voice' ? 'voz' : 'texto'}): "${observationText}"

Valida si el nombre mencionado en el registro coincide con la lista. Si no coincide, devuelve el error. Si es correcto, genera la evidencia y retroalimentación en primera persona${previousNote ? ', integrando la nota previa en un resumen compacto' : ''}.`;

  const data = await groqGenerateJson(SYSTEM_PROMPT, userPrompt);

  if (data.error) {
    return { error: String(data.error) };
  }

  return {
    evidencia: String(data.evidencia ?? observationText),
    retroalimentacion: String(
      data.retroalimentacion ?? 'Ampliaré la observación con más detalles en la próxima sesión.',
    ),
    studentNameMatch: data.studentNameMatch ? String(data.studentNameMatch) : undefined,
  };
}

