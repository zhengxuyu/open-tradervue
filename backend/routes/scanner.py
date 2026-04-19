from fastapi import APIRouter, Query
from typing import Optional
from ..services.scanner import ScannerService

router = APIRouter(prefix="/api/scanner", tags=["scanner"])
scanner_service = ScannerService()

@router.get("/scan")
async def scan(
    preset: Optional[str] = Query(None),
    sort_by: str = Query("change_from_close_pct"),
    sort_dir: str = Query("desc"),
):
    return await scanner_service.scan(preset=preset, sort_by=sort_by, sort_dir=sort_dir)

@router.get("/presets")
async def get_presets():
    return scanner_service.get_presets()
