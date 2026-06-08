import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: mockSelect.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      single: mockSingle,
    })),
  })),
}))

import handler from './[code]'

function makeReq(code = 'abc123') {
  return { method: 'GET', query: { code } }
}

function makeRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.end = vi.fn().mockReturnValue(res)
  return res
}

describe('GET /api/s/[code]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  it('returns 405 for non-GET requests', async () => {
    const req = { ...makeReq(), method: 'POST' }
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns bill data when short_code exists', async () => {
    const billData = { items: [], people: [], tipPercentage: 0 }
    mockSingle.mockResolvedValue({ data: { data: billData }, error: null })
    const req = makeReq('abc123')
    const res = makeRes()
    await handler(req, res)
    expect(mockEq).toHaveBeenCalledWith('short_code', 'abc123')
    expect(res.json).toHaveBeenCalledWith(billData)
  })

  it('returns 404 when short_code does not exist', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const req = makeReq('notexist')
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Bill not found' })
  })
})
