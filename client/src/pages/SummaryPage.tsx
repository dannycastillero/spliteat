import { useState } from 'react'
import { useBill } from '../context/BillContext'
import { calculateAllBreakdowns, validateBillTotal } from '../lib/taxCalculator'
import PersonAvatar from '../components/PersonAvatar'
import BottomNav from '../components/BottomNav'
import type { Item, Person, PersonBreakdown } from '../types'

export default function SummaryPage() {
  const { items, people, tipPercentage } = useBill()
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [viewAll, setViewAll] = useState(false)
  const [sharing, setSharing] = useState(false)

  const breakdowns = calculateAllBreakdowns(people, items, tipPercentage)
  const isValid = validateBillTotal(breakdowns, items, tipPercentage)
  const grandTotal = breakdowns.reduce((s, b) => s + b.total, 0)
  const billHasAlcohol = items.some(i => i.isAlcohol)

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

  const handleShare = () => {
    setSharing(true)
    try {
      // Codifica la cuenta en base64 para compartir sin base de datos
      const payload = { items, people, tipPercentage }
      const encoded = btoa(encodeURIComponent(JSON.stringify(payload)))
      const shareUrl = `${window.location.origin}/share?d=${encoded}`

      const recent = JSON.parse(localStorage.getItem('spliteat_recent') || '[]')
      const updated = [
        { shareUrl, date: new Date().toLocaleDateString('es-PA'), total: grandTotal.toFixed(2) },
        ...recent,
      ].slice(0, 5)
      localStorage.setItem('spliteat_recent', JSON.stringify(updated))

      const text = `Aquí está el resumen de nuestra cuenta 🍽️: ${shareUrl}`
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } catch {
      alert('No se pudo generar el link.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 px-5">
      {/* Person tabs + "Cuenta completa" tab */}
      <div className="pt-10 pb-4">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {people.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => { setSelectedIdx(idx); setViewAll(false) }}
              className={`flex-shrink-0 flex flex-col items-center gap-1 transition-opacity ${
                !viewAll && idx === selectedIdx ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <PersonAvatar name={p.name} color={p.color} selected={!viewAll && idx === selectedIdx} />
              <span className="text-xs font-semibold">{p.name}{p.senior ? ' 👴' : ''}</span>
            </button>
          ))}

          {/* Tab: cuenta completa */}
          <button
            onClick={() => setViewAll(true)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 transition-opacity ${viewAll ? 'opacity-100' : 'opacity-40'}`}
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg border-2 transition-colors ${
              viewAll ? 'bg-on-surface text-white border-on-surface' : 'bg-gray-100 border-gray-200'
            }`}>
              📋
            </div>
            <span className="text-xs font-semibold">Completo</span>
          </button>
        </div>
      </div>

      {/* ── VISTA: CUENTA COMPLETA ── */}
      {viewAll ? (
        <FullBillView
          people={people}
          breakdowns={breakdowns}
          items={items}
          tipPercentage={tipPercentage}
          grandTotal={grandTotal}
          billHasAlcohol={billHasAlcohol}
        />
      ) : (
        /* ── VISTA: PERSONA INDIVIDUAL ── */
        <>
          <div className="text-center mb-6">
            <h2 className="font-heading font-bold text-2xl mb-1">{person.name}'s Summary</h2>
            <p className="text-on-surface-variant text-sm mb-3">Tu parte de la cuenta</p>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total a pagar</div>
            <div className="font-heading font-bold text-4xl text-secondary">
              ${breakdown.total.toFixed(2)}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm mb-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-heading font-bold text-sm">Items consumidos</span>
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
                        : item.isAlcohol ? '10% imp. licor' : billHasAlcohol ? '7% ITBMS' : 'Sin impuesto'}
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
              {breakdown.seniorDiscount > 0 && (
                <div className="flex justify-between text-sm text-amber-600 font-semibold">
                  <span>👴 Descuento jubilado (25%)</span>
                  <span>-${breakdown.seniorDiscount.toFixed(2)}</span>
                </div>
              )}
              {breakdown.foodTax > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>ITBMS (7% comida)</span>
                  <span>${breakdown.foodTax.toFixed(2)}</span>
                </div>
              )}
              {breakdown.alcoholTax > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Imp. licor (10%)</span>
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
                <span>Total</span>
                <span className="text-secondary">${breakdown.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {!isValid && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-600">
              ⚠️ La suma de los totales no cuadra con el total de la factura. Revisa los items asignados.
            </div>
          )}
        </>
      )}

      <button
        onClick={handleShare}
        disabled={sharing}
        className="w-full py-4 rounded-full bg-primary text-white font-heading font-bold text-base mb-3 disabled:opacity-60"
      >
        {sharing ? 'Generando link...' : '↗ Compartir resumen'}
      </button>

      <BottomNav />
    </div>
  )
}

/* ── Componente: vista de cuenta completa ── */
function FullBillView({
  people,
  breakdowns,
  items,
  tipPercentage,
  grandTotal,
  billHasAlcohol,
}: {
  people: Person[]
  breakdowns: PersonBreakdown[]
  items: Item[]
  tipPercentage: number
  grandTotal: number
  billHasAlcohol: boolean
}) {
  const subtotalItems = items.reduce((s, i) => s + i.totalPrice, 0)
  const totalTax = breakdowns.reduce((s, b) => s + b.foodTax + b.alcoholTax, 0)
  const totalTip = breakdowns.reduce((s, b) => s + b.tipShare, 0)
  const totalDiscount = breakdowns.reduce((s, b) => s + b.seniorDiscount, 0)

  return (
    <>
      <h2 className="font-heading font-bold text-xl mb-4">Cuenta completa</h2>

      {/* Resumen por persona */}
      <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="font-heading font-bold text-sm">Por persona</span>
        </div>
        {people.map((p, idx) => {
          const bd = breakdowns[idx]
          if (!bd) return null
          const myItems = items.filter(i => i.assignedTo.includes(p.id))
          return (
            <div key={p.id} className="px-4 py-3 border-b border-gray-50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="font-semibold text-sm">{p.name}{p.senior ? ' 👴' : ''}</span>
                </div>
                <span className="font-bold text-secondary">${bd.total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-400 pl-9">
                {myItems.map(i => i.name).join(', ') || 'Sin items asignados'}
              </p>
            </div>
          )
        })}
      </div>

      {/* Desglose global */}
      <div className="bg-white rounded-2xl shadow-sm mb-4 px-4 py-3 space-y-2">
        <div className="font-heading font-bold text-sm mb-1">Desglose total</div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal items</span>
          <span>${subtotalItems.toFixed(2)}</span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex justify-between text-sm text-amber-600 font-semibold">
            <span>👴 Descuentos jubilado</span>
            <span>-${totalDiscount.toFixed(2)}</span>
          </div>
        )}
        {billHasAlcohol && totalTax > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Impuestos (ITBMS + licor)</span>
            <span>${totalTax.toFixed(2)}</span>
          </div>
        )}
        {!billHasAlcohol && (
          <div className="flex justify-between text-sm text-gray-400">
            <span>ITBMS</span>
            <span>No aplica (sin licor)</span>
          </div>
        )}
        {totalTip > 0 && (
          <div className="flex justify-between text-sm text-gray-500">
            <span>Propina ({tipPercentage}%)</span>
            <span>${totalTip.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
          <span>Total entre todos</span>
          <span className="text-secondary">${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </>
  )
}
