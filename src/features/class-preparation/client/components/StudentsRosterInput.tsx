import { useCallback, useEffect, useRef, useState } from 'react';

interface StudentsRosterInputProps {
  names: string[];
  onChange: (names: string[]) => void;
}

// ─── Parser robusto ───────────────────────────────────────────────────────────
// Maneja: saltos de línea, tabs, comas, punto y coma, numeración (1. 2- •),
// teléfonos, emails, y descarta basura no-nombre.

const HEADERS_TO_IGNORE = [
  'nombre',
  'nombres',
  'estudiante',
  'estudiantes',
  'alumno',
  'alumnos',
  'nombres de estudiantes',
  'nombres de alumnos',
  'lista de estudiantes',
  'lista de alumnos',
  'name',
  'names',
  'student',
  'students',
  'student name',
  'student names',
  'roster',
  'list',
];

function parseRawText(raw: string): string[] {
  return raw
    .split(/[\n\r\t,;]+/)
    .map((s) => s.trim())
    .map((s) =>
      s
        .replace(/^[\d]+[.):\-\s]+/, '')
        .replace(/^[•\-*]\s*/, '')
        .trim(),
    )
    .filter((s) => !/\d{6,}/.test(s)) // descartar teléfonos
    .filter((s) => !/@/.test(s)) // descartar emails
    .filter((s) => s.length >= 2 && s.length <= 60)
    .filter((s) => /[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(s)) // al menos una letra
    .filter((s) => {
      const lower = s.toLowerCase();
      return !HEADERS_TO_IGNORE.some((h) => lower === h || lower.startsWith(h + ' '));
    });
}

async function parseFile(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(parseRawText(e.target?.result as string));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsText(file, 'utf-8');
  });
}

// ─── Header actions ───────────────────────────────────────────────────────────

interface RosterHeaderActionsProps {
  onFileImport: (names: string[]) => void;
  fileError: string | null;
  onFileError: (err: string | null) => void;
}

export function RosterHeaderActions({ onFileImport, fileError, onFileError }: RosterHeaderActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileError(null);
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) {
        onFileError('Sin nombres válidos en el archivo');
        return;
      }
      onFileImport(parsed);
    } catch {
      onFileError('No se pudo leer el archivo');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function downloadTemplate() {
    const sampleNames = [
      'Juan Pérez',
      'María Rodríguez',
      'Sofía Gómez',
      'Lucas Díaz',
      'Mateo Torres',
      'Valentina Silva',
    ];
    // UTF-8 BOM para soporte correcto de tildes en Excel
    const BOM = '\uFEFF';
    const csvContent = BOM + sampleNames.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'ejemplo_estudiantes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex items-center gap-2">
      {fileError && <span className="text-xs font-semibold text-coral-600">⚠ {fileError}</span>}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,.tsv,.xlsx"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Importar lista desde archivo"
      />
      <button
        type="button"
        onClick={downloadTemplate}
        title="Descargar plantilla de ejemplo (CSV)"
        className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-cream-dark bg-cream/10 px-3 py-1.5 text-xs font-bold text-warm-600 transition-all duration-200 hover:border-lilac-300 hover:text-lilac-600 hover:bg-lilac-50/50 active:scale-[0.97]"
      >
        <span aria-hidden>📄</span>
        Plantilla
      </button>
      <button
        type="button"
        onClick={() => {
          onFileError(null);
          fileInputRef.current?.click();
        }}
        title="Importar desde Excel o CSV"
        className="flex items-center gap-1.5 rounded-xl border-2 border-cream-dark bg-white px-3 py-1.5 text-xs font-bold text-warm-700 transition-all duration-200 hover:border-lilac-300 hover:bg-lilac-50/60 active:scale-[0.97]"
      >
        <span aria-hidden>📎</span>
        Importar
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function StudentsRosterInput({ names, onChange }: StudentsRosterInputProps) {
  // rows = nombres editables; siempre termina en al menos una fila vacía
  const [rows, setRows] = useState<string[]>(() => (names.length > 0 ? names : ['']));

  // Sincronizar cuando names cambia desde afuera (ej: importar archivo).
  // Comparamos por contenido para evitar loops cuando el padre re-renderiza
  // con una nueva referencia de array pero los mismos valores.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rows is conditionally set to prevent loop
  useEffect(() => {
    const currentValid = rows.filter((r) => r.trim().length >= 2).join('||');
    const incomingValid = names.join('||');
    if (currentValid === incomingValid) return; // ya sincronizado

    if (names.length === 0) {
      setRows(['']);
    } else {
      setRows([...names, '']);
    }
  }, [names]);

  // Refs para auto-focus al añadir fila
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const commitRows = useCallback(
    (updated: string[]) => {
      const valid = updated.filter((r) => r.trim().length >= 2);
      onChange(valid);
    },
    [onChange],
  );

  function handleChange(index: number, value: string) {
    // Detectar paste con separadores en onChange (mobile)
    const hasMultiline = value.includes('\n') || value.includes('\r');
    const hasSeparators = value.includes('\t') || (value.includes(',') && value.split(',').length > 2);

    if (hasMultiline || hasSeparators) {
      const parsed = parseRawText(value);
      if (parsed.length > 1) {
        const before = rows.slice(0, index).filter((r) => r.trim().length >= 2);
        const after = rows.slice(index + 1).filter((r) => r.trim().length >= 2);
        const next = [...before, ...parsed, ...after, ''];
        setRows(next);
        commitRows(next);
        // Focus última fila real
        setTimeout(() => inputRefs.current[next.length - 1]?.focus(), 30);
        return;
      }
    }

    const next = rows.map((r, i) => (i === index ? value : r));
    setRows(next);
    commitRows(next);
  }

  function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text');
    const parsed = parseRawText(text);
    const isMultiline = text.includes('\n') || text.includes('\r') || text.includes('\t');
    const isLikelyList = parsed.length > 1 || isMultiline;

    if (isLikelyList) {
      e.preventDefault();
      const before = rows.slice(0, index).filter((r) => r.trim().length >= 2);
      const after = rows.slice(index + 1).filter((r) => r.trim().length >= 2);
      const next = [...before, ...parsed, ...after, ''];
      setRows(next);
      commitRows(next);
      setTimeout(() => inputRefs.current[next.length - 1]?.focus(), 30);
    }
  }

  function handleRemove(index: number) {
    const next = rows.filter((_, i) => i !== index);
    // Garantizar al menos una fila vacía
    const safe = next.length === 0 ? [''] : next;
    setRows(safe);
    commitRows(safe);
    // Focus la fila anterior o la que quede
    const focusIdx = Math.max(0, index - 1);
    setTimeout(() => inputRefs.current[focusIdx]?.focus(), 30);
  }

  function handleAdd() {
    const next = [...rows, ''];
    setRows(next);
    setTimeout(() => inputRefs.current[next.length - 1]?.focus(), 30);
  }

  const validCount = rows.filter((r) => r.trim().length >= 2).length;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* Contador */}
      <p className="shrink-0 text-sm font-semibold text-warm-600">
        {validCount > 0
          ? `${validCount} estudiante${validCount !== 1 ? 's' : ''} en la lista`
          : 'Escribe o pega los nombres de tu aula'}
      </p>

      {/* Lista de inputs */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-2 pr-0.5">
        {rows.map((row, index) => {
          const isLast = index === rows.length - 1;
          const hasValue = row.trim().length >= 2;

          return (
            <div key={index} className="flex items-center gap-2">
              {/* Número de orden */}
              <span className="shrink-0 w-6 text-right text-sm font-bold text-warm-400 select-none">
                {hasValue ? index + 1 : ''}
              </span>

              <input
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                value={row}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isLast && row.trim().length >= 2) {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                onPaste={(e) => handlePaste(index, e)}
                placeholder={isLast && validCount > 0 ? 'Añadir otro…' : 'Nombre del estudiante…'}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="words"
                className="flex-1 input-warm py-3"
              />

              {/* Botón eliminar — solo si hay contenido en esa fila */}
              {hasValue && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-2 text-warm-400 hover:text-coral-500 hover:bg-coral-500/10 rounded-xl transition-all duration-200 active:scale-[0.95]"
                  title="Eliminar estudiante"
                  aria-label={`Eliminar ${row}`}
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
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              )}

              {/* Botón + — solo en la última fila, habilitado si tiene valor */}
              {isLast && (
                <button
                  type="button"
                  disabled={!hasValue}
                  onClick={handleAdd}
                  className="shrink-0 flex items-center justify-center h-[52px] w-[52px] rounded-xl border-2 border-dashed border-cream-dark bg-white text-warm-500 hover:border-coral-500/40 hover:text-coral-500 hover:bg-coral-500/5 transition-all duration-200 active:scale-[0.95] disabled:opacity-35 disabled:cursor-not-allowed disabled:active:scale-100"
                  title="Añadir estudiante"
                  aria-label="Añadir estudiante"
                >
                  <span aria-hidden="true" className="text-xl font-light leading-none">
                    +
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Hint */}
      <p className="shrink-0 text-xs text-warm-500 font-semibold">
        Puedes pegar la lista completa desde WhatsApp, Word o Excel
      </p>
    </div>
  );
}
