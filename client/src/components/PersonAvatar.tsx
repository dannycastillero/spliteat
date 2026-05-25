interface PersonAvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md'
  selected?: boolean
  onClick?: () => void
}

export default function PersonAvatar({
  name, color, size = 'md', selected = false, onClick
}: PersonAvatarProps) {
  const initials = name.slice(0, 1).toUpperCase()
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-11 h-11 text-sm'

  return (
    <button
      onClick={onClick}
      className={`rounded-full flex items-center justify-center font-heading font-bold text-white relative flex-shrink-0
        ${sizeClass} ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${selected ? 'ring-2 ring-offset-1 ring-secondary' : ''}`}
      style={{ backgroundColor: color }}
    >
      {initials}
      {selected && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-secondary rounded-full flex items-center justify-center">
          <span className="text-white text-[10px]">✓</span>
        </span>
      )}
    </button>
  )
}
