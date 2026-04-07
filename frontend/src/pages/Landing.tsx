import { useState } from 'react'
import { Link } from 'react-router-dom'
import { loginWithGoogle } from '@/services/auth'

const faqs = [
  {
    q: 'Is it really free?',
    a: 'Yes. Self-host for free forever with all features. The cloud version offers a free tier and a $15/mo pro plan for managed hosting.',
  },
  {
    q: 'What brokers are supported?',
    a: 'Any broker that exports CSV. Auto-detects columns from Interactive Brokers, MetaTrader, TD Ameritrade, Schwab, and more.',
  },
  {
    q: 'How does it compare to Tradervue?',
    a: 'Similar analytics depth (Sharpe, profit factor, P&L calendar) but open source and free to self-host. Plus market condition analysis that Tradervue doesn\'t have.',
  },
]

const comparisonRows = [
  { feature: 'Open Source', tj: true, tv: false, ts: false },
  { feature: 'Self-Hostable', tj: true, tv: false, ts: false },
  { feature: 'Market Conditions', tj: true, tv: false, ts: false },
  { feature: 'Sharpe/Sortino/Kelly', tj: true, tv: true, ts: false },
  { feature: 'P&L Heatmap', tj: true, tv: true, ts: true },
  { feature: 'Price', tj: 'Free / $15', tv: '$49/mo', ts: '$79/mo' },
]

export function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen text-slate-900 overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-violet-50/50" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-emerald-400/8 blur-3xl" />
      </div>

      {/* Glass Nav */}
      <nav className="sticky top-0 z-50">
        <div className="mx-4 mt-3">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between rounded-2xl bg-white/40 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', monospace" }}>
              TradeJournal<span className="text-blue-600">.dev</span>
            </span>
            <div className="hidden md:flex items-center gap-6 text-sm text-slate-500">
              <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
              <a href="#compare" className="hover:text-slate-900 transition-colors">Compare</a>
              <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
              <a href="https://github.com/zhengxuyu/open-tradervue" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors">GitHub</a>
            </div>
            <Link
              to="/login"
              className="bg-white/60 backdrop-blur-sm border border-white/80 text-slate-700 text-sm font-medium px-5 py-2 rounded-xl hover:bg-white/80 transition-all shadow-sm"
            >
              Log in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Open Source & Free
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Build your trading system with{' '}
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                TradeJournal.dev
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-500 max-w-lg leading-relaxed">
              Track where you've been and where you're going. You can't improve what you don't measure.
            </p>
            <div className="mt-10 space-y-4">
              {[
                ['check_circle', 'Sharpe, Sortino, Kelly, and more for only $15/mo'],
                ['check_circle', '10+ analysis dimensions — by hour, day, symbol, market conditions'],
                ['check_circle', 'P&L calendar heatmap — see your patterns at a glance'],
                ['check_circle', 'Need a free version? Build your own with our open-source code', 'https://github.com/zhengxuyu/open-tradervue'],
              ].map(([icon, text, link]) => (
                <div key={text} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  <span className="text-slate-600 text-[15px]">
                    {text}
                    {link && (
                      <> <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">→ GitHub</a></>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Glass CTA card */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-sm p-8 rounded-3xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_60px_rgba(0,0,0,0.06)]">
              <h2 className="text-2xl font-bold text-center mb-2">Get Started Free</h2>
              <p className="text-slate-400 text-sm text-center mb-8">No credit card required</p>

              {/* Google OAuth button */}
              <button
                onClick={() => loginWithGoogle()}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl py-3.5 px-4 font-medium text-slate-700 hover:bg-slate-50 hover:shadow-md transition-all shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-slate-200/60" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-slate-200/60" />
              </div>

              <Link
                to="/register"
                className="w-full block text-center bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium py-3.5 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all"
              >
                Sign up with Email
              </Link>

              <p className="mt-6 text-center text-xs text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 font-medium hover:underline">Log in</Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quote River — slow horizontal scroll with candlestick background */}
      <section className="py-20 relative overflow-hidden">
        {/* Background: faded candlestick chart pattern */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 1200 400" preserveAspectRatio="none">
          {/* Stylized candlestick silhouettes */}
          {[80,160,240,320,400,480,560,640,720,800,880,960,1040,1120].map((x, i) => {
            const h = [180,120,200,90,160,220,110,170,140,190,130,210,100,150][i]
            const y = 200 - h/2
            const isUp = i % 3 !== 0
            return (
              <g key={i}>
                <line x1={x} y1={y - 30} x2={x} y2={y + h + 30} stroke={isUp ? '#10b981' : '#ef4444'} strokeWidth="1.5" />
                <rect x={x - 12} y={y} width="24" height={h} rx="2" fill={isUp ? '#10b981' : '#ef4444'} />
              </g>
            )
          })}
        </svg>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-center mb-4">Wisdom from the Masters</h2>
          <p className="text-slate-400 text-center mb-14">The greatest traders all agree: discipline is the edge.</p>

          {/* Row 1 — scrolls left, slower */}
          <div className="mb-5 overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
            <div className="flex gap-5 animate-[scroll-left_240s_linear_infinite] w-max">
              {[...Array(2)].flatMap(() => [
                { q: "Money is made by sitting, not trading.", a: "Jesse Livermore" },
                { q: "The trend is your friend until the end when it bends.", a: "Ed Seykota" },
                { q: "The most important quality for an investor is temperament, not intellect.", a: "Warren Buffett" },
                { q: "Don't be a hero. Don't have an ego. Always question yourself and your ability.", a: "Paul Tudor Jones" },
                { q: "The goal of a successful trader is to make the best trades. Money is secondary.", a: "Alexander Elder" },
                { q: "The elements of good trading are: cutting losses, cutting losses, and cutting losses.", a: "Ed Seykota" },
                { q: "Markets are never wrong. Opinions often are.", a: "Jesse Livermore" },
              ]).map((q, i) => (
                <div key={i} className="flex-shrink-0 w-[380px] p-5 rounded-2xl bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
                  <p className="text-slate-600 text-sm leading-relaxed italic mb-3">"{q.q}"</p>
                  <p className="text-xs font-semibold text-slate-400">— {q.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Row 2 — scrolls right, slightly different speed */}
          <div className="overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
            <div className="flex gap-5 animate-[scroll-right_220s_linear_infinite] w-max">
              {[...Array(2)].flatMap(() => [
                { q: "It's not whether you're right or wrong, but how much you make when you're right and lose when you're wrong.", a: "George Soros" },
                { q: "Everyday I assume every position I have is wrong.", a: "Paul Tudor Jones" },
                { q: "There are old traders and there are bold traders, but there are very few old, bold traders.", a: "Ed Seykota" },
                { q: "Risk comes from not knowing what you're doing.", a: "Warren Buffett" },
                { q: "Plan your trade and trade your plan.", a: "Linda Raschke" },
                { q: "The key to trading success is emotional discipline.", a: "Victor Sperandeo" },
                { q: "A loss never bothers me after I take it. I forget it overnight.", a: "Jesse Livermore" },
              ]).map((q, i) => (
                <div key={i} className="flex-shrink-0 w-[400px] p-5 rounded-2xl bg-white/40 backdrop-blur-md border border-white/50 shadow-[0_2px_20px_rgba(0,0,0,0.02)]">
                  <p className="text-slate-600 text-sm leading-relaxed italic mb-3">"{q.q}"</p>
                  <p className="text-xs font-semibold text-slate-400">— {q.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold">Built for serious traders</h2>
          <p className="mt-3 text-slate-500">Every tool you need to find and refine your edge.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: 'analytics',
              title: 'Professional Analytics',
              desc: 'Cumulative P&L, win rate, profit factor, Sharpe ratio, and 20+ metrics computed automatically.',
            },
            {
              icon: 'tune',
              title: 'Market Condition Analysis',
              desc: 'Cross-analyze your performance against 10 market conditions. Find your statistical edge.',
            },
            {
              icon: 'calendar_month',
              title: 'Journal & Calendar',
              desc: 'Monthly P&L heatmap, daily journal with mood tracking, structured lessons and reviews.',
            },
          ].map((f) => (
            <div key={f.title} className="p-8 rounded-3xl bg-white/50 backdrop-blur-sm border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500/10 to-violet-500/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/40">
                <span className="material-symbols-outlined text-blue-600 text-2xl">{f.icon}</span>
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-slate-500 text-[15px] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section id="compare" className="max-w-4xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">How we compare</h2>
          <p className="mt-3 text-slate-500">Professional features without the price tag.</p>
        </div>
        <div className="rounded-3xl bg-white/50 backdrop-blur-sm border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100/60">
                <th className="text-left py-4 px-6 font-medium text-slate-400">Feature</th>
                <th className="text-center py-4 px-4 font-bold text-blue-600 bg-blue-50/50">TradeJournal</th>
                <th className="text-center py-4 px-4 font-medium text-slate-400">Tradervue</th>
                <th className="text-center py-4 px-4 font-medium text-slate-400">TraderSync</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature} className="border-b border-slate-50/60">
                  <td className="py-3.5 px-6 text-slate-700 font-medium">{row.feature}</td>
                  {[row.tj, row.tv, row.ts].map((val, i) => (
                    <td key={i} className={`text-center py-3.5 px-4 ${i === 0 ? 'bg-blue-50/30' : ''}`}>
                      {val === true ? (
                        <span className="material-symbols-outlined text-emerald-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      ) : val === false ? (
                        <span className="material-symbols-outlined text-slate-300 text-lg">cancel</span>
                      ) : (
                        <span className={`font-semibold ${i === 0 ? 'text-blue-600' : 'text-slate-500'}`}>{val}</span>
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
          <h2 className="text-3xl font-bold">Simple pricing</h2>
          <p className="mt-3 text-slate-500">Self-host free or let us handle it.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <div className="p-8 rounded-3xl bg-white/50 backdrop-blur-sm border border-white/60 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
            <h3 className="text-lg font-bold">Self-Hosted</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">Free</span>
              <span className="text-slate-400 text-sm">forever</span>
            </div>
            <ul className="mt-8 space-y-3">
              {['All features', 'Unlimited trades', 'Docker setup', 'Community support'].map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="material-symbols-outlined text-emerald-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  {t}
                </li>
              ))}
            </ul>
            <a
              href="https://github.com/zhengxuyu/open-tradervue"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 block text-center py-3 rounded-xl border border-slate-200/60 text-slate-600 font-medium hover:bg-white/60 transition-all"
            >
              View on GitHub
            </a>
          </div>
          {/* Pro */}
          <div className="p-8 rounded-3xl bg-white/70 backdrop-blur-xl border-2 border-blue-500/30 shadow-[0_8px_40px_rgba(59,130,246,0.08)] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-medium px-4 py-1 rounded-full">
              Popular
            </div>
            <h3 className="text-lg font-bold">Cloud Pro</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">$15</span>
              <span className="text-slate-400 text-sm">/month</span>
            </div>
            <ul className="mt-8 space-y-3">
              {['Everything in free', 'Managed hosting', 'Auto backups', 'Priority support'].map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="material-symbols-outlined text-blue-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  {t}
                </li>
              ))}
            </ul>
            <button className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/20 transition-all">
              Start Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-2xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-12">FAQ</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-2xl bg-white/50 backdrop-blur-sm border border-white/60 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-medium">{faq.q}</span>
                <span className="material-symbols-outlined text-slate-400 transition-transform text-xl" style={{ transform: openFaq === i ? 'rotate(180deg)' : '' }}>
                  expand_more
                </span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-slate-500 text-sm leading-relaxed -mt-1">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 py-12 border-t border-slate-200/40">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <span className="font-bold" style={{ fontFamily: "'Space Grotesk', monospace" }}>
              TradeJournal<span className="text-blue-600">.dev</span>
            </span>
            <p className="text-sm text-slate-400 mt-1">Open source trading journal. AGPL-3.0.</p>
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <a href="https://github.com/zhengxuyu/open-tradervue" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 transition-colors">GitHub</a>
            <Link to="/login" className="hover:text-slate-700 transition-colors">Log in</Link>
            <a href="#pricing" className="hover:text-slate-700 transition-colors">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
