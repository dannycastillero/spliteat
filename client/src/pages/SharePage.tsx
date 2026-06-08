import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { calculateAllBreakdowns } from '../lib/taxCalculator'
import { getBillFromServer, getBillByCode } from '../api/client'
import type { BillState } from '../types'

export default function SharePage() {
  const { billId, code } = useParams<{ billId?: string; code?: string }>()
  const [searchParams] = useSearchParams()
  const [bill, setBill] = useState<BillState | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (code) {
      getBillByCode(code)
        .then(setBill)
        .catch(() => setError(true))
    } else if (billId) {
      getBillFromServer(billId)
        .then(setBill)
        .catch(() => setError(true))
    } else {
      const encoded = searchParams.get('d')
      if (!encoded) { setError(true); return }
      try {
        setBill(JSON.parse(decodeURIComponent(atob(encoded))))
      } catch {
        setError(true)
      }
    }
  }, [billId, code, searchParams])

  if (error) return <ErrorView />
  if (!bill) return <LoadingView />

  const breakdowns = calculateAllBreakdowns(bill.people, bill.items, bill.tipPercentage)
  const grandTotal = breakdowns.reduce((s, b) => s + b.total, 0)
  const billHasAlcohol = bill.items.some(i => i.isAlcohol)

  return (
    <div className="flex flex-col min-h-screen px-5 pb-10">
      <header className="pt-8 pb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-primary text-xl">🍽️</span>
          <span className="font-heading font-bold text-xl">SplitEat</span>
        </div>
        <h1 className="font-heading font-bold text-2xl">Resumen de la cuenta</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Total general: <strong className="text-primary">${grandTotal.toFixed(2)}</strong>
        </p>
      </header>

      <div className="bg-white rounded-2xl shadow-sm mb-6">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="font-heading font-bold text-sm">Todos los items</span>
        </div>
        {bill.items.map(item => (
          <div key={item.id} className="flex justify-between px-4 py-2.5 border-b border-gray-50 text-sm">
            <div>
              <span>{item.name}</span>
              {item.isAlcohol && <span className="ml-1 text-xs text-orange-500">🍺</span>}
              <span className="text-gray-400 text-xs ml-2">×{item.quantity}</span>
            </div>
            <span className="font-semibold text-primary">${item.totalPrice.toFixed(2)}</span>
          </div>
        ))}
        <div className="px-4 py-2.5 bg-gray-50 rounded-b-2xl flex justify-between font-bold text-sm">
          <span>Total items</span>
          <span>${bill.items.reduce((s, i) => s + i.totalPrice, 0).toFixed(2)}</span>
        </div>
      </div>

      <h2 className="font-heading font-bold text-lg mb-3">Por persona</h2>
      <div className="space-y-3">
        {bill.people.map((person, idx) => {
          const bd = breakdowns[idx]
          if (!bd) return null
          const myItems = bill.items.filter(i => i.assignedTo.includes(person.id))
          return (
            <div key={person.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: person.color }}
                >
                  {person.name[0].toUpperCase()}
                </div>
                <span className="font-heading font-semibold text-sm">
                  {person.name}{person.senior ? ' 👴' : ''}
                </span>
                <span className="ml-auto font-bold text-secondary">${bd.total.toFixed(2)}</span>
              </div>
              {myItems.map(item => (
                <div key={item.id} className="flex justify-between px-4 py-2 text-xs text-gray-600 border-b border-gray-50">
                  <span>{item.name}{item.assignedTo.length > 1 ? ` (÷${item.assignedTo.length})` : ''}</span>
                  <span>${(item.totalPrice / item.assignedTo.length).toFixed(2)}</span>
                </div>
              ))}
              <div className="px-4 py-2 bg-gray-50 rounded-b-2xl text-xs text-gray-500 space-y-0.5">
                {bd.seniorDiscount > 0 && (
                  <div className="flex justify-between text-amber-600 font-semibold">
                    <span>Descuento jubilado (25%)</span>
                    <span>-${bd.seniorDiscount.toFixed(2)}</span>
                  </div>
                )}
                {billHasAlcohol && bd.foodTax > 0 && (
                  <div className="flex justify-between"><span>ITBMS 7%</span><span>+${bd.foodTax.toFixed(2)}</span></div>
                )}
                {bd.alcoholTax > 0 && (
                  <div className="flex justify-between"><span>Licor 10%</span><span>+${bd.alcoholTax.toFixed(2)}</span></div>
                )}
                {bd.tipShare > 0 && (
                  <div className="flex justify-between"><span>Propina ({bill.tipPercentage}%)</span><span>+${bd.tipShare.toFixed(2)}</span></div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center mt-8 text-xs text-gray-400">
        Generado con SplitEat 🍽️
      </div>
    </div>
  )
}

function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
      <div className="text-4xl mb-4">🍽️</div>
      <p className="text-on-surface-variant text-sm">Cargando cuenta...</p>
    </div>
  )
}

function ErrorView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
      <div className="text-4xl mb-4">🍽️</div>
      <h1 className="font-heading font-bold text-xl mb-2">Link inválido</h1>
      <p className="text-on-surface-variant text-sm">Este link no contiene datos de una cuenta.</p>
    </div>
  )
}
