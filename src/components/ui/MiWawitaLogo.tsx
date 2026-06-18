interface MiWawitaLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { box: 'h-10 w-10 text-lg', text: 'text-xl' },
  md: { box: 'h-14 w-14 text-2xl', text: 'text-3xl' },
  lg: { box: 'h-16 w-16 text-3xl', text: 'text-4xl' },
};

export default function MiWawitaLogo({ size = 'md' }: MiWawitaLogoProps) {
  const s = sizes[size];
  return (
    <span className={`flex items-center gap-3 ${s.text}`}>
      <span
        className={`${s.box} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-lilac-500 to-lilac-600 font-extrabold text-white shadow-[0_4px_16px_-2px_rgba(139,92,246,0.5)]`}
      >
        M
      </span>
      <span className="font-extrabold text-warm-900 tracking-tight">Mi Wawita</span>
    </span>
  );
}
