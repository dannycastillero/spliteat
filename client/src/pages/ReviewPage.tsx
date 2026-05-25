import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBill } from '../context/BillContext'
import AlcoholChip from '../components/AlcoholChip'
import TipSelector from '../components/TipSelector'
import BottomNav from '../components/BottomNav'

export default function ReviewPage() {
  const navigate = useNavigate()
  const { items, tipPercentage, updateItem, addItem, removeItem, setTipPercentage } = useBill()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newQty, setNewQty] = useState('1')

  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0)

  const handleAddItem = () => {
    const price = parseFloat(newPrice)
    const qty = parseInt(newQty) || 1
    if (!newName || isNaN(price)) return
    addItem({
      name: newName,
      quantity: qty,
      unitPrice: price,
      totalPrice: price * qty,
      isAlcohol: false,
      isPotentialAlcohol: false,
    })
    setNewName('')
    setNewPrice('')
    setNewQty('1')
    setShowAddForm(false)
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 px-5">
      <header className="pt-10 pb-4">
        <h1 className="font-heading font-bold text-2xl">Check the Bill</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Confirma los items. Toca ¿Licor? para marcar bebidas alcohólicas.
        </p>
      </header>

      <div className="bg-white rounded-2xl shadow-sm mb-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-heading font-bold text-xs text-primary uppercase tracking-wide">
            Receipt Summary
          </span>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString('es-PA')}
          </span>
        </div>

        {items.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">
            Sin items. Escanea una factura o agrega items manualmente.
          </p>
        )}

        {items.map(item => (
          <div key={item.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-50">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm flex-shrink-0">
              {item.isAlcohol ? '🍺' : '🍔'}
            </div>
            <div className="flex-1 min-w-0">
              <input
                className="font-semibold text-sm w-full bg-transparent outline-none"
                value={item.name}
                onChange={e => updateItem(item.id, { name: e.target.value })}
              />
              <div className="text-xs text-gray-400">Qty: {item.quantity}</div>
              {(item.isPotentialAlcohol || item.isAlcohol) && (
                <div className="mt-1">
                  <AlcoholChip
                    confirmed={item.isAlcohol}
                    onConfirm={() => updateItem(item.id, { isAlcohol: true })}
                    onDeny={() => updateItem(item.id, { isAlcohol: false })}
                  />
                </div>
              )}
              {!item.isPotentialAlcohol && !item.isAlcohol && (
                <button
                  onClick={() => updateItem(item.id, { isPotentialAlcohol: true })}
                  className="text-xs text-gray-300 mt-1"
                >
                  + marcar como licor
                </button>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">$</span>
                <input
                  className="font-bold text-primary text-sm w-16 text-right bg-transparent outline-none"
                  value={item.totalPrice.toFixed(2)}
                  onChange={e => {
                    const val = parseFloat(e.target.value)
                    if (!isNaN(val)) updateItem(item.id, { totalPrice: val, unitPrice: val / item.quantity })
                  }}
                />
              </div>
              <button onClick={() => removeItem(item.id)} className="text-red-300 text-xs">✕</button>
            </div>
          </div>
        ))}

        <div className="px-4 py-3 space-y-1">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
            <span>Items Total</span>
            <span className="text-primary">${subtotal.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400">
            * Los impuestos se calculan al asignar (7% comida / 10% licor)
          </p>
        </div>
      </div>

      {showAddForm ? (
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <h3 className="font-heading font-semibold text-sm mb-3">Agregar item</h3>
          <input
            className="w-full border border-gray-200 rounded-full px-4 py-2 text-sm mb-2 focus:border-primary outline-none"
            placeholder="Nombre del item"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:border-primary outline-none"
              placeholder="Precio ($)"
              type="number"
              step="0.01"
              value={newPrice}
              onChange={e => setNewPrice(e.target.value)}
            />
            <input
              className="w-20 border border-gray-200 rounded-full px-4 py-2 text-sm focus:border-primary outline-none"
              placeholder="Cant."
              type="number"
              min="1"
              value={newQty}
              onChange={e => setNewQty(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-2 rounded-full border-2 border-gray-200 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddItem}
              className="flex-1 py-2 rounded-full bg-primary text-white text-sm font-semibold"
            >
              Agregar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 rounded-full border-2 border-dashed border-gray-200 text-primary text-sm font-semibold mb-4"
        >
          + Add Item Manually
        </button>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <h3 className="font-heading font-semibold text-sm mb-3">Add a Group Tip?</h3>
        <TipSelector value={tipPercentage} onChange={setTipPercentage} />
      </div>

      <button
        onClick={() => navigate('/assign')}
        disabled={items.length === 0}
        className="w-full py-4 rounded-full bg-[#B3272E] text-white font-heading font-bold text-base disabled:opacity-40"
      >
        NEXT: ASSIGN PEOPLE →
      </button>

      <BottomNav />
    </div>
  )
}
