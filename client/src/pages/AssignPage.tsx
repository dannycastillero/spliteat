import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBill } from '../context/BillContext'
import PersonAvatar from '../components/PersonAvatar'
import BottomNav from '../components/BottomNav'

export default function AssignPage() {
  const navigate = useNavigate()
  const { items, people, addPerson, updatePerson, removePerson, toggleAssignment } = useBill()
  const [newName, setNewName] = useState('')
  const [newSenior, setNewSenior] = useState(false)
  const [showInput, setShowInput] = useState(false)

  const allAssigned = items.length > 0 && items.every(i => i.assignedTo.length > 0)
  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0)

  const handleAddPerson = () => {
    if (!newName.trim()) return
    addPerson(newName.trim(), newSenior)
    setNewName('')
    setNewSenior(false)
    setShowInput(false)
  }

  return (
    <div className="flex flex-col min-h-screen pb-[210px] px-5">
      <header className="pt-10 pb-4 flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl">Who's eating?</h1>
        <span className="text-primary font-semibold text-sm">{people.length} People</span>
      </header>

      {/* People row */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          {showInput ? (
            <div className="flex flex-col gap-2 min-w-[120px]">
              <div className="flex gap-1">
                <input
                  autoFocus
                  className="w-20 border border-primary rounded-full px-2 py-1 text-xs outline-none"
                  placeholder="Nombre"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPerson()}
                />
                <button onClick={handleAddPerson} className="text-primary text-xs font-bold">OK</button>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newSenior}
                  onChange={e => setNewSenior(e.target.checked)}
                  className="accent-primary w-3.5 h-3.5"
                />
                <span className="text-[11px] text-gray-500">Jubilado 👴 (25% off)</span>
              </label>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="w-11 h-11 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xl"
            >
              +
            </button>
          )}
          <span className="text-xs text-gray-400">Add</span>
        </div>

        {people.map(person => (
          <div key={person.id} className="flex flex-col items-center gap-1 flex-shrink-0">
            <PersonAvatar
              name={person.name}
              color={person.color}
              onClick={() => removePerson(person.id)}
            />
            <span className="text-xs text-on-surface-variant">{person.name}</span>
            <button
              onClick={() => updatePerson(person.id, { senior: !person.senior })}
              className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                person.senior
                  ? 'bg-amber-100 border-amber-400 text-amber-700 font-bold'
                  : 'border-gray-200 text-gray-300'
              }`}
              title={person.senior ? 'Quitar jubilado' : 'Marcar como jubilado'}
            >
              👴
            </button>
          </div>
        ))}
      </div>

      <p className="text-on-surface-variant text-sm mb-4">Tap to assign items</p>

      <div className="space-y-3 mb-6">
        {items.map(item => (
          <div
            key={item.id}
            className={`bg-white rounded-2xl p-4 shadow-sm ${
              item.assignedTo.length > 0 ? 'border-2 border-secondary' : 'border-2 border-gray-100'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-sm">{item.name}</div>
                <div className="text-xs text-gray-400">
                  {item.isAlcohol ? '🍺 Bebida alcohólica' : 'Comida / bebida'}
                </div>
              </div>
              <span className="font-bold text-primary">${item.totalPrice.toFixed(2)}</span>
            </div>

            {people.length === 0 && (
              <p className="text-xs text-gray-400">Agrega personas arriba para asignar</p>
            )}

            <div className="flex gap-2 flex-wrap">
              {people.map(person => (
                <div key={person.id} className="flex flex-col items-center gap-0.5">
                  <PersonAvatar
                    name={person.name}
                    color={person.color}
                    size="sm"
                    selected={item.assignedTo.includes(person.id)}
                    onClick={() => toggleAssignment(item.id, person.id)}
                  />
                  <span className="text-[10px] text-gray-400">
                    {person.name}{person.senior ? ' 👴' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed footer — sits above the BottomNav (nav height ~84px, footer at 88px) */}
      <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 w-full max-w-[430px] px-5">
        <div className="bg-white rounded-2xl shadow-md px-4 py-3 flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-on-surface-variant">
            All items: ${subtotal.toFixed(2)}
          </span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-tertiary" />
            <div className="w-3 h-3 rounded-full bg-primary" />
          </div>
        </div>
        <button
          onClick={() => navigate('/summary')}
          disabled={!allAssigned || people.length === 0}
          className="w-full py-4 rounded-full bg-primary text-white font-heading font-bold text-base disabled:opacity-40"
        >
          Final Summary →
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
