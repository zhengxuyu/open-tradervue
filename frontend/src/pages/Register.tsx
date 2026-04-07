import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerWithEmail, loginWithEmail, loginWithGoogle } from '@/services/auth'

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
      await registerWithEmail(email, username, password)
      await loginWithEmail(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle()
    } catch (err: any) {
      setError(err.message || 'Google login failed')
    }
  }

  return (
    <div className="bg-surface min-h-screen flex items-center justify-center">
      <div className="bg-surface-container p-8 rounded-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">TradeJournal.dev</h1>
          <p className="text-sm text-outline mt-1">Create your account</p>
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-outline-variant/30 rounded-xl py-3 px-4 font-medium text-slate-700 hover:bg-slate-50 transition-all mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-outline-variant/30" />
          <span className="text-xs text-outline uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-outline-variant/30" />
        </div>

        {/* Email registration */}
        {error && <p className="text-tertiary text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-label uppercase tracking-widest text-outline">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-primary py-2.5 px-0 text-sm text-on-surface outline-none font-label"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-[10px] font-label uppercase tracking-widest text-outline">Username</label>
            <input
              type="text" required value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-primary py-2.5 px-0 text-sm text-on-surface outline-none font-label"
              placeholder="Choose a username"
            />
          </div>
          <div>
            <label className="text-[10px] font-label uppercase tracking-widest text-outline">Password</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-primary py-2.5 px-0 text-sm text-on-surface outline-none font-label"
              placeholder="Create a password"
            />
          </div>
          <div>
            <label className="text-[10px] font-label uppercase tracking-widest text-outline">Confirm Password</label>
            <input
              type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-primary py-2.5 px-0 text-sm text-on-surface outline-none font-label"
              placeholder="Confirm your password"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-3 rounded-xl font-label text-sm font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-outline">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
