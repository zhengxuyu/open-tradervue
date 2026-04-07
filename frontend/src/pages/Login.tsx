import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '@/services/auth'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      const message =
        err.response?.data?.detail || 'Invalid email or password'
      setError(typeof message === 'string' ? message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface min-h-screen flex items-center justify-center">
      <div className="bg-surface-container p-8 rounded-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Open Tradervue
          </h1>
          <p className="text-sm text-outline mt-1">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-label uppercase tracking-widest text-outline">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-primary py-2.5 px-0 text-sm text-on-surface outline-none font-label"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-[10px] font-label uppercase tracking-widest text-outline">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-primary py-2.5 px-0 text-sm text-on-surface outline-none font-label"
              placeholder="Enter your password"
            />
          </div>

          {error && <p className="text-tertiary text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-br from-primary to-primary-container text-on-primary-container w-full py-3 rounded-lg font-label text-sm font-bold uppercase tracking-widest disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-outline">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:text-white text-sm">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
