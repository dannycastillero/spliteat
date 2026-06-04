import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    }
  }
}))

import { saveBillToServer } from './client'
import { supabase } from '../lib/supabase'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('saveBillToServer', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ billId: 'test-uuid' })
    })
  })

  it('sends bill data without auth header when no session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null }
    } as any)

    await saveBillToServer({ items: [], people: [] })

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Authorization']).toBeUndefined()
  })

  it('sends Authorization header when session exists', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'my-token' } }
    } as any)

    await saveBillToServer({ items: [], people: [] })

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Authorization']).toBe('Bearer my-token')
  })
})
