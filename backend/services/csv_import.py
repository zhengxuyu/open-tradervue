import pandas as pd
from io import StringIO
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.trade import Trade
from ..schemas import CSVFieldMapping, CSVPreview, ImportResult


class CSVImportService:
    COMMON_DATE_FORMATS = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d",
    ]

    COLUMN_ALIASES = {
        "date": ["date", "datetime", "time", "executed_at", "trade_date", "exec_time"],
        "symbol": ["symbol", "ticker", "stock", "instrument", "security"],
        "side": ["side", "action", "type", "buy_sell", "direction", "transaction"],
        "quantity": ["quantity", "qty", "shares", "amount", "size", "volume"],
        "price": ["price", "exec_price", "fill_price", "avg_price", "trade_price"],
        "commission": ["commission", "fee", "fees", "comm", "trading_fee"],
        "notes": ["notes", "note", "comment", "comments", "memo", "description"],
    }

    def _detect_column(self, columns: list[str], field_type: str) -> Optional[str]:
        aliases = self.COLUMN_ALIASES.get(field_type, [])
        columns_lower = {c.lower().strip(): c for c in columns}

        for alias in aliases:
            if alias in columns_lower:
                return columns_lower[alias]
        return None

    def _detect_date_format(self, date_series: pd.Series) -> str:
        sample = date_series.dropna().head(10).tolist()
        for fmt in self.COMMON_DATE_FORMATS:
            try:
                for s in sample:
                    datetime.strptime(str(s).strip(), fmt)
                return fmt
            except (ValueError, TypeError):
                continue
        return self.COMMON_DATE_FORMATS[0]

    def _normalize_side(self, side: str) -> str:
        side = str(side).strip().upper()
        buy_indicators = ["BUY", "B", "BOUGHT", "LONG", "BOT"]
        sell_indicators = ["SELL", "S", "SOLD", "SHORT", "SLD"]

        if side in buy_indicators:
            return "BUY"
        if side in sell_indicators:
            return "SELL"
        return side

    def _convert_timezone(self, dt: datetime, source_tz: Optional[str]) -> datetime:
        """Convert datetime from source timezone to UTC."""
        if not source_tz:
            return dt

        try:
            source_zone = ZoneInfo(source_tz)
            localized = dt.replace(tzinfo=source_zone)
            utc_dt = localized.astimezone(ZoneInfo("UTC"))
            return utc_dt.replace(tzinfo=None)
        except Exception:
            return dt

    def preview_csv(self, content: str) -> CSVPreview:
        df = pd.read_csv(StringIO(content))
        columns = df.columns.tolist()

        date_col = self._detect_column(columns, "date") or columns[0]
        date_format = self._detect_date_format(df[date_col]) if date_col in columns else "%Y-%m-%d %H:%M:%S"

        detected_mapping = CSVFieldMapping(
            date_column=date_col,
            symbol_column=self._detect_column(columns, "symbol") or "Symbol",
            side_column=self._detect_column(columns, "side") or "Side",
            quantity_column=self._detect_column(columns, "quantity") or "Quantity",
            price_column=self._detect_column(columns, "price") or "Price",
            commission_column=self._detect_column(columns, "commission"),
            notes_column=self._detect_column(columns, "notes"),
            date_format=date_format
        )

        sample_rows = df.head(5).to_dict(orient="records")

        return CSVPreview(
            columns=columns,
            sample_rows=sample_rows,
            detected_mapping=detected_mapping,
            total_rows=len(df)
        )

    async def import_csv(
        self,
        content: str,
        db: AsyncSession,
        mapping: Optional[CSVFieldMapping] = None,
        timezone: Optional[str] = None
    ) -> ImportResult:
        df = pd.read_csv(StringIO(content))

        if not mapping:
            preview = self.preview_csv(content)
            mapping = preview.detected_mapping

        imported_count = 0
        error_count = 0
        errors = []

        for idx, row in df.iterrows():
            try:
                date_str = str(row[mapping.date_column]).strip()
                try:
                    executed_at = datetime.strptime(date_str, mapping.date_format)
                except ValueError:
                    for fmt in self.COMMON_DATE_FORMATS:
                        try:
                            executed_at = datetime.strptime(date_str, fmt)
                            break
                        except ValueError:
                            continue
                    else:
                        raise ValueError(f"Unable to parse date: {date_str}")

                executed_at = self._convert_timezone(executed_at, timezone)

                symbol = str(row[mapping.symbol_column]).strip().upper()
                side = self._normalize_side(row[mapping.side_column])
                quantity = float(row[mapping.quantity_column])
                price = float(row[mapping.price_column])

                if side not in ["BUY", "SELL"]:
                    raise ValueError(f"Invalid side: {side}")

                commission = 0.0
                if mapping.commission_column and mapping.commission_column in row:
                    try:
                        commission = float(row[mapping.commission_column])
                    except (ValueError, TypeError):
                        pass

                notes = None
                if mapping.notes_column and mapping.notes_column in row:
                    notes_val = row[mapping.notes_column]
                    if pd.notna(notes_val):
                        notes = str(notes_val)

                trade = Trade(
                    symbol=symbol,
                    side=side,
                    quantity=quantity,
                    price=price,
                    executed_at=executed_at,
                    commission=commission,
                    notes=notes,
                    tags=[]
                )
                db.add(trade)
                imported_count += 1

            except Exception as e:
                error_count += 1
                errors.append(f"Row {idx + 2}: {str(e)}")

        await db.commit()

        return ImportResult(
            success=error_count == 0,
            imported_count=imported_count,
            error_count=error_count,
            errors=errors[:10]
        )
