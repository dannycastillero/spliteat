import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      insert: mockInsert.mockReturnThis(),
      select: mockSelect.mockReturnThis(),
      single: mockSingle,
    })),
  })),
}))

import handler from './bills'

function makeReq(overrides: Record<string, any> = {}) {
  return {
    method: 'POST',
    body: { items: [{ id: '1', name: 'Burger', price: 5 }], people: [{ id: 'p1', name: 'Ana' }] },
    headers: {},
    ...overrides,
  }
}

function makeRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.end = vi.fn().mockReturnValue(res)
  return res
}

describe('POST /api/bills', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    mockSingle.mockResolvedValue({ data: { id: 'bill-uuid-123', short_code: 'abc123' }, error: null })
  })

  it('returns 405 for non-POST requests', async () => {
    const req = makeReq({ method: 'GET' })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('returns 400 when items is missing', async () => {
    const req = makeReq({ body: { people: [] } })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid bill data: items and people are required' })
  })

  it('returns 400 when people is missing', async () => {
    const req = makeReq({ body: { items: [] } })
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('saves bill anonymously when no Authorization header', async () => {
    const req = makeReq()
    const res = makeRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith({ billId: 'bill-uuid-123', shortCode: 'abc123' })
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('extracts user_id from valid Bearer token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-abc' } } })
    const req = makeReq({ headers: { authorization: 'Bearer valid-token' } })
    const res = makeRes()
    await handler(req, res)
    expect(mockGetUser).toHaveBeenCalledWith('valid-token')
    expect(res.json).toHaveBeenCalledWith({ billId: 'bill-uuid-123', shortCode: 'abc123' })
  })

  it('saves anonymously when Bearer token resolves to no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const req = makeReq({ headers: { authorization: 'Bearer invalid-token' } })
    const res = makeRes()
    await handler(req, res)
    expect(res.json).toHaveBeenCalledWith({ billId: 'bill-uuid-123', shortCode: 'abc123' })
  })

  it('returns 500 when Supabase insert fails with non-collision error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: '42P01', message: 'DB connection failed' } })
    const req = makeReq()
    const res = makeRes()
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'DB connection failed' })
  })

  it('retries on short_code collision (23505) and succeeds', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'unique violation' } })
      .mockResolvedValueOnce({ data: { id: 'bill-uuid-456', short_code: 'xyz789' }, error: null })
    const req = makeReq()
    const res = makeRes()
    await handler(req, res)
    expect(mockSingle).toHaveBeenCalledTimes(2)
    expect(res.json).toHaveBeenCalledWith({ billId: 'bill-uuid-456', shortCode: 'xyz789' })
  })
})
