import { useRef, useState } from 'react';
import { createSession } from '../../lib/api/client';
import type { CurriculumRow } from '../../lib/curriculum';
import type { MatchedScanResult } from '../../lib/curriculumMatch';
import { validateCurricularRow } from '../../lib/scan/catalog';
import { compressImageForScan } from '../../lib/scan/compressImage';
import type { ScanWorkflowPhase } from '../../lib/scan/phases';
import type { CurricularValues } from './CurricularFieldsEditor';
import ScanPhaseIndicator from './ScanPhaseIndicator';
import ScanSummary from './ScanSummary';

interface ScanSessionFlowProps {
  curriculum: CurriculumRow[];
}

interface ScanApiResponse {
  extracted: Record<string, string>;
  matched: MatchedScanResult;
  mode?: 'vision';
  error?: string;
}

export default function ScanSessionFlow({ curriculum }: ScanSessionFlowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [workflow, setWorkflow] = useState<ScanWorkflowPhase>('capture');
  const [processingStep, setProcessingStep] = useState<'extract' | 'catalog'>('extract');
  const [error, setError] = useState<string | null>(null);
  const [matched, setMatched] = useState<MatchedScanResult | null>(null);

  const [titulo, setTitulo] = useState('');
  const [grado, setGrado] = useState('');
  const [seccion, setSeccion] = useState('');
  const [curricular, setCurricular] = useState<CurricularValues>({
    area: '',
    competencia: '',
    capacidad: '',
    criterio: '',
  });

  async function processFile(file: File) {
    setError(null);
    setWorkflow('processing');
    setProcessingStep('extract');

    try {
      const { base64, mimeType } = await compressImageForScan(file);
      const res = await fetch('/api/scan-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      setProcessingStep('catalog');
      const data = (await res.json()) as ScanApiResponse;
      if (!res.ok) throw new Error(data.error ?? 'Error al escanear');
      applyResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo analizar la imagen');
      setWorkflow('capture');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function applyResult(data: ScanApiResponse) {
    const m = data.matched;
    setMatched(m);
    setTitulo(m.titulo.value);
    setGrado(m.grado.value);
    setSeccion(m.seccion.value);
    setCurricular({
      area: m.area.value,
      competencia: m.competencia.value,
      capacidad: m.capacidad.value,
      criterio: m.criterio.value,
    });
    setWorkflow('review');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
  }

  function handleRescan() {
    setMatched(null);
    setError(null);
    setWorkflow('capture');
    setProcessingStep('extract');
  }

  function canStart(): boolean {
    return !!(
      validateCurricularRow(
        curricular.area,
        curricular.competencia,
        curricular.capacidad,
        curricular.criterio,
        curriculum,
      ) &&
      grado &&
      seccion
    );
  }

  async function handleStart() {
    if (!canStart()) return;
    try {
      await createSession({
        titulo: titulo.trim() || undefined,
        grado,
        seccion,
        area: curricular.area,
        competencia: curricular.competencia,
        capacidad: curricular.capacidad,
        criterio: curricular.criterio,
      });
      window.location.href = '/aula';
    } catch {
      setError('No se pudo crear la sesión. Intenta de nuevo.');
    }
  }

  if (workflow === 'review' && matched) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <ScanPhaseIndicator workflow="review" />
        <ScanSummary
          curriculum={curriculum}
          matched={matched}
          curricular={curricular}
          titulo={titulo}
          grado={grado}
          seccion={seccion}
          onTituloChange={setTitulo}
          onGradoChange={setGrado}
          onSeccionChange={setSeccion}
          onCurricularChange={setCurricular}
          onRescan={handleRescan}
          onStart={handleStart}
          canStart={canStart()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <ScanPhaseIndicator workflow={workflow} processingStep={processingStep} />

      {workflow === 'capture' && (
        <header className="shrink-0 mb-4">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-base font-bold text-warm-700 hover:text-coral-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Inicio
          </a>
        </header>
      )}

      <div className="rounded-xl border-2 border-lilac-200 bg-lilac-100/50 px-3 py-2 text-xs font-semibold text-warm-800 shrink-0 mb-4">
        Fase 1–3: sin guardar foto, audio ni archivos. Solo texto en pantalla.
      </div>

      {workflow === 'processing' ? (
        <div className="card-warm flex flex-1 flex-col items-center justify-center p-8 text-center min-h-0">
          <div
            className="h-12 w-12 rounded-full border-4 border-coral-500 border-t-transparent animate-spin mb-5"
            aria-hidden
          />
          <p className="text-lg font-extrabold text-warm-900">
            {processingStep === 'extract' ? 'Fase 2 · Leyendo planificación…' : 'Fase 3 · Cruzando con catálogo CNEB…'}
          </p>
          <p className="text-sm text-warm-700 mt-2 max-w-xs">
            {processingStep === 'extract' ? 'Extracción en memoria con Gemini.' : 'Emparejando con data/curriculo.csv.'}
          </p>
        </div>
      ) : (
        <div className="card-warm flex flex-1 flex-col items-center justify-center p-6 text-center gap-5 min-h-0">
          <span className="text-4xl" aria-hidden>
            📷
          </span>
          <p className="text-lg font-extrabold text-warm-900">Fase 1 · Captura</p>
          <p className="text-sm text-warm-600 max-w-xs">Enfoca título, competencia, capacidad y criterio de la hoja.</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-primary w-full max-w-sm py-3.5 text-base"
          >
            Abrir cámara o galería
          </button>
          <a href="/onboarding" className="btn-secondary w-full max-w-sm py-3 text-base text-center">
            Completar manualmente (wizard)
          </a>
          {error && (
            <p className="text-sm font-semibold text-coral-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
