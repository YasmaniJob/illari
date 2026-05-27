/**
 * CuadernoCampo — Vista previa e impresión del Cuaderno de Campo Digital.
 */
import { memo, useCallback, useRef } from 'react';
import type { StudentDto } from '../../lib/api/client';
import type { ChatMessage } from './ChatFeed';
import type { SessionConfig } from '../../lib/curriculum';

interface Props {
  session: SessionConfig;
  students: StudentDto[];
  messages: ChatMessage[];
  onClose: () => void;
}

/**
 * Picks the most recent (synthesized) AI note for each student.
 * Since the backend always upserts a single AI row per student per session,
 * we just take the last AI message paired with a user message for each student.
 */
function buildStudentEvidence(
  messages: ChatMessage[],
  students: StudentDto[],
): Map<string, { evidencia: string; retroalimentacion: string }> {
  const map = new Map<string, { evidencia: string; retroalimentacion: string }>();
  for (const s of students) {
    map.set(s.name, { evidencia: '', retroalimentacion: '' });
  }
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.type === 'user') {
      const aiMsg = messages[i + 1];
      if (aiMsg?.type === 'ai') {
        const key = msg.studentName ?? '__grupo__';
        if (!map.has(key)) map.set(key, { evidencia: '', retroalimentacion: '' });
        const entry = map.get(key)!;
        // Always overwrite with the latest AI synthesis for this student
        if (aiMsg.evidencia) entry.evidencia = aiMsg.evidencia;
        if (aiMsg.retroalimentacion) entry.retroalimentacion = aiMsg.retroalimentacion;
      }
    }
  }
  return map;
}

// Shared print styles injected into the popup window
const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 10.5px; color: #000; padding: 28px 32px; }
  h2 { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 14px; letter-spacing: 2px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #111; padding: 5px 7px; vertical-align: top; }
  .meta td.label { font-weight: bold; white-space: nowrap; }
  .meta td.value { font-weight: normal; }
  .obs th { font-weight: bold; text-align: center; font-size: 10px; background: #efefef; padding: 6px 7px; }
  .obs td.num { text-align: center; width: 32px; color: #555; }
  .obs td.name { width: 150px; }
  .obs td.empty { height: 36px; }
  .spacer { height: 14px; }
  @media print { body { padding: 0; } @page { margin: 1.5cm; } }
`;

function CuadernoCampo({ session, students, messages, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const fecha = new Date(session.createdAt).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const edadSeccion = [session.grado, session.seccion ? `Sección ${session.seccion}` : null]
    .filter(Boolean)
    .join(' · ');

  const evidenceMap = buildStudentEvidence(messages, students);
  const grupoEntry = evidenceMap.get('__grupo__');
  const rows = students.map((s, idx) => ({
    num: String(idx + 1).padStart(2, '0'),
    name: s.name,
    ...(evidenceMap.get(s.name) ?? { evidencia: '', retroalimentacion: '' }),
  }));
  const padRows = Math.max(0, 5 - rows.length - (grupoEntry ? 1 : 0));

  const handlePrint = useCallback(() => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank', 'width=860,height=680');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<title>Cuaderno de Campo — ${session.titulo || session.area}</title>
<style>${PRINT_STYLES}</style></head>
<body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  }, [session]);

  // Close on overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa del Cuaderno de Campo"
      onClick={handleOverlayClick}
    >
      {/* Modal container — fixed height with internal scroll */}
      <div className="flex flex-col w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100dvh-2rem)]">

        {/* ── Toolbar ── */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-warm-900 leading-tight">Cuaderno de Campo</p>
            <p className="text-xs font-semibold text-warm-500 truncate">{session.titulo || session.area}</p>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-coral-500 px-4 py-2 text-sm font-bold text-white hover:bg-coral-600 transition-colors focus-ring-warm shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Descargar / Imprimir
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-warm-500 hover:bg-gray-100 hover:text-warm-900 transition-colors focus-ring-warm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ── Document preview — scrollable ── */}
        <div className="flex-1 overflow-y-auto overflow-x-auto bg-white">
          <div ref={printRef} className="p-8 min-w-[700px]">

            {/* Title */}
            <h2 className="text-center text-sm font-bold tracking-[0.2em] mb-5 uppercase">
              Cuaderno de Campo
            </h2>

            {/* Meta table */}
            <table className="meta w-full border-collapse text-sm mb-5">
              <tbody>
                <tr>
                  <td className="label border border-gray-700 px-3 py-2 font-bold w-36">EDAD</td>
                  <td className="value border border-gray-700 px-3 py-2 w-44">{session.grado ?? '—'}</td>
                  <td className="label border border-gray-700 px-3 py-2 font-bold w-24">SECCIÓN</td>
                  <td className="value border border-gray-700 px-3 py-2 w-20">{session.seccion ?? '—'}</td>
                  <td className="label border border-gray-700 px-3 py-2 font-bold w-16">FECHA</td>
                  <td className="value border border-gray-700 px-3 py-2">{fecha}</td>
                </tr>
                <tr>
                  <td className="label border border-gray-700 px-3 py-2 font-bold">TÍTULO</td>
                  <td className="value border border-gray-700 px-3 py-2" colSpan={5}>
                    {session.titulo ?? '—'}
                  </td>
                </tr>
                <tr>
                  <td className="label border border-gray-700 px-3 py-2 font-bold">ÁREA</td>
                  <td className="value border border-gray-700 px-3 py-2" colSpan={5}>
                    {session.area}
                  </td>
                </tr>
                <tr>
                  <td className="label border border-gray-700 px-3 py-2 font-bold align-top">
                    COMPETENCIA /<br />CAPACIDADES
                  </td>
                  <td className="value border border-gray-700 px-3 py-2" colSpan={5}>
                    {session.competencia}
                    {session.capacidad && (
                      <span className="text-gray-500"> — {session.capacidad}</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="label border border-gray-700 px-3 py-2 font-bold align-top">
                    CRITERIO DE<br />EVALUACIÓN
                  </td>
                  <td className="value border border-gray-700 px-3 py-2" colSpan={5}>
                    {session.criterio}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Observations table */}
            <table className="obs w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-700 px-3 py-2.5 text-center w-10">Nº</th>
                  <th className="border border-gray-700 px-3 py-2.5 text-center w-40">
                    NOMBRE Y<br />APELLIDOS
                  </th>
                  <th className="border border-gray-700 px-3 py-2.5 text-center">
                    DESCRIPCIÓN DE EVIDENCIAS
                  </th>
                  <th className="border border-gray-700 px-3 py-2.5 text-center w-48">
                    RETROALIMENTACIÓN
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name} className="align-top">
                    <td className="num border border-gray-700 px-2 py-3 text-center text-gray-400 text-xs">
                      {row.num}
                    </td>
                    <td className="name border border-gray-700 px-3 py-3">
                      {row.name}
                    </td>
                    <td className="border border-gray-700 px-3 py-3 whitespace-pre-line">
                      {row.evidencia || null}
                    </td>
                    <td className="border border-gray-700 px-3 py-3 whitespace-pre-line">
                      {row.retroalimentacion || null}
                    </td>
                  </tr>
                ))}

                {/* Observaciones de grupo */}
                {grupoEntry && (grupoEntry.evidencia || grupoEntry.retroalimentacion) && (
                  <tr className="align-top">
                    <td className="num border border-gray-700 px-2 py-3 text-center text-gray-400">—</td>
                    <td className="name border border-gray-700 px-3 py-3 italic text-gray-500">Grupo / Aula</td>
                    <td className="border border-gray-700 px-3 py-3 whitespace-pre-line">
                      {grupoEntry.evidencia || null}
                    </td>
                    <td className="border border-gray-700 px-3 py-3 whitespace-pre-line">
                      {grupoEntry.retroalimentacion || null}
                    </td>
                  </tr>
                )}

                {/* Padding rows */}
                {Array.from({ length: padRows }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: padding rows
                  <tr key={`pad-${i}`}>
                    <td className="empty border border-gray-700 h-10" />
                    <td className="empty border border-gray-700 h-10" />
                    <td className="empty border border-gray-700 h-10" />
                    <td className="empty border border-gray-700 h-10" />
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(CuadernoCampo);
