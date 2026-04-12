export function getChartColors() {
  const isDark = document.documentElement.classList.contains('dark')
  return {
    background: isDark ? '#111413' : '#f9f6f1',
    text: isDark ? '#e5e5e5' : '#3d3630',
    textMuted: isDark ? '#525252' : '#a89e92',
    border: isDark ? '#2a2f2d' : '#ddd5ca',
    primary: isDark ? '#10b981' : '#6b8ea0',
    profit: isDark ? '#34d399' : '#6a9e86',
    loss: isDark ? '#ef4444' : '#c07070',
    profitContainer: isDark ? '#059669' : '#4a8a6e',
    lossContainer: isDark ? '#ef4444' : '#a85555',
    grid: isDark ? 'rgba(42, 47, 45, 0.15)' : 'rgba(221, 213, 202, 0.5)',
    labelMuted: isDark ? '#a3a3a3' : '#78716c',
    surface: isDark ? '#080a09' : '#f0ebe4',
  }
}
