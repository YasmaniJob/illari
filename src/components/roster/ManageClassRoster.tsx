import { useEffect, useState } from 'react';
import { fetchStudents, saveStudents } from '../../lib/api/client';
import { GRADOS, SECCIONES } from '../../lib/classroom';
import StudentsRosterInput from '../onboarding/StudentsRosterInput';
import SelectionCards from '../ui/SelectionCards';

export default function ManageClassRoster() {
  const [grado, setGrado] = useState('');
  const [seccion, setSeccion] = useState('');
  const [names, setNames] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!grado || !seccion) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchStudents(grado, seccion)
      .then((students) => {
        if (cancelled) return;
        setNames(students.length > 0 ? students.map((s) => s.name) : ['']);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error al cargar');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [grado, seccion]);

  const validNames = names.filter((n) => n.trim().length >= 2);
  const canSave = !!grado && !!seccion && validNames.length >= 1;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveStudents(grado, seccion, validNames);
      setMessage(`Guardamos ${validNames.length} niño/as en Turso.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl flex flex-col gap-6">
      <header>
        <a href="/" className="inline-flex items-center gap-1.5 text-base font-bold text-warm-700 hover:text-coral-600">
          ← Inicio
        </a>
        <h1 className="text-display mt-4">Mis estudiantes</h1>
        <p className="text-lead mt-3">
          Registra los nombres reales de tu aula por grado y sección. Se usan en el aula en vivo.
        </p>
      </header>

      <div className="card-warm p-6 space-y-5">
        <SelectionCards label="Grado" value={grado} options={GRADOS} onChange={setGrado} columns={3} />
        <SelectionCards label="Sección" value={seccion} options={SECCIONES} onChange={setSeccion} columns={4} />

        {grado && seccion && (
          <>
            {loading ? (
              <p className="text-lg font-semibold text-warm-600">Cargando listado…</p>
            ) : (
              <StudentsRosterInput names={names} onChange={setNames} />
            )}
          </>
        )}

        {error && (
          <p className="text-sm font-semibold text-coral-600" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm font-semibold text-mint-600" role="status">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving || loading}
          className="btn-primary w-full py-3.5 text-base"
        >
          {saving ? 'Guardando…' : 'Guardar listado'}
        </button>
      </div>
    </div>
  );
}
