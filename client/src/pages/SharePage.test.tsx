import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../api/client', () => ({
  getBillByCode: vi.fn(),
  getBillFromServer: vi.fn(),
}))

import SharePage from './SharePage'
import { getBillByCode } from '../api/client'

const mockBill = {
  items: [
    {
      id: '1',
      name: 'Ceviche',
      quantity: 1,
      unitPrice: 10,
      totalPrice: 10,
      isAlcohol: false,
      isPotentialAlcohol: false,
      assignedTo: ['p1'],
    },
  ],
  people: [{ id: 'p1', name: 'Ana', color: '#FF5F5F' }],
  tipPercentage: 0,
}

describe('SharePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('muestra CTA para dividir cuenta propia', async () => {
    vi.mocked(getBillByCode).mockResolvedValue(mockBill)
    render(
      <MemoryRouter initialEntries={['/s/abc123']}>
        <Routes>
          <Route path="/s/:code" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(await screen.findByText('Divide tu cuenta gratis →')).toBeTruthy()
  })

  it('navega a / al tocar el CTA', async () => {
    vi.mocked(getBillByCode).mockResolvedValue(mockBill)
    render(
      <MemoryRouter initialEntries={['/s/abc123']}>
        <Routes>
          <Route path="/s/:code" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    )
    const btn = await screen.findByText('Divide tu cuenta gratis →')
    fireEvent.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
