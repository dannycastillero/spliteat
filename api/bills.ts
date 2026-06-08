import { createClient } from '@supabase/supabase-js'

async function createBillWithRetry(
  supabase: any,
  userId: string | null,
  data: object,
  attempts = 3
): Promise<{ id: string; short_code: string }> {
  for (let i = 0; i < attempts; i++) {
    const short_code = Math.random().toString(36).slice(2, 8)
    const { data: bill, error } = await supabase
      .from('bills')
      .insert({ user_id: userId, data, short_code })
      .select('id, short_code')
      .single()
    if (!error) return bill
    if (error.code !== '23505') throw error
  }
  throw new Error('Failed to generate unique short code after 3 attempts')
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const billData = req.body
  if (!billData?.items || !billData?.people) {
    return res.status(400).json({ error: 'Invalid bill data: items and people are required' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let userId: string | null = null
  const authHeader = req.headers.authorization as string | undefined
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user } } = await supabase.auth.getUser(token)
    userId = user?.id ?? null
  }

  try {
    const bill = await createBillWithRetry(supabase, userId, billData)
    res.json({ billId: bill.id, shortCode: bill.short_code })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
