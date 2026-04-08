# Open Tradervue - Full App Design Prompt for Google Stitch

Design a professional trading journal and analytics web application called "Open Tradervue". The app helps stock/futures traders track trades, analyze performance, and improve their trading. Use a dark theme (dark navy/charcoal background) with accent colors: green for profit, red for loss, blue for neutral/primary actions. Clean, data-dense layout inspired by Bloomberg Terminal aesthetics but with modern SaaS polish. Use Inter or similar clean sans-serif font. Sidebar navigation on the left.

## Global Layout

- **Left sidebar** (collapsible, ~240px): Logo "Open Tradervue" at top, navigation links with icons: Dashboard, Trades, Import, Calendar, Journal, Analysis, Statistics, Charts. Active state with subtle blue highlight bar on the left edge. User avatar/settings at bottom.
- **Main content area**: Full width with consistent padding (24px). Top bar with page title and contextual actions (filters, date range picker, export button).
- **Color system**: Background #0f1419, Card background #1a1f2e, Border #2a3040, Text primary #e1e4e8, Text secondary #8b949e, Profit green #26a69a, Loss red #ef5350, Primary blue #4c9aff, Warning amber #ffb74d.

## Page 1: Dashboard

Overview page showing trading performance at a glance.

- **Top row**: 4 KPI cards in a horizontal row:
  - Total P&L (large number, colored green/red)
  - Win Rate (percentage with circular progress indicator)
  - Total Trades (count)
  - Profit Factor (ratio)
- **Middle row, left (60%)**: Cumulative P&L line chart. X-axis = dates, Y-axis = cumulative dollar P&L. Area fill below the line (green gradient when above zero, red when below). Smooth curve.
- **Middle row, right (40%)**: Daily P&L bar chart. Vertical bars, green for positive days, red for negative days. Last 30 days.
- **Bottom row**: Recent trades table showing last 10 trades. Columns: Date, Symbol, Side (BUY tag green / SELL tag red), Quantity, Price, P&L (colored). Compact rows. "View All" link at bottom right.

## Page 2: Trades

Full trade management page with filtering, bulk actions, and inline editing.

- **Top bar**: Search input (search by symbol), filter chips (Side: All/Buy/Sell, Date range picker, Symbol dropdown), and "Add Trade" button (primary blue).
- **Main table**: Full-width data table with columns:
  - Checkbox (for bulk select)
  - Date/Time (formatted nicely, e.g., "Apr 5, 2026 09:31")
  - Symbol (bold, monospace)
  - Side (pill badge: green "BUY" / red "SELL")
  - Quantity (right-aligned number)
  - Price (right-aligned, 2 decimal)
  - Commission (right-aligned, subtle gray)
  - P&L (right-aligned, colored green/red, only shown for closing trades)
  - Tags (small colored pills)
  - Actions (edit icon, delete icon on hover)
- **Pagination** at bottom: "Showing 1-50 of 1,234 trades", page numbers, per-page selector.
- **Add/Edit Trade Modal**: Slide-in panel from the right with form fields: Symbol, Side (toggle BUY/SELL), Quantity, Price, Date/Time picker, Commission, Notes (textarea), Tags (multi-select chips).

## Page 3: Position Detail

Detailed view of a single closed position (entry to exit).

- **Header**: Symbol name large + position status badge ("CLOSED" gray / "OPEN" blue). Entry date to exit date range.
- **Summary cards row**: Entry Price, Exit Price, Quantity, P&L (large colored number), P&L % (colored), Holding Time, Commission Total.
- **Left section (55%)**: Price chart showing the stock price during the holding period. Candlestick or line chart. Entry point marked with green arrow up, exit point marked with red arrow down. Volume bars below.
- **Right section (45%)**: "Trades in this Position" table listing all individual buy/sell orders that make up this position. Columns: Date, Side, Qty, Price, Commission.
- **Bottom section**: Market conditions during the position. Cards showing: Volume (vs 50-day avg), Volatility (ATR), Gap %, Day Range %, Relative Volume, Price vs SMA50.

## Page 4: Import

CSV trade import with preview and column mapping.

- **Step 1 - Upload**: Large dashed-border drop zone ("Drop CSV file here or click to browse"). Also a "Paste CSV" tab with a textarea for pasting raw CSV text. Sample format hint below.
- **Step 2 - Column Mapping**: After upload, show a preview table of first 5 rows. Above each column, a dropdown selector to map: Symbol, Side, Quantity, Price, Date/Time, Commission, Notes, (Skip). Auto-detected mappings pre-selected with green checkmark. Timezone selector dropdown.
- **Step 3 - Preview & Confirm**: Full preview of parsed trades. Highlight any rows with warnings (missing data, parse errors) in amber. Show summary: "Ready to import 247 trades (3 warnings)". "Import" button (primary) and "Cancel" button.
- **Success state**: Green checkmark animation, "Successfully imported 247 trades", link to view trades.

## Page 5: Calendar

Monthly P&L calendar view, similar to a GitHub contribution heatmap but for trading.

- **Top bar**: Month/Year navigation with left/right arrows. Toggle between "Monthly" and "Yearly" view.
- **Monthly view**: Standard calendar grid. Each day cell shows:
  - Day number (top left)
  - P&L amount (center, colored green/red, bold)
  - Trade count (bottom right, small gray text)
  - Background color intensity based on P&L magnitude (darker green = more profit, darker red = more loss, neutral gray = no trades)
- **Yearly view**: 12 mini-month grids arranged in a 4x3 layout. Each day is a small colored square (heatmap style). Monthly totals shown below each mini-month.
- **Bottom summary bar**: Monthly total P&L, trading days count, average daily P&L, best day, worst day.
- **Click interaction hint**: Clicking a day opens that day's journal entry or trade list.

## Page 6: Journal

Daily trading journal with mood tracking and performance context.

- **Left panel (30%)**: Scrollable list of journal dates, most recent first. Each entry shows: Date, mood emoji, P&L summary, trade count. Active date highlighted. "New Entry" button at top.
- **Right panel (70%)**: Selected journal entry editor/viewer.
  - **Date header** with auto-calculated stats: Daily P&L (colored), Trade Count, Win Rate for the day.
  - **Mood selector**: Row of 5 emoji buttons (great/good/neutral/bad/terrible) with labels.
  - **Content**: Rich text area for free-form trading notes. Markdown support.
  - **Structured sections** (collapsible):
    - "Lessons Learned" (textarea)
    - "Mistakes Made" (textarea)
    - "Improvements for Tomorrow" (textarea)
  - **Save button** and last-saved timestamp.

## Page 7: Analysis

Performance analysis broken down by different dimensions.

- **Tab bar**: "By Symbol" | "By Date" | "Summary"
- **By Symbol tab**:
  - Horizontal bar chart showing P&L by symbol (sorted by P&L descending). Green bars for profitable symbols, red for losing.
  - Below: Table with columns: Symbol, Trades, Win Rate, Total P&L, Avg P&L, Profit Factor, Best Trade, Worst Trade. Sortable columns. Click symbol to drill into position list.
- **By Date tab**:
  - Line chart showing daily P&L over selected date range.
  - Below: Table grouped by date with daily summaries.
- **Summary tab**:
  - Grid of metric cards (3 columns): Total P&L, Win Rate, Profit Factor, Average Win, Average Loss, Largest Win, Largest Loss, Max Drawdown, Sharpe Ratio, Expectancy, Recovery Factor, Commission Total.

## Page 8: Statistics (7 sub-tabs)

Advanced analytics page with 7 tabs for deep performance analysis.

- **Tab bar (horizontal, scrollable)**: By Hour | By Day of Week | By Symbol | By Holding Time | P&L Distribution | Market Conditions | Risk & Reward

### Tab: By Hour
- Bar chart: X-axis = trading hours (9:30, 10:00, ..., 15:30), Y-axis = average P&L per trade. Green/red bars.
- Table below: Hour, Trade Count, Win Rate, Avg P&L, Total P&L.

### Tab: By Day of Week
- Bar chart: X-axis = Mon-Fri, Y-axis = average P&L. Green/red bars.
- Table: Day, Trade Count, Win Rate, Avg P&L, Total P&L, Profit Factor.

### Tab: By Symbol
- Treemap or bubble chart showing symbols sized by trade count, colored by profitability.
- Detailed table: Symbol, Trades, Wins, Losses, Win Rate, Total P&L, Avg P&L, Profit Factor, Max Win, Max Loss. Sortable.

### Tab: By Holding Time
- Horizontal bar chart: holding time ranges (< 1 min, 1-5 min, 5-15 min, 15-30 min, 30-60 min, 1-4 hours, 4h-1 day, 1-5 days, > 5 days) vs avg P&L.
- Table with same ranges showing count, win rate, avg P&L, total P&L.

### Tab: P&L Distribution
- Histogram showing distribution of individual trade P&Ls. X-axis = P&L ranges, Y-axis = frequency count. Bell curve overlay if possible. Green bars for positive range, red for negative.
- Stats below: Mean, Median, Std Dev, Skewness, Kurtosis.

### Tab: Market Conditions
- 7 sub-sections, each with a grouped bar chart:
  - Volume Level (Low/Medium/High)
  - Relative Volume (Below Avg/Average/Above Avg/Very High)
  - Opening Gap (Gap Down Large/Small, No Gap, Gap Up Small/Large)
  - Day Movement (Strong Bear/Bear/Sideways/Bull/Strong Bull)
  - ATR Level (Low/Medium/High)
  - Volatility (Low/Medium/High/Very High)
  - Price vs SMA50 (Below/Near/Above)
- Each section shows: Category, Trade Count, Win Rate, Avg P&L, Total P&L in a compact table.

### Tab: Risk & Reward
- Scatter plot: X-axis = risk (max adverse excursion or loss), Y-axis = reward (P&L). Each dot is a trade. Green dots for wins, red for losses.
- Summary cards: Avg Risk:Reward ratio, Win Rate by R-multiple ranges.

## Page 9: Charts

Interactive price charts with trade overlay.

- **Top bar**: Symbol search/select dropdown. Time range selector (1D, 1W, 1M, 3M, 6M, 1Y, All).
- **Main chart area (80% height)**: Professional candlestick chart (like TradingView).
  - Candlesticks: green body for up, red body for down.
  - Volume bars at bottom (30% height overlay).
  - Trade markers overlaid: green triangle up for BUY, red triangle down for SELL. Hover shows trade details tooltip (date, price, quantity, P&L).
  - Moving average lines (optional toggles): SMA20 (blue), SMA50 (orange).
- **Bottom panel**: Trade list for selected symbol. Compact table: Date, Side, Qty, Price, P&L.

## Design Principles

1. **Data density**: Traders want to see lots of data at once. Don't waste space.
2. **Scannability**: Use color consistently (green=good, red=bad) so traders can scan instantly.
3. **Professional**: Think Bloomberg meets modern SaaS. No playful illustrations or excessive whitespace.
4. **Responsive**: Works on 1920x1080 monitors (primary) and tablets (secondary). Not mobile-first.
5. **Performance feel**: Tables should feel fast. Loading states with skeleton screens, not spinners.
6. **Typography hierarchy**: Numbers are the stars. Use tabular (monospace) numbers for financial data. Bold for key metrics, regular weight for supporting data.
