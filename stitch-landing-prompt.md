# TradeJournal.dev Landing Page - Google Stitch Design Prompt

Design a modern SaaS landing page for "TradeJournal.dev", an open source trading journal. Style inspired by photoai.com: light theme, bold typography, product screenshots, strong CTAs. The app itself is dark themed — show dark UI screenshots embedded in the light page for contrast.

## Colors & Fonts

- Backgrounds: white (#fff) and light gray (#f8fafc) alternating
- Text: #0f1419 (primary), #64748b (secondary)
- Accent blue: #4c9aff (CTAs, links)
- Green: #10b981 (checkmarks, profit)
- Red: #ef4444 (X marks, loss)
- Cards: white, shadow-sm, border #e2e8f0
- Fonts: Inter (headlines 800, body 400), Space Grotesk (labels, uppercase)

## Section 1: Nav Bar (sticky)

White bg, subtle border-bottom, backdrop-blur.
- Left: "TradeJournal" bold black + ".dev" in blue + "OPEN SOURCE" green pill badge
- Center: Features, Pricing, GitHub, Docs
- Right: "Sign In" link + "Get Started Free" blue button rounded-full

## Section 2: Hero (Split Layout)

White bg. Two columns (55% left, 45% right).

**Left — Value Proposition:**
- Pill badge: "🚀 Open Source & Free to Self-Host"
- Headline: "Track Every Trade.\nFind Your Edge." — text-6xl font-extrabold
- Subtitle: "Professional trading analytics. Open source. Self-host or use our cloud." — text-lg text-slate-500
- 5 advantage rows (green ✓ + bold title + one-line description):
  - ✅ Free & Open Source — Self-host, AGPL-3.0
  - ✅ 10+ Analysis Dimensions — Hour, day, symbol, market conditions
  - ✅ Sharpe, Sortino, Kelly — Metrics that $49/mo tools charge for
  - ✅ P&L Calendar Heatmap — See patterns at a glance
  - ✅ FIFO Position Tracking — Automatic from your trades

**Right — Sign Up Card:**
White card, shadow-xl, rounded-2xl, p-8.
- "Start Trading Smarter" heading
- "Free. No credit card." subtitle
- Email / Username / Password fields
- "Create Free Account →" blue button full-width
- "or" divider
- "⭐ Star & Self-Host" dark button with GitHub icon
- "Already have an account? Sign in" link

## Section 3: Screenshot Scroll Wall (like photoai.com)

The visual wow moment. 4 columns of app screenshots auto-scrolling vertically. Odd columns scroll up, even columns scroll down. ~500px height, overflow-hidden.

Show 12+ dark-themed app screenshots as rounded cards with shadow:
Dashboard KPIs, equity curve, daily P&L bars, trade table, calendar heatmap, yearly heatmap, statistics histogram, market conditions cards, journal with mood selector, K-line chart, analysis bar chart, import wizard.

CSS infinite scroll animation, 30s cycle, seamless loop by duplicating content. No text in this section — pure visual.

## Section 4: Three Feature Cards

White bg. "What You Get" — text-3xl font-bold centered.

Three cards in a row, each with a small dark-themed app screenshot on top and text below:

1. **"Professional Analytics"** — Dashboard screenshot. "Cumulative P&L, win rate, profit factor, 10+ statistical dimensions."
2. **"Market Condition Analysis"** — Statistics screenshot. "Discover you trade 3x better on high-volume gap days."
3. **"Journal & Calendar"** — Calendar screenshot. "Monthly P&L heatmap, daily journal with mood tracking."

Cards: white, rounded-2xl, border, shadow-sm, overflow-hidden.

## Section 5: Comparison Table

Light gray bg. "How We Compare" — text-3xl font-bold centered.

| | TradeJournal.dev | Tradervue | TraderSync | TradeNote |
|---|:---:|:---:|:---:|:---:|
| Price | **Free** / $15 | $49/mo | $79/mo | Free |
| Open Source | ✅ | ❌ | ❌ | ✅ |
| Self-Hostable | ✅ | ❌ | ❌ | ✅ |
| Market Conditions | ✅ | ❌ | ❌ | ❌ |
| Sharpe/Sortino | ✅ | ✅ | ❌ | ❌ |
| P&L Heatmap | ✅ | ✅ | ✅ | ❌ |

TradeJournal.dev column highlighted with blue tint (#eff6ff).

## Section 6: Pricing

White bg. "Simple Pricing" — text-3xl font-bold centered.

Two cards side by side:

**Self-Hosted** — "Free Forever". All features, unlimited trades, Docker setup, community support. CTA: "Deploy Free →" outlined button.

**Cloud Pro** — "$15/month" (border-2 border-blue-500, shadow-xl, "RECOMMENDED" badge). Everything in self-hosted + managed hosting + backups + market data + priority support. CTA: "Start Free Trial →" blue button.

## Section 7: FAQ (compact)

White bg. "FAQ" heading. 5 accordion items:
- Is it really free?
- What brokers can I import from?
- How does it compare to Tradervue?
- Is my data safe?
- Can I migrate from another journal?

## Section 8: Footer

Dark bg (#0f1419). TradeJournal.dev logo + links (Product, Developers, Legal) + "© 2026" + GitHub/Twitter icons.

## Design Rules

1. LIGHT theme landing page, DARK theme app screenshots — contrast is the design
2. Keep it short — say it once, say it clearly, move on
3. photoai.com energy — bold, clean, whitespace, product-first
4. Mobile: everything stacks vertically
5. No fluff sections — every section earns its scroll
