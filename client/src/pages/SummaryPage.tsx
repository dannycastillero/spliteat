import { useState } from 'react'
import { useBill } from '../context/BillContext'
import { calculateAllBreakdowns, validateBillTotal } from '../lib/taxCalculator'
import { saveBillToServer } from '../api/client'
import PersonAvatar from '../components/PersonAvatar'
import BottomNav from '../components/BottomNav'
import type { SavedBill } from '../types'

export default function SummaryPage() {
  const { items, people, tipPercentage } = useBill()
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [sharing, setSharing] = useState(false)

  const breakdowns = calculateAllBreakdowns(people, items, tipPercentage)
  const isValid = validateBillTotal(breakdowns, items, tipPercentage)
  const person = people[selectedIdx]
  const breakdown = breakdowns[selectedIdx]

  if (!person || !breakdown) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
        <p className="text-on-surface-variant">No hay personas asignadas.</p>
        <BottomNav />
      </div>
    )
  }

  const myItems = items.filter(i => i.assignedTo.includes(person.id))

  const handleShare = async () => {
    setSharing(true)
    try {
      const billData: SavedBill = { items, people, tipPercentage, breakdowns }
      const { billId } = await saveBillToServer(billData)

      const grandTotal = breakdowns.reduce((s, b) => s + b.total, 0)
      const recent = JSON.parse(localStorage.getItem('spliteat_recent') || '[]')
      const updated = [
        { billId, date: new Date().toLocaleDateString('es-PA'), total: grandTotal.toFixed(2) },
        ...recent,
      ].slice(0, 5)
      localStorage.setItem('spliteat_recent', JSON.stringify(updated))

      const shareUrl = `${window.location.origin}/share/${billId}`
      const text = `Aquí está el resumen de nuestra cuenta 🍽️: ${shareUrl}`
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } catch {
      alert('No se pudo generar el link. Verifica tu conexión.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 px-5">
      <div className="pt-10 pb-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {people.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => setSelectedIdx(idx)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 transition-opacity ${
                idx === selectedIdx ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <PersonAvatar name={p.name} color={p.color} selected={idx === selectedIdx} />
              <span className="text-xs font-semibold">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center mb-6">
        <h2 className="font-heading font-bold text-2xl mb-1">{person.name}'s Summary</h2>
        <p className="text-on-surface-variant text-sm mb-3">Review your share of the bill</p>
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total to Pay</div>
        <div className="font-heading font-bold text-4xl text-secondary">
          ${breakdown.total.toFixed(2)}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-heading font-bold text-sm">Items Ordered</span>
          <span className="text-xs text-gray-400">{myItems.length} items</span>
        </div>
        {myItems.map(item => {
          const share = item.totalPrice / item.assignedTo.length
          return (
            <div key={item.id} className="flex justify-between items-start px-4 py-3 border-b border-gray-50">
              <div>
                <div className="font-semibold text-sm">{item.name}</div>
                <div className="text-xs text-gray-400">
                  {item.assignedTo.length > 1
                    ? `Compartido con ${item.assignedTo.length - 1} más`
                    : item.isAlcohol ? '10% impuesto' : '7% ITBMS'}
                </div>
              </div>
              <span className="font-bold text-primary text-sm">${share.toFixed(2)}</span>
            </div>
          )
        })}

        <div className="px-4 py-3 space-y-1 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>${(breakdown.foodSubtotal + breakdown.alcoholSubtotal).toFixed(2)}</span>
          </div>
          {breakdown.foodTax > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>ITBMS (7% comida)</span>
              <span>${breakdown.foodTax.toFixed(2)}</span>
            </div>
          )}
          {breakdown.alcoholTax > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Impuesto licor (10%)</span>
              <span>${breakdown.alcoholTax.toFixed(2)}</span>
            </div>
          )}
          {breakdown.tipShare > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Propina ({tipPercentage}%)</span>
              <span>${breakdown.tipShare.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
            <span>Final Total</span>
            <span className="text-secondary">${breakdown.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {!isValid && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-600">
          ⚠️ La suma de los totales no cuadra con el total de la factura. Revisa los items asignados.
        </div>
      )}

      <button
        onClick={handleShare}
        disabled={sharing}
        className="w-full py-4 rounded-full bg-primary text-white font-heading font-bold text-base mb-3 disabled:opacity-60"
      >
        {sharing ? 'Generando link...' : '↗ Share Summary Link'}
      </button>

      <BottomNav />
    </div>
  )
}
