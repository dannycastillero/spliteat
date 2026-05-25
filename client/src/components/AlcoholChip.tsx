interface AlcoholChipProps {
  confirmed: boolean
  onConfirm: () => void
  onDeny: () => void
}

export default function AlcoholChip({ confirmed, onConfirm, onDeny }: AlcoholChipProps) {
  if (confirmed) {
    return (
      <button
        onClick={onDeny}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-bold"
      >
        🍺 Licor
      </button>
    )
  }

  return (
    <button
      onClick={onConfirm}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold border border-orange-300"
    >
      ¿Licor?
    </button>
  )
}
