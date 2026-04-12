import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { TopAppBar } from '@/components/TopAppBar'
import { Icon } from '@/components/Icon'
import { getJournal, updateJournal, getJournals, type JournalWithTrades, type Journal as JournalType } from '@/services/api'
import { formatCurrency, cn, getPnLColor } from '@/lib/utils'

const MOODS = [
  { value: 'great', emoji: '\u{1F929}', label: 'Great' },
  { value: 'good', emoji: '\u{1F60A}', label: 'Good' },
  { value: 'neutral', emoji: '\u{1F610}', label: 'Neutral' },
  { value: 'bad', emoji: '\u{1F614}', label: 'Bad' },
  { value: 'terrible', emoji: '\u{1F621}', label: 'Terrible' },
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Form state
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [lessons, setLessons] = useState('')
  const [mistakes, setMistakes] = useState('')
  const [improvements, setImprovements] = useState('')

  // Collapsible sections
  const [lessonsOpen, setLessonsOpen] = useState(true)
  const [mistakesOpen, setMistakesOpen] = useState(true)
  const [improvementsOpen, setImprovementsOpen] = useState(true)

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
      setRecentJournals(data)
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
      setLastSaved(new Date())
      await fetchJournal(date)
      await fetchRecentJournals()
    } catch (error) {
      console.error('Failed to save journal:', error)
      alert('Failed to save journal')
    } finally {
      setSaving(false)
    }
  }

  const handleNewEntry = () => {
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
  }

  const hasChanges = journal
    ? (content !== (journal.content || '') ||
       mood !== (journal.mood || '') ||
       lessons !== (journal.lessons || '') ||
       mistakes !== (journal.mistakes || '') ||
       improvements !== (journal.improvements || ''))
    : (content || mood || lessons || mistakes || improvements)

  const pnl = journal?.pnl_summary ?? 0
  const tradeCount = journal?.trade_count ?? 0
  const winningTrades = journal?.positions?.filter(p => (p.pnl ?? 0) > 0).length ?? 0
  const winRate = tradeCount > 0 ? (winningTrades / tradeCount) * 100 : 0

  const getMoodEmoji = (moodValue: string | null | undefined) => {
    if (!moodValue) return null
    return MOODS.find(m => m.value === moodValue)?.emoji ?? null
  }

  return (
    <div className="flex flex-col h-full">
      <TopAppBar title="Journal" />

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left panel - History */}
        <div className="w-full lg:w-[30%] border-b lg:border-b-0 lg:border-r border-[#111413] bg-surface-container-low flex flex-col">
          <div className="p-4 flex items-center justify-between border-b border-[#111413]">
            <span className="font-label text-xs font-bold text-outline uppercase tracking-wider">History</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewEntry}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-label font-bold hover:bg-primary/20 transition-colors"
              >
                <Icon name="add" className="text-sm" />
                New Entry
              </button>
              <button className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-outline">
                <Icon name="filter_list" className="text-lg" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {recentJournals.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs font-label text-outline">
                No journal entries yet
              </p>
            ) : (
              <div>
                {recentJournals.map((j) => {
                  const isActive = j.date === date
                  const emoji = getMoodEmoji(j.mood)
                  return (
                    <button
                      key={j.id}
                      onClick={() => setDate(j.date)}
                      className={cn(
                        'w-full px-4 py-3.5 text-left transition-colors border-l-4',
                        isActive
                          ? 'bg-surface-container-high border-primary'
                          : 'hover:bg-surface-container border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {emoji && (
                          <span className="text-2xl">{emoji}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-label text-xs font-bold text-on-surface">
                            {new Date(j.date + 'T12:00:00').toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn(
                              'text-xs font-label font-bold tabular-nums',
                              j.pnl_summary !== null ? getPnLColor(j.pnl_summary) : 'text-outline-variant'
                            )}>
                              {j.pnl_summary !== null ? formatCurrency(j.pnl_summary) : '-'}
                            </span>
                            <span className="text-[10px] font-label text-outline">
                              {j.trade_count || 0} trades
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Editor */}
        <div className="w-full lg:w-[70%] bg-surface flex flex-col overflow-auto">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-outline">
              <Icon name="progress_activity" className="text-3xl animate-spin" />
            </div>
          ) : (
            <div className="p-6 space-y-6 max-w-4xl">
              {/* Date header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-headline text-lg font-semibold text-on-surface">
                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-xs text-outline bg-transparent border-none focus:outline-none cursor-pointer mt-0.5"
                  />
                </div>
                <div className="flex items-center gap-3">
                  {lastSaved && (
                    <span className="text-xs text-slate-500">
                      Saved {lastSaved.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className={cn(
                      'px-5 py-2 rounded-lg font-label text-sm font-bold transition-all',
                      hasChanges
                        ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary-container hover:brightness-110'
                        : 'bg-surface-container text-outline cursor-not-allowed'
                    )}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Stats header */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                  <p className="text-[10px] font-label font-bold text-outline uppercase tracking-wider mb-1">Daily P&L</p>
                  <p className={cn('font-label text-xl font-extrabold tabular-nums', getPnLColor(pnl))}>
                    {formatCurrency(pnl)}
                  </p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                  <p className="text-[10px] font-label font-bold text-outline uppercase tracking-wider mb-1">Trades</p>
                  <p className="font-label text-xl font-extrabold text-on-surface">{tradeCount}</p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                  <p className="text-[10px] font-label font-bold text-outline uppercase tracking-wider mb-1">Win Rate</p>
                  <p className="font-label text-xl font-extrabold text-on-surface">{winRate.toFixed(0)}%</p>
                </div>
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                  <p className="text-[10px] font-label font-bold text-outline uppercase tracking-wider mb-1">Positions</p>
                  <p className="font-label text-xl font-extrabold text-on-surface">{journal?.positions?.length ?? 0}</p>
                </div>
              </div>

              {/* Mood selector */}
              <div>
                <label className="block text-[10px] font-label font-bold text-outline uppercase tracking-wider mb-3">
                  How was your trading today?
                </label>
                <div className="flex gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMood(m.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all',
                        mood === m.value
                          ? 'bg-surface-container-high ring-1 ring-primary'
                          : 'hover:bg-surface-container'
                      )}
                    >
                      <span className="text-2xl">{m.emoji}</span>
                      <span className="text-[10px] font-label font-bold text-outline">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content textarea */}
              <div>
                <label className="block text-[10px] font-label font-bold text-outline uppercase tracking-wider mb-3">
                  Journal Notes
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write about your trading day... What happened? How did you feel? What were the market conditions?"
                  className="w-full h-40 px-0 py-3 bg-transparent border-0 border-b border-outline-variant focus:border-primary text-lg text-on-surface placeholder:text-outline-variant/50 focus:outline-none resize-y transition-colors"
                />
              </div>

              {/* Collapsible sections */}
              <CollapsibleSection
                title="Lessons Learned"
                icon="lightbulb"
                borderColor="border-secondary/30"
                open={lessonsOpen}
                onToggle={() => setLessonsOpen(!lessonsOpen)}
              >
                <textarea
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                  placeholder="What did you learn today?"
                  className="w-full h-28 px-0 py-2 bg-transparent border-0 border-b border-outline-variant/30 focus:border-secondary/50 text-sm text-on-surface placeholder:text-outline-variant/50 focus:outline-none resize-y transition-colors"
                />
              </CollapsibleSection>

              <CollapsibleSection
                title="Mistakes Made"
                icon="warning"
                borderColor="border-tertiary/30"
                open={mistakesOpen}
                onToggle={() => setMistakesOpen(!mistakesOpen)}
              >
                <textarea
                  value={mistakes}
                  onChange={(e) => setMistakes(e.target.value)}
                  placeholder="What mistakes did you make?"
                  className="w-full h-28 px-0 py-2 bg-transparent border-0 border-b border-outline-variant/30 focus:border-tertiary/50 text-sm text-on-surface placeholder:text-outline-variant/50 focus:outline-none resize-y transition-colors"
                />
              </CollapsibleSection>

              <CollapsibleSection
                title="Improvements"
                icon="trending_up"
                borderColor="border-primary/30"
                open={improvementsOpen}
                onToggle={() => setImprovementsOpen(!improvementsOpen)}
              >
                <textarea
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  placeholder="How can you improve?"
                  className="w-full h-28 px-0 py-2 bg-transparent border-0 border-b border-outline-variant/30 focus:border-primary/50 text-sm text-on-surface placeholder:text-outline-variant/50 focus:outline-none resize-y transition-colors"
                />
              </CollapsibleSection>

              {/* Positions list */}
              {journal && journal.positions.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-label font-bold text-outline uppercase tracking-wider mb-3">
                    Closed Positions
                  </h4>
                  <div className="space-y-2">
                    {journal.positions.map((pos) => (
                      <Link
                        key={pos.id}
                        to={`/positions/${pos.id}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/10 hover:border-outline-variant/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-label text-sm font-bold text-on-surface">{pos.symbol}</span>
                          <span className="text-[10px] font-label text-outline">{pos.quantity} shares</span>
                        </div>
                        <div className="text-right">
                          <span className={cn('font-label text-sm font-bold tabular-nums', getPnLColor(pos.pnl ?? 0))}>
                            {formatCurrency(pos.pnl ?? 0)}
                          </span>
                          <span className={cn('ml-2 text-xs font-label tabular-nums', getPnLColor(pos.pnl_percent ?? 0))}>
                            {(pos.pnl_percent ?? 0) >= 0 ? '+' : ''}{(pos.pnl_percent ?? 0).toFixed(2)}%
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CollapsibleSection({
  title,
  icon,
  borderColor,
  open,
  onToggle,
  children,
}: {
  title: string
  icon: string
  borderColor: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className={cn('border-l-2 pl-4', borderColor)}>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        <Icon name={icon} className="text-base text-outline" />
        <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-wider flex-1">
          {title}
        </span>
        <Icon
          name={open ? 'expand_less' : 'expand_more'}
          className="text-base text-outline"
        />
      </button>
      {open && children}
    </div>
  )
}
