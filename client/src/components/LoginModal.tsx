import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface LoginModalProps {
  onClose: () => void
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await signIn(email)
      setSent(true)
    } catch {
      alert('No se pudo enviar el enlace. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-10"
        onClick={e => e.stopPropagation()}
      >
        {sent ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📬</div>
            <h2 className="font-heading font-bold text-xl mb-2">¡Revisa tu email!</h2>
            <p className="text-on-surface-variant text-sm">
              Te enviamos un enlace a <strong>{email}</strong>. Haz click en él para entrar.
            </p>
            <button
              className="mt-6 w-full py-3 rounded-full bg-primary text-white font-semibold"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-heading font-bold text-xl mb-1">Iniciar sesión</h2>
            <p className="text-on-surface-variant text-sm mb-6">
              Ingresa tu email y te enviamos un enlace mágico para entrar.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-primary text-white font-semibold disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
