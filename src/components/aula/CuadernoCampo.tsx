/**
 * CuadernoCampo — Vista previa e impresión del Cuaderno de Campo Digital.
 * PDF generado con @react-pdf/renderer (texto vectorial, A4, seleccionable).
 */

import { Document, Font, Page, pdf, StyleSheet, Text, View } from '@react-pdf/renderer';
import { memo, useCallback, useState } from 'react';
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
          cai.intervencion && `[INT] ${cai.intervencion}`,
          cai.interpretacionSugerida && `[IPS] ${cai.interpretacionSugerida}`,
          cai.interpretacion && `[I] ${cai.interpretacion}`,
        ].filter(Boolean);
        if (parts.length) entry.evidencia = parts.join('\n');
        if (cai.retroalimentacion) entry.retroalimentacion = cai.retroalimentacion;
      }
    }
  }
  return map;
}

// ─── Datos estructurados por estudiante (para formato ficha) ──────────────────

// ─── Fichas Individuales de Observación (una por cada descripción) ────────────

interface FichaIndividual {
  id: string;
  studentName: string;
  grado: string;
  seccion: string;
  timestamp: string;
  situacion: string;
  contexto: string;
  accion: string;
  intervencion: string;
  interpretacionSugerida: string;
  interpretacion: string;
  retroalimentacion: string;
}

function buildFichasIndividuales(
  messages: ChatMessage[],
  students: StudentDto[],
  session: SessionConfig,
): FichaIndividual[] {
  const fichas: FichaIndividual[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.type === 'user' && msg.studentName) {
      const nextMsg = messages[i + 1];
      
      let aiFields = {
        contexto: '', accion: '', intervencion: '', interpretacionSugerida: '',
        interpretacion: '', retroalimentacion: ''
      };
      
      if (nextMsg && nextMsg.type === 'ai') {
        aiFields = {
          contexto: nextMsg.cai.contexto,
          accion: nextMsg.cai.accion,
          intervencion: nextMsg.cai.intervencion,
          interpretacionSugerida: nextMsg.cai.interpretacionSugerida,
          interpretacion: nextMsg.cai.interpretacion,
          retroalimentacion: nextMsg.cai.retroalimentacion
        };
      }
      
      fichas.push({
        id: msg.id,
        studentName: msg.studentName,
        grado: session.grado ?? '—',
        seccion: session.seccion ?? '—',
        timestamp: msg.timestamp,
        situacion: msg.text,
        ...aiFields
      });
    }
  }
  
  return fichas;
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
          <View style={S.metaRow}>
            <Text style={S.metaLabel}>EVIDENCIA DE{'\n'}APRENDIZAJE</Text>
            <Text style={S.metaValueWide}>{session.evidencia ?? '—'}</Text>
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
              <Text style={[S.obsCell, S.colNum, S.muted, { textAlign: 'center' }]}>{row.isGroup ? '—' : row.num}</Text>
              <Text style={[S.obsCell, S.colName, row.isGroup ? S.italic : {}]}>{row.name}</Text>
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

// ─── PDF Fichas Individuales por Observación ──────────────────────────────────

interface PerStudentDocProps {
  session: SessionConfig;
  fichas: FichaIndividual[];
  fecha: string;
}

function PerStudentDocument({ session, fichas, fecha }: PerStudentDocProps) {
  return (
    <Document title={`Fichas de Observación — ${session.titulo || session.area}`}>
      {fichas.map((ficha) => {
        const intereses = [ficha.contexto, ficha.accion].filter(Boolean).join('\n');
        const capacidades = [ficha.interpretacionSugerida, ficha.interpretacion].filter(Boolean).join('\n');

        return (
          <Page key={ficha.id} size="A4" style={S.page}>
            <Text style={S.title}>Ficha de Observación Pedagógica</Text>

            {/* Datos de la sesión (compacto) */}
            <View style={[S.metaTable, { marginBottom: 8 }]}>
              <View style={S.metaRow}>
                <Text style={S.metaLabel}>ÁREA</Text>
                <Text style={S.metaValueWide}>{session.area}</Text>
              </View>
              <View style={S.metaRow}>
                <Text style={S.metaLabel}>COMPETENCIA</Text>
                <Text style={S.metaValueWide}>{session.competencia}</Text>
              </View>
              <View style={S.metaRow}>
                <Text style={S.metaLabel}>CRITERIO</Text>
                <Text style={S.metaValueWide}>{session.criterio}</Text>
              </View>
            </View>

            {/* Datos del niño/a */}
            <View style={S.metaTable}>
              <View style={S.metaRow}>
                <Text style={S.metaLabel}>NOMBRE DEL{'\n'}NIÑO/A</Text>
                <Text style={[S.metaValueWide, { fontFamily: 'Helvetica-Bold' }]}>{ficha.studentName}</Text>
              </View>
              <View style={S.metaRow}>
                <Text style={S.metaLabel}>EDAD</Text>
                <Text style={[S.metaValue, { width: 90 }]}>{ficha.grado}</Text>
                <Text style={S.metaLabel}>SECCIÓN</Text>
                <Text style={[S.metaValue, { width: 60 }]}>{ficha.seccion}</Text>
                <Text style={S.metaLabel}>FECHA / HORA</Text>
                <Text style={S.metaValue}>{fecha} — {ficha.timestamp}</Text>
              </View>
            </View>

            {/* 1. Situación observada */}
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 3 }}>
                1. SITUACIÓN OBSERVADA
              </Text>
              <Text style={{ fontFamily: 'Helvetica-Oblique', fontSize: 8, color: '#666', marginBottom: 5 }}>
                ¿Qué hace el niño(a)? ¿Cómo interactúa con objetos, el espacio y las personas? (Describir sin interpretar)
              </Text>
              <View style={{ borderWidth: 1, borderColor: '#111', paddingHorizontal: 6, paddingVertical: 5, minHeight: 60 }}>
                <Text>{ficha.situacion}</Text>
              </View>
            </View>

            {/* 2. Análisis pedagógico */}
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 3 }}>
                2. ANÁLISIS PEDAGÓGICO
              </Text>
              <Text style={{ fontFamily: 'Helvetica-Oblique', fontSize: 8, color: '#666', marginBottom: 6 }}>
                Se realiza entre las docentes responsables de una misma aula
              </Text>

              <View style={{ borderWidth: 1, borderColor: '#888', paddingHorizontal: 6, paddingVertical: 5, minHeight: 36, marginBottom: 5 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#444', marginBottom: 3 }}>
                  Intereses e iniciativas del niño(a):
                </Text>
                <Text>{intereses}</Text>
              </View>

              <View style={{ borderWidth: 1, borderColor: '#888', paddingHorizontal: 6, paddingVertical: 5, minHeight: 36, marginBottom: 5 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#444', marginBottom: 3 }}>
                  Combinación de capacidades que muestran el desarrollo de las Competencias:
                </Text>
                <Text>{capacidades}</Text>
              </View>

              <View style={{ borderWidth: 1, borderColor: '#888', paddingHorizontal: 6, paddingVertical: 5, minHeight: 36 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#444', marginBottom: 3 }}>
                  Necesidades o dificultades:
                </Text>
                <Text>{ficha.retroalimentacion}</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
}


// ─── Modal component ──────────────────────────────────────────────────────────

function CuadernoCampo({ session, students, messages, onClose }: Props) {
  const fecha = new Date(session.createdAt).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const evidenceMap = buildStudentEvidence(messages, students);
  const fichas = buildFichasIndividuales(messages, students, session);
  const grupoEntry = evidenceMap.get('__grupo__');

  const rows = [
    ...students.map((s, idx) => ({
      num: String(idx + 1).padStart(2, '0'),
      name: s.name,
      isGroup: false,
      ...(evidenceMap.get(s.name) ?? { evidencia: '', retroalimentacion: '' }),
    })),
    ...(grupoEntry && (grupoEntry.evidencia || grupoEntry.retroalimentacion)
      ? [{ num: '—', name: 'Grupo / Aula', isGroup: true, ...grupoEntry }]
      : []),
  ];

  const padRows = Math.max(0, 5 - rows.length);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [format, setFormat] = useState<'table' | 'per-student'>('table');

  const handleDownload = useCallback(async () => {
    try {
      const pdfDoc =
        format === 'per-student' ? (
          <PerStudentDocument session={session} fichas={fichas} fecha={fecha} />
        ) : (
          <CuadernoDocument session={session} rows={rows} padRows={padRows} fecha={fecha} />
        );
      const blob = await pdf(pdfDoc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${
        format === 'per-student' ? 'Fichas_Estudiantes' : 'Cuaderno_de_Campo'
      }_${(session.titulo || session.area || 'Clase').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generando PDF:', err);
    }
  }, [session, rows, padRows, fecha, format, fichas]);

  // Copia HTML enriquecido al clipboard — Word, Google Docs y LibreOffice
  // respetan tablas y estilos cuando se pega desde HTML.
  const handleCopy = useCallback(async () => {
    let html: string;
    let plain: string;

    if (format === 'per-student') {
      // ── Formato ficha por estudiante ─────────────────────────────────────────
      const studentSections = fichas
        .map((ficha) => {
          const intereses = [ficha.contexto, ficha.accion].filter(Boolean).join('\n');
          const capacidades = [ficha.interpretacionSugerida, ficha.interpretacion].filter(Boolean).join('\n');
          return `
            <h3 style="font-family:Arial,sans-serif;font-size:11pt;font-weight:bold;margin:20px 0 6px;border-top:2px solid #111;padding-top:12px">${ficha.studentName}</h3>
            <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:9pt;margin-bottom:8px">
              <tr>
                <td style="border:1px solid #111;padding:3px 6px;font-weight:bold">EDAD</td>
                <td style="border:1px solid #111;padding:3px 6px">${ficha.grado}</td>
                <td style="border:1px solid #111;padding:3px 6px;font-weight:bold">SECCIÓN</td>
                <td style="border:1px solid #111;padding:3px 6px">${ficha.seccion}</td>
                <td style="border:1px solid #111;padding:3px 6px;font-weight:bold">FECHA / HORA</td>
                <td style="border:1px solid #111;padding:3px 6px">${fecha} — ${ficha.timestamp}</td>
              </tr>
            </table>
            <p style="font-family:Arial,sans-serif;font-size:9pt;font-weight:bold;margin:8px 0 3px">1. SITUACIÓN OBSERVADA</p>
            <p style="font-family:Arial,sans-serif;font-size:8pt;color:#666;font-style:italic;margin:0 0 4px">¿Qué hace el niño(a)? ¿Cómo interactúa con objetos, el espacio y las personas? (Describir sin interpretar)</p>
            <div style="border:1px solid #111;padding:8px;min-height:56px;font-family:Arial,sans-serif;font-size:9pt;margin-bottom:10px;white-space:pre-line">${ficha.situacion}</div>
            <p style="font-family:Arial,sans-serif;font-size:9pt;font-weight:bold;margin:8px 0 3px">2. ANÁLISIS PEDAGÓGICO</p>
            <p style="font-family:Arial,sans-serif;font-size:8pt;color:#666;font-style:italic;margin:0 0 6px">Se realiza entre las docentes responsables de una misma aula</p>
            <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:9pt">
              <tr><td style="border:1px solid #888;padding:5px 8px;vertical-align:top">
                <strong>Intereses e iniciativas del niño(a):</strong><br/>${intereses.replace(/\n/g, '<br/>')}
              </td></tr>
              <tr><td style="border:1px solid #888;padding:5px 8px;vertical-align:top">
                <strong>Combinación de capacidades que muestran el desarrollo de las Competencias:</strong><br/>${capacidades.replace(/\n/g, '<br/>')}
              </td></tr>
              <tr><td style="border:1px solid #888;padding:5px 8px;vertical-align:top">
                <strong>Necesidades o dificultades:</strong><br/>${ficha.retroalimentacion}
              </td></tr>
            </table>`;
        })
        .join('');

      html = `<html><body>
        <p style="text-align:center;font-family:Arial,sans-serif;font-size:11pt;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">FICHAS DE OBSERVACIÓN PEDAGÓGICA</p>
        <p style="text-align:center;font-family:Arial,sans-serif;font-size:9pt;color:#555;margin-bottom:8px">${session.area} — ${session.competencia}</p>
        ${studentSections}
      </body></html>`;

      plain = fichas
        .map((ficha) => {
          return [
            `=== ${ficha.studentName.toUpperCase()} ===`,
            `EDAD: ${ficha.grado} | SECCIÓN: ${ficha.seccion} | FECHA / HORA: ${fecha} — ${ficha.timestamp}`,
            '',
            '1. SITUACIÓN OBSERVADA',
            ficha.situacion,
            '',
            '2. ANÁLISIS PEDAGÓGICO',
            `Intereses e iniciativas: ${[ficha.contexto, ficha.accion].filter(Boolean).join(' / ')}`,
            `Combinación de capacidades: ${[ficha.interpretacionSugerida, ficha.interpretacion].filter(Boolean).join(' / ')}`,
            `Necesidades o dificultades: ${ficha.retroalimentacion}`,
          ].join('\n');
        })
        .join('\n\n');
    } else {
      // ── Formato tabla general ─────────────────────────────────────────────────
      const metaRows = [
        ['EDAD', session.grado ?? '—', 'SECCIÓN', session.seccion ?? '—', 'FECHA', fecha],
        ['TÍTULO', session.titulo ?? '—'],
        ['ÁREA', session.area],
        ['COMPETENCIA / CAPACIDADES', `${session.competencia}${session.capacidad ? ` — ${session.capacidad}` : ''}`],
        ['CRITERIO DE EVALUACIÓN', session.criterio ?? '—'],
        ['EVIDENCIA DE APRENDIZAJE', session.evidencia ?? '—'],
      ];


      const metaHtml = metaRows
        .map((row, i) => {
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
        })
        .join('');

      const obsRowsHtml = [
        ...rows.map(
          (row) => `<tr>
          <td style="border:1px solid #111;padding:4px 6px;text-align:center;color:#888;width:28px">${row.isGroup ? '—' : row.num}</td>
          <td style="border:1px solid #111;padding:4px 8px;width:130px${row.isGroup ? ';font-style:italic;color:#666' : ''}">${row.name}</td>
          <td style="border:1px solid #111;padding:4px 8px">${row.evidencia}</td>
          <td style="border:1px solid #111;padding:4px 8px;width:140px">${row.retroalimentacion}</td>
        </tr>`,
        ),
        ...Array.from({ length: padRows }).map(
          () => `<tr>
          <td style="border:1px solid #111;padding:4px 6px;height:32px"></td>
          <td style="border:1px solid #111;padding:4px 8px"></td>
          <td style="border:1px solid #111;padding:4px 8px"></td>
          <td style="border:1px solid #111;padding:4px 8px"></td>
        </tr>`,
        ),
      ].join('');

      html = `
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
      plain = [
        'CUADERNO DE CAMPO',
        '',
        `EDAD: ${session.grado ?? '—'} | SECCIÓN: ${session.seccion ?? '—'} | FECHA: ${fecha}`,
        `TÍTULO: ${session.titulo ?? '—'}`,
        `ÁREA: ${session.area}`,
        `COMPETENCIA: ${session.competencia}`,
        `CRITERIO: ${session.criterio ?? '—'}`,
        `EVIDENCIA: ${session.evidencia ?? '—'}`,
        '',
        'Nº | NOMBRE | EVIDENCIAS | RETROALIMENTACIÓN',
        ...rows.map((r) => `${r.num} | ${r.name} | ${r.evidencia} | ${r.retroalimentacion}`),
      ].join('\n');
    }

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
  }, [session, rows, padRows, fecha, format, fichas]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

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
        <div className="shrink-0 flex items-center gap-2 px-5 py-3 border-b border-gray-200 bg-white flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-warm-900 leading-tight">Cuaderno de Campo</p>
            <p className="text-xs font-semibold text-warm-500 truncate">{session.titulo || session.area}</p>
          </div>

          {/* Toggle formato */}
          <div className="flex items-center gap-1 bg-warm-100 p-1 rounded-xl border border-cream-dark/60 shrink-0">
            <button
              type="button"
              onClick={() => setFormat('table')}
              className={[
                'px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 focus-ring-warm',
                format === 'table'
                  ? 'bg-warm-900 text-white shadow-sm scale-[1.02]'
                  : 'text-warm-600 hover:text-warm-900 hover:bg-white/40',
              ].join(' ')}
              title="Tabla general — todos los estudiantes"
            >
              📊 Tabla General
            </button>
            <button
              type="button"
              onClick={() => setFormat('per-student')}
              className={[
                'px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all duration-200 focus-ring-warm',
                format === 'per-student'
                  ? 'bg-warm-900 text-white shadow-sm scale-[1.02]'
                  : 'text-warm-600 hover:text-warm-900 hover:bg-white/40',
              ].join(' ')}
              title="Ficha por niño — dos secciones por estudiante"
            >
              👤 Ficha por Niño
            </button>
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
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                ¡Copiado!
              </>
            ) : copyState === 'error' ? (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Error
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  aria-hidden="true"
                >
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto overflow-x-auto bg-white">
          {format === 'table' ? (
            /* ── Tabla general ─────────────────────────────────────────────── */
            <div className="p-8 min-w-[700px]">
              <h2 className="text-center text-sm font-bold tracking-[0.2em] mb-5 uppercase">Cuaderno de Campo</h2>

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
                    <td className="border border-gray-700 px-3 py-2" colSpan={5}>
                      {session.titulo ?? '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-700 px-3 py-2 font-bold">ÁREA</td>
                    <td className="border border-gray-700 px-3 py-2" colSpan={5}>
                      {session.area}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-700 px-3 py-2 font-bold align-top">
                      COMPETENCIA /<br />
                      CAPACIDADES
                    </td>
                    <td className="border border-gray-700 px-3 py-2" colSpan={5}>
                      {session.competencia}
                      {session.capacidad && <span className="text-gray-500"> — {session.capacidad}</span>}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-700 px-3 py-2 font-bold align-top">
                      CRITERIO DE
                      <br />
                      EVALUACIÓN
                    </td>
                    <td className="border border-gray-700 px-3 py-2" colSpan={5}>
                      {session.criterio}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-700 px-3 py-2 font-bold align-top">
                      EVIDENCIA DE
                      <br />
                      APRENDIZAJE
                    </td>
                    <td className="border border-gray-700 px-3 py-2" colSpan={5}>
                      {session.evidencia ?? '—'}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-700 px-3 py-2.5 text-center w-10 bg-gray-100">Nº</th>
                    <th className="border border-gray-700 px-3 py-2.5 text-center w-40 bg-gray-100">
                      NOMBRE Y<br />
                      APELLIDOS
                    </th>
                    <th className="border border-gray-700 px-3 py-2.5 text-center bg-gray-100">
                      DESCRIPCIÓN DE EVIDENCIAS
                    </th>
                    <th className="border border-gray-700 px-3 py-2.5 text-center w-48 bg-gray-100">RETROALIMENTACIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.name} className="align-top">
                      <td className="border border-gray-700 px-2 py-3 text-center text-gray-400 text-xs">
                        {row.isGroup ? '—' : row.num}
                      </td>
                      <td className={`border border-gray-700 px-3 py-3 ${row.isGroup ? 'italic text-gray-500' : ''}`}>
                        {row.name}
                      </td>
                      <td className="border border-gray-700 px-3 py-3 whitespace-pre-line">{row.evidencia || null}</td>
                      <td className="border border-gray-700 px-3 py-3 whitespace-pre-line">
                        {row.retroalimentacion || null}
                      </td>
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
          ) : (
            /* ── Fichas por estudiante ──────────────────────────────────────── */
            <div className="p-8 min-w-[600px] space-y-8 text-left">
              <h2 className="text-center text-sm font-bold tracking-[0.2em] uppercase text-warm-900 mb-6">
                Fichas de Observación Pedagógica
              </h2>
              {fichas.length > 0 ? (
                fichas.map((ficha) => {
                  const intereses = [ficha.contexto, ficha.accion].filter(Boolean).join('\n');
                  const capacidades = [ficha.interpretacionSugerida, ficha.interpretacion].filter(Boolean).join('\n');
                  return (
                    <div key={ficha.id} className="border-2 border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
                        <h3 className="text-base font-extrabold text-warm-900 capitalize">
                          {ficha.studentName}
                        </h3>
                        <span className="text-xs font-bold text-warm-500 bg-warm-100 px-2.5 py-1 rounded-lg">
                          🕒 {fecha} — {ficha.timestamp}
                        </span>
                      </div>
                      {/* Meta */}
                      <table className="w-full border-collapse text-sm mb-4">
                        <tbody>
                          <tr>
                            <td className="border border-gray-700 px-2 py-1.5 font-bold text-xs">EDAD</td>
                            <td className="border border-gray-700 px-2 py-1.5 text-sm">{ficha.grado}</td>
                            <td className="border border-gray-700 px-2 py-1.5 font-bold text-xs">SECCIÓN</td>
                            <td className="border border-gray-700 px-2 py-1.5 text-sm">{ficha.seccion}</td>
                            <td className="border border-gray-700 px-2 py-1.5 font-bold text-xs">FECHA / HORA</td>
                            <td className="border border-gray-700 px-2 py-1.5 text-sm">{fecha} — {ficha.timestamp}</td>
                          </tr>
                        </tbody>
                      </table>
                      {/* Sección 1 */}
                      <div className="mb-4">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider mb-1">1. Situación observada</p>
                        <p className="text-[11px] text-gray-400 italic mb-2">
                          ¿Qué hace el niño(a)? ¿Cómo interactúa con objetos, el espacio y las personas? (Describir sin interpretar)
                        </p>
                        <div className="border border-gray-700 px-4 py-3 min-h-[56px] text-sm bg-warm-50/20 rounded-lg whitespace-pre-line text-warm-850 font-medium">
                          {ficha.situacion}
                        </div>
                      </div>
                      {/* Sección 2 */}
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wider mb-1">2. Análisis pedagógico</p>
                        <p className="text-[11px] text-gray-400 italic mb-2">Se realiza entre las docentes responsables de una misma aula</p>
                        <div className="border border-gray-500 px-3 py-2 min-h-[36px] text-sm whitespace-pre-line mb-2 bg-white rounded-lg">
                          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Intereses e iniciativas del niño(a)</span>
                          {intereses || <span className="text-gray-300">—</span>}
                        </div>
                        <div className="border border-gray-500 px-3 py-2 min-h-[36px] text-sm whitespace-pre-line mb-2 bg-white rounded-lg">
                          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Combinación de capacidades que muestran el desarrollo de las Competencias</span>
                          {capacidades || <span className="text-gray-300">—</span>}
                        </div>
                        <div className="border border-gray-500 px-3 py-2 min-h-[36px] text-sm whitespace-pre-line bg-white rounded-lg">
                          <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Necesidades o dificultades</span>
                          {ficha.retroalimentacion || <span className="text-gray-300">—</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-warm-500 bg-white rounded-xl border border-dashed border-warm-200">
                  <span className="text-4xl block mb-2">📋</span>
                  <p className="font-bold">No hay fichas individuales de observación registradas en esta sesión.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(CuadernoCampo);
