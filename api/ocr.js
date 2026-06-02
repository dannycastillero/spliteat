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
- isPotentialAlcohol = true si el nombre sugiere bebida alcohólica (ron, cerveza, vino, whisky, vodka, tequila, gin, balboa, seco, botella, trago, cóctel, beer, wine, rum, bourbon, champagne, prosecco, sangria, daiquiri, mojito)
- Si hay propina sugerida en la factura incluye el porcentaje en detectedTipPercentage (ej: 10), si no hay pon null
- Precios en números decimales sin símbolo de moneda
- Si un item tiene cantidad > 1: unitPrice = precio unitario, totalPrice = unitPrice × quantity`

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mediaType = 'image/jpeg' } = req.body || {}

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: OCR_PROMPT },
          ],
        }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in OCR response')

    res.json(JSON.parse(match[0]))
  } catch (err) {
    console.error('OCR error:', err)
    res.status(500).json({ error: 'Failed to extract items from image' })
  }
}
