from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, date
from typing import Optional
from collections import defaultdict
import calendar

from ..database import get_db
from ..schemas import CalendarDay, MonthSummary, YearSummary
from ..services.analysis import AnalysisService

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


@router.get("/daily", response_model=list[CalendarDay])
async def get_daily_calendar(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: AsyncSession = Depends(get_db)
):
    service = AnalysisService()
    positions = await service.calculate_positions(db)
    closed_positions = [p for p in positions if p.status == "closed"]

    month_positions = [
        p for p in closed_positions
        if p.exit_time.year == year and p.exit_time.month == month
    ]

    daily_stats: dict[str, dict] = defaultdict(lambda: {
        "pnl": 0.0,
        "trade_count": 0,
        "positions_closed": 0
    })

    for pos in month_positions:
        date_key = pos.exit_time.strftime("%Y-%m-%d")
        daily_stats[date_key]["pnl"] += pos.pnl
        daily_stats[date_key]["trade_count"] += 1
        daily_stats[date_key]["positions_closed"] += 1

    _, days_in_month = calendar.monthrange(year, month)
    results = []
    for day in range(1, days_in_month + 1):
        date_key = f"{year}-{month:02d}-{day:02d}"
        stats = daily_stats.get(date_key, {"pnl": 0.0, "trade_count": 0, "positions_closed": 0})
        results.append(CalendarDay(
            date=date_key,
            pnl=round(stats["pnl"], 2),
            trade_count=stats["trade_count"],
            positions_closed=stats["positions_closed"]
        ))

    return results


@router.get("/monthly", response_model=list[MonthSummary])
async def get_monthly_summary(
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db)
):
    service = AnalysisService()
    positions = await service.calculate_positions(db)
    closed_positions = [p for p in positions if p.status == "closed"]

    year_positions = [p for p in closed_positions if p.exit_time.year == year]

    monthly_stats: dict[int, dict] = defaultdict(lambda: {
        "total_pnl": 0.0,
        "daily_pnl": defaultdict(float),
    })

    for pos in year_positions:
        month = pos.exit_time.month
        date_key = pos.exit_time.strftime("%Y-%m-%d")
        monthly_stats[month]["total_pnl"] += pos.pnl
        monthly_stats[month]["daily_pnl"][date_key] += pos.pnl

    results = []
    for month in range(1, 13):
        stats = monthly_stats[month]
        daily_pnls = stats["daily_pnl"]

        if not daily_pnls:
            results.append(MonthSummary(
                year=year,
                month=month,
                total_pnl=0.0,
                trading_days=0,
                winning_days=0,
                losing_days=0,
                best_day=0.0,
                worst_day=0.0
            ))
            continue

        daily_values = list(daily_pnls.values())
        winning_days = len([d for d in daily_values if d > 0])
        losing_days = len([d for d in daily_values if d < 0])

        results.append(MonthSummary(
            year=year,
            month=month,
            total_pnl=round(stats["total_pnl"], 2),
            trading_days=len(daily_pnls),
            winning_days=winning_days,
            losing_days=losing_days,
            best_day=round(max(daily_values), 2) if daily_values else 0.0,
            worst_day=round(min(daily_values), 2) if daily_values else 0.0
        ))

    return results


@router.get("/yearly", response_model=list[YearSummary])
async def get_yearly_summary(
    db: AsyncSession = Depends(get_db)
):
    service = AnalysisService()
    positions = await service.calculate_positions(db)
    closed_positions = [p for p in positions if p.status == "closed"]

    yearly_stats: dict[int, dict] = defaultdict(lambda: {
        "total_pnl": 0.0,
        "daily_pnl": defaultdict(float),
        "monthly_pnl": defaultdict(float),
    })

    for pos in closed_positions:
        year = pos.exit_time.year
        month = pos.exit_time.month
        date_key = pos.exit_time.strftime("%Y-%m-%d")

        yearly_stats[year]["total_pnl"] += pos.pnl
        yearly_stats[year]["daily_pnl"][date_key] += pos.pnl
        yearly_stats[year]["monthly_pnl"][month] += pos.pnl

    results = []
    for year in sorted(yearly_stats.keys()):
        stats = yearly_stats[year]
        daily_pnls = list(stats["daily_pnl"].values())
        monthly_pnls = list(stats["monthly_pnl"].values())

        winning_days = len([d for d in daily_pnls if d > 0])
        losing_days = len([d for d in daily_pnls if d < 0])
        winning_months = len([m for m in monthly_pnls if m > 0])
        losing_months = len([m for m in monthly_pnls if m < 0])

        results.append(YearSummary(
            year=year,
            total_pnl=round(stats["total_pnl"], 2),
            trading_days=len(daily_pnls),
            winning_days=winning_days,
            losing_days=losing_days,
            winning_months=winning_months,
            losing_months=losing_months
        ))

    return results
