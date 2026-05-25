import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createOcrService } from './ocr.service'

function makeMockClient(responseText: string) {
  return {
    messages: {
      create: async () => ({
        content: [{ type: 'text', text: responseText }],
      }),
    },
  }
}

describe('createOcrService / extractItemsFromImage', () => {
  it('parsea correctamente una respuesta válida de Claude', async () => {
    const mockResponse = JSON.stringify({
      items: [
        { name: 'Burger', quantity: 1, unitPrice: 15.00, totalPrice: 15.00, isPotentialAlcohol: false },
        { name: 'Cerveza Balboa', quantity: 2, unitPrice: 3.50, totalPrice: 7.00, isPotentialAlcohol: true },
      ],
      detectedTipPercentage: null,
    })
    const service = createOcrService(makeMockClient(mockResponse) as any)
    const result = await service.extractItemsFromImage('base64imagedata')

    assert.strictEqual(result.items.length, 2)
    assert.strictEqual(result.items[0].name, 'Burger')
    assert.strictEqual(result.items[0].isPotentialAlcohol, false)
    assert.strictEqual(result.items[1].name, 'Cerveza Balboa')
    assert.strictEqual(result.items[1].isPotentialAlcohol, true)
    assert.strictEqual(result.detectedTipPercentage, null)
  })

  it('extrae JSON incluso cuando hay texto extra alrededor', async () => {
    const mockResponse = 'Aquí está el resultado:\n```json\n{"items": [{"name": "Pizza", "quantity": 1, "unitPrice": 12.00, "totalPrice": 12.00, "isPotentialAlcohol": false}], "detectedTipPercentage": 10}\n```'
    const service = createOcrService(makeMockClient(mockResponse) as any)
    const result = await service.extractItemsFromImage('base64imagedata')

    assert.strictEqual(result.items[0].name, 'Pizza')
    assert.strictEqual(result.detectedTipPercentage, 10)
  })

  it('lanza error cuando la respuesta no contiene JSON válido', async () => {
    const service = createOcrService(makeMockClient('No puedo leer esta imagen') as any)
    await assert.rejects(
      () => service.extractItemsFromImage('base64imagedata'),
      { message: 'No valid JSON in OCR response' }
    )
  })
})
