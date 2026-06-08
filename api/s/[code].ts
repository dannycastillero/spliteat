import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code } = req.query as { code: string }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: bill, error } = await supabase
    .from('bills')
    .select('data')
    .eq('short_code', code)
    .single()

  if (error || !bill) return res.status(404).json({ error: 'Bill not found' })
  res.json(bill.data)
}
