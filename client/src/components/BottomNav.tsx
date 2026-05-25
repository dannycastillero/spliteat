import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/', label: 'Upload', icon: '↑' },
  { path: '/review', label: 'Review', icon: '☰' },
  { path: '/assign', label: 'Assign', icon: '👤' },
  { path: '/summary', label: 'Summary', icon: '💰' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 flex">
      {tabs.map(tab => {
        const active = location.pathname === tab.path
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex-1 flex flex-col items-center py-3 text-xs font-heading font-semibold transition-colors
              ${active ? 'text-primary' : 'text-gray-400'}`}
          >
            {active ? (
              <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-lg mb-1">
                {tab.icon}
              </span>
            ) : (
              <span className="text-xl mb-1">{tab.icon}</span>
            )}
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
