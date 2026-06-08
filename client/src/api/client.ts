import type { SavedBill } from '../types'
import { supabase } from '../lib/supabase'

export interface OcrResponse {
  items: Array<{
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
    isPotentialAlcohol: boolean
  }>
  detectedTipPercentage: number | null
}

export async function ocrReceipt(imageBase64: string, mediaType: string): Promise<OcrResponse> {
  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mediaType }),
  })
  if (!res.ok) throw new Error('OCR failed')
  return res.json()
}

export async function saveBillToServer(billData: object): Promise<{ billId: string; shortCode: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const res = await fetch('/api/bills', {
    method: 'POST',
    headers,
    body: JSON.stringify(billData),
  })
  if (!res.ok) throw new Error('Failed to save bill')
  return res.json()
}

export async function getBillFromServer(billId: string): Promise<SavedBill> {
  const res = await fetch(`/api/bills/${billId}`)
  if (!res.ok) throw new Error('Bill not found')
  return res.json()
}

export async function getBillByCode(code: string): Promise<SavedBill> {
  const res = await fetch(`/api/s/${code}`)
  if (!res.ok) throw new Error('Bill not found')
  return res.json()
}
