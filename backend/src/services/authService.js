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

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) {
    const err = new Error(error.message || 'Signup failed')
    err.status = 400
    throw err
  }
  return data.user
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
