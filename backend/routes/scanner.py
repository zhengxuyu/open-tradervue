from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from ..auth import get_current_user, CurrentUser
from ..services.scanner import ScannerService

router = APIRouter(prefix="/api/scanner", tags=["scanner"])
scanner_service = ScannerService()

@router.get("/scan")
async def scan(
    current_user: CurrentUser = Depends(get_current_user),
    preset: Optional[str] = Query(None),
    sort_by: str = Query("change_from_close_pct"),
    sort_dir: str = Query("desc"),
):
    return await scanner_service.scan(preset=preset, sort_by=sort_by, sort_dir=sort_dir)

@router.get("/presets")
async def get_presets(
    current_user: CurrentUser = Depends(get_current_user),
):
    return scanner_service.get_presets()
