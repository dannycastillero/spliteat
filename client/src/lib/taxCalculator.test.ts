import { describe, it, expect } from 'vitest'
import { calculatePersonBreakdown, validateBillTotal, calculateAllBreakdowns } from './taxCalculator'
import type { Item, Person } from '../types'

const makePerson = (id: string): Person => ({ id, name: id, color: '#FF5F5F' })

const makeItem = (overrides: Partial<Item>): Item => ({
  id: 'i1',
  name: 'Burger',
  quantity: 1,
  unitPrice: 10,
  totalPrice: 10,
  isAlcohol: false,
  isPotentialAlcohol: false,
  assignedTo: ['p1'],
  ...overrides,
})

describe('calculatePersonBreakdown', () => {
  it('aplica 7% ITBMS a items de comida', () => {
    const person = makePerson('p1')
    const items = [makeItem({ assignedTo: ['p1'] })]
    const result = calculatePersonBreakdown(person, items, 0)

    expect(result.foodSubtotal).toBe(10)
    expect(result.foodTax).toBeCloseTo(0.7)
    expect(result.alcoholSubtotal).toBe(0)
    expect(result.alcoholTax).toBe(0)
    expect(result.tipShare).toBe(0)
    expect(result.total).toBeCloseTo(10.7)
  })

  it('aplica 10% a items de alcohol', () => {
    const person = makePerson('p1')
    const items = [makeItem({ isAlcohol: true, assignedTo: ['p1'] })]
    const result = calculatePersonBreakdown(person, items, 0)

    expect(result.alcoholSubtotal).toBe(10)
    expect(result.alcoholTax).toBeCloseTo(1.0)
    expect(result.foodTax).toBe(0)
    expect(result.total).toBeCloseTo(11.0)
  })

  it('divide items compartidos en partes iguales', () => {
    const p1 = makePerson('p1')
    const items = [makeItem({ totalPrice: 20, assignedTo: ['p1', 'p2'] })]
    const result = calculatePersonBreakdown(p1, items, 0)

    expect(result.foodSubtotal).toBe(10)   // 20 / 2
    expect(result.total).toBeCloseTo(10.7) // 10 + 7%
  })

  it('calcula propina proporcional al subtotal', () => {
    const p1 = makePerson('p1')
    const p2 = makePerson('p2')
    const items = [
      makeItem({ id: 'i1', totalPrice: 30, assignedTo: ['p1'] }),
      makeItem({ id: 'i2', totalPrice: 70, assignedTo: ['p2'] }),
    ]
    const result = calculatePersonBreakdown(p1, items, 10)
    expect(result.tipShare).toBeCloseTo(3)
  })

  it('retorna 0 de propina cuando tipPercentage es 0', () => {
    const person = makePerson('p1')
    const items = [makeItem({ assignedTo: ['p1'] })]
    const result = calculatePersonBreakdown(person, items, 0)
    expect(result.tipShare).toBe(0)
  })

  it('ignora items no asignados a esta persona', () => {
    const person = makePerson('p1')
    const items = [makeItem({ assignedTo: ['p2'] })]
    const result = calculatePersonBreakdown(person, items, 0)
    expect(result.total).toBe(0)
  })
})

describe('validateBillTotal', () => {
  it('retorna true cuando la suma cuadra', () => {
    const p1 = makePerson('p1')
    const p2 = makePerson('p2')
    const items = [
      makeItem({ id: 'i1', totalPrice: 100, assignedTo: ['p1'] }),
      makeItem({ id: 'i2', isAlcohol: true, totalPrice: 50, assignedTo: ['p2'] }),
    ]
    const breakdowns = calculateAllBreakdowns([p1, p2], items, 0)
    expect(validateBillTotal(breakdowns, items, 0)).toBe(true)
  })

  it('retorna false cuando la suma no cuadra (diferencia > $0.01)', () => {
    const p1 = makePerson('p1')
    const items = [makeItem({ id: 'i1', totalPrice: 100, assignedTo: ['p1'] })]
    const breakdowns = calculateAllBreakdowns([p1], items, 0)
    // Manipulamos el total para crear una discrepancia
    const tampered = [{ ...breakdowns[0], total: breakdowns[0].total + 1.00 }]
    expect(validateBillTotal(tampered, items, 0)).toBe(false)
  })
})

describe('calculateAllBreakdowns', () => {
  it('retorna un breakdown por cada persona', () => {
    const people = [makePerson('p1'), makePerson('p2'), makePerson('p3')]
    const items = [
      makeItem({ id: 'i1', totalPrice: 30, assignedTo: ['p1'] }),
      makeItem({ id: 'i2', totalPrice: 20, assignedTo: ['p2'] }),
      makeItem({ id: 'i3', totalPrice: 10, assignedTo: ['p3'] }),
    ]
    const result = calculateAllBreakdowns(people, items, 0)

    expect(result).toHaveLength(3)
    expect(result[0].personId).toBe('p1')
    expect(result[1].personId).toBe('p2')
    expect(result[2].personId).toBe('p3')
    expect(result[0].total).toBeCloseTo(30 * 1.07)
    expect(result[1].total).toBeCloseTo(20 * 1.07)
    expect(result[2].total).toBeCloseTo(10 * 1.07)
  })
})
