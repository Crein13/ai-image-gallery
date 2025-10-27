import { jest } from '@jest/globals'
import request from 'supertest'

// Mock the authService module before importing the app
const signup = jest.fn()
const signin = jest.fn()

jest.unstable_mockModule('../../services/authService.js', () => ({
  signup,
  signin,
}))

const { default: app } = await import('../../app.js')

describe('Auth routes', () => {
  beforeEach(() => {
    signup.mockReset()
    signin.mockReset()
  })

  describe('POST /api/auth/signup', () => {
    it('returns 201 and user on success', async () => {
      signup.mockResolvedValueOnce({ id: 'u1', email: 'user@example.com' })
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'user@example.com', password: 'Password123!' })
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({ user: { id: 'u1', email: 'user@example.com' } })
      expect(signup).toHaveBeenCalled()
    })

    it('propagates validation error as 400', async () => {
      const err = new Error('Invalid email'); err.status = 400
      signup.mockRejectedValueOnce(err)
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'bad', password: 'Password123!' })
      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error', 'Invalid email')
    })
  })

  describe('POST /api/auth/signin', () => {
    it('returns 200 and token+user on success', async () => {
      signin.mockResolvedValueOnce({ access_token: 'tok', user: { id: 'u1' } })
      const res = await request(app)
        .post('/api/auth/signin')
        .send({ email: 'user@example.com', password: 'Password123!' })
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ access_token: 'tok', user: { id: 'u1' } })
    })

    it('propagates missing creds as 400', async () => {
      const err = new Error('Email and password are required'); err.status = 400
      signin.mockRejectedValueOnce(err)
      const res = await request(app)
        .post('/api/auth/signin')
        .send({ email: '', password: '' })
      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error', 'Email and password are required')
    })
  })
})
