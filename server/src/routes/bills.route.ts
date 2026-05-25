import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { saveBill, getBill } from '../db/queries'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  const billData = req.body

  if (!billData?.items || !billData?.people) {
    res.status(400).json({ error: 'Invalid bill data: items and people are required' })
    return
  }

  const billId = uuidv4()
  saveBill(billId, billData)
  res.json({ billId })
})

router.get('/:billId', (req: Request, res: Response): void => {
  const { billId } = req.params
  const bill = getBill(billId)

  if (!bill) {
    res.status(404).json({ error: 'Bill not found' })
    return
  }

  res.json(bill)
})

export default router
