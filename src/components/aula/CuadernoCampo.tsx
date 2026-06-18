/**
 * CuadernoCampo — Vista previa e impresión del Cuaderno de Campo Digital.
 * PDF generado con @react-pdf/renderer (texto vectorial, A4, seleccionable).
 */
import { memo, useCallback, useState } from 'react';
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer';
import type { StudentDto } from '../../lib/api/client';
import type { SessionConfig } from '../../lib/curriculum';
import type { ChatMessage } from './ChatFeed';

interface Props {
  session: SessionConfig;
  students: StudentDto[];
  messages: ChatMessage[];
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildStudentEvidence(
  messages: ChatMessage[],
  students: StudentDto[],
): Map<string, { evidencia: string; retroalimentacion: string }> {
  const map = new Map<string, { evidencia: string; retroalimentacion: string }>();
  for (const s of students) map.set(s.name, { evidencia: '', retroalimentacion: '' });
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.type === 'user') {
      const aiMsg = messages[i + 1];
      if (aiMsg?.type === 'ai') {
        const key = msg.studentName ?? '__grupo__';
        if (!map.has(key)) map.set(key, { evidencia: '', retroalimentacion: '' });
        const entry = map.get(key)!;
        const cai = aiMsg.cai;
        // Build readable evidencia from C+A+I
        const parts = [
          cai.contexto && `[C] ${cai.contexto}`,
          cai.accion && `[A] ${cai.accion}`,
          cai.interpretacion && `[I] ${cai.interpretacion}`,
        ].filter(Boolean);
        if (parts.length) entry.evidencia = parts.join('\n');
        if (cai.retroalimentacion) entry.retroalimentacion = cai.retroalimentacion;
      }
    }
  }
  return map;
}

// ─── PDF Styles ───────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
    color: '#111',
  },
  title: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  // Meta table
  metaTable: { width: '100%', marginBottom: 12 },
  metaRow: { flexDirection: 'row' },
  metaLabel: {
    fontFamily: 'Helvetica-Bold',
    borderWidth: 1,
    borderColor: '#111',
    paddingHorizontal: 6,
    paddingVertical: 4,
    width: 100,
  },
  metaValue: {
    borderWidth: 1,
    borderColor: '#111',
    paddingHorizontal: 6,
    paddingVertical: 4,
    flex: 1,
  },
  metaValueWide: {
    borderWidth: 1,
    borderColor: '#111',
    paddingHorizontal: 6,
    paddingVertical: 4,
    flex: 3,
  },
  // Obs table
  obsTable: { width: '100%' },
  obsHeaderRow: { flexDirection: 'row', backgroundColor: '#efefef' },
  obsRow: { flexDirection: 'row' },
  obsHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    borderWidth: 1,
    borderColor: '#111',
    paddingHorizontal: 5,
    paddingVertical: 5,
    textAlign: 'center',
    fontSize: 8,
  },
  obsCell: {
    borderWidth: 1,
    borderColor: '#111',
    paddingHorizontal: 5,
    paddingVertical: 5,
    minHeight: 32,
  },
  colNum: { width: 24 },
  colName: { width: 110 },
  colEvidencia: { flex: 1 },
  colRetro: { width: 120 },
  emptyRow: { height: 32 },
  italic: { fontFamily: 'Helvetica-Oblique', color: '#666' },
  muted: { color: '#888' },
});

// ─── PDF Document ─────────────────────────────────────────────────────────────

interface DocProps {
  session: SessionConfig;
  rows: Array<{ num: string; name: string; evidencia: string; retroalimentacion: string; isGroup?: boolean }>;
  padRows: number;
  fecha: string;
}

function CuadernoDocument({ session, rows, padRows, fecha }: DocProps) {
  return (
    <Document title={`Cuaderno de Campo — ${session.titulo || session.area}`}>
      <Page size="A4" style={S.page}>
        <Text style={S.title}>Cuaderno de Campo</Text>

        {/* Meta */}
        <View style={S.metaTable}>
          <View style={S.metaRow}>
            <Text style={S.metaLabel}>EDAD</Text>
            <Text style={[S.metaValue, { width: 90 }]}>{session.grado ?? '—'}</Text>
            <Text style={S.metaLabel}>SECCIÓN</Text>
            <Text style={[S.metaValue, { width: 60 }]}>{session.seccion ?? '—'}</Text>
            <Text style={S.metaLabel}>FECHA</Text>
            <Text style={S.metaValue}>{fecha}</Text>
          </View>
          <View style={S.metaRow}>
            <Text style={S.metaLabel}>TÍTULO</Text>
            <Text style={S.metaValueWide}>{session.titulo ?? '—'}</Text>
          </View>
          <View style={S.metaRow}>
            <Text style={S.metaLabel}>ÁREA</Text>
            <Text style={S.metaValueWide}>{session.area}</Text>
          </View>
          <View style={S.metaRow}>
            <Text style={S.metaLabel}>COMPETENCIA{'\n'}/ CAPACIDADES</Text>
            <Text style={S.metaValueWide}>
              {session.competencia}
              {session.capacidad ? `\n— ${session.capacidad}` : ''}
            </Text>
          </View>
          <View style={S.metaRow}>
            <Text style={S.metaLabel}>CRITERIO DE{'\n'}EVALUACIÓN</Text>
            <Text style={S.metaValueWide}>{session.criterio}</Text>
          </View>
        </View>

        {/* Observations table */}
        <View style={S.obsTable}>
          {/* Header */}
          <View style={S.obsHeaderRow}>
            <Text style={[S.obsHeaderCell, S.colNum]}>Nº</Text>
            <Text style={[S.obsHeaderCell, S.colName]}>NOMBRE Y APELLIDOS</Text>
            <Text style={[S.obsHeaderCell, S.colEvidencia]}>DESCRIPCIÓN DE EVIDENCIAS</Text>
            <Text style={[S.obsHeaderCell, S.colRetro]}>RETROALIMENTACIÓN</Text>
          </View>

          {/* Rows */}
          {rows.map((row) => (
            <View key={row.name} style={S.obsRow} wrap={false}>
              <Text style={[S.obsCell, S.colNum, S.muted, { textAlign: 'center' }]}>
                {row.isGroup ? '—' : row.num}
              </Text>
              <Text style={[S.obsCell, S.colName, row.isGroup ? S.italic : {}]}>
                {row.name}
              </Text>
              <Text style={[S.obsCell, S.colEvidencia]}>{row.evidencia}</Text>
              <Text style={[S.obsCell, S.colRetro]}>{row.retroalimentacion}</Text>
            </View>
          ))}

          {/* Padding rows */}
          {Array.from({ length: padRows }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: padding rows
            <View key={`pad-${i}`} style={S.obsRow}>
              <Text style={[S.obsCell, S.colNum, S.emptyRow]} />
              <Text style={[S.obsCell, S.colName, S.emptyRow]} />
              <Text style={[S.obsCell, S.colEvidencia, S.emptyRow]} />
              <Text style={[S.obsCell, S.colRetro, S.emptyRow]} />
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

// ─── Modal component ──────────────────────────────────────────────────────────

function CuadernoCampo({ session, students, messages, onClose }: Props) {
  const fecha = new Date(session.createdAt).toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  const evidenceMap = buildStudentEvidence(messages, students);
  const grupoEntry = evidenceMap.get('__grupo__');

  const rows = [
    ...students.map((s, idx) => ({
      num: String(idx + 1).padStart(2, '0'),
      name: s.name,
      ...(evidenceMap.get(s.name) ?? { evidencia: '', retroalimentacion: '' }),
    })),
    ...(grupoEntry && (grupoEntry.evidencia || grupoEntry.retroalimentacion)
      ? [{ num: '—', name: 'Grupo / Aula', isGroup: true, ...grupoEntry }]
      : []),
  ];

  const padRows = Math.max(0, 5 - rows.length);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleDownload = useCallback(async () => {
    try {
      const blob = await pdf(
        <CuadernoDocument session={session} rows={rows} padRows={padRows} fecha={fecha} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Cuaderno_de_Campo_${(session.titulo || session.area || 'Clase').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generando PDF:', err);
    }
  }, [session, rows, padRows, fecha]);

  // Copia HTML enriquecido al clipboard — Word, Google Docs y LibreOffice
  // respetan tablas y estilos cuando se pega desde HTML.
  const handleCopy = useCallback(async () => {
    const metaRows = [
      ['EDAD', session.grado ?? '—', 'SECCIÓN', session.seccion ?? '—', 'FECHA', fecha],
      ['TÍTULO', session.titulo ?? '—'],
      ['ÁREA', session.area],
      ['COMPETENCIA / CAPACIDADES', `${session.competencia}${session.capacidad ? ` — ${session.capacidad}` : ''}`],
      ['CRITERIO DE EVALUACIÓN', session.criterio ?? '—'],
    ];

    const metaHtml = metaRows.map((row, i) => {
      if (i === 0) {
        return `<tr>
          <td style="border:1px solid #111;padding:4px 8px;font-weight:bold;width:100px">${row[0]}</td>
          <td style="border:1px solid #111;padding:4px 8px;width:90px">${row[1]}</td>
          <td style="border:1px solid #111;padding:4px 8px;font-weight:bold;width:70px">${row[2]}</td>
          <td style="border:1px solid #111;padding:4px 8px;width:50px">${row[3]}</td>
          <td style="border:1px solid #111;padding:4px 8px;font-weight:bold;width:50px">${row[4]}</td>
          <td style="border:1px solid #111;padding:4px 8px">${row[5]}</td>
        </tr>`;
      }
      return `<tr>
        <td style="border:1px solid #111;padding:4px 8px;font-weight:bold">${row[0]}</td>
        <td style="border:1px solid #111;padding:4px 8px" colspan="5">${row[1]}</td>
      </tr>`;
    }).join('');

    const obsRowsHtml = [
      ...rows.map(row => `<tr>
        <td style="border:1px solid #111;padding:4px 6px;text-align:center;color:#888;width:28px">${row.isGroup ? '—' : row.num}</td>
        <td style="border:1px solid #111;padding:4px 8px;width:130px${row.isGroup ? ';font-style:italic;color:#666' : ''}">${row.name}</td>
        <td style="border:1px solid #111;padding:4px 8px">${row.evidencia}</td>
        <td style="border:1px solid #111;padding:4px 8px;width:140px">${row.retroalimentacion}</td>
      </tr>`),
      ...Array.from({ length: padRows }).map(() => `<tr>
        <td style="border:1px solid #111;padding:4px 6px;height:32px"></td>
        <td style="border:1px solid #111;padding:4px 8px"></td>
        <td style="border:1px solid #111;padding:4px 8px"></td>
        <td style="border:1px solid #111;padding:4px 8px"></td>
      </tr>`),
    ].join('');

    const html = `
      <html><body>
      <p style="text-align:center;font-family:Arial,sans-serif;font-size:11pt;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">
        CUADERNO DE CAMPO
      </p>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:9pt;margin-bottom:12px">
        <tbody>${metaHtml}</tbody>
      </table>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:9pt">
        <thead>
          <tr>
            <th style="border:1px solid #111;padding:5px 6px;background:#efefef;text-align:center;width:28px">Nº</th>
            <th style="border:1px solid #111;padding:5px 8px;background:#efefef;text-align:center;width:130px">NOMBRE Y APELLIDOS</th>
            <th style="border:1px solid #111;padding:5px 8px;background:#efefef;text-align:center">DESCRIPCIÓN DE EVIDENCIAS</th>
            <th style="border:1px solid #111;padding:5px 8px;background:#efefef;text-align:center;width:140px">RETROALIMENTACIÓN</th>
          </tr>
        </thead>
        <tbody>${obsRowsHtml}</tbody>
      </table>
      </body></html>`;

    // Texto plano como fallback
    const plain = [
      'CUADERNO DE CAMPO',
      '',
      `EDAD: ${session.grado ?? '—'} | SECCIÓN: ${session.seccion ?? '—'} | FECHA: ${fecha}`,
      `TÍTULO: ${session.titulo ?? '—'}`,
      `ÁREA: ${session.area}`,
      `COMPETENCIA: ${session.competencia}`,
      `CRITERIO: ${session.criterio ?? '—'}`,
      '',
      'Nº | NOMBRE | EVIDENCIAS | RETROALIMENTACIÓN',
      ...rows.map(r => `${r.num} | ${r.name} | ${r.evidencia} | ${r.retroalimentacion}`),
    ].join('\n');

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ]);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2500);
    } catch {
      // Fallback para browsers sin ClipboardItem (Firefox sin permiso)
      try {
        await navigator.clipboard.writeText(plain);
        setCopyState('copied');
        setTimeout(() => setCopyState('idle'), 2500);
      } catch {
        setCopyState('error');
        setTimeout(() => setCopyState('idle'), 2500);
      }
    }
  }, [session, rows, padRows, fecha]);

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
      <div className="flex flex-col w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100dvh-2rem)]">

        {/* Toolbar */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-warm-900 leading-tight">Cuaderno de Campo</p>
            <p className="text-xs font-semibold text-warm-500 truncate">{session.titulo || session.area}</p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={[
              'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors focus-ring-warm shrink-0',
              copyState === 'copied'
                ? 'bg-mint-400/20 text-warm-900 border border-mint-400/50'
                : copyState === 'error'
                ? 'bg-coral-500/10 text-coral-600 border border-coral-500/30'
                : 'bg-white border border-cream-dark text-warm-700 hover:bg-cream',
            ].join(' ')}
            title="Copiar para pegar en Word, Google Docs o LibreOffice"
          >
            {copyState === 'copied' ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                ¡Copiado!
              </>
            ) : copyState === 'error' ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Error
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copiar
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-xl bg-coral-500 px-4 py-2 text-sm font-bold text-white hover:bg-coral-600 transition-colors focus-ring-warm shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Descargar PDF (A4)
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

        {/* Preview — tabla HTML para visualización en pantalla */}
        <div className="flex-1 overflow-y-auto overflow-x-auto bg-white">
          <div className="p-8 min-w-[700px]">
            <h2 className="text-center text-sm font-bold tracking-[0.2em] mb-5 uppercase">
              Cuaderno de Campo
            </h2>

            <table className="w-full border-collapse text-sm mb-5">
              <tbody>
                <tr>
                  <td className="border border-gray-700 px-3 py-2 font-bold w-36">EDAD</td>
                  <td className="border border-gray-700 px-3 py-2 w-44">{session.grado ?? '—'}</td>
                  <td className="border border-gray-700 px-3 py-2 font-bold w-24">SECCIÓN</td>
                  <td className="border border-gray-700 px-3 py-2 w-20">{session.seccion ?? '—'}</td>
                  <td className="border border-gray-700 px-3 py-2 font-bold w-16">FECHA</td>
                  <td className="border border-gray-700 px-3 py-2">{fecha}</td>
                </tr>
                <tr>
                  <td className="border border-gray-700 px-3 py-2 font-bold">TÍTULO</td>
                  <td className="border border-gray-700 px-3 py-2" colSpan={5}>{session.titulo ?? '—'}</td>
                </tr>
                <tr>
                  <td className="border border-gray-700 px-3 py-2 font-bold">ÁREA</td>
                  <td className="border border-gray-700 px-3 py-2" colSpan={5}>{session.area}</td>
                </tr>
                <tr>
                  <td className="border border-gray-700 px-3 py-2 font-bold align-top">COMPETENCIA /<br />CAPACIDADES</td>
                  <td className="border border-gray-700 px-3 py-2" colSpan={5}>
                    {session.competencia}
                    {session.capacidad && <span className="text-gray-500"> — {session.capacidad}</span>}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-700 px-3 py-2 font-bold align-top">CRITERIO DE<br />EVALUACIÓN</td>
                  <td className="border border-gray-700 px-3 py-2" colSpan={5}>{session.criterio}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-700 px-3 py-2.5 text-center w-10 bg-gray-100">Nº</th>
                  <th className="border border-gray-700 px-3 py-2.5 text-center w-40 bg-gray-100">NOMBRE Y<br />APELLIDOS</th>
                  <th className="border border-gray-700 px-3 py-2.5 text-center bg-gray-100">DESCRIPCIÓN DE EVIDENCIAS</th>
                  <th className="border border-gray-700 px-3 py-2.5 text-center w-48 bg-gray-100">RETROALIMENTACIÓN</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name} className="align-top">
                    <td className="border border-gray-700 px-2 py-3 text-center text-gray-400 text-xs">{row.isGroup ? '—' : row.num}</td>
                    <td className={`border border-gray-700 px-3 py-3 ${row.isGroup ? 'italic text-gray-500' : ''}`}>{row.name}</td>
                    <td className="border border-gray-700 px-3 py-3 whitespace-pre-line">{row.evidencia || null}</td>
                    <td className="border border-gray-700 px-3 py-3 whitespace-pre-line">{row.retroalimentacion || null}</td>
                  </tr>
                ))}
                {Array.from({ length: padRows }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: padding rows
                  <tr key={`pad-${i}`}>
                    <td className="border border-gray-700 h-10" />
                    <td className="border border-gray-700 h-10" />
                    <td className="border border-gray-700 h-10" />
                    <td className="border border-gray-700 h-10" />
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
