export interface Item {
  id: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number        // unitPrice × quantity
  isAlcohol: boolean        // confirmado por el usuario
  isPotentialAlcohol: boolean  // detectado por OCR
  assignedTo: string[]      // IDs de personas
}

export interface Person {
  id: string
  name: string
  color: string             // hex color del avatar
}

export interface BillState {
  items: Item[]
  people: Person[]
  tipPercentage: number     // 0 | 10 | 15 | 20
  rawReceiptImageBase64?: string
}

export interface PersonBreakdown {
  personId: string
  foodSubtotal: number
  alcoholSubtotal: number
  foodTax: number           // foodSubtotal × 0.07
  alcoholTax: number        // alcoholSubtotal × 0.10
  tipShare: number          // proporcional al subtotal
  total: number
}

export interface SavedBill extends BillState {
  breakdowns?: PersonBreakdown[]  // presente al leer del servidor; ausente si se construye en el cliente
}
