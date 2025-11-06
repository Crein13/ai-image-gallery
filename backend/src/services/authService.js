import { supabase } from './supabaseClient.js'

function isValidEmail(email) {
  return typeof email === 'string' && /.+@.+\..+/.test(email)
}

function assertPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    const err = new Error('Password must be at least 8 characters')
    err.status = 400
    throw err
  }
}

export async function signup(email, password) {
  if (!isValidEmail(email)) {
    const err = new Error('Invalid email')
    err.status = 400
    throw err
  }
  assertPassword(password)

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${baseUrl}/confirm-email`
    }
  })

  if (error) {
    // Handle specific Supabase errors
    if (error.message.includes('already registered') || error.message.includes('User already registered')) {
      const err = new Error('Account already exists with this email. Please sign in instead.')
      err.status = 409
      throw err
    }
    const err = new Error(error.message || 'Signup failed')
    err.status = 400
    throw err
  }

  if (!data?.user) {
    const err = new Error('Signup failed - no user returned')
    err.status = 500
    throw err
  }

  // For Supabase signup:
  // - If user is truly new, created_at will be very recent (within seconds)
  // - If user already existed, Supabase may return the existing user record
  //   or create a new confirmation attempt, but created_at will be older
  const now = new Date()
  const createdAt = new Date(data.user.created_at)
  const timeDiffSeconds = Math.abs(now - createdAt) / 1000

  // If created within the last 30 seconds, consider it a new user
  // This accounts for any small delays in processing
  const isNewUser = timeDiffSeconds < 30

  return {
    user: data.user,
    session: data.session,
    isNewUser
  }
}

export async function signin(email, password) {
  if (!email || !password) {
    const err = new Error('Email and password are required')
    err.status = 400
    throw err
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    const err = new Error(error.message || 'Signin failed')
    err.status = 401
    throw err
  }
  return { access_token: data.session?.access_token, refresh_token: data.session?.refresh_token, user: data.user }
}
