import Anthropic from '@anthropic-ai/sdk'

export interface OcrItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  isPotentialAlcohol: boolean
}

export interface OcrResult {
  items: OcrItem[]
  detectedTipPercentage: number | null
}

const OCR_PROMPT = `Analiza esta imagen de una factura de restaurante y extrae los items.
Retorna SOLO JSON válido con este formato exacto, sin texto adicional:
{
  "items": [
    {
      "name": "nombre del item",
      "quantity": 1,
      "unitPrice": 0.00,
      "totalPrice": 0.00,
      "isPotentialAlcohol": false
    }
  ],
  "detectedTipPercentage": null
}

Reglas:
- NO incluyas líneas de subtotal, impuestos, propina o total — solo items individuales
- isPotentialAlcohol = true si el nombre sugiere bebida alcohólica (ron, cerveza, vino, whisky, vodka, tequila, gin, balboa, seco, absolut, botella, trago, cóctel, licorera, beer, wine, rum, bourbon, champagne, prosecco, sangria, daiquiri, mojito)
- Si hay propina sugerida en la factura incluye el porcentaje en detectedTipPercentage (ej: 10), si no hay pon null
- Precios en números decimales sin símbolo de moneda
- Si un item tiene cantidad > 1: unitPrice = precio unitario, totalPrice = unitPrice × quantity`

interface AnthropicLike {
  messages: {
    create(params: object): Promise<{ content: Array<{ type: string; text: string }> }>
  }
}

export function createOcrService(client: AnthropicLike) {
  return {
    async extractItemsFromImage(
      imageBase64: string,
      mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
    ): Promise<OcrResult> {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageBase64 },
              },
              { type: 'text', text: OCR_PROMPT },
            ],
          },
        ],
      })

      const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No valid JSON in OCR response')

      return JSON.parse(jsonMatch[0]) as OcrResult
    },
  }
}

const defaultClient = new Anthropic()
export const extractItemsFromImage = createOcrService(defaultClient).extractItemsFromImage
