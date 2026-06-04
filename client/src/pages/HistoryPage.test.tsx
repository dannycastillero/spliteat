import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    })
  }
}))

import HistoryPage from './HistoryPage'
import { useAuth } from '../context/AuthContext'

const baseAuth = {
  signIn: vi.fn(), signUp: vi.fn(), signOut: vi.fn(), resetPassword: vi.fn()
}

describe('HistoryPage', () => {
  it('redirects to / when user is not logged in', () => {
    vi.mocked(useAuth).mockReturnValue({ ...baseAuth, user: null, loading: false })
    render(<MemoryRouter><HistoryPage /></MemoryRouter>)
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('shows empty state when user has no bills', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...baseAuth,
      user: { id: 'user-1', email: 'test@test.com' } as any,
      loading: false,
    })
    render(<MemoryRouter><HistoryPage /></MemoryRouter>)
    expect(await screen.findByText(/no tienes facturas/i)).toBeTruthy()
  })
})
