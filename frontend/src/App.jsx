import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import Gallery from './pages/Gallery'

function App() {
  const { user, loading, signUp, signIn } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  // If user is logged in, show gallery
  if (user) {
    return <Gallery />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (isSignUp) {
        const result = await signUp(email, password)

        // Check if this is a new signup or existing user
        if (result && result.isNewUser) {
          // New account created, needs email verification
          setError('Account created! Please check your email to verify your account before signing in.')
        } else {
          // For existing users or unclear cases, use generic message
          setError('Please check your email to verify your account before signing in.')
        }
      } else {
        await signIn(email, password)
        // User will be redirected automatically when user state updates
      }
    } catch (err) {
      // Handle specific error cases
      if (err.response?.status === 409 && isSignUp) {
        // User already registered
        setError('An account with this email already exists. Try signing in instead.')
      } else if (err.response?.status === 400) {
        setError(err.response.data?.error || err.response.data?.message || 'Invalid request')
      } else if (err.response?.status === 401) {
        setError('Invalid email or password')
      } else {
        setError(err.response?.data?.error || err.message || 'Authentication failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Match homepage navbar style */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="w-full max-w-6xl flex justify-between items-center h-16">
              {/* Logo */}
              <div>
                <h1 className="text-xl font-bold text-blue-600">AI Image Gallery</h1>
              </div>

              {/* Empty space to maintain navbar structure */}
              <div></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full" style={{maxWidth: '400px'}}>
          {/* Hero Text */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </h2>
            <p className="text-gray-600 text-sm">
              {isSignUp
                ? 'Create an account to start organizing your images with AI'
                : 'Upload, tag, and search your images with AI'}
            </p>
          </div>

          {/* Auth Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="Email address"
                />
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                  placeholder="Password"
                />
              </div>

              {error && (
                <div
                  className={`p-3 rounded text-sm ${
                    error.includes('created')
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError('')
                }}
                disabled={isLoading}
                className="text-blue-600 hover:underline text-sm disabled:opacity-50"
              >
                {isSignUp
                  ? 'Already have an account? Sign In'
                  : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
