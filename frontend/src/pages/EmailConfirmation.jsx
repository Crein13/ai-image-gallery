import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function EmailConfirmation() {
  const [status, setStatus] = useState('verifying') // 'verifying', 'success', 'error', 'already-confirmed'
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    let timeoutId = null

    const handleEmailConfirmation = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user && session.user.email_confirmed_at) {
          setStatus('success')
          setMessage('Your email has been confirmed successfully!')
          return
        }

        let token_hash = searchParams.get('token_hash')
        let type = searchParams.get('type')
        let access_token = searchParams.get('access_token')
        let refresh_token = searchParams.get('refresh_token')

        if (!token_hash && hashParams.get('token_hash')) {
          token_hash = hashParams.get('token_hash')
          type = hashParams.get('type')
          access_token = hashParams.get('access_token')
          refresh_token = hashParams.get('refresh_token')
        }

        if (token_hash && type) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type === 'signup' ? 'signup' : 'email'
          })

          if (error) {
            if (error.message.includes('expired') || error.message.includes('invalid')) {
              setStatus('error')
              setMessage('This confirmation link has expired or is invalid. Please sign up again.')
            } else if (error.message.includes('already') || error.message.includes('confirmed')) {
              setStatus('already-confirmed')
              setMessage('This email has already been confirmed.')
            } else {
              setStatus('error')
              setMessage('Email confirmation failed. Please try signing up again.')
            }
            return
          }

          if (data.user) {
            setStatus('success')
            setMessage('Your email has been confirmed successfully!')
            return
          }
        }

        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          })

          if (error) {
            if (error.message.includes('expired')) {
              setStatus('error')
              setMessage('This confirmation link has expired. Please sign up again.')
            } else if (error.message.includes('already been consumed')) {
              setStatus('already-confirmed')
              setMessage('This confirmation link has already been used.')
            } else {
              setStatus('error')
              setMessage('Email confirmation failed. Please try signing up again.')
            }
            return
          }

          if (data.user) {
            setStatus('success')
            setMessage('Your email has been confirmed successfully!')
            return
          }
        }

        timeoutId = setTimeout(async () => {
          const { data: { session: finalSession } } = await supabase.auth.getSession()
          if (finalSession?.user) {
            setStatus('success')
            setMessage('Your email has been confirmed successfully!')
            return
          }

          setStatus('error')
          setMessage('Invalid confirmation link. This might be because the link was opened from an email client that doesn\'t preserve URL parameters. Please try copying the link and pasting it directly in your browser, or try signing up again.')
        }, 3000)

      } catch (err) {
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (timeoutId) clearTimeout(timeoutId)
        setTimeout(() => {
          setStatus('success')
          setMessage('Your email has been confirmed successfully!')
        }, 500)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        if (timeoutId) clearTimeout(timeoutId)
        setTimeout(() => {
          setStatus('success')
          setMessage('Your email has been confirmed successfully!')
        }, 500)
      }
    })

    handleEmailConfirmation()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [searchParams])

  const handleContinue = () => {
    setTimeout(() => {
      navigate('/')
    }, 100)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Match app navbar style */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="w-full max-w-6xl flex justify-between items-center h-16">
              <div>
                <h1 className="text-xl font-bold text-blue-600">AI Image Gallery</h1>
              </div>
              <div></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            {status === 'verifying' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Email</h2>
                <p className="text-gray-600">Please wait while we confirm your email address...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="rounded-full bg-green-100 p-3 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Confirmed!</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <p className="text-sm text-gray-500 mb-6">
                  You can now start using AI Image Gallery to upload, organize, and search your images.
                </p>
                <button
                  onClick={handleContinue}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 transition-colors"
                >
                  Continue to Gallery
                </button>
              </>
            )}

            {status === 'already-confirmed' && (
              <>
                <div className="rounded-full bg-yellow-100 p-3 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Already Confirmed</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <p className="text-sm text-gray-500 mb-6">
                  You can now sign in to your account.
                </p>
                <button
                  onClick={handleContinue}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 transition-colors"
                >
                  Go to Sign In
                </button>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="rounded-full bg-red-100 p-3 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmation Failed</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                {/* Debug info in development */}
                {import.meta.env.DEV && (
                  <div className="text-left bg-gray-100 p-3 rounded mb-4 text-xs">
                    <strong>Debug info:</strong><br/>
                    URL params: {JSON.stringify(Object.fromEntries(searchParams.entries()), null, 2)}
                  </div>
                )}
                <button
                  onClick={handleContinue}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 transition-colors"
                >
                  Back to Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailConfirmation