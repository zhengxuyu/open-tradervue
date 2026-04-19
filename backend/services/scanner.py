"""Scanner service — thin facade over the scanner registry + shared data source."""

from typing import Optional

from ..schemas import ScannerPreset, ScannerResponse
from .market_data_source import MarketDataSource
from .scanners import get_scanner, get_all_scanners


class ScannerService:
    def __init__(self):
        self._data_source = MarketDataSource(cache_ttl_seconds=10)

    async def scan(
        self,
        preset: Optional[str] = None,
        sort_by: str = "change_from_close_pct",
        sort_dir: str = "desc",
        **filters,
    ) -> ScannerResponse:
        preset_id = preset or "top_gainers"
        scanner = get_scanner(preset_id)
        if not scanner:
            return ScannerResponse(results=[], total=0, scan_time_ms=0, preset=preset_id)
        return await scanner.scan(self._data_source)

    def get_presets(self) -> list[ScannerPreset]:
        return [s.to_preset() for s in get_all_scanners()]
