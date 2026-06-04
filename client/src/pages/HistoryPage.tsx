import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

interface BillRow {
  id: string
  created_at: string
  data: { total?: number; people?: Array<{ name: string }> }
}

export default function HistoryPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [bills, setBills] = useState<BillRow[]>([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      navigate('/', { replace: true })
      return
    }
    if (!user) return

    supabase
      .from('bills')
      .select('id, created_at, data')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setBills(data as BillRow[])
        setFetching(false)
      })
  }, [user, loading, navigate])

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-on-surface-variant text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen px-5 pb-10">
      <header className="pt-8 pb-6">
        <h1 className="font-heading font-bold text-2xl">Mis facturas</h1>
        <p className="text-on-surface-variant text-sm mt-1">{user?.email}</p>
      </header>

      {bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <div className="text-4xl mb-3">🧾</div>
          <p className="text-on-surface-variant text-sm">
            No tienes facturas guardadas todavía.
          </p>
          <Link to="/" className="mt-4 text-primary font-semibold text-sm">
            Dividir una cuenta →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map(bill => {
            const peopleNames = bill.data.people?.map(p => p.name).join(', ') ?? ''
            const date = new Date(bill.created_at).toLocaleDateString('es-PA')
            return (
              <Link
                key={bill.id}
                to={`/share/${bill.id}`}
                className="block bg-white rounded-2xl shadow-sm px-4 py-3"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold">{peopleNames || 'Cuenta'}</p>
                    <p className="text-xs text-on-surface-variant">{date}</p>
                  </div>
                  <span className="text-primary font-bold text-sm">Ver →</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
