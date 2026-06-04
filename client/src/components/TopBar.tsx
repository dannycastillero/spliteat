import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoginModal from './LoginModal'

export default function TopBar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showLogin, setShowLogin] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-6 pb-2">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <span className="text-primary">🍽️</span>
          <span className="font-heading font-bold text-lg">SplitEat</span>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <button
              className="text-xs text-on-surface-variant underline"
              onClick={() => navigate('/history')}
            >
              Mis facturas
            </button>
            <button
              className="text-xs text-on-surface-variant"
              onClick={signOut}
            >
              Salir
            </button>
          </div>
        ) : (
          <button
            className="text-sm font-semibold text-primary"
            onClick={() => setShowLogin(true)}
          >
            Iniciar sesión
          </button>
        )}
      </header>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}
