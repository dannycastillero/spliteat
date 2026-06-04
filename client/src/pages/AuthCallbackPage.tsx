import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/history', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    })
  }, [navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
      <div className="text-4xl mb-4">🍽️</div>
      <p className="text-on-surface-variant text-sm">Iniciando sesión...</p>
    </div>
  )
}
