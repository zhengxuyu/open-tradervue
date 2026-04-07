import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register, login } from '@/services/auth'

const screenshots = [
  { label: 'Dashboard', color: 'from-blue-900 to-slate-900' },
  { label: 'Calendar', color: 'from-emerald-900 to-slate-900' },
  { label: 'Statistics', color: 'from-purple-900 to-slate-900' },
  { label: 'Journal', color: 'from-amber-900 to-slate-900' },
  { label: 'Analysis', color: 'from-cyan-900 to-slate-900' },
  { label: 'Charts', color: 'from-rose-900 to-slate-900' },
  { label: 'Import', color: 'from-indigo-900 to-slate-900' },
  { label: 'Trades', color: 'from-teal-900 to-slate-900' },
  { label: 'Position', color: 'from-violet-900 to-slate-900' },
  { label: 'Settings', color: 'from-orange-900 to-slate-900' },
  { label: 'Heatmap', color: 'from-lime-900 to-slate-900' },
  { label: 'Metrics', color: 'from-pink-900 to-slate-900' },
]

const faqs = [
  {
    q: 'How is this different from Tradervue?',
    a: 'TradeJournal.dev is fully open-source and self-hostable. You own your data, pay nothing, and can customize every aspect of the platform. No vendor lock-in, no monthly fees for basic features.',
  },
  {
    q: 'What brokers are supported?',
    a: 'We support CSV imports from most major brokers including Interactive Brokers, TD Ameritrade, Schwab, Tradier, and more. You can also use our generic CSV format to import from any broker.',
  },
  {
    q: 'Can I migrate my data from Tradervue?',
    a: 'Yes. Export your trades from Tradervue as CSV and import them directly into TradeJournal.dev. Your tags, notes, and execution data will be preserved.',
  },
]

const comparisonRows = [
  { feature: 'Open Source', tj: true, tv: false, ts: false },
  { feature: 'Self-Hostable', tj: true, tv: false, ts: false },
  { feature: 'Trade Analytics', tj: true, tv: true, ts: true },
  { feature: 'Journal & Notes', tj: true, tv: true, ts: true },
  { feature: 'Condition Tagging', tj: true, tv: false, ts: false },
  { feature: 'Free Tier', tj: 'Unlimited', tv: '100 trades/mo', ts: 'No' },
  { feature: 'Price (Full)', tj: 'Free / $15', tv: '$49/mo', ts: '$29/mo' },
]

export function Landing() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(email, username, password)
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const col1 = screenshots.slice(0, 3)
  const col2 = screenshots.slice(3, 6)
  const col3 = screenshots.slice(6, 9)
  const col4 = screenshots.slice(9, 12)

  return (
    <div className="min-h-screen bg-[#f7f9ff] text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', monospace" }}>
              TradeJournal.dev
            </span>
            <div className="hidden md:flex items-center gap-6 text-sm text-slate-500">
              <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
              <a href="https://github.com/zhengxuyu/open-tradervue" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors">GitHub</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Sign In</Link>
            <a href="#signup" className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-blue-700 transition-colors">Get Started Free</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left column */}
          <div className="pt-4">
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-slate-900">
              Track Every Trade.<br />
              <span className="text-blue-600">Find Your Edge.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-500 max-w-lg">
              The open-source trade journal that gives you professional-grade analytics without the monthly bill.
            </p>
            <div className="mt-10 space-y-5">
              {[
                'Free & open-source forever',
                'Self-host or use our cloud',
                'Import from any broker',
                'Professional analytics & charts',
                'No trade limits, no paywalls',
              ].map((text) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-xl">check_circle</span>
                  <span className="text-slate-700">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column - signup form */}
          <div id="signup" className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Create your account</h2>
            <p className="text-slate-500 text-sm mb-6">Start journaling your trades in under a minute.</p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition"
                  placeholder="trader123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition"
                  placeholder="Min 8 characters"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-medium py-3 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Get Started Free'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign In</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Screenshot scroll wall */}
      <section className="py-16 overflow-hidden bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
          <h2 className="text-3xl font-bold text-white">Everything you need to improve</h2>
          <p className="mt-3 text-slate-400">Professional tools, zero cost.</p>
        </div>
        <div className="flex gap-4 h-[500px] overflow-hidden px-6">
          {[col1, col2, col3, col4].map((col, colIdx) => (
            <div key={colIdx} className="flex-1 overflow-hidden">
              <div className={colIdx % 2 === 0 ? 'animate-scroll-up' : 'animate-scroll-down'}>
                {[...col, ...col].map((s, i) => (
                  <div
                    key={`${colIdx}-${i}`}
                    className={`bg-gradient-to-br ${s.color} rounded-xl h-48 mb-4 flex items-center justify-center`}
                  >
                    <span className="text-white/60 text-lg font-medium">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900">Built for serious traders</h2>
          <p className="mt-3 text-slate-500">Every tool you need to find and refine your edge.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: 'analytics',
              title: 'Professional Analytics',
              desc: 'P&L curves, win rate breakdowns, R-multiple distributions, and dozens of metrics updated in real-time.',
            },
            {
              icon: 'psychology',
              title: 'Condition Analysis',
              desc: 'Tag trades with market conditions, setups, and emotions. See which conditions produce your best results.',
            },
            {
              icon: 'calendar_month',
              title: 'Journal & Calendar',
              desc: 'Daily journaling with a calendar heatmap view. Attach notes, screenshots, and lessons to every trading day.',
            },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-blue-600 text-2xl">{f.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">How we compare</h2>
          <p className="mt-3 text-slate-500">The features you need without the price tag.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-4 px-6 font-medium text-slate-500">Feature</th>
                <th className="text-center py-4 px-4 font-bold text-blue-600">TradeJournal</th>
                <th className="text-center py-4 px-4 font-medium text-slate-500">Tradervue</th>
                <th className="text-center py-4 px-4 font-medium text-slate-500">TraderSync</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature} className="border-b border-slate-50">
                  <td className="py-3 px-6 text-slate-700">{row.feature}</td>
                  {[row.tj, row.tv, row.ts].map((val, i) => (
                    <td key={i} className="text-center py-3 px-4">
                      {val === true ? (
                        <span className="material-symbols-outlined text-emerald-500 text-lg">check</span>
                      ) : val === false ? (
                        <span className="material-symbols-outlined text-slate-300 text-lg">close</span>
                      ) : (
                        <span className="text-slate-700 text-sm font-medium">{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900">Simple, honest pricing</h2>
          <p className="mt-3 text-slate-500">Self-host for free or let us handle the infrastructure.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Self-Hosted */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h3 className="text-lg font-bold text-slate-900">Self-Hosted</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900">Free</span>
              <span className="text-slate-500 text-sm">forever</span>
            </div>
            <p className="mt-3 text-slate-500 text-sm">Run on your own server. Full control over your data.</p>
            <ul className="mt-6 space-y-3">
              {['Unlimited trades', 'All analytics features', 'All import formats', 'Community support'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="material-symbols-outlined text-emerald-500 text-base">check</span>
                  {t}
                </li>
              ))}
            </ul>
            <a
              href="https://github.com/zhengxuyu/open-tradervue"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 block text-center border border-slate-200 text-slate-700 font-medium py-3 rounded-full hover:bg-slate-50 transition-colors"
            >
              View on GitHub
            </a>
          </div>
          {/* Cloud Pro */}
          <div className="bg-white rounded-2xl shadow-sm border-2 border-blue-600 p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
              Popular
            </div>
            <h3 className="text-lg font-bold text-slate-900">Cloud Pro</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900">$15</span>
              <span className="text-slate-500 text-sm">/month</span>
            </div>
            <p className="mt-3 text-slate-500 text-sm">We handle hosting, backups, and updates for you.</p>
            <ul className="mt-6 space-y-3">
              {['Everything in Self-Hosted', 'Managed hosting', 'Automatic backups', 'Priority support'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="material-symbols-outlined text-emerald-500 text-base">check</span>
                  {t}
                </li>
              ))}
            </ul>
            <a
              href="#signup"
              className="mt-8 block text-center bg-blue-600 text-white font-medium py-3 rounded-full hover:bg-blue-700 transition-colors"
            >
              Get Started Free
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-medium text-slate-900">{faq.q}</span>
                <span className="material-symbols-outlined text-slate-400 transition-transform" style={{ transform: openFaq === i ? 'rotate(180deg)' : '' }}>
                  expand_more
                </span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-6 text-slate-500 text-sm leading-relaxed -mt-2">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <span className="text-white text-lg font-bold" style={{ fontFamily: "'Space Grotesk', monospace" }}>
                TradeJournal.dev
              </span>
              <p className="mt-2 text-sm text-slate-500 max-w-xs">
                Open-source trade journaling for serious traders.
              </p>
            </div>
            <div className="flex gap-12 text-sm">
              <div className="space-y-3">
                <h4 className="text-white font-medium">Product</h4>
                <a href="#features" className="block hover:text-white transition-colors">Features</a>
                <a href="#pricing" className="block hover:text-white transition-colors">Pricing</a>
              </div>
              <div className="space-y-3">
                <h4 className="text-white font-medium">Resources</h4>
                <a href="https://github.com/zhengxuyu/open-tradervue" target="_blank" rel="noopener noreferrer" className="block hover:text-white transition-colors">GitHub</a>
                <Link to="/login" className="block hover:text-white transition-colors">Sign In</Link>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 text-sm text-slate-600">
            &copy; {new Date().getFullYear()} TradeJournal.dev. Open-source under MIT license.
          </div>
        </div>
      </footer>
    </div>
  )
}
