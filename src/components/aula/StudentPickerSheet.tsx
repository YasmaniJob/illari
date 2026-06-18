import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StudentDto } from '../../lib/api/client';

interface StudentPickerSheetProps {
  students: StudentDto[];
  selectedId: string | null;
  grado?: string;
  seccion?: string;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

function Avatar({ name }: { name: string }) {
  const colors = ['bg-coral-500', 'bg-lilac-500', 'bg-sky-300', 'bg-honey-400', 'bg-mint-400'];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colors[idx]} text-sm font-extrabold text-white select-none`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function StudentPickerSheet({
  students,
  selectedId,
  grado,
  seccion,
  onSelect,
  onClose,
}: StudentPickerSheetProps) {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Bloquea scroll del body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    // Foco en el buscador tras la animación
    const t = setTimeout(() => searchRef.current?.focus(), 120);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = '';
    };
  }, []);

  const filtered = query.trim()
    ? students.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
    : students;

  function pick(id: string | null) {
    onSelect(id);
    onClose();
  }

  const sheet = (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className="relative bg-white rounded-t-3xl shadow-[0_-8px_40px_-8px_rgba(61,44,41,0.25)] flex flex-col"
        style={{
          maxHeight: '80dvh',
          animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1) both',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="h-1 w-10 rounded-full bg-warm-500/20" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 border-b border-cream-dark shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-extrabold text-warm-900">
              Anotar en cuaderno de…
            </p>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-warm-500 hover:bg-cream transition-colors"
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Buscador */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Buscar entre ${students.length} estudiantes…`}
              className="w-full rounded-xl border-2 border-cream-dark bg-cream pl-9 pr-4 py-2.5 text-sm font-semibold text-warm-900 placeholder:text-warm-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Lista */}
        <ul className="overflow-y-auto overscroll-contain flex-1 py-2">
          {/* Opción: Aula General — solo si no hay búsqueda activa */}
          {!query.trim() && (
            <li>
              <button
                type="button"
                onClick={() => pick(null)}
                className={[
                  'flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors duration-150 active:bg-cream',
                  selectedId === null ? 'bg-honey-50' : 'hover:bg-cream/60',
                ].join(' ')}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-cream-dark text-base shadow-sm">
                  🏫
                </span>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-warm-900 leading-tight">Aula General</span>
                  <span className="block text-xs font-semibold text-warm-500 mt-0.5">
                    {grado && seccion ? `${grado} · Sección ${seccion}` : 'Grupo completo'}
                  </span>
                </div>
                {selectedId === null && (
                  <svg className="h-5 w-5 shrink-0 text-honey-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </li>
          )}

          {/* Separador */}
          {!query.trim() && students.length > 0 && (
            <li className="px-5 pt-3 pb-1">
              <p className="text-[10px] font-extrabold text-warm-400 uppercase tracking-wider">
                Estudiantes ({students.length})
              </p>
            </li>
          )}

          {/* Sin resultados */}
          {filtered.length === 0 && (
            <li className="px-5 py-8 text-center">
              <p className="text-sm font-semibold text-warm-500">Sin resultados para "{query}"</p>
            </li>
          )}

          {filtered.map((student) => (
            <li key={student.id}>
              <button
                type="button"
                onClick={() => pick(student.id)}
                className={[
                  'flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors duration-150 active:bg-cream border-b border-cream-dark/40 last:border-0',
                  selectedId === student.id ? 'bg-lilac-50/60' : 'hover:bg-cream/60',
                ].join(' ')}
              >
                <Avatar name={student.name} />
                <span className="flex-1 min-w-0 text-sm font-bold text-warm-900 capitalize truncate">
                  {student.name}
                </span>
                {selectedId === student.id && (
                  <svg className="h-5 w-5 shrink-0 text-lilac-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Safe area */}
        <div className="shrink-0" style={{ height: 'env(safe-area-inset-bottom, 1rem)' }} />
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : null;
}
