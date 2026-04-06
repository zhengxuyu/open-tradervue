import { useState, useRef, useCallback } from 'react'
import { previewCSV, importCSV, type CSVPreview, type ImportResult } from '@/services/api'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { TopAppBar } from '@/components/TopAppBar'
import { Icon } from '@/components/Icon'

const TIMEZONES = [
  { value: '', label: 'Local Time (No conversion)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'US Eastern (ET)' },
  { value: 'America/Chicago', label: 'US Central (CT)' },
  { value: 'America/Denver', label: 'US Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
]

const MAPPING_FIELDS = [
  { key: 'date_column', label: 'Date/Time' },
  { key: 'time_column', label: 'Time' },
  { key: 'symbol_column', label: 'Symbol' },
  { key: 'side_column', label: 'Side' },
  { key: 'quantity_column', label: 'Quantity' },
  { key: 'price_column', label: 'Price' },
  { key: 'commission_column', label: 'Commission' },
  { key: 'notes_column', label: 'Notes' },
]

const COLUMN_OPTIONS = ['Symbol', 'Side', 'Quantity', 'Price', 'Date/Time', 'Commission', 'Notes', 'Skip']

type InputMode = 'file' | 'paste'
type Step = 1 | 2 | 3

export function Import() {
  const [step, setStep] = useState<Step>(1)
  const [inputMode, setInputMode] = useState<InputMode>('file')
  const [file, setFile] = useState<File | null>(null)
  const [pastedContent, setPastedContent] = useState('')
  const [preview, setPreview] = useState<CSVPreview | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [timezone, setTimezone] = useState('Europe/London')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const resetState = () => {
    setStep(1)
    setFile(null)
    setPastedContent('')
    setPreview(null)
    setMapping({})
    setResult(null)
    setError(null)
  }

  const handleModeChange = (mode: InputMode) => {
    resetState()
    setInputMode(mode)
  }

  const processPreview = async (previewData: CSVPreview) => {
    setPreview(previewData)
    setMapping({
      date_column: previewData.detected_mapping.date_column,
      time_column: previewData.detected_mapping.time_column || '',
      symbol_column: previewData.detected_mapping.symbol_column,
      side_column: previewData.detected_mapping.side_column,
      quantity_column: previewData.detected_mapping.quantity_column,
      price_column: previewData.detected_mapping.price_column,
      commission_column: previewData.detected_mapping.commission_column || '',
      notes_column: previewData.detected_mapping.notes_column || '',
    })
    setStep(2)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const previewData = await previewCSV(selectedFile)
      processPreview(previewData)
    } catch (err) {
      setError('Failed to preview CSV file')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (!droppedFile || !droppedFile.name.endsWith('.csv')) return

    setFile(droppedFile)
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const previewData = await previewCSV(droppedFile)
      processPreview(previewData)
    } catch (err) {
      setError('Failed to preview CSV file')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handlePastePreview = async () => {
    if (!pastedContent.trim()) {
      setError('Please paste some CSV content')
      return
    }

    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const previewData = await previewCSV(pastedContent)
      processPreview(previewData)
    } catch (err) {
      setError('Failed to parse CSV content. Please check the format.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    const content = inputMode === 'file' ? file : pastedContent
    if (!content) return

    setLoading(true)
    setError(null)

    try {
      const importResult = await importCSV(content, mapping, timezone || undefined)
      setResult(importResult)
      setStep(3)
      if (importResult.success && importResult.imported_count > 0) {
        setTimeout(() => navigate('/trades'), 2000)
      }
    } catch (err) {
      setError('Failed to import CSV')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const STEPS = [
    { num: 1, label: 'Upload' },
    { num: 2, label: 'Mapping' },
    { num: 3, label: 'Confirm' },
  ] as const

  const getColumnMappingLabel = (colName: string): string => {
    for (const [key, val] of Object.entries(mapping)) {
      if (val === colName) {
        const field = MAPPING_FIELDS.find(f => f.key === key)
        return field?.label || ''
      }
    }
    return ''
  }

  return (
    <div className="flex flex-col h-full">
      <TopAppBar title="Import" />

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                    step > s.num
                      ? 'bg-primary text-on-primary'
                      : step === s.num
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high border border-outline-variant text-on-surface-variant'
                  )}
                >
                  {step > s.num ? (
                    <Icon name="check" className="text-[16px]" />
                  ) : (
                    s.num
                  )}
                </div>
                <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                  {step === s.num ? (
                    <span className="text-primary">{s.label}</span>
                  ) : (
                    s.label
                  )}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-16 h-px mx-3 mb-5',
                    step > s.num ? 'bg-primary' : 'bg-outline-variant'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-tertiary-container/10 border border-tertiary/30">
            <Icon name="error" className="text-tertiary text-xl" />
            <span className="text-sm text-tertiary">{error}</span>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Tab Toggle */}
            <div className="flex gap-6 border-b border-outline-variant/30">
              <button
                onClick={() => handleModeChange('file')}
                className={cn(
                  'flex items-center gap-2 pb-3 text-sm font-medium transition-colors',
                  inputMode === 'file'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                <Icon name="upload_file" className="text-lg" />
                Upload File
              </button>
              <button
                onClick={() => handleModeChange('paste')}
                className={cn(
                  'flex items-center gap-2 pb-3 text-sm font-medium transition-colors',
                  inputMode === 'paste'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                <Icon name="content_paste" className="text-lg" />
                Paste CSV
              </button>
            </div>

            {inputMode === 'file' ? (
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors',
                  dragOver
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-outline-variant/30 bg-surface-container-lowest/50 hover:border-outline-variant/50'
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Icon name="cloud_upload" className="text-5xl text-on-surface-variant/50 mx-auto" />
                <p className="mt-4 text-sm text-on-surface">
                  {file ? file.name : 'Drop CSV file here'}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {file ? 'Click to choose a different file' : 'or click to browse'}
                </p>
                {loading && (
                  <p className="mt-4 text-xs text-primary animate-pulse">Processing...</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  placeholder={'Paste your CSV content here...\n\nExample:\nDate,Symbol,Side,Quantity,Price\n2024-01-15 09:30:00,AAPL,BUY,100,185.50\n2024-01-15 14:00:00,AAPL,SELL,100,187.25'}
                  className="w-full h-48 px-4 py-3 bg-surface-container border-b-2 border-outline-variant rounded-t-lg text-sm font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary resize-y"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handlePastePreview}
                    disabled={loading || !pastedContent.trim()}
                    className="px-6 py-2.5 bg-gradient-to-br from-primary to-primary-container rounded-lg text-on-primary text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  >
                    {loading ? 'Processing...' : 'Continue'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && preview && !result && (
          <div className="space-y-6">
            {/* Preview Table */}
            <div>
              <h3 className="text-sm font-medium text-on-surface mb-3">
                Preview ({preview.total_rows} rows)
              </h3>
              <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-outline-variant/20">
                      {preview.columns.map(col => (
                        <th key={col} className="px-4 py-2">
                          <select
                            value={getColumnMappingLabel(col) || ''}
                            onChange={(e) => {
                              const label = e.target.value
                              const field = MAPPING_FIELDS.find(f => f.label === label)
                              if (field) {
                                // Clear any previous mapping to this column
                                const newMapping = { ...mapping }
                                for (const [k, v] of Object.entries(newMapping)) {
                                  if (v === col) newMapping[k] = ''
                                }
                                newMapping[field.key] = col
                                setMapping(newMapping)
                              } else {
                                // "Skip" selected - remove mapping
                                const newMapping = { ...mapping }
                                for (const [k, v] of Object.entries(newMapping)) {
                                  if (v === col) newMapping[k] = ''
                                }
                                setMapping(newMapping)
                              }
                            }}
                            className="w-full px-2 py-1 bg-surface-container-high border border-outline-variant/30 rounded text-xs text-on-surface focus:outline-none focus:border-primary"
                          >
                            <option value="">Skip</option>
                            {COLUMN_OPTIONS.filter(o => o !== 'Skip').map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-surface-container-high/50">
                      {preview.columns.map(col => (
                        <th
                          key={col}
                          className="px-4 py-2 text-left text-[10px] font-label uppercase tracking-widest text-on-surface-variant"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {preview.sample_rows.map((row, i) => (
                      <tr key={i} className="hover:bg-surface-container-lowest/30">
                        {preview.columns.map(col => (
                          <td key={col} className="px-4 py-2 text-sm text-on-surface whitespace-nowrap">
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Field Mapping */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-on-surface">Field Mapping</h3>
              <p className="text-xs text-on-surface-variant">
                Map your CSV columns to the required fields. Auto-detected mappings are pre-filled.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {MAPPING_FIELDS.map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">
                      {field.label}
                      {['date_column', 'symbol_column', 'side_column', 'quantity_column', 'price_column'].includes(field.key) && (
                        <span className="text-tertiary ml-0.5">*</span>
                      )}
                    </label>
                    <select
                      value={mapping[field.key] || ''}
                      onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                      className={cn(
                        'w-full px-3 py-2 bg-surface-container border border-outline-variant/30 rounded-lg text-sm text-on-surface focus:outline-none focus:border-primary',
                        mapping[field.key] && 'border-primary/40'
                      )}
                    >
                      <option value="">-- Select column --</option>
                      {preview.columns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">
                    Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container border border-outline-variant/30 rounded-lg text-sm text-on-surface focus:outline-none focus:border-primary"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-on-surface-variant">
                    Select the timezone of the dates in your CSV
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => { setStep(1); setPreview(null) }}
                className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-br from-primary to-primary-container rounded-lg text-on-primary text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? 'Importing...' : 'Execute Import'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {result && (
          <div className="space-y-6">
            {result.success ? (
              <div className="flex flex-col items-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Icon name="check_circle" className="text-4xl text-secondary" filled />
                </div>
                <h3 className="text-lg font-semibold text-on-surface">
                  Successfully imported {result.imported_count} trades
                </h3>
                <p className="text-sm text-on-surface-variant">
                  Redirecting to trades page...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-tertiary-container/20 flex items-center justify-center">
                    <Icon name="warning" className="text-xl text-tertiary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-on-surface">
                      Import Completed with Errors
                    </h3>
                    <p className="text-sm text-on-surface-variant">
                      Imported {result.imported_count} trades
                      {result.error_count > 0 && ` (${result.error_count} errors)`}
                    </p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="rounded-xl border border-tertiary/20 bg-tertiary-container/5 p-4">
                    <p className="text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest">Errors</p>
                    <ul className="space-y-1">
                      {result.errors.map((err, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-on-surface">
                          <Icon name="error" className="text-sm text-tertiary mt-0.5" />
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={resetState}
                    className="px-6 py-2.5 bg-secondary-container text-on-secondary-container rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                  >
                    Import Again
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
