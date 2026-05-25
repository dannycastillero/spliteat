import { createContext, useContext, useState, ReactNode } from 'react'
import type { BillState, Item, Person } from '../types'

const AVATAR_COLORS = [
  '#FF5F5F', '#2EE59D', '#47D1FF', '#FFB347', '#C27AFF', '#FF85C2',
  '#4DB8FF', '#FFD700', '#98FF98', '#FF6B6B',
]

interface BillContextValue extends BillState {
  setItems: (items: Item[]) => void
  addItem: (item: Omit<Item, 'id' | 'assignedTo'>) => void
  updateItem: (id: string, changes: Partial<Item>) => void
  removeItem: (id: string) => void
  addPerson: (name: string) => void
  removePerson: (id: string) => void
  setTipPercentage: (pct: number) => void
  toggleAssignment: (itemId: string, personId: string) => void
  setRawImage: (base64: string) => void
  resetBill: () => void
}

const BillContext = createContext<BillContextValue | null>(null)

const initialState: BillState = {
  items: [],
  people: [],
  tipPercentage: 0,
}

export function BillProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BillState>(initialState)

  const setItems = (items: Item[]) => setState(s => ({ ...s, items }))

  const addItem = (item: Omit<Item, 'id' | 'assignedTo'>) =>
    setState(s => ({
      ...s,
      items: [...s.items, { ...item, id: crypto.randomUUID(), assignedTo: [] }],
    }))

  const updateItem = (id: string, changes: Partial<Item>) =>
    setState(s => ({
      ...s,
      items: s.items.map(i => (i.id === id ? { ...i, ...changes } : i)),
    }))

  const removeItem = (id: string) =>
    setState(s => ({ ...s, items: s.items.filter(i => i.id !== id) }))

  const addPerson = (name: string) => {
    setState(s => {
      const color = AVATAR_COLORS[s.people.length % AVATAR_COLORS.length]
      return {
        ...s,
        people: [...s.people, { id: crypto.randomUUID(), name, color }],
      }
    })
  }

  const removePerson = (personId: string) =>
    setState(s => ({
      ...s,
      people: s.people.filter(p => p.id !== personId),
      items: s.items.map(i => ({
        ...i,
        assignedTo: i.assignedTo.filter(id => id !== personId),
      })),
    }))

  const setTipPercentage = (tipPercentage: number) =>
    setState(s => ({ ...s, tipPercentage }))

  const toggleAssignment = (itemId: string, personId: string) =>
    setState(s => ({
      ...s,
      items: s.items.map(item => {
        if (item.id !== itemId) return item
        const already = item.assignedTo.includes(personId)
        return {
          ...item,
          assignedTo: already
            ? item.assignedTo.filter(id => id !== personId)
            : [...item.assignedTo, personId],
        }
      }),
    }))

  const setRawImage = (rawReceiptImageBase64: string) =>
    setState(s => ({ ...s, rawReceiptImageBase64 }))

  const resetBill = () => setState(initialState)

  return (
    <BillContext.Provider
      value={{
        ...state,
        setItems,
        addItem,
        updateItem,
        removeItem,
        addPerson,
        removePerson,
        setTipPercentage,
        toggleAssignment,
        setRawImage,
        resetBill,
      }}
    >
      {children}
    </BillContext.Provider>
  )
}

export function useBill(): BillContextValue {
  const ctx = useContext(BillContext)
  if (!ctx) throw new Error('useBill must be used inside BillProvider')
  return ctx
}
