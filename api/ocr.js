const { createClient } = require('@supabase/supabase-js')

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

const MAX_IMAGE_SIZE = 7_000_000

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (!forwarded) return null
  return forwarded.split(',')[0].trim()
}

async function checkRateLimit(ip) {
  if (!ip) return true
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_ip: ip,
      p_endpoint: 'ocr'
    })
    if (error) return true
    return data?.[0]?.allowed !== false
  } catch {
    return true
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mediaType = 'image/jpeg' } = req.body || {}

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' })
  }

  if (imageBase64.length > MAX_IMAGE_SIZE) {
    return res.status(400).json({ error: 'La imagen es demasiado grande. Máximo 5MB.' })
  }

  const ip = getClientIp(req)
  const allowed = await checkRateLimit(ip)
  if (!allowed) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta de nuevo en una hora.' })
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
