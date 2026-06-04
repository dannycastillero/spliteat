import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn()
}))

import LoginPage from './LoginPage'
import { useAuth } from '../context/AuthContext'

const defaultAuth = {
  user: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    vi.mocked(useAuth).mockReturnValue({ ...defaultAuth })
  })

  it('renders sign in form by default', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    expect(screen.getAllByPlaceholderText('ejemplo@correo.com')[0]).toBeTruthy()
    expect(screen.getByPlaceholderText('••••••••')).toBeTruthy()
  })

  it('navigates to / when Continua como Invitado is clicked', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    fireEvent.click(screen.getByText('Continua como Invitado'))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('shows error message when sign in fails', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...defaultAuth,
      signIn: vi.fn().mockRejectedValue(new Error('Invalid login credentials')),
    })
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    fireEvent.change(screen.getAllByPlaceholderText('ejemplo@correo.com')[0], {
      target: { value: 'test@test.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpass' },
    })
    fireEvent.click(screen.getByText('Ingresa →'))
    await waitFor(() =>
      expect(screen.getByText('Invalid login credentials')).toBeTruthy()
    )
  })

  it('switches to Crear Cuenta tab and shows name field', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    fireEvent.click(screen.getByText('Crear Cuenta'))
    expect(screen.getByPlaceholderText('Tu nombre y apellido')).toBeTruthy()
  })

  it('navigates to / after successful sign in', async () => {
    vi.mocked(useAuth).mockReturnValue({
      ...defaultAuth,
      signIn: vi.fn().mockResolvedValue(undefined),
    })
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    fireEvent.change(screen.getAllByPlaceholderText('ejemplo@correo.com')[0], {
      target: { value: 'user@test.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByText('Ingresa →'))
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    )
  })
})
