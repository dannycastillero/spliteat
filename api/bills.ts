import { createClient } from '@supabase/supabase-js'

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
    const { data, error } = await supabase.rpc('create_bill', {
      p_user_id: userId,
      p_data: billData
    })
    if (error) throw error
    const bill = data[0]
    res.json({ billId: bill.bill_id, shortCode: bill.bill_short_code })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
