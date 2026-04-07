import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register, login } from '@/services/auth'

export function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await register(email, username, password)
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      const message =
        err.response?.data?.detail || 'Registration failed'
      setError(typeof message === 'string' ? message : 'Registration failed')
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
            Create your account
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
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-primary py-2.5 px-0 text-sm text-on-surface outline-none font-label"
              placeholder="Choose a username"
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
              placeholder="Create a password"
            />
          </div>

          <div>
            <label className="text-[10px] font-label uppercase tracking-widest text-outline">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-primary py-2.5 px-0 text-sm text-on-surface outline-none font-label"
              placeholder="Confirm your password"
            />
          </div>

          {error && <p className="text-tertiary text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-br from-primary to-primary-container text-on-primary-container w-full py-3 rounded-lg font-label text-sm font-bold uppercase tracking-widest disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-outline">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-white text-sm">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
