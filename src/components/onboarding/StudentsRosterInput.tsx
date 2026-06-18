import { useCallback, useRef, useState } from 'react';

interface StudentsRosterInputProps {
  names: string[];
  onChange: (names: string[]) => void;
}

// ─── Parser robusto ───────────────────────────────────────────────────────────
// Maneja: saltos de línea, tabs, comas, punto y coma, numeración (1. 2- •),
// teléfonos, emails, y descarta basura no-nombre.

function parseRawText(raw: string): string[] {
  return raw
    .split(/[\n\r\t,;]+/)
    .map((s) => s.trim())
    .map((s) => s.replace(/^[\d]+[.):\-\s]+/, '').replace(/^[•\-*]\s*/, '').trim())
    .filter((s) => !/\d{6,}/.test(s))       // descartar teléfonos
    .filter((s) => !/@/.test(s))             // descartar emails
    .filter((s) => s.length >= 2 && s.length <= 60)
    .filter((s) => /[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(s)); // al menos una letra
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
      if (parsed.length === 0) { onFileError('Sin nombres válidos en el archivo'); return; }
      onFileImport(parsed);
    } catch {
      onFileError('No se pudo leer el archivo');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="flex items-center gap-2">
      {fileError && <span className="text-xs font-semibold text-coral-600">⚠ {fileError}</span>}
      <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv,.xlsx" className="sr-only" onChange={handleFileChange} aria-label="Importar lista desde archivo" />
      <button
        type="button"
        onClick={() => { onFileError(null); fileInputRef.current?.click(); }}
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
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validNames = names.filter((n) => n.trim().length >= 2);

  const mergeNames = useCallback(
    (incoming: string[]) => {
      const existing = names.filter((n) => n.trim().length >= 2);
      onChange([...new Set([...existing, ...incoming])]);
    },
    [names, onChange],
  );

  function removeChip(name: string) {
    onChange(names.filter((n) => n !== name));
  }

  // Confirma el valor actual del input como un nombre
  function commitInput(value: string) {
    const trimmed = value.trim().replace(/,$/, '');
    if (trimmed.length >= 2) mergeNames([trimmed]);
    setInputValue('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitInput(inputValue);
    }
    if (e.key === 'Backspace' && inputValue === '' && validNames.length > 0) {
      onChange(names.filter((n) => n !== validNames[validNames.length - 1]));
    }
  }

  // Paste inteligente: detecta automáticamente si es lista o nombre simple
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text');
    const parsed = parseRawText(text);
    const isMultiline = text.includes('\n') || text.includes('\r') || text.includes('\t');
    const isLikelyList = parsed.length > 1 || isMultiline;

    if (isLikelyList) {
      e.preventDefault();
      mergeNames(parsed);
      setInputValue('');
    }
    // Si es un solo nombre sin separadores, deja que el input lo reciba normalmente
  }

  // En mobile, onChange puede recibir texto pegado sin disparar onPaste
  // Detectamos si el nuevo valor contiene separadores y lo procesamos
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    const hasMultiline = val.includes('\n') || val.includes('\r');
    const hasSeparators = val.includes('\t') || (val.includes(',') && val.split(',').length > 2);

    if (hasMultiline || hasSeparators) {
      const parsed = parseRawText(val);
      if (parsed.length > 1) {
        mergeNames(parsed);
        setInputValue('');
        return;
      }
    }
    setInputValue(val);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      {/* Contador */}
      <p className="shrink-0 text-sm font-semibold text-warm-600">
        {validNames.length > 0
          ? `${validNames.length} niño${validNames.length !== 1 ? 's' : ''} en la lista`
          : 'Escribe o pega los nombres de tu aula'}
      </p>

      {/* Área de chips + input */}
      <div
        className="flex-1 min-h-0 rounded-2xl border-2 border-cream-dark bg-white px-3 py-3 flex flex-col gap-2 cursor-text transition-all duration-200 overflow-hidden"
        onClick={() => inputRef.current?.focus()}
      >
        {validNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5 overflow-y-auto max-h-44 pr-0.5">
            {validNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-xl bg-lilac-100 border border-lilac-200 pl-3 pr-1.5 py-1 text-sm font-semibold text-lilac-800 transition-colors hover:bg-lilac-200/70"
              >
                {name}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeChip(name); }}
                  aria-label={`Quitar ${name}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-lilac-500 hover:bg-lilac-300 hover:text-lilac-900 transition-colors text-xs font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => commitInput(inputValue)}
          placeholder={validNames.length === 0 ? 'Escribe un nombre o pega la lista completa…' : 'Añadir otro…'}
          className="w-full bg-transparent text-base text-warm-900 placeholder:text-warm-400 outline-none min-w-[120px]"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
        />
      </div>

      {/* Hint mínimo */}
      <p className="shrink-0 text-xs text-warm-500 font-semibold">
        Escribe y pulsa <kbd className="rounded bg-cream-dark px-1 py-0.5 font-mono text-[10px]">Enter</kbd>, o pega directamente desde WhatsApp, Word o Excel
      </p>
    </div>
  );
}
