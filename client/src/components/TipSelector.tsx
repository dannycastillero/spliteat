import { useState } from 'react'

interface TipSelectorProps {
  value: number
  onChange: (pct: number) => void
}

const PRESETS = [0, 10, 20]

export default function TipSelector({ value, onChange }: TipSelectorProps) {
  const isPreset = PRESETS.includes(value)
  const [customMode, setCustomMode] = useState(!isPreset)
  const [customInput, setCustomInput] = useState(!isPreset ? String(value) : '')

  const selectPreset = (pct: number) => {
    setCustomMode(false)
    setCustomInput('')
    onChange(pct)
  }

  const handleCustomInput = (raw: string) => {
    setCustomInput(raw)
    const n = parseFloat(raw)
    if (!isNaN(n) && n >= 0 && n <= 100) onChange(n)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {PRESETS.map(pct => (
          <button
            key={pct}
            onClick={() => selectPreset(pct)}
            className={`flex-1 py-2.5 rounded-full text-sm font-heading font-semibold border-2 transition-colors
              ${!customMode && value === pct
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 bg-white text-on-surface'
              }`}
          >
            {pct === 0 ? '0%' : `${pct}%`}
          </button>
        ))}
        <button
          onClick={() => { setCustomMode(true); onChange(0) }}
          className={`flex-1 py-2.5 rounded-full text-sm font-heading font-semibold border-2 transition-colors
            ${customMode
              ? 'border-primary bg-primary text-white'
              : 'border-gray-200 bg-white text-on-surface'
            }`}
        >
          Otro
        </button>
      </div>

      {customMode && (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="number"
            min="0"
            max="100"
            step="1"
            value={customInput}
            onChange={e => handleCustomInput(e.target.value)}
            placeholder="Ej: 15"
            className="flex-1 border-2 border-primary rounded-full px-4 py-2.5 text-sm font-heading font-semibold text-center outline-none"
          />
          <span className="text-sm font-semibold text-on-surface-variant">%</span>
        </div>
      )}
    </div>
  )
}
