import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getPnLColor(pnl: number): string {
  if (pnl > 0) return 'text-secondary'
  if (pnl < 0) return 'text-tertiary'
  return 'text-outline'
}

export function getPnLBgColor(pnl: number): string {
  if (pnl > 0) return 'bg-secondary-container/20'
  if (pnl < 0) return 'bg-tertiary-container/20'
  return 'bg-surface-container'
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatPnL(value: number): string {
  const prefix = value >= 0 ? '+' : ''
  return `${prefix}${formatCurrency(value)}`
}
