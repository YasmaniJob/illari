import type { StudentDto } from '../../lib/api/client';

interface StudentListProps {
  students: StudentDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  variant: 'carousel' | 'sidebar';
}

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  const colors = ['bg-coral-500', 'bg-lilac-500', 'bg-sky-300', 'bg-honey-400', 'bg-mint-400'];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${colors[idx]} text-lg font-extrabold text-white`}
    >
      {initial}
    </span>
  );
}

export default function StudentList({ students, selectedId, onSelect, variant }: StudentListProps) {
  if (variant === 'carousel') {
    return (
      <div className="md:hidden">
        <p className="text-lg font-extrabold text-warm-900 mb-3 px-1">Mis pequeños</p>
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
          {students.map((student) => (
            <button
              key={student.id}
              type="button"
              onClick={() => onSelect(student.id)}
              className={[
                'flex flex-col items-center gap-2 shrink-0 snap-start rounded-2xl border-2 px-4 py-3 transition-all duration-200 focus-ring-warm min-w-[5.5rem]',
                selectedId === student.id
                  ? 'border-coral-500 bg-coral-500/10 shadow-[0_4px_12px_-2px_rgba(224,122,95,0.25)]'
                  : 'border-cream-dark bg-white',
              ].join(' ')}
            >
              <Avatar name={student.name} />
              <span className="text-base font-bold text-warm-900">{student.name}</span>
              <span
                className={['h-2.5 w-2.5 rounded-full', student.active ? 'bg-mint-400' : 'bg-cream-dark'].join(' ')}
                title={student.active ? 'Participando' : 'En espera'}
              />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className="hidden md:flex md:flex-col h-full border-r-2 border-cream-dark bg-white">
      <div className="px-5 py-6 border-b-2 border-cream-dark bg-gradient-to-b from-cream to-white">
        <h2 className="text-2xl font-extrabold text-warm-900">Mis pequeños</h2>
        <p className="text-lg text-warm-700 mt-1 font-semibold">
          {students.filter((s) => s.active).length} participando ahora
        </p>
      </div>
      <ul className="flex-1 overflow-y-auto p-4 space-y-2">
        {students.map((student) => (
          <li key={student.id}>
            <button
              type="button"
              onClick={() => onSelect(student.id)}
              className={[
                'flex w-full items-center gap-4 rounded-2xl px-4 py-4 transition-all duration-200 focus-ring-warm text-left',
                selectedId === student.id
                  ? 'bg-lilac-100 border-2 border-lilac-500/40'
                  : 'hover:bg-cream border-2 border-transparent',
              ].join(' ')}
            >
              <Avatar name={student.name} />
              <div className="min-w-0 flex-1">
                <span className="text-xl font-bold text-warm-900 block truncate">{student.name}</span>
                <span className="text-base font-semibold text-warm-500">
                  {student.active ? 'Participando' : 'En espera'}
                </span>
              </div>
              <span
                className={['h-3 w-3 rounded-full shrink-0', student.active ? 'bg-mint-400' : 'bg-cream-dark'].join(
                  ' ',
                )}
              />
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
