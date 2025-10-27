import { jest } from '@jest/globals'

// Mock Supabase client before importing the service
const signUp = jest.fn()
const signInWithPassword = jest.fn()

jest.unstable_mockModule('../../services/supabaseClient.js', () => ({
  supabase: {
    auth: {
      signUp,
      signInWithPassword,
    },
  },
}))

const { signup, signin } = await import('../../services/authService.js')

describe('authService', () => {
  beforeEach(() => {
    signUp.mockReset()
    signInWithPassword.mockReset()
  })

  describe('signup', () => {
    it('throws for invalid email', async () => {
      await expect(signup('bad-email', 'Password123!')).rejects.toThrow('Invalid email')
    })

    it('throws for weak password', async () => {
      await expect(signup('user@example.com', 'short')).rejects.toThrow('Password must be at least 8 characters')
    })

    it('returns user on success', async () => {
      signUp.mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'user@example.com' } }, error: null })
      const res = await signup('user@example.com', 'Password123!')
      expect(signUp).toHaveBeenCalled()
      expect(res).toMatchObject({ id: 'u1', email: 'user@example.com' })
    })

    it('throws when provider returns error', async () => {
      signUp.mockResolvedValueOnce({ data: { user: null }, error: new Error('email in use') })
      await expect(signup('user@example.com', 'Password123!')).rejects.toThrow('email in use')
    })
  })

  describe('signin', () => {
    it('throws on missing credentials', async () => {
      await expect(signin('', '')).rejects.toThrow('Email and password are required')
    })

    it('returns session token and user', async () => {
      signInWithPassword.mockResolvedValueOnce({ data: { session: { access_token: 'tok' }, user: { id: 'u1' } }, error: null })
      const res = await signin('user@example.com', 'Password123!')
      expect(signInWithPassword).toHaveBeenCalled()
      expect(res).toMatchObject({ access_token: 'tok', user: { id: 'u1' } })
    })

    it('throws when provider returns error', async () => {
      signInWithPassword.mockResolvedValueOnce({ data: { session: null, user: null }, error: new Error('invalid') })
      await expect(signin('user@example.com', 'Password123!')).rejects.toThrow('invalid')
    })
  })
})
