interface TipSelectorProps {
  value: number
  onChange: (pct: number) => void
}

const OPTIONS = [0, 10, 15, 20]

export default function TipSelector({ value, onChange }: TipSelectorProps) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map(pct => (
        <button
          key={pct}
          onClick={() => onChange(pct)}
          className={`flex-1 py-2.5 rounded-full text-sm font-heading font-semibold border-2 transition-colors
            ${value === pct
              ? 'border-primary bg-primary text-white'
              : 'border-gray-200 bg-white text-on-surface'
            }`}
        >
          {pct === 0 ? 'None' : `${pct}%`}
        </button>
      ))}
    </div>
  )
}
