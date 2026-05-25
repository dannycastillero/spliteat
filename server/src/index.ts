import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDb } from './db/schema'
import ocrRouter from './routes/ocr.route'
import billsRouter from './routes/bills.route'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api/ocr', ocrRouter)
app.use('/api/bills', billsRouter)

initDb()

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
