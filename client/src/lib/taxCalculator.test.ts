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
  it('aplica 7% ITBMS a comida cuando la cuenta tiene alcohol', () => {
    const person = makePerson('p1')
    // La cuenta tiene un item de comida (p1) y uno de alcohol (p2) → hay licencia → aplica ITBMS
    const items = [
      makeItem({ id: 'i1', assignedTo: ['p1'] }),
      makeItem({ id: 'i2', isAlcohol: true, assignedTo: ['p2'] }),
    ]
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

  it('divide items compartidos en partes iguales (sin alcohol → sin ITBMS)', () => {
    const p1 = makePerson('p1')
    const items = [makeItem({ totalPrice: 20, assignedTo: ['p1', 'p2'] })]
    const result = calculatePersonBreakdown(p1, items, 0)

    expect(result.foodSubtotal).toBe(10)  // 20 / 2
    expect(result.foodTax).toBe(0)        // sin alcohol en cuenta → no hay ITBMS
    expect(result.total).toBe(10)
  })

  it('divide propina en partes iguales entre personas', () => {
    const p1 = makePerson('p1')
    const p2 = makePerson('p2')
    const items = [
      makeItem({ id: 'i1', totalPrice: 30, assignedTo: ['p1'] }),
      makeItem({ id: 'i2', totalPrice: 70, assignedTo: ['p2'] }),
    ]
    // 10% de 100 = $10 total propina / 2 personas = $5 cada uno
    const result = calculatePersonBreakdown(p1, items, 10, 2)
    expect(result.tipShare).toBeCloseTo(5)
  })

  it('NO cobra 7% ITBMS si la cuenta no tiene alcohol (fonda/comida rápida)', () => {
    const person = makePerson('p1')
    const items = [makeItem({ assignedTo: ['p1'] })] // solo comida, sin alcohol
    const result = calculatePersonBreakdown(person, items, 0)

    expect(result.foodTax).toBe(0)
    expect(result.total).toBe(10) // sin impuesto
  })

  it('SÍ cobra 7% ITBMS si la cuenta tiene alcohol (restaurante con licencia)', () => {
    const p1 = makePerson('p1')
    const p2 = makePerson('p2')
    const items = [
      makeItem({ id: 'i1', assignedTo: ['p1'] }),                          // comida de p1
      makeItem({ id: 'i2', isAlcohol: true, assignedTo: ['p2'] }),         // alcohol de p2
    ]
    const result = calculatePersonBreakdown(p1, items, 0)

    expect(result.foodTax).toBeCloseTo(0.7) // 10 * 7%
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

  it('aplica 25% descuento jubilado + ITBMS sobre precio neto cuando hay alcohol', () => {
    const senior: Person = { id: 'p1', name: 'Abuelo', color: '#ccc', senior: true }
    // Cuenta con alcohol → aplica ITBMS
    const items = [
      makeItem({ id: 'i1', totalPrice: 20, assignedTo: ['p1'] }),
      makeItem({ id: 'i2', isAlcohol: true, totalPrice: 10, assignedTo: ['p2'] }),
    ]
    const result = calculatePersonBreakdown(senior, items, 0)

    expect(result.seniorDiscount).toBeCloseTo(5)   // 20 * 0.25
    expect(result.foodTax).toBeCloseTo(1.05)        // 15 * 0.07
    expect(result.total).toBeCloseTo(16.05)         // 15 + 1.05
  })

  it('aplica 25% descuento jubilado sin ITBMS cuando no hay alcohol', () => {
    const senior: Person = { id: 'p1', name: 'Abuelo', color: '#ccc', senior: true }
    const items = [makeItem({ totalPrice: 20, assignedTo: ['p1'] })]
    const result = calculatePersonBreakdown(senior, items, 0)

    expect(result.seniorDiscount).toBeCloseTo(5)  // 20 * 0.25
    expect(result.foodTax).toBe(0)                 // sin alcohol → sin ITBMS
    expect(result.total).toBeCloseTo(15)           // 20 - 5
  })

  it('jubilado no obtiene descuento en alcohol', () => {
    const senior: Person = { id: 'p1', name: 'Abuelo', color: '#ccc', senior: true }
    const items = [makeItem({ isAlcohol: true, totalPrice: 20, assignedTo: ['p1'] })]
    const result = calculatePersonBreakdown(senior, items, 0)

    expect(result.seniorDiscount).toBe(0)
    expect(result.alcoholTax).toBeCloseTo(2.0)
    expect(result.total).toBeCloseTo(22.0)
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
    // Sin alcohol en la cuenta → sin ITBMS
    expect(result[0].total).toBeCloseTo(30)
    expect(result[1].total).toBeCloseTo(20)
    expect(result[2].total).toBeCloseTo(10)
  })
})
