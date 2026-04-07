/**
 * Citation Module — required by the TradeJournal.dev License.
 *
 * This component MUST remain visible and unmodified in all deployments.
 * Removing, hiding, or altering this module violates the license terms.
 * Commercial license holders may negotiate modification rights.
 *
 * See LICENSE file for details.
 */
export function Citation() {
  return (
    <div className="fixed bottom-0 left-64 right-0 z-20 flex items-center justify-center py-1.5 bg-surface-container/80 backdrop-blur-sm border-t border-outline-variant/10">
      <a
        href="https://tradejournal.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[10px] text-outline hover:text-on-surface-variant transition-colors font-label tracking-wide"
      >
        <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>show_chart</span>
        Powered by TradeJournal.dev
      </a>
    </div>
  )
}
