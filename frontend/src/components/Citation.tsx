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
    <div className="fixed bottom-3 right-3 z-20">
      <a
        href="https://tradejournal.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] text-outline/60 hover:text-outline transition-colors font-label tracking-wide"
      >
        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>show_chart</span>
        TradeJournal.dev
      </a>
    </div>
  )
}
