import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { initDb, closeDb } from './schema'
import { saveBill, getBill } from './queries'

beforeEach(() => {
  process.env.DATABASE_PATH = ':memory:'
  initDb()
})

afterEach(() => {
  closeDb()
})

describe('saveBill / getBill', () => {
  it('guarda y recupera una factura por ID', () => {
    const data = { items: [{ id: '1', name: 'Burger' }], people: [], tipPercentage: 0 }
    saveBill('bill-123', data)

    const result = getBill('bill-123')
    assert.deepStrictEqual(result, data)
  })

  it('retorna null para un ID que no existe', () => {
    const result = getBill('nonexistent')
    assert.strictEqual(result, null)
  })

  it('serializa correctamente datos anidados', () => {
    const data = {
      items: [{ id: '1', name: 'Beer', isAlcohol: true, assignedTo: ['p1', 'p2'] }],
      people: [{ id: 'p1', name: 'Ana', color: '#FF5F5F' }],
      tipPercentage: 10,
      breakdowns: [{ personId: 'p1', total: 5.50 }],
    }
    saveBill('bill-456', data)

    const result = getBill('bill-456')
    assert.deepStrictEqual(result, data)
  })
})
