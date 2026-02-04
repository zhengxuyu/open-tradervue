import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { getJournal, updateJournal, getJournals, type JournalWithTrades, type Journal as JournalType } from '@/services/api'
import { formatCurrency, cn, getPnLColor } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Save, Book, AlertTriangle, Lightbulb, Target } from 'lucide-react'

const MOODS = [
  { value: 'great', label: 'Great', color: 'bg-green-100 text-green-800' },
  { value: 'good', label: 'Good', color: 'bg-blue-100 text-blue-800' },
  { value: 'neutral', label: 'Neutral', color: 'bg-gray-100 text-gray-800' },
  { value: 'bad', label: 'Bad', color: 'bg-orange-100 text-orange-800' },
  { value: 'terrible', label: 'Terrible', color: 'bg-red-100 text-red-800' },
]

export function Journal() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [date, setDate] = useState(() => {
    return searchParams.get('date') || new Date().toISOString().split('T')[0]
  })
  const [journal, setJournal] = useState<JournalWithTrades | null>(null)
  const [recentJournals, setRecentJournals] = useState<JournalType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [lessons, setLessons] = useState('')
  const [mistakes, setMistakes] = useState('')
  const [improvements, setImprovements] = useState('')

  const fetchJournal = async (targetDate: string) => {
    setLoading(true)
    try {
      const data = await getJournal(targetDate)
      setJournal(data)
      setContent(data.content || '')
      setMood(data.mood || '')
      setLessons(data.lessons || '')
      setMistakes(data.mistakes || '')
      setImprovements(data.improvements || '')
    } catch (error) {
      console.error('Failed to fetch journal:', error)
      // Reset to empty state if no journal exists
      setJournal(null)
      setContent('')
      setMood('')
      setLessons('')
      setMistakes('')
      setImprovements('')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentJournals = async () => {
    try {
      const data = await getJournals()
      setRecentJournals(data.slice(0, 10))
    } catch (error) {
      console.error('Failed to fetch recent journals:', error)
    }
  }

  useEffect(() => {
    fetchJournal(date)
    fetchRecentJournals()
  }, [date])

  useEffect(() => {
    setSearchParams({ date })
  }, [date])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateJournal(date, {
        content,
        mood,
        lessons,
        mistakes,
        improvements,
      })
      await fetchJournal(date)
      await fetchRecentJournals()
    } catch (error) {
      console.error('Failed to save journal:', error)
      alert('Failed to save journal')
    } finally {
      setSaving(false)
    }
  }

  const navigateDay = (direction: number) => {
    const currentDate = new Date(date)
    currentDate.setDate(currentDate.getDate() + direction)
    setDate(currentDate.toISOString().split('T')[0])
  }

  const hasChanges = journal && (
    content !== (journal.content || '') ||
    mood !== (journal.mood || '') ||
    lessons !== (journal.lessons || '') ||
    mistakes !== (journal.mistakes || '') ||
    improvements !== (journal.improvements || '')
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trading Journal</h1>
          <p className="text-gray-500 mt-1">Review and reflect on your trading day</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigateDay(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 text-center cursor-pointer"
              />
              <p className="text-sm text-gray-500">
                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigateDay(1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Summary */}
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Loading...
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Book className="h-5 w-5" />
                    Daily Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">P&L</p>
                      <p className={cn(
                        'text-2xl font-bold',
                        journal?.pnl_summary !== null && journal?.pnl_summary !== undefined
                          ? getPnLColor(journal.pnl_summary)
                          : 'text-gray-400'
                      )}>
                        {journal?.pnl_summary !== null && journal?.pnl_summary !== undefined
                          ? formatCurrency(journal.pnl_summary)
                          : '$0.00'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Trades Closed</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {journal?.trade_count || 0}
                      </p>
                    </div>
                  </div>

                  {/* Mood Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      How was your trading today?
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {MOODS.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => setMood(m.value)}
                          className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                            mood === m.value
                              ? m.color + ' ring-2 ring-offset-2 ring-gray-400'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          )}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Journal Content */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Journal Notes
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write about your trading day... What happened? How did you feel? What were the market conditions?"
                      className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Reflection Sections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500" />
                      Lessons Learned
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={lessons}
                      onChange={(e) => setLessons(e.target.value)}
                      placeholder="What did you learn today?"
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Mistakes Made
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={mistakes}
                      onChange={(e) => setMistakes(e.target.value)}
                      placeholder="What mistakes did you make?"
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      Improvements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={improvements}
                      onChange={(e) => setImprovements(e.target.value)}
                      placeholder="How can you improve?"
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Trades List */}
              {journal && journal.positions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Closed Positions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Entry</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Exit</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">P&L</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {journal.positions.map((pos) => (
                            <tr key={pos.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <Link
                                  to={`/positions/${pos.id}`}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                >
                                  {pos.symbol}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-sm text-right">{pos.quantity}</td>
                              <td className="px-4 py-3 text-sm text-right">{formatCurrency(pos.entry_price)}</td>
                              <td className="px-4 py-3 text-sm text-right">{pos.exit_price ? formatCurrency(pos.exit_price) : '-'}</td>
                              <td className={cn('px-4 py-3 text-sm font-medium text-right', pos.pnl !== null ? getPnLColor(pos.pnl) : '')}>
                                {pos.pnl !== null ? formatCurrency(pos.pnl) : '-'}
                              </td>
                              <td className={cn('px-4 py-3 text-sm font-medium text-right', pos.pnl_percent !== null ? getPnLColor(pos.pnl_percent) : '')}>
                                {pos.pnl_percent !== null ? `${pos.pnl_percent >= 0 ? '+' : ''}${pos.pnl_percent.toFixed(2)}%` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Sidebar - Recent Journals */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Journals</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentJournals.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-500">
                  No journal entries yet
                </p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {recentJournals.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => setDate(j.date)}
                      className={cn(
                        'w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors',
                        j.date === date && 'bg-blue-50'
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{j.date}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {j.trade_count || 0} trades
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            'text-sm font-medium',
                            j.pnl_summary !== null ? getPnLColor(j.pnl_summary) : 'text-gray-400'
                          )}>
                            {j.pnl_summary !== null ? formatCurrency(j.pnl_summary) : '-'}
                          </p>
                          {j.mood && (
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              MOODS.find(m => m.value === j.mood)?.color || 'bg-gray-100'
                            )}>
                              {MOODS.find(m => m.value === j.mood)?.label || j.mood}
                            </span>
                          )}
                        </div>
                      </div>
                      {j.content && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {j.content}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
