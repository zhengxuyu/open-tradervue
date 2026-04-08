import { useState } from 'react'
import { createCheckoutSession } from '@/services/stripe'
import { logout } from '@/services/auth'

export function Paywall() {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const url = await createCheckoutSession()
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      console.error('Failed to create checkout session', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="max-w-md w-full p-8 rounded-2xl bg-surface-container border border-outline-variant/20 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-3xl">lock</span>
        </div>
        <h1 className="text-2xl font-bold text-on-surface mb-2">Activate Your Account</h1>
        <p className="text-outline mb-8">
          Subscribe to TradeJournal.dev Pro to access all trading analytics,
          journal, and portfolio tracking features.
        </p>
        <div className="mb-6 p-4 rounded-xl bg-surface-container-high">
          <div className="text-3xl font-bold text-on-surface">$15<span className="text-lg text-outline font-normal">/month</span></div>
          <p className="text-sm text-outline mt-1">Cancel anytime</p>
        </div>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-sm uppercase tracking-widest disabled:opacity-50 transition-all"
        >
          {loading ? 'Redirecting to Stripe...' : 'Subscribe Now'}
        </button>
        <button
          onClick={() => logout()}
          className="mt-4 text-sm text-outline hover:text-on-surface-variant transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
