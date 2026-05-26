interface SelectionCardsProps {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  columns?: 2 | 3 | 4;
}

export default function SelectionCards({ label, value, options, onChange, columns = 3 }: SelectionCardsProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns];

  return (
    <div className="shrink-0">
      <p className="text-label mb-2">{label}</p>
      <div className={`grid ${gridCols} gap-2`}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={[
              'rounded-xl border-2 py-3 px-2 text-lg font-extrabold transition-all duration-200 focus-ring-warm',
              value === option
                ? 'border-coral-500 bg-coral-500/10 text-coral-600 shadow-[0_2px_10px_-2px_rgba(224,122,95,0.15)]'
                : 'border-cream-dark bg-white text-warm-700 hover:border-lilac-300',
            ].join(' ')}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
