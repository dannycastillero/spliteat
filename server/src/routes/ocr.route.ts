import { Router, Request, Response } from 'express'
import { extractItemsFromImage } from '../services/ocr.service'

const router = Router()

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { imageBase64, mediaType } = req.body as {
    imageBase64?: string
    mediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  }

  if (!imageBase64) {
    res.status(400).json({ error: 'imageBase64 is required' })
    return
  }

  try {
    const result = await extractItemsFromImage(imageBase64, mediaType)
    res.json(result)
  } catch (error) {
    console.error('OCR error:', error)
    res.status(500).json({ error: 'Failed to extract items from image' })
  }
})

export default router
