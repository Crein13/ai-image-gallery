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

    it('returns user on success (new user)', async () => {
      const now = new Date().toISOString()
      // Signup should succeed with new user
      signUp.mockResolvedValueOnce({
        data: {
          user: { id: 'u1', email: 'user@example.com', email_confirmed_at: null, created_at: now },
          session: null
        },
        error: null
      })
      const res = await signup('user@example.com', 'Password123!')
      expect(signUp).toHaveBeenCalled()
      expect(res).toMatchObject({
        user: { id: 'u1', email: 'user@example.com', email_confirmed_at: null, created_at: now },
        session: null,
        isNewUser: true
      })
    })

    it('returns user on success (existing user)', async () => {
      const pastTime = new Date(Date.now() - 60000).toISOString() // 1 minute ago (old user)
      // Signup should succeed but return existing user
      signUp.mockResolvedValueOnce({
        data: {
          user: { id: 'u1', email: 'user@example.com', email_confirmed_at: pastTime, created_at: pastTime },
          session: null
        },
        error: null
      })
      const res = await signup('user@example.com', 'Password123!')
      expect(signUp).toHaveBeenCalled()
      expect(res).toMatchObject({
        user: { id: 'u1', email: 'user@example.com', email_confirmed_at: pastTime, created_at: pastTime },
        session: null,
        isNewUser: false
      })
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
