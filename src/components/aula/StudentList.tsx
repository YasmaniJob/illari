import type { StudentDto } from '../../lib/api/client';

interface StudentListProps {
  students: StudentDto[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  variant: 'carousel' | 'sidebar';
  grado?: string;
  seccion?: string;
}

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  const colors = ['bg-coral-500', 'bg-lilac-500', 'bg-sky-300', 'bg-honey-400', 'bg-mint-400'];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${colors[idx]} text-sm font-extrabold text-white select-none`}
    >
      {initial}
    </span>
  );
}

function GeneralOption({
  selected,
  onSelect,
  grado,
  seccion,
}: {
  selected: boolean;
  onSelect: () => void;
  grado?: string;
  seccion?: string;
}) {
  const subtext = grado && seccion ? `${grado}, ${seccion}` : 'Grupo completo';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex w-full items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-150 focus-ring-warm text-left border text-sm font-bold',
        selected
          ? 'bg-honey-100/60 border-honey-300/80 shadow-sm text-warm-900'
          : 'hover:bg-honey-50 hover:border-honey-200/50 border-transparent text-warm-850',
      ].join(' ')}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-cream-dark text-base select-none shadow-sm">
        🏫
      </span>
      <div className="min-w-0 flex-1">
        <span className="block leading-tight">Aula General</span>
        <span className="text-xs font-semibold text-warm-500 mt-0.5 block truncate">{subtext}</span>
      </div>
      {selected && (
        <span className="flex items-center gap-1 text-[10px] font-extrabold text-honey-700 bg-honey-200/50 px-2 py-0.5 rounded-lg shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-honey-500 animate-pulse" />
          Activo
        </span>
      )}
    </button>
  );
}

export default function StudentList({ students, selectedId, onSelect, variant, grado, seccion }: StudentListProps) {
  if (variant === 'carousel') {
    return (
      <div className="md:hidden">
        {/* Label */}
        <p className="text-[11px] font-extrabold text-warm-500 uppercase tracking-wider mb-2 px-1">
          Anotar en cuaderno de:
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
          {/* Opción general */}
          <button
            key="general"
            type="button"
            onClick={() => onSelect(null)}
            className={[
              'flex items-center gap-2 shrink-0 snap-start rounded-xl border px-3.5 py-2 transition-all duration-150 focus-ring-warm',
              selectedId === null
                ? 'border-honey-300 bg-honey-100/60 shadow-sm'
                : 'border-cream-dark bg-white hover:bg-honey-50 hover:border-honey-200',
            ].join(' ')}
          >
            <span className="text-base">🏫</span>
            <div className="text-left">
              <span className="text-sm font-bold text-warm-800 block leading-tight whitespace-nowrap">
                Aula General
              </span>
              {grado && seccion && (
                <span className="text-[10px] font-semibold text-warm-500 block mt-0.5 whitespace-nowrap">
                  {grado} - "{seccion}"
                </span>
              )}
            </div>
            {selectedId === null && <span className="h-1.5 w-1.5 rounded-full bg-honey-500 shrink-0" />}
          </button>

          {students.map((student) => (
            <button
              key={student.id}
              type="button"
              onClick={() => onSelect(student.id)}
              className={[
                'flex items-center gap-2 shrink-0 snap-start rounded-xl border px-3.5 py-2 transition-all duration-150 focus-ring-warm',
                selectedId === student.id ? 'border-lilac-300 bg-lilac-50 shadow-sm' : 'border-cream-dark bg-white',
              ].join(' ')}
            >
              <Avatar name={student.name} />
              <div className="text-left">
                <span className="text-sm font-bold text-warm-900 block leading-tight whitespace-nowrap capitalize">
                  {student.name}
                </span>
                {selectedId === student.id && (
                  <span className="flex items-center gap-1 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-lilac-500 shrink-0" />
                    <span className="text-[10px] font-extrabold text-lilac-600">Anotando</span>
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className="flex flex-col h-full bg-white">
      {/* Lista */}
      <ul className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Opción: General */}
        <li>
          <GeneralOption
            selected={selectedId === null}
            onSelect={() => onSelect(null)}
            grado={grado}
            seccion={seccion}
          />
        </li>

        {/* Separador */}
        {students.length > 0 && (
          <li className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-extrabold text-warm-400 uppercase tracking-wider">
              Estudiantes inscritos ({students.length})
            </p>
          </li>
        )}

        {students.map((student) => (
          <li key={student.id}>
            <button
              type="button"
              onClick={() => onSelect(student.id)}
              className={[
                'flex w-full items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-150 focus-ring-warm text-left border text-sm font-bold',
                selectedId === student.id
                  ? 'bg-lilac-50 border-lilac-200/80 shadow-sm text-warm-900'
                  : 'bg-white border-cream-dark hover:bg-cream/65 shadow-sm text-warm-850',
              ].join(' ')}
            >
              <Avatar name={student.name} />
              <div className="min-w-0 flex-1">
                <span className="block truncate capitalize">{student.name}</span>
                {selectedId === student.id && (
                  <span className="flex w-fit items-center gap-1 text-[10px] font-extrabold text-lilac-700 bg-lilac-100/50 px-2 py-0.5 rounded-lg shrink-0 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-lilac-500 animate-pulse" />
                    En cuaderno
                  </span>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
