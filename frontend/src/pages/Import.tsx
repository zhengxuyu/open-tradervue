import { useState, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card'
import { Button } from '@/components/Button'
import { previewCSV, importCSV, type CSVPreview, type ImportResult } from '@/services/api'
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, ClipboardPaste } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

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

type InputMode = 'file' | 'paste'

export function Import() {
  const [inputMode, setInputMode] = useState<InputMode>('file')
  const [file, setFile] = useState<File | null>(null)
  const [pastedContent, setPastedContent] = useState('')
  const [preview, setPreview] = useState<CSVPreview | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [timezone, setTimezone] = useState('Europe/London')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const resetState = () => {
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
      symbol_column: previewData.detected_mapping.symbol_column,
      side_column: previewData.detected_mapping.side_column,
      quantity_column: previewData.detected_mapping.quantity_column,
      price_column: previewData.detected_mapping.price_column,
      commission_column: previewData.detected_mapping.commission_column || '',
      notes_column: previewData.detected_mapping.notes_column || '',
      date_format: previewData.detected_mapping.date_format,
    })
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

  const renderMappingForm = () => {
    if (!preview) return null

    return (
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Field Mapping</h3>
        <p className="text-sm text-gray-500">
          Map your CSV columns to the required fields. The system has auto-detected the mappings below.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'date_column', label: 'Date/Time Column', required: true },
            { key: 'symbol_column', label: 'Symbol Column', required: true },
            { key: 'side_column', label: 'Side (Buy/Sell) Column', required: true },
            { key: 'quantity_column', label: 'Quantity Column', required: true },
            { key: 'price_column', label: 'Price Column', required: true },
            { key: 'commission_column', label: 'Commission Column', required: false },
            { key: 'notes_column', label: 'Notes Column', required: false },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <select
                value={mapping[field.key] || ''}
                onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select column --</option>
                {preview.columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Format
            </label>
            <select
              value={mapping.date_format || ''}
              onChange={(e) => setMapping({ ...mapping, date_format: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="%Y-%m-%d %H:%M:%S">YYYY-MM-DD HH:MM:SS</option>
              <option value="%Y-%m-%d %H:%M">YYYY-MM-DD HH:MM</option>
              <option value="%Y-%m-%d">YYYY-MM-DD</option>
              <option value="%m/%d/%Y %H:%M:%S">MM/DD/YYYY HH:MM:SS</option>
              <option value="%m/%d/%Y">MM/DD/YYYY</option>
              <option value="%d/%m/%Y">DD/MM/YYYY</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select the timezone of the dates in your CSV
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Trades</h1>
        <p className="text-gray-500 mt-1">Upload a CSV file or paste CSV content to import your trading records</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleModeChange('file')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                inputMode === 'file'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <FileText className="h-4 w-4" />
              Upload File
            </button>
            <button
              onClick={() => handleModeChange('paste')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                inputMode === 'paste'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <ClipboardPaste className="h-4 w-4" />
              Paste Content
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {inputMode === 'file' ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-sm text-gray-600">
                {file ? file.name : 'Click to upload or drag and drop'}
              </p>
              <p className="mt-1 text-xs text-gray-500">CSV files only</p>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder="Paste your CSV content here...&#10;&#10;Example:&#10;Date,Symbol,Side,Quantity,Price&#10;2024-01-15 09:30:00,AAPL,BUY,100,185.50&#10;2024-01-15 14:00:00,AAPL,SELL,100,187.25"
                className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handlePastePreview}
                  disabled={loading || !pastedContent.trim()}
                  variant="secondary"
                >
                  {loading ? 'Processing...' : 'Preview Data'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && !preview && (
        <div className="text-center py-8 text-gray-500">Processing...</div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {preview && !result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Preview ({preview.total_rows} rows)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {preview.columns.map(col => (
                        <th
                          key={col}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {preview.sample_rows.map((row, i) => (
                      <tr key={i}>
                        {preview.columns.map(col => (
                          <td key={col} className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6">
              {renderMappingForm()}

              <div className="mt-6 flex justify-end">
                <Button onClick={handleImport} disabled={loading}>
                  {loading ? 'Importing...' : 'Import Trades'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {result && (
        <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              {result.success ? (
                <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-8 w-8 text-yellow-600 flex-shrink-0" />
              )}
              <div>
                <h3 className={`font-semibold ${result.success ? 'text-green-800' : 'text-yellow-800'}`}>
                  {result.success ? 'Import Successful!' : 'Import Completed with Errors'}
                </h3>
                <p className="mt-1 text-sm">
                  Imported {result.imported_count} trades
                  {result.error_count > 0 && ` (${result.error_count} errors)`}
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700">Errors:</p>
                    <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.success && (
                  <p className="mt-2 text-sm text-gray-600">
                    Redirecting to trades page...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
