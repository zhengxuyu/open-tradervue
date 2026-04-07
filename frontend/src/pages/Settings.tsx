import { useState, useEffect } from 'react'
import { TopAppBar } from '@/components/TopAppBar'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/utils'
import { getTrades, getPositions, getJournals } from '@/services/api'
import type { Trade, Position } from '@/services/api'

function arrayToCSV<T extends Record<string, unknown>>(data: T[]): string {
  if (data.length === 0) return ''
  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h]
        const str = val === null || val === undefined ? '' : String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      })
      .join(',')
  )
  return [headers.join(','), ...rows].join('\n')
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Australia/Sydney',
  'UTC',
]

interface AccountSettings {
  displayName: string
  email: string
  timezone: string
  defaultCommission: number
}

interface ApiSettings {
  alphaVantageKey: string
}

const LABEL = 'text-[10px] font-label uppercase tracking-widest text-outline'
const INPUT =
  'w-full bg-surface-container-lowest border-b-2 border-outline-variant focus:border-primary py-2 text-sm outline-none'

export function Settings() {
  const [account, setAccount] = useState<AccountSettings>(() => {
    const saved = localStorage.getItem('settings:account')
    return saved
      ? JSON.parse(saved)
      : { displayName: '', email: '', timezone: 'America/New_York', defaultCommission: 0 }
  })

  const [apiConfig, setApiConfig] = useState<ApiSettings>(() => {
    const saved = localStorage.getItem('settings:api')
    return saved ? JSON.parse(saved) : { alphaVantageKey: '' }
  })

  const [showApiKey, setShowApiKey] = useState(false)
  const [apiStatus, setApiStatus] = useState<'connected' | 'not_configured'>(
    () => (localStorage.getItem('settings:api') ? 'connected' : 'not_configured')
  )
  const [testingConnection, setTestingConnection] = useState(false)
  const [exportingTrades, setExportingTrades] = useState(false)
  const [exportingPositions, setExportingPositions] = useState(false)
  const [exportingBackup, setExportingBackup] = useState(false)
  const [accountSaved, setAccountSaved] = useState(false)

  useEffect(() => {
    const key = apiConfig.alphaVantageKey.trim()
    setApiStatus(key ? 'connected' : 'not_configured')
  }, [apiConfig.alphaVantageKey])

  function saveAccount() {
    localStorage.setItem('settings:account', JSON.stringify(account))
    setAccountSaved(true)
    setTimeout(() => setAccountSaved(false), 2000)
  }

  function saveApiConfig() {
    localStorage.setItem('settings:api', JSON.stringify(apiConfig))
  }

  async function testConnection() {
    setTestingConnection(true)
    try {
      // Simulate a test delay
      await new Promise((r) => setTimeout(r, 1000))
      saveApiConfig()
      setApiStatus(apiConfig.alphaVantageKey.trim() ? 'connected' : 'not_configured')
    } finally {
      setTestingConnection(false)
    }
  }

  async function exportTrades() {
    setExportingTrades(true)
    try {
      const trades: Trade[] = await getTrades()
      const csv = arrayToCSV(trades as unknown as Record<string, unknown>[])
      downloadFile(csv, `trades_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
    } finally {
      setExportingTrades(false)
    }
  }

  async function exportPositions() {
    setExportingPositions(true)
    try {
      const positions: Position[] = await getPositions()
      const csv = arrayToCSV(positions as unknown as Record<string, unknown>[])
      downloadFile(csv, `positions_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
    } finally {
      setExportingPositions(false)
    }
  }

  async function exportBackup() {
    setExportingBackup(true)
    try {
      const [trades, positions, journals] = await Promise.all([
        getTrades(),
        getPositions(),
        getJournals(),
      ])
      const backup = {
        exported_at: new Date().toISOString(),
        trades,
        positions,
        journals,
      }
      downloadFile(
        JSON.stringify(backup, null, 2),
        `tradervue_backup_${new Date().toISOString().split('T')[0]}.json`,
        'application/json'
      )
    } finally {
      setExportingBackup(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-surface">
      <TopAppBar title="Settings" />
      <main className="max-w-4xl mx-auto p-6 space-y-8 w-full">
        {/* Section 1: Account Info */}
        <section className="bg-surface-container rounded-xl overflow-hidden">
          <div className="p-6 border-b border-outline-variant/10 bg-surface-container-high flex items-center gap-3">
            <Icon name="person" className="text-primary" />
            <h3 className="text-sm font-bold text-on-surface">Account Information</h3>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className={LABEL}>Display Name</label>
              <input
                type="text"
                className={cn(INPUT, 'font-label')}
                value={account.displayName}
                onChange={(e) => setAccount({ ...account, displayName: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className={LABEL}>Email</label>
              <input
                type="email"
                className={cn(INPUT, 'font-label')}
                value={account.email}
                onChange={(e) => setAccount({ ...account, email: e.target.value })}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className={LABEL}>Timezone</label>
              <select
                className={cn(INPUT, 'font-label')}
                value={account.timezone}
                onChange={(e) => setAccount({ ...account, timezone: e.target.value })}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Default Commission</label>
              <input
                type="number"
                className={cn(INPUT, 'font-label')}
                value={account.defaultCommission}
                onChange={(e) =>
                  setAccount({ ...account, defaultCommission: parseFloat(e.target.value) || 0 })
                }
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveAccount}
                className="bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-6 py-2.5 rounded-lg text-sm font-bold cursor-pointer"
              >
                Save Changes
              </button>
              {accountSaved && (
                <span className="text-xs text-primary font-label">Saved!</span>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Data Export & Backup */}
        <section className="bg-surface-container rounded-xl overflow-hidden">
          <div className="p-6 border-b border-outline-variant/10 bg-surface-container-high flex items-center gap-3">
            <Icon name="cloud_download" className="text-primary" />
            <h3 className="text-sm font-bold text-on-surface">Data Export & Backup</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10 flex flex-col items-center text-center gap-3">
                <Icon name="table_view" className="text-primary text-3xl" />
                <h4 className="text-sm font-bold text-on-surface">Export Trades</h4>
                <p className="text-xs text-outline">Download all trades as CSV</p>
                <button
                  onClick={exportTrades}
                  disabled={exportingTrades}
                  className="w-full px-4 py-2 bg-surface-container-high text-on-surface text-xs font-label font-bold uppercase tracking-widest rounded-lg hover:bg-surface-bright transition-colors cursor-pointer disabled:opacity-50"
                >
                  {exportingTrades ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>

              <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10 flex flex-col items-center text-center gap-3">
                <Icon name="assessment" className="text-primary text-3xl" />
                <h4 className="text-sm font-bold text-on-surface">Export Positions</h4>
                <p className="text-xs text-outline">Download all positions as CSV</p>
                <button
                  onClick={exportPositions}
                  disabled={exportingPositions}
                  className="w-full px-4 py-2 bg-surface-container-high text-on-surface text-xs font-label font-bold uppercase tracking-widest rounded-lg hover:bg-surface-bright transition-colors cursor-pointer disabled:opacity-50"
                >
                  {exportingPositions ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>

              <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10 flex flex-col items-center text-center gap-3">
                <Icon name="backup" className="text-primary text-3xl" />
                <h4 className="text-sm font-bold text-on-surface">Full Backup</h4>
                <p className="text-xs text-outline">Download complete database backup</p>
                <button
                  onClick={exportBackup}
                  disabled={exportingBackup}
                  className="w-full px-4 py-2 bg-surface-container-high text-on-surface text-xs font-label font-bold uppercase tracking-widest rounded-lg hover:bg-surface-bright transition-colors cursor-pointer disabled:opacity-50"
                >
                  {exportingBackup ? 'Downloading...' : 'Download Backup'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: API Configuration */}
        <section className="bg-surface-container rounded-xl overflow-hidden">
          <div className="p-6 border-b border-outline-variant/10 bg-surface-container-high flex items-center gap-3">
            <Icon name="key" className="text-primary" />
            <h3 className="text-sm font-bold text-on-surface">API Configuration</h3>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className={LABEL}>Alpha Vantage API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className={cn(INPUT, 'font-label pr-10')}
                  value={apiConfig.alphaVantageKey}
                  onChange={(e) =>
                    setApiConfig({ ...apiConfig, alphaVantageKey: e.target.value })
                  }
                  placeholder="Enter your API key"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-outline hover:text-on-surface transition-colors cursor-pointer"
                >
                  <Icon name={showApiKey ? 'visibility_off' : 'visibility'} className="text-lg" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  apiStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                )}
              />
              <span className="text-xs text-on-surface-variant">
                {apiStatus === 'connected' ? 'Connected' : 'Not configured'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={testConnection}
                disabled={testingConnection}
                className="bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-6 py-2.5 rounded-lg text-sm font-bold cursor-pointer disabled:opacity-50"
              >
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            <p className="text-xs text-outline">
              API key is used for market data. Get one at{' '}
              <a
                href="https://www.alphavantage.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                alphavantage.co
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
