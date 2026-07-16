interface MiWawitaLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { box: 'h-10 w-10', text: 'text-xl' },
  md: { box: 'h-14 w-14', text: 'text-3xl' },
  lg: { box: 'h-16 w-16', text: 'text-4xl' },
};

export default function MiWawitaLogo({ size = 'md' }: MiWawitaLogoProps) {
  const s = sizes[size];
  return (
    <span className={`flex items-center gap-3 ${s.text}`}>
      {/* Huella-Cuaderno SVG Logo */}
      <svg className={`${s.box} shrink-0 pointer-events-none`} viewBox="0 0 120 120" fill="none">
        {/* Planta del pie: Hoja de Registro (Lila de la App) */}
        <rect x="42" y="46" width="36" height="46" rx="8" fill="#818CF8" />

        {/* Líneas de escritura / Registro pedagógico (Blanco) */}
        <line x1="51" y1="58" x2="69" y2="58" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="51" y1="69" x2="69" y2="69" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="51" y1="80" x2="69" y2="80" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />

        {/* Deditos del bebé redondeados (Coral de la App) */}
        <circle cx="39" cy="36" r="6" fill="#E07A5F" />
        <circle cx="49.5" cy="28" r="5.5" fill="#E07A5F" />
        <circle cx="61.5" cy="25" r="5" fill="#E07A5F" />
        <circle cx="73.5" cy="28" r="4.5" fill="#E07A5F" />
        <circle cx="83.5" cy="36" r="3.5" fill="#E07A5F" />
      </svg>
      <span className="font-extrabold text-warm-900 tracking-tight">Mi Wawita</span>
    </span>
  );
}
