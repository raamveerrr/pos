import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

// Mock the useAuth hook
jest.mock('@/hooks/useAuth')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Mock component that uses auth
const TestAuthComponent = () => {
  const { user, signIn, signOut, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      {user ? (
        <div>
          <p>Logged in as: {user.email}</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <div>
          <p>Not logged in</p>
          <button onClick={() => signIn('test@example.com', 'password')}>
            Sign In
          </button>
        </div>
      )}
    </div>
  )
}

describe('Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should display loading state initially', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    })

    render(<TestAuthComponent />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('should display not logged in state when user is null', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    })

    render(<TestAuthComponent />)
    expect(screen.getByText('Not logged in')).toBeInTheDocument()
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  test('should display logged in state when user exists', () => {
    const mockUser = { email: 'test@example.com', id: '123' }
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    })

    render(<TestAuthComponent />)
    expect(screen.getByText('Logged in as: test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  test('should call signIn when sign in button is clicked', async () => {
    const mockSignIn = jest.fn()
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      signIn: mockSignIn,
      signUp: jest.fn(),
      signOut: jest.fn(),
    })

    render(<TestAuthComponent />)
    fireEvent.click(screen.getByText('Sign In'))
    
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password')
  })

  test('should call signOut when sign out button is clicked', async () => {
    const mockSignOut = jest.fn()
    const mockUser = { email: 'test@example.com', id: '123' }
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: mockSignOut,
    })

    render(<TestAuthComponent />)
    fireEvent.click(screen.getByText('Sign Out'))
    
    expect(mockSignOut).toHaveBeenCalled()
  })
})