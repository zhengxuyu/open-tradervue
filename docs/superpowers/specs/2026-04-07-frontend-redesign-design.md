# Frontend Redesign: Stitch Design Implementation

## Overview

Full rewrite of the Open Tradervue frontend UI to match designs generated via Google Stitch. The data layer (api.ts, types, API calls) remains unchanged. Every page and shared component gets rebuilt with a new design system.

## Current State

- React 19 + TypeScript + Vite + TailwindCSS 4
- Light theme, top horizontal nav bar
- lucide-react icons, system fonts
- ~5,400 lines across 10 pages + 8 components
- HSL CSS variables for basic theming

## Target State

- Dark theme (#0f1419 base) with Material Design 3 color tokens
- Fixed left sidebar navigation (264px)
- Material Symbols Outlined icons (Google Fonts CDN)
- Inter (headings/body) + Space Grotesk (data labels, tabular numbers)
- Bloomberg Terminal aesthetic with modern SaaS polish

## Design System

### Color Tokens (from Stitch Tailwind config)

```
surface:                 #0f1419
surface-container-lowest: #0a0f14
surface-container-low:   #171c21
surface-container:       #1b2025
surface-container-high:  #252a30
surface-container-highest: #30353b
surface-variant:         #30353b

on-surface:              #dee3ea
on-surface-variant:      #c1c6d5
outline:                 #8b919e
outline-variant:         #414753

primary:                 #a7c8ff  (blue accent)
primary-container:       #4c9aff
secondary:               #66d9cc  (profit/green)
secondary-container:     #1ea296
tertiary:                #ffb3ae  (loss/red light)
tertiary-container:      #ff6762  (loss/red strong)
error:                   #ffb4ab
```

### Typography

- **Headlines**: Inter, font-weight 600-800
- **Body**: Inter, font-weight 400-500
- **Data labels**: Space Grotesk, uppercase, tracking-widest, font-weight 500-700
- **Numbers**: Space Grotesk with `font-variant-numeric: tabular-nums`

### Icons

Replace lucide-react with Material Symbols Outlined via Google Fonts CDN link. Create a reusable `<Icon name="dashboard" />` component that renders `<span class="material-symbols-outlined">{name}</span>`.

### Shared Components

#### Sidebar
- Fixed left, 264px wide, full height
- Background: surface-container-low (#171c21)
- Border right: slate-800
- Logo "Open Tradervue" at top
- Nav items: icon + label, active state with blue-500/10 bg + blue-400 text + left border
- User avatar + "Pro Account" at bottom

#### TopAppBar
- Sticky top, 64px height, spans right of sidebar
- Background: surface/80 with backdrop-blur-xl
- Page title (uppercase, tracking-widest, primary color)
- Contextual action buttons on the right

#### StatCard
- Background: surface-container
- Label: 10px Space Grotesk uppercase tracking-widest, slate-400
- Value: 4xl Inter extrabold
- Optional accent border-left, gradient overlay, progress bar

#### DataTable
- Surface-container-lowest background with ghost-border
- Header: 10px Space Grotesk uppercase tracking-widest, outline color
- Rows: divide-y outline-variant/10, hover:bg-surface-container-high/40
- Actions: opacity-0 group-hover:opacity-100

#### Badge (BUY/SELL)
- BUY: bg-secondary-container text-on-secondary-container
- SELL: bg-tertiary-container text-on-tertiary-container
- 10px font-bold uppercase rounded

#### P&L Value
- Profit: text-secondary (#66d9cc)
- Loss: text-tertiary (#ffb3ae) or text-error
- Font: Space Grotesk tabular-nums font-bold

## Pages

### 1. Layout (Sidebar + TopAppBar)
- Replace top nav with fixed left sidebar
- Main content area: `ml-64 min-h-screen`
- TopAppBar inside main area, sticky top
- Navigation items: Dashboard, Trades, Import, Calendar, Journal, Analysis, Statistics, Charts

### 2. Dashboard
- 4 KPI cards row: Total P&L, Win Rate (circular progress), Total Trades (long/short split), Profit Factor
- Cumulative P&L chart (Recharts area chart with gradient fill)
- Daily P&L bars (last 30 days, green/red)
- Recent trades table (last 10, compact)

### 3. Trades
- Filter bar: search by symbol, side toggle (All/Buy/Sell), date range, symbol dropdown
- "Add Trade" button (primary gradient)
- Full data table: checkbox, date/time, symbol, side badge, qty, price, commission, P&L, tags, actions
- Pagination: "Showing 1-50 of N trades" + page numbers
- Slide-in side panel (right, max-w-md) for add/edit trade form

### 4. Import
- 3-step wizard with step indicator (numbered circles + connecting lines)
- Step 1: File upload drop zone + paste CSV tab
- Step 2: Column mapping with dropdown selectors per column, auto-detection, timezone selector
- Step 3: Preview table with warning highlights, summary count, import button
- Right sidebar: live summary (trade count, warnings), import tips

### 5. Position Detail
- Header: symbol (4xl bold) + status badge (CLOSED/OPEN) + date range
- Summary cards row (7 cards): entry price, exit price, qty, P&L, P&L%, hold time, commission
- Left (8/12): candlestick chart with entry/exit markers
- Right (4/12): trades table for this position
- Bottom: market conditions cards (6 cards): vol vs 50d avg, ATR, gap%, day range%, rel volume, price vs SMA50
- Execution timeline: horizontal dots connected by dashed line

### 6. Calendar
- Top bar: month/year nav arrows, monthly/yearly toggle
- Monthly view: 7-col grid, each cell 128px tall, day number + P&L amount + trade count
- Color intensity: green gradient for profit, red for loss, gray for no trades
- Bottom summary: monthly total, trading days, avg daily P&L, best/worst day
- Yearly view: 4x3 grid of mini-month heatmap squares

### 7. Journal
- Left panel (30%): scrollable date list, each showing date + mood emoji + P&L + trade count
- Right panel (70%): editor view
  - Stats header: daily P&L, win rate, trade count
  - Mood selector: 5 emoji buttons
  - Content textarea (markdown support)
  - Collapsible sections: Lessons Learned, Mistakes Made, Improvements
  - Save button + auto-save timestamp

### 8. Analysis
- Tab bar: By Symbol | By Date | Summary
- By Symbol: horizontal P&L bar chart + detailed breakdown table (symbol, trades, win rate, total P&L, avg P&L, profit factor, best/worst)
- Win probability card with mini bar chart
- Summary stats grid (10 cards): total P&L, win rate, profit factor, avg win/loss, max drawdown, sharpe, expectancy, recovery factor, commission, total volume

### 9. Statistics (7 sub-tabs)
- Horizontal scrollable tab bar
- P&L Distribution: histogram with bell curve overlay + descriptive stats sidebar (mean, median, std dev, skewness, kurtosis)
- Market Conditions: 6 condition cards (volume level, relative volume, price vs SMA50, opening gap, ATR level, day movement), each with compact table
- Statistical edge decay timeline (by holding time)
- Other tabs (By Hour, By Day, By Symbol, By Holding Time, Risk & Reward): bar charts + tables, same patterns

### 10. Charts
- Top: symbol search + time range selector (1D/1W/1M/3M/6M/1Y/ALL)
- Technical info ribbon: symbol, price, volume
- Main area: candlestick chart (lightweight-charts) with SMA overlays + trade markers (entry/exit arrows)
- Volume bars below chart
- Bottom panel (256px): recent executions table for selected symbol

## What Does NOT Change

- `frontend/src/services/api.ts` — all API calls and type definitions stay as-is
- `frontend/src/lib/utils.ts` — keep existing helpers, extend if needed
- `App.tsx` route definitions — same paths, same components
- Backend — zero backend changes
- Recharts + lightweight-charts libraries — kept, only styled differently
- React Router, axios, Vite config — unchanged

## Dependency Changes

### Add
- Google Fonts CDN links in index.html: Inter, Space Grotesk, Material Symbols Outlined

### Remove
- `lucide-react` — replaced by Material Symbols

### Keep
- recharts, lightweight-charts, class-variance-authority, clsx, tailwind-merge

## Implementation Order

1. Design system: CSS + Tailwind config + fonts + icons
2. Shared components: Sidebar, TopAppBar, Icon, StatCard, DataTable, Badge
3. Layout: replace top nav with sidebar layout
4. Dashboard
5. Trades + slide-in panel
6. Import (3-step wizard)
7. Calendar (monthly + yearly)
8. Journal (split-pane)
9. Analysis (3 tabs)
10. Statistics (7 sub-tabs, split into sub-components)
11. Charts (candlestick + trade overlay)
12. PositionDetail + DailyPositionDetail

## File Structure After Rewrite

```
frontend/src/
  index.css              — Design system CSS (colors, fonts, scrollbar)
  App.tsx                — Routes (unchanged)
  components/
    Icon.tsx             — Material Symbols wrapper
    Sidebar.tsx          — Fixed left nav
    TopAppBar.tsx        — Sticky top bar
    StatCard.tsx         — KPI card
    DataTable.tsx        — Generic data table
    Badge.tsx            — BUY/SELL badge
    SlidePanel.tsx       — Right slide-in panel
    PnLCalendar.tsx      — Calendar grid (rewritten)
    TradingChart.tsx     — Recharts wrapper (restyled)
    TradingViewWidget.tsx — lightweight-charts (restyled)
  pages/
    Dashboard.tsx
    Trades.tsx
    Import.tsx
    PositionDetail.tsx
    DailyPositionDetail.tsx
    Calendar.tsx
    Journal.tsx
    Analysis.tsx
    Statistics.tsx        — Main + sub-tab routing
    Statistics/           — Sub-components if Statistics.tsx gets too large
    Charts.tsx
  services/
    api.ts               — Unchanged
  lib/
    utils.ts             — Unchanged + new helpers
```
