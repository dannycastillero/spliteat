import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Tab = 'signin' | 'signup'
type ForgotState = 'idle' | 'form' | 'sent'

export default function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('signin')

  const [siEmail, setSiEmail] = useState('')
  const [siPassword, setSiPassword] = useState('')
  const [siError, setSiError] = useState('')
  const [siLoading, setSiLoading] = useState(false)

  const [suName, setSuName] = useState('')
  const [suEmail, setSuEmail] = useState('')
  const [suPassword, setSuPassword] = useState('')
  const [suError, setSuError] = useState('')
  const [suLoading, setSuLoading] = useState(false)
  const [suSuccess, setSuSuccess] = useState(false)

  const [forgot, setForgot] = useState<ForgotState>('idle')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setSiError('')
    setSiLoading(true)
    try {
      await signIn(siEmail, siPassword)
      navigate('/', { replace: true })
    } catch (err: any) {
      setSiError(err.message || 'Email o contraseña incorrectos')
    } finally {
      setSiLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuError('')
    setSuLoading(true)
    try {
      await signUp(suEmail, suPassword, suName)
      setSuSuccess(true)
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } catch (err: any) {
      setSuError(err.message || 'No se pudo crear la cuenta')
    } finally {
      setSuLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotLoading(true)
    try {
      await resetPassword(forgotEmail)
    } catch {
      // always show "sent" to avoid email enumeration
    } finally {
      setForgotLoading(false)
      setForgot('sent')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-primary-dark flex flex-col items-center pt-12 pb-8 px-5">
        <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center text-6xl mb-4">
          🍽️
        </div>
        <h1 className="font-heading font-bold text-white text-2xl">Bienvenido</h1>
        <p className="text-white/70 text-sm mt-1 text-center">
          Dividir la cuenta nunca ha sido tan fácil
        </p>
      </div>

      {/* Tabs */}
      <div className="mx-4 mt-5">
        <div className="flex bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <button
            className={`flex-1 py-3 text-sm font-heading font-semibold transition-colors ${
              tab === 'signin' ? 'bg-primary text-white' : 'text-on-surface-variant'
            }`}
            onClick={() => { setTab('signin'); setForgot('idle') }}
          >
            Ingresar
          </button>
          <button
            className={`flex-1 py-3 text-sm font-heading font-semibold transition-colors ${
              tab === 'signup' ? 'bg-primary text-white' : 'text-on-surface-variant'
            }`}
            onClick={() => setTab('signup')}
          >
            Crear Cuenta
          </button>
        </div>
      </div>

      <div className="px-5 pt-6 pb-10 flex-1">

        {/* ── INGRESAR ── */}
        {tab === 'signin' && (
          <>
            {forgot === 'form' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <h2 className="font-heading font-bold text-lg">¿Olvidaste tu contraseña?</h2>
                <p className="text-on-surface-variant text-sm">
                  Ingresa tu email y te enviamos un enlace para resetearla.
                </p>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 rounded-full bg-primary text-white font-heading font-bold disabled:opacity-50"
                >
                  {forgotLoading ? 'Enviando...' : 'Enviar enlace'}
                </button>
                <button
                  type="button"
                  className="w-full text-sm text-on-surface-variant underline pt-1"
                  onClick={() => setForgot('idle')}
                >
                  Volver
                </button>
              </form>
            )}

            {forgot === 'sent' && (
              <div className="text-center py-6">
                <div className="text-5xl mb-4">📬</div>
                <h2 className="font-heading font-bold text-xl mb-2">Revisa tu email</h2>
                <p className="text-on-surface-variant text-sm mb-6">
                  Si ese correo existe en nuestro sistema, te enviamos un enlace para resetear tu contraseña.
                </p>
                <button
                  className="w-full py-3 rounded-full bg-primary text-white font-heading font-bold"
                  onClick={() => setForgot('idle')}
                >
                  Volver al login
                </button>
              </div>
            )}

            {forgot === 'idle' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                {siError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                    {siError}
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={siEmail}
                    onChange={e => setSiEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={siPassword}
                    onChange={e => setSiPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    className="text-xs text-primary font-semibold"
                    onClick={() => setForgot('form')}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={siLoading}
                  className="w-full py-3.5 rounded-full bg-primary text-white font-heading font-bold text-sm disabled:opacity-50"
                >
                  {siLoading ? 'Ingresando...' : 'Ingresa →'}
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">O</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <button
                  type="button"
                  className="w-full py-3.5 rounded-full border-2 border-primary text-primary font-heading font-bold text-sm"
                  onClick={() => navigate('/')}
                >
                  Continua como Invitado
                </button>
              </form>
            )}
          </>
        )}

        {/* ── CREAR CUENTA ── */}
        {tab === 'signup' && (
          <>
            {suSuccess ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="font-heading font-bold text-xl mb-2">¡Cuenta creada!</h2>
                <p className="text-on-surface-variant text-sm">Bienvenido a SplitEat.</p>
              </div>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5 flex gap-2.5 items-start">
                  <span className="text-green-600 text-sm mt-0.5">ℹ️</span>
                  <p className="text-green-700 text-xs font-medium leading-relaxed">
                    Usuarios registrados reciben descuentos y promociones en comercios afiliados.
                  </p>
                </div>
                <form onSubmit={handleSignUp} className="space-y-4">
                  {suError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                      {suError}
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      placeholder="Tu nombre y apellido"
                      value={suName}
                      onChange={e => setSuName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      placeholder="ejemplo@correo.com"
                      value={suEmail}
                      onChange={e => setSuEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant mb-1.5 block">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={suPassword}
                      onChange={e => setSuPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={suLoading}
                    className="w-full py-3.5 rounded-full bg-primary text-white font-heading font-bold text-sm disabled:opacity-50"
                  >
                    {suLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">o</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <button
                    type="button"
                    className="w-full py-3.5 rounded-full border-2 border-primary text-primary font-heading font-bold text-sm"
                    onClick={() => navigate('/')}
                  >
                    Continuar como Invitado
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
