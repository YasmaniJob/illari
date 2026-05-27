import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface CustomSelectProps {
  label: string;
  hint?: string;
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/** Detecta si estamos en un viewport mobile (< 768px) */
function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

export default function CustomSelect({
  label,
  hint,
  value,
  options,
  placeholder = 'Toca para elegir…',
  disabled = false,
  onChange,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mobile, setMobile] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  function openDropdown() {
    if (disabled || !triggerRef.current) return;
    const nowMobile = isMobile();
    setMobile(nowMobile);

    if (!nowMobile) {
      // Desktop: dropdown posicionado relativo al trigger
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = Math.min(options.length * 64, 256);
      const showAbove = spaceBelow < dropdownHeight + 8 && rect.top > dropdownHeight + 8;
      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        ...(showAbove ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      });
    }
    setOpen(true);
  }

  // Cierra al hacer click fuera (solo desktop)
  useEffect(() => {
    if (!open || mobile) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        !(triggerRef.current?.contains(target)) &&
        !(dropdownRef.current?.contains(target))
      ) {
        setOpen(false);
      }
    }
    const id = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, mobile]);

  // Cierra al scroll externo (solo desktop)
  useEffect(() => {
    if (!open || mobile) return;
    function handleScroll(e: Event) {
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [open, mobile]);

  // Bloquea scroll del body cuando el bottom sheet está abierto
  useEffect(() => {
    if (open && mobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, mobile]);

  const display = value || placeholder;

  // ── Desktop dropdown ──────────────────────────────────────────────────────
  const desktopDropdown =
    open && !mobile && options.length > 0 ? (
      <ul
        ref={dropdownRef}
        id={listId}
        role="listbox"
        style={dropdownStyle}
        className="max-h-64 overflow-auto rounded-2xl border-2 border-cream-dark bg-white py-2 shadow-[0_12px_32px_-8px_rgba(61,44,41,0.18)]"
      >
        {options.map((opt) => (
          <li key={opt} role="option" aria-selected={value === opt}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                setOpen(false);
              }}
              className={[
                'flex w-full items-start gap-3 px-5 py-4 text-left text-lg transition-colors duration-200',
                value === opt ? 'bg-lilac-100 text-lilac-600 font-bold' : 'text-warm-900 hover:bg-cream font-medium',
              ].join(' ')}
            >
              {value === opt && (
                <svg className="mt-1 h-5 w-5 shrink-0 text-lilac-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className={value === opt ? '' : 'pl-8'}>{opt}</span>
            </button>
          </li>
        ))}
      </ul>
    ) : null;

  // ── Mobile bottom sheet ───────────────────────────────────────────────────
  const mobileSheet =
    open && mobile ? (
      <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
        {/* Sheet */}
        <div
          className="relative bg-white rounded-t-3xl shadow-[0_-8px_40px_-8px_rgba(61,44,41,0.25)] animate-slide-up"
          style={{ animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1) both' }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-warm-500/20" />
          </div>
          {/* Label */}
          <div className="px-5 pt-2 pb-3 border-b border-cream-dark">
            <p className="text-base font-extrabold text-warm-900">{label}</p>
          </div>
          {/* Options */}
          <ul
            ref={dropdownRef}
            id={listId}
            role="listbox"
            className="overflow-y-auto overscroll-contain"
            style={{ maxHeight: '55dvh' }}
          >
            {options.map((opt) => (
              <li key={opt} role="option" aria-selected={value === opt}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={[
                    'flex w-full items-center gap-3 px-5 py-4 text-left text-lg border-b border-cream-dark/60 transition-colors duration-150 active:bg-cream',
                    value === opt ? 'bg-lilac-100/60 text-lilac-700 font-bold' : 'text-warm-900 font-medium',
                  ].join(' ')}
                >
                  <span className="flex-1">{opt}</span>
                  {value === opt && (
                    <svg className="h-5 w-5 shrink-0 text-lilac-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {/* Safe area bottom */}
          <div className="h-[env(safe-area-inset-bottom,1rem)]" />
        </div>
      </div>
    ) : null;

  return (
    <div className="relative w-full">
      {label && <label className="text-base font-bold text-warm-900 mb-1.5 block">{label}</label>}
      {hint && <p className="mb-2 text-base text-warm-700">{hint}</p>}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className={[
          'flex w-full min-h-[3.25rem] items-center justify-between gap-3 rounded-2xl border-2 border-cream-dark',
          'bg-white px-4 py-3 text-left text-base shadow-[0_2px_10px_-2px_rgba(61,44,41,0.08)]',
          'focus-ring-warm transition-all duration-200',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-coral-500/40',
          value ? 'text-warm-900 font-semibold' : 'text-warm-500',
        ].join(' ')}
      >
        <span className="line-clamp-3 flex-1 leading-snug">{display}</span>
        <svg
          className={`h-6 w-6 shrink-0 text-coral-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {typeof document !== 'undefined' && createPortal(
        <>
          {desktopDropdown}
          {mobileSheet}
        </>,
        document.body,
      )}
    </div>
  );
}
