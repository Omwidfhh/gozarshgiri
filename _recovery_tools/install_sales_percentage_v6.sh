#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$ROOT/.patch_backups/sales_percentage_v6_$STAMP"

if [[ ! -f "$ROOT/backend/api.py" || ! -f "$ROOT/frontend/index.html" || ! -f "$ROOT/frontend/app.js" ]]; then
  echo "❌ این فایل را باید از ریشه پروژه اجرا کنی؛ همان‌جایی که backend و frontend هستند."
  exit 1
fi

mkdir -p "$BACKUP_DIR/backend" "$BACKUP_DIR/frontend"
for f in backend/api.py backend/sales_percentage_report.py frontend/index.html frontend/app.js; do
  if [[ -f "$ROOT/$f" ]]; then
    cp "$ROOT/$f" "$BACKUP_DIR/$f"
  fi
done

echo "✅ بکاپ ساخته شد: $BACKUP_DIR"

cat > "$ROOT/backend/sales_percentage_report.py" <<'PY'
from __future__ import annotations

from collections import Counter
from copy import copy
from datetime import date, datetime, timedelta
import math
from pathlib import Path
import re
import traceback
from typing import Iterable, Optional

from openpyxl import Workbook, load_workbook
from openpyxl.styles import PatternFill
from openpyxl.utils import get_column_letter

try:
    from python_calamine import CalamineWorkbook
except Exception:  # pragma: no cover - only relevant if dependency is missing
    CalamineWorkbook = None


BLOCKED_ISSUERS = (
    "ابوالفضل فلاح",
    "رقیه پیرانی",
    "مهدیه تن ساز",
)

RED_FILL = PatternFill(fill_type="solid", fgColor="FFFF0000")
MAX_HEADER_SCAN_ROWS = 60
MAX_HEADER_SCAN_COLS = 250


def _fa_digits_to_en(value: str) -> str:
    return value.translate(
        str.maketrans(
            "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩",
            "01234567890123456789",
        )
    )


def _norm_text(value) -> str:
    if value is None:
        return ""
    text = _fa_digits_to_en(str(value))
    text = (
        text.replace("ي", "ی")
        .replace("ك", "ک")
        .replace("ة", "ه")
        .replace("ۀ", "ه")
        .replace("\u200c", " ")
        .replace("\u200e", " ")
        .replace("\u200f", " ")
        .replace("\ufeff", " ")
        .replace("\u00a0", " ")
    )
    return re.sub(r"\s+", " ", text).strip().lower()


def _compact_text(value) -> str:
    return re.sub(r"[\s_\-]+", "", _norm_text(value))


def _norm_key(value) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if math.isnan(value):
            return ""
        if value.is_integer():
            return str(int(value))
        return format(value, ".15g")

    text = _fa_digits_to_en(str(value)).strip()
    text = (
        text.replace("\u200c", "")
        .replace("\u200e", "")
        .replace("\u200f", "")
        .replace("\u00a0", "")
    )
    text = re.sub(r"\s+", "", text)
    if re.fullmatch(r"\d+\.0+", text):
        text = text.split(".", 1)[0]
    return text


def _to_number(value) -> Optional[float]:
    if value is None or value == "":
        return 0.0
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, (int, float)):
        if isinstance(value, float) and math.isnan(value):
            return None
        return float(value)

    text = _fa_digits_to_en(str(value)).strip()
    text = (
        text.replace(",", "")
        .replace("٬", "")
        .replace("٫", ".")
        .replace("%", "")
        .replace("٪", "")
        .strip()
    )
    if not text:
        return 0.0
    try:
        return float(text)
    except ValueError:
        return None


def _gregorian_to_jalali(gy: int, gm: int, gd: int) -> tuple[int, int, int]:
    g_days_in_month = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    gy2 = gy + 1 if gm > 2 else gy
    days = (
        355666
        + (365 * gy)
        + ((gy2 + 3) // 4)
        - ((gy2 + 99) // 100)
        + ((gy2 + 399) // 400)
        + gd
        + g_days_in_month[gm - 1]
    )
    jy = -1595 + 33 * (days // 12053)
    days %= 12053
    jy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        jy += (days - 1) // 365
        days = (days - 1) % 365
    if days < 186:
        jm = 1 + days // 31
        jd = 1 + days % 31
    else:
        jm = 7 + (days - 186) // 30
        jd = 1 + (days - 186) % 30
    return jy, jm, jd


def _jalali_to_gregorian(jy: int, jm: int, jd: int) -> tuple[int, int, int]:
    jy += 1595
    days = (
        -355668
        + (365 * jy)
        + ((jy // 33) * 8)
        + (((jy % 33) + 3) // 4)
        + jd
    )
    if jm < 7:
        days += (jm - 1) * 31
    else:
        days += ((jm - 7) * 30) + 186

    gy = 400 * (days // 146097)
    days %= 146097
    if days > 36524:
        days -= 1
        gy += 100 * (days // 36524)
        days %= 36524
        if days >= 365:
            days += 1
    gy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        gy += (days - 1) // 365
        days = (days - 1) % 365

    gd = days + 1
    month_lengths = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    if (gy % 4 == 0 and gy % 100 != 0) or gy % 400 == 0:
        month_lengths[2] = 29
    gm = 1
    while gm <= 12 and gd > month_lengths[gm]:
        gd -= month_lengths[gm]
        gm += 1
    return gy, gm, gd


def _parse_jalali(value) -> Optional[tuple[int, int, int]]:
    if value is None or value == "":
        return None

    if isinstance(value, datetime):
        value = value.date()
    if isinstance(value, date):
        return _gregorian_to_jalali(value.year, value.month, value.day)

    if isinstance(value, float) and value.is_integer():
        value = int(value)

    text = _fa_digits_to_en(str(value)).strip()

    # Jalali: 1405/06/16, 1405-6-16, 1405.06.16, 14050616
    match = re.search(
        r"(?<!\d)(1[34]\d{2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?!\d)",
        text,
    )
    if not match:
        match = re.search(r"(?<!\d)(1[34]\d{2})(\d{2})(\d{2})(?!\d)", text)

    if match:
        y, mo, d = map(int, match.groups())
        if not (1 <= mo <= 12 and 1 <= d <= 31):
            return None
        try:
            gy, gm, gd = _jalali_to_gregorian(y, mo, d)
            if _gregorian_to_jalali(gy, gm, gd) == (y, mo, d):
                return y, mo, d
        except Exception:
            return None

    # If Excel exported a Gregorian date as text, convert it to Jalali too.
    gregorian = re.search(
        r"(?<!\d)(20\d{2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?!\d)",
        text,
    )
    if gregorian:
        gy, gm, gd = map(int, gregorian.groups())
        try:
            date(gy, gm, gd)
            return _gregorian_to_jalali(gy, gm, gd)
        except Exception:
            return None

    return None


def _jalali_next_day(value: tuple[int, int, int]) -> tuple[int, int, int]:
    gy, gm, gd = _jalali_to_gregorian(*value)
    next_g = date(gy, gm, gd) + timedelta(days=1)
    return _gregorian_to_jalali(next_g.year, next_g.month, next_g.day)


def _aliases_match(value, aliases: Iterable[str]) -> bool:
    value_norm = _norm_text(value)
    value_compact = _compact_text(value)
    if not value_norm:
        return False
    for alias in aliases:
        alias_norm = _norm_text(alias)
        alias_compact = _compact_text(alias)
        if value_norm == alias_norm or value_compact == alias_compact:
            return True
        if alias_norm in value_norm or value_norm in alias_norm:
            return True
    return False


def _find_header_row_ws(ws, groups: list[Iterable[str]]) -> int:
    best_row = None
    best_score = -1
    max_row = min(ws.max_row, MAX_HEADER_SCAN_ROWS)
    max_col = min(ws.max_column, MAX_HEADER_SCAN_COLS)
    for row in range(1, max_row + 1):
        values = [ws.cell(row, col).value for col in range(1, max_col + 1)]
        score = sum(any(_aliases_match(v, aliases) for v in values) for aliases in groups)
        if score > best_score:
            best_score = score
            best_row = row
    if best_row is None or best_score <= 0:
        raise ValueError("ردیف عنوان ستون‌ها پیدا نشد.")
    return best_row


def _find_col_ws(ws, header_row: int, aliases: Iterable[str], required: bool = True) -> Optional[int]:
    max_col = min(ws.max_column, MAX_HEADER_SCAN_COLS)
    for col in range(1, max_col + 1):
        if _aliases_match(ws.cell(header_row, col).value, aliases):
            return col
    if required:
        visible = [
            str(ws.cell(header_row, col).value)
            for col in range(1, max_col + 1)
            if ws.cell(header_row, col).value not in (None, "")
        ]
        raise ValueError(
            f"ستون «{next(iter(aliases))}» پیدا نشد. ستون‌های موجود: {', '.join(visible[:60])}"
        )
    return None


def _find_header_row_matrix(rows: list[list], groups: list[Iterable[str]]) -> int:
    best_index = None
    best_score = -1
    for index, row in enumerate(rows[:MAX_HEADER_SCAN_ROWS]):
        values = list(row[:MAX_HEADER_SCAN_COLS])
        score = sum(any(_aliases_match(v, aliases) for v in values) for aliases in groups)
        if score > best_score:
            best_score = score
            best_index = index
    if best_index is None or best_score <= 0:
        raise ValueError("ردیف عنوان ستون‌ها در فایل انتقال پیدا نشد.")
    return best_index


def _find_col_matrix(row: list, aliases: Iterable[str], required: bool = True) -> Optional[int]:
    for index, value in enumerate(row[:MAX_HEADER_SCAN_COLS]):
        if _aliases_match(value, aliases):
            return index
    if required:
        visible = [str(v) for v in row[:MAX_HEADER_SCAN_COLS] if v not in (None, "")]
        raise ValueError(
            f"ستون «{next(iter(aliases))}» در فایل انتقال پیدا نشد. ستون‌های موجود: {', '.join(visible[:60])}"
        )
    return None


def _get_row_value(row: list, index: int):
    return row[index] if index < len(row) else None


def _issuer_is_blocked(value) -> bool:
    text = _compact_text(value)
    if not text:
        return False
    return any(_compact_text(name) in text for name in BLOCKED_ISSUERS)


def _copy_cell_style(src, dst) -> None:
    try:
        if src.has_style:
            dst._style = copy(src._style)
        dst.number_format = src.number_format
        dst.alignment = copy(src.alignment)
        dst.protection = copy(src.protection)
        dst.font = copy(src.font)
        dst.fill = copy(src.fill)
        dst.border = copy(src.border)
    except Exception:
        pass


def _load_calamine_rows(path: Path) -> list[list]:
    if CalamineWorkbook is None:
        raise RuntimeError(
            "کتابخانه python-calamine نصب نیست. داخل Codespaces بزن: pip install -r requirements.txt"
        )
    book = CalamineWorkbook.from_path(str(path))
    sheet = book.get_sheet_by_index(0)
    rows = sheet.to_python(skip_empty_area=False)
    return [list(row) for row in rows]


def _load_definition_workbook(path: Path):
    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xlsm"}:
        wb = load_workbook(path, data_only=False)
        return wb, wb.active

    if suffix == ".xls":
        rows = _load_calamine_rows(path)
        wb = Workbook()
        ws = wb.active
        for r_idx, row in enumerate(rows, start=1):
            for c_idx, value in enumerate(row, start=1):
                ws.cell(r_idx, c_idx, value)
        return wb, ws

    raise ValueError(f"فرمت فایل گزارش تعریف کالا پشتیبانی نمی‌شود: {suffix}")


def _delete_rows_in_blocks(ws, rows_to_delete: list[int]) -> None:
    if not rows_to_delete:
        return
    rows = sorted(set(rows_to_delete))
    blocks: list[tuple[int, int]] = []
    start = prev = rows[0]
    for row in rows[1:]:
        if row == prev + 1:
            prev = row
            continue
        blocks.append((start, prev))
        start = prev = row
    blocks.append((start, prev))

    for start, end in reversed(blocks):
        ws.delete_rows(start, end - start + 1)


def _first_empty_output_columns(ws, header_row: int, needed: int = 2) -> list[int]:
    result = []
    # Prefer genuinely empty columns already present in the sheet.
    max_col = min(ws.max_column, MAX_HEADER_SCAN_COLS)
    max_data_row = min(ws.max_row, header_row + 2000)
    for col in range(1, max_col + 1):
        if ws.cell(header_row, col).value not in (None, ""):
            continue
        if all(ws.cell(row, col).value in (None, "") for row in range(header_row + 1, max_data_row + 1)):
            result.append(col)
            if len(result) == needed:
                return result

    next_col = ws.max_column + 1
    while len(result) < needed:
        result.append(next_col)
        next_col += 1
    return result


def _last_meaningful_row(ws, header_row: int, columns: Iterable[int]) -> int:
    columns = list(columns)
    for row in range(ws.max_row, header_row, -1):
        if any(ws.cell(row, col).value not in (None, "") for col in columns):
            return row
    return header_row


DEFINITION_DATE_ALIASES = ("تاریخ تعریف", "تاريخ تعريف", "تاریخ ایجاد", "تاريخ ايجاد")
BARCODE_ALIASES = ("بارکد", "باركد", "barcode")
SALES_ALIASES = ("تعداد فروش", "تعداد فروش رفته", "فروش تعداد")
INITIAL_STOCK_ALIASES = (
    "موجودی اولیه",
    "موجودي اوليه",
    "موجودی اول دوره",
    "موجودي اول دوره",
    "موجودی ابتدای دوره",
)
ISSUER_ALIASES = ("صادر کننده", "صادرکننده", "صادر كننده", "صادركننده")
TECHNICAL_ALIASES = ("مشخصات فنی", "مشخصات فني", "مشخصه فنی", "مشخصه فني")
DOCUMENT_DATE_ALIASES = ("تاریخ سند", "تاريخ سند")


def create_sales_percentage_report(definition_path, transfer_path, output_path):
    definition_path = Path(definition_path)
    transfer_path = Path(transfer_path)
    output_path = Path(output_path)

    try:
        wb_definition, ws_definition = _load_definition_workbook(definition_path)
        transfer_rows = _load_calamine_rows(transfer_path)
        if not transfer_rows:
            raise ValueError("فایل انتقال خالی است.")

        definition_header = _find_header_row_ws(
            ws_definition,
            [DEFINITION_DATE_ALIASES, BARCODE_ALIASES, SALES_ALIASES, INITIAL_STOCK_ALIASES],
        )
        transfer_header_idx = _find_header_row_matrix(
            transfer_rows,
            [ISSUER_ALIASES, TECHNICAL_ALIASES, DOCUMENT_DATE_ALIASES],
        )

        definition_date_col = _find_col_ws(ws_definition, definition_header, DEFINITION_DATE_ALIASES)
        barcode_col = _find_col_ws(ws_definition, definition_header, BARCODE_ALIASES)
        sales_col = _find_col_ws(ws_definition, definition_header, SALES_ALIASES)
        initial_stock_col = _find_col_ws(ws_definition, definition_header, INITIAL_STOCK_ALIASES)

        transfer_header = transfer_rows[transfer_header_idx]
        issuer_idx = _find_col_matrix(transfer_header, ISSUER_ALIASES)
        technical_idx = _find_col_matrix(transfer_header, TECHNICAL_ALIASES)
        document_date_idx = _find_col_matrix(transfer_header, DOCUMENT_DATE_ALIASES)

        kept_transfer: list[tuple[object, object]] = []
        removed_issuer_rows = 0
        document_dates: list[tuple[int, int, int]] = []

        for row in transfer_rows[transfer_header_idx + 1 :]:
            issuer = _get_row_value(row, issuer_idx)
            technical = _get_row_value(row, technical_idx)
            document_date_value = _get_row_value(row, document_date_idx)

            if all(v in (None, "") for v in (issuer, technical, document_date_value)):
                continue
            if _issuer_is_blocked(issuer):
                removed_issuer_rows += 1
                continue

            kept_transfer.append((technical, document_date_value))
            parsed_date = _parse_jalali(document_date_value)
            if parsed_date:
                document_dates.append(parsed_date)

        if not kept_transfer:
            raise ValueError("بعد از حذف صادرکننده‌های مشخص‌شده، هیچ ردیفی در فایل انتقال باقی نماند.")
        if not document_dates:
            samples = [str(v) for _, v in kept_transfer[:8]]
            raise ValueError(
                "در ستون «تاریخ سند» تاریخ معتبر پیدا نشد. چند مقدار اول: " + " | ".join(samples)
            )

        document_date = Counter(document_dates).most_common(1)[0][0]
        next_date = _jalali_next_day(document_date)
        allowed_dates = {document_date, next_date}

        last_definition_row = _last_meaningful_row(
            ws_definition,
            definition_header,
            [definition_date_col, barcode_col, sales_col, initial_stock_col],
        )

        rows_to_delete = []
        for row in range(definition_header + 1, last_definition_row + 1):
            parsed = _parse_jalali(ws_definition.cell(row, definition_date_col).value)
            if parsed not in allowed_dates:
                rows_to_delete.append(row)
        _delete_rows_in_blocks(ws_definition, rows_to_delete)

        # Resolve columns again after row deletion.
        barcode_col = _find_col_ws(ws_definition, definition_header, BARCODE_ALIASES)
        sales_col = _find_col_ws(ws_definition, definition_header, SALES_ALIASES)
        initial_stock_col = _find_col_ws(ws_definition, definition_header, INITIAL_STOCK_ALIASES)

        # Always place «درصد فروش» directly after «تعداد فروش».
        existing_percentage_col = _find_col_ws(
            ws_definition,
            definition_header,
            ("درصد فروش",),
            required=False,
        )
        if existing_percentage_col is not None:
            ws_definition.delete_cols(existing_percentage_col, 1)
            sales_col = _find_col_ws(ws_definition, definition_header, SALES_ALIASES)
            initial_stock_col = _find_col_ws(ws_definition, definition_header, INITIAL_STOCK_ALIASES)
            barcode_col = _find_col_ws(ws_definition, definition_header, BARCODE_ALIASES)

        percentage_col = sales_col + 1
        ws_definition.insert_cols(percentage_col, 1)
        _copy_cell_style(
            ws_definition.cell(definition_header, sales_col),
            ws_definition.cell(definition_header, percentage_col),
        )
        ws_definition.cell(definition_header, percentage_col, "درصد فروش")

        sales_col = _find_col_ws(ws_definition, definition_header, SALES_ALIASES)
        initial_stock_col = _find_col_ws(ws_definition, definition_header, INITIAL_STOCK_ALIASES)
        barcode_col = _find_col_ws(ws_definition, definition_header, BARCODE_ALIASES)
        percentage_col = _find_col_ws(ws_definition, definition_header, ("درصد فروش",))

        last_definition_row = _last_meaningful_row(
            ws_definition,
            definition_header,
            [barcode_col, sales_col, initial_stock_col],
        )

        calculated_percentage_rows = 0
        for row in range(definition_header + 1, last_definition_row + 1):
            sales_value = _to_number(ws_definition.cell(row, sales_col).value)
            stock_value = _to_number(ws_definition.cell(row, initial_stock_col).value)
            if sales_value is None or stock_value is None:
                percentage = None
            elif stock_value == 0:
                percentage = 0
            else:
                raw_percentage = (sales_value / stock_value) * 100
                # کاربر خروجی ساده می‌خواهد: عدد صحیح، بدون اعشار و بدون علامت درصد.
                percentage = (
                    math.floor(raw_percentage + 0.5)
                    if raw_percentage >= 0
                    else math.ceil(raw_percentage - 0.5)
                )
                calculated_percentage_rows += 1
            cell = ws_definition.cell(row, percentage_col, percentage)
            _copy_cell_style(ws_definition.cell(row, sales_col), cell)
            cell.number_format = "0"

        # Put transfer columns into available empty columns of the first workbook.
        technical_output_col, document_date_output_col = _first_empty_output_columns(
            ws_definition, definition_header, 2
        )
        ws_definition.cell(definition_header, technical_output_col, "مشخصات فنی")
        ws_definition.cell(definition_header, document_date_output_col, "تاریخ سند")
        _copy_cell_style(
            ws_definition.cell(definition_header, 1),
            ws_definition.cell(definition_header, technical_output_col),
        )
        _copy_cell_style(
            ws_definition.cell(definition_header, 1),
            ws_definition.cell(definition_header, document_date_output_col),
        )

        # Index transfer rows by technical specification. This lets the final output
        # keep only true barcode/technical matches and place the matched values on
        # the same surviving row instead of leaving unrelated transfer rows beside them.
        transfer_matches: dict[str, list[tuple[object, object]]] = {}
        for technical, date_value in kept_transfer:
            key = _norm_key(technical)
            if key:
                transfer_matches.setdefault(key, []).append((technical, date_value))

        definition_keys: dict[str, list[int]] = {}
        last_definition_row = _last_meaningful_row(
            ws_definition,
            definition_header,
            [barcode_col],
        )
        for row in range(definition_header + 1, last_definition_row + 1):
            key = _norm_key(ws_definition.cell(row, barcode_col).value)
            if key:
                definition_keys.setdefault(key, []).append(row)

        duplicate_keys = set(transfer_matches).intersection(definition_keys)

        # First mark all matched barcode/technical pairs red, as requested.
        for key in duplicate_keys:
            technical_value, date_value = transfer_matches[key][0]
            for row in definition_keys[key]:
                ws_definition.cell(row, technical_output_col, technical_value)
                ws_definition.cell(row, document_date_output_col, date_value)
                ws_definition.cell(row, barcode_col).fill = RED_FILL
                ws_definition.cell(row, technical_output_col).fill = RED_FILL

        # Then remove every data row whose barcode was not one of the red/matched codes.
        # The final workbook therefore contains only similarities between «بارکد» and
        # «مشخصات فنی».
        unmatched_rows = []
        for row in range(definition_header + 1, last_definition_row + 1):
            key = _norm_key(ws_definition.cell(row, barcode_col).value)
            if key not in duplicate_keys:
                unmatched_rows.append(row)
        _delete_rows_in_blocks(ws_definition, unmatched_rows)

        # Resolve columns/last row again because whole rows were deleted.
        barcode_col = _find_col_ws(ws_definition, definition_header, BARCODE_ALIASES)
        sales_col = _find_col_ws(ws_definition, definition_header, SALES_ALIASES)
        initial_stock_col = _find_col_ws(ws_definition, definition_header, INITIAL_STOCK_ALIASES)
        percentage_col = _find_col_ws(ws_definition, definition_header, ("درصد فروش",))
        technical_output_col = _find_col_ws(ws_definition, definition_header, TECHNICAL_ALIASES)
        document_date_output_col = _find_col_ws(ws_definition, definition_header, DOCUMENT_DATE_ALIASES)
        last_definition_row = _last_meaningful_row(
            ws_definition, definition_header, [barcode_col]
        )

        # Remove requested columns from final output. Do it right-to-left.
        remove_cols = []
        for name in ("شناسه راهکاران", "قیمت", "تاریخ ویرایش"):
            col = _find_col_ws(ws_definition, definition_header, (name,), required=False)
            if col is not None:
                remove_cols.append(col)
        for col in sorted(set(remove_cols), reverse=True):
            ws_definition.delete_cols(col, 1)

        percentage_col = _find_col_ws(ws_definition, definition_header, ("درصد فروش",), required=False)
        technical_output_col = _find_col_ws(ws_definition, definition_header, TECHNICAL_ALIASES, required=False)
        document_date_output_col = _find_col_ws(ws_definition, definition_header, DOCUMENT_DATE_ALIASES, required=False)

        if percentage_col:
            letter = get_column_letter(percentage_col)
            ws_definition.column_dimensions[letter].width = max(
                ws_definition.column_dimensions[letter].width or 0, 13
            )
        if technical_output_col:
            ws_definition.column_dimensions[get_column_letter(technical_output_col)].width = 22
        if document_date_output_col:
            ws_definition.column_dimensions[get_column_letter(document_date_output_col)].width = 16

        output_path.parent.mkdir(parents=True, exist_ok=True)
        wb_definition.save(output_path)

        year, month, day = document_date
        return {
            "row_count": max(0, last_definition_row - definition_header),
            "removed_issuer_count": removed_issuer_rows,
            "duplicate_count": len(duplicate_keys),
            "percentage_count": calculated_percentage_rows,
            "document_date": f"{year:04d}/{month:02d}/{day:02d}",
            "next_date": f"{next_date[0]:04d}/{next_date[1]:02d}/{next_date[2]:02d}",
        }

    except Exception:
        log_path = Path(__file__).resolve().parent.parent / "sales_percentage_error.log"
        try:
            with log_path.open("a", encoding="utf-8") as log:
                log.write("\n" + "=" * 90 + "\n")
                log.write(f"definition: {definition_path} ({definition_path.stat().st_size if definition_path.exists() else 'missing'} bytes)\n")
                log.write(f"transfer:   {transfer_path} ({transfer_path.stat().st_size if transfer_path.exists() else 'missing'} bytes)\n")
                log.write(traceback.format_exc())
        except Exception:
            pass
        raise
PY

# Patch API and frontend using Python so rerunning this installer is safe.
python - "$ROOT" <<'PY'
from pathlib import Path
import re
import sys
import time

root = Path(sys.argv[1])
api_path = root / "backend" / "api.py"
api = api_path.read_text(encoding="utf-8")

# Import.
if "from sales_percentage_report import create_sales_percentage_report" not in api:
    anchor = "from smart_charge_report import create_smart_charge_report\n"
    if anchor not in api:
        raise SystemExit("❌ محل import در backend/api.py پیدا نشد.")
    api = api.replace(anchor, anchor + "from sales_percentage_report import create_sales_percentage_report\n", 1)

# Extension set.
if "SALES_PERCENTAGE_EXTENSIONS" not in api:
    marker = "DAILY_REPORT_EXTENSIONS = {\n    \".xlsx\",\n    \".xlsm\",\n    \".xls\",\n}\n"
    addition = marker + "\nSALES_PERCENTAGE_EXTENSIONS = {\n    \".xlsx\",\n    \".xlsm\",\n    \".xls\",\n}\n"
    if marker in api:
        api = api.replace(marker, addition, 1)
    else:
        # Less formatting-sensitive fallback.
        m = re.search(r"DAILY_REPORT_EXTENSIONS\s*=\s*\{.*?\}\n", api, re.S)
        if not m:
            raise SystemExit("❌ DAILY_REPORT_EXTENSIONS پیدا نشد.")
        api = api[:m.end()] + "\nSALES_PERCENTAGE_EXTENSIONS = {\".xlsx\", \".xlsm\", \".xls\"}\n" + api[m.end():]

integration = '''# === SALES_PERCENTAGE_INTEGRATION_V6 ===

def build_sales_percentage_report(
    input_paths,
    output_path,
):
    return create_sales_percentage_report(
        input_paths[0],
        input_paths[1],
        output_path,
    )


@app.post("/upload-sales-percentage")
async def upload_sales_percentage_files(
    files: list[UploadFile] = File(...),
):
    return await process_upload(
        files=files,
        report_builder=build_sales_percentage_report,
        download_filename="sales-percentage-report.xlsx",
        allowed_extensions=SALES_PERCENTAGE_EXTENSIONS,
        expected_count=2,
    )

# === /SALES_PERCENTAGE_INTEGRATION_V6 ===
'''

# Remove the very first legacy route injected by older installers.
api = re.sub(
    r"\n?# === SALES_PERCENTAGE_REPORT_ROUTE_V1 ===.*?# === /SALES_PERCENTAGE_REPORT_ROUTE_V1 ===\n?",
    "\n",
    api,
    flags=re.S,
)

# Replace any previous integration block.
api = re.sub(
    r"\n?# === SALES_PERCENTAGE_INTEGRATION_V\d+ ===.*?# === /SALES_PERCENTAGE_INTEGRATION_V\d+ ===\n?",
    "\n\n" + integration + "\n",
    api,
    flags=re.S,
)
if "/upload-sales-percentage" not in api:
    anchor = '@app.post("/upload-daily")'
    pos = api.find(anchor)
    if pos < 0:
        raise SystemExit("❌ محل endpoint در backend/api.py پیدا نشد.")
    api = api[:pos] + integration + "\n" + api[pos:]

api_path.write_text(api, encoding="utf-8")

# Frontend: remove the old custom sales modal and improve error detail.
app_path = root / "frontend" / "app.js"
app = app_path.read_text(encoding="utf-8")
app = re.sub(
    r"\n?/\* === SALES_PERCENTAGE_UI_V1 === \*/.*?/\* === /SALES_PERCENTAGE_UI_V1 === \*/\n?",
    "\n",
    app,
    flags=re.S,
)
new_reader = '''async function readErrorMessage(blob, status = 0) {
    let text = "";
    try {
        text = await blob.text();
    } catch (error) {
        text = "";
    }

    if (text) {
        try {
            const data = JSON.parse(text);
            if (Array.isArray(data.detail)) {
                return data.detail.map((item) => item.msg || String(item)).join("، ");
            }
            if (data.detail) {
                return String(data.detail);
            }
            if (data.message) {
                return String(data.message);
            }
        } catch (error) {
            const clean = text
                .replace(/<style[\\s\\S]*?<\\/style>/gi, " ")
                .replace(/<script[\\s\\S]*?<\\/script>/gi, " ")
                .replace(/<[^>]+>/g, " ")
                .replace(/\\s+/g, " ")
                .trim();
            if (clean) {
                return clean.slice(0, 700);
            }
        }
    }

    return status
        ? `ساخت گزارش با خطا مواجه شد. کد خطای سرور: ${status}`
        : "ساخت گزارش با خطا مواجه شد.";
}'''
app, count = re.subn(
    r"async function readErrorMessage\(blob\) \{.*?\n\}",
    lambda _m: new_reader,
    app,
    count=1,
    flags=re.S,
)
if count == 0:
    # Maybe v5 was already partially applied; don't fail if function already has status arg.
    if "async function readErrorMessage(blob, status = 0)" not in app:
        raise SystemExit("❌ تابع readErrorMessage در frontend/app.js پیدا نشد.")

app = app.replace(
    "reject(new Error(await readErrorMessage(request.response)));",
    "reject(new Error(await readErrorMessage(request.response, request.status)));",
)
app_path.write_text(app, encoding="utf-8")

# Frontend cards: patch card 08 and 10 statically so the project's own modal handles both.
index_path = root / "frontend" / "index.html"
html = index_path.read_text(encoding="utf-8")

MOON_SVG = """<svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M20.5 14.5A7.2 7.2 0 0 1 9.5 3.5a7.8 7.8 0 1 0 11 11Z"></path>
                        <path d="M4 18h4l-4 4h4"></path>
                        <path d="M13 17h5l-5 5h5"></path>
                    </svg>"""

PERCENT_SVG = """<svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <line x1="19" y1="5" x2="5" y2="19"></line>
                        <circle cx="6.5" cy="6.5" r="2.5"></circle>
                        <circle cx="17.5" cy="17.5" r="2.5"></circle>
                        <path d="M4 21h16"></path>
                    </svg>"""


def patch_button(block, attrs, title, subtitle, svg):
    open_end = block.find(">")
    if open_end < 0:
        return block
    opening = block[: open_end + 1]
    body = block[open_end + 1 :]

    for name in [
        "data-tool", "data-title", "data-endpoint", "data-file-mode", "data-file-count",
        "data-file-one", "data-file-two", "data-file-three", "data-file-four",
        "data-file-five", "data-file-six",
    ]:
        opening = re.sub(rf'\s+{name}="[^"]*"', "", opening)
    opening = re.sub(r'\s+disabled(?:="[^"]*")?', "", opening)
    opening = re.sub(r'\s+aria-disabled="[^"]*"', "", opening)

    insertion = "".join(f'\n                {k}="{v}"' for k, v in attrs.items())
    opening = opening[:-1] + insertion + "\n            >"

    body = re.sub(r'<strong>.*?</strong>', f'<strong>{title}</strong>', body, count=1, flags=re.S)
    body = re.sub(r'<small>.*?</small>', f'<small>{subtitle}</small>', body, count=1, flags=re.S)
    body = re.sub(r'<svg\b[\s\S]*?</svg>', svg, body, count=1)
    return opening + body


def patch_numbered_button(source, number, attrs, title, subtitle, svg):
    for m in list(re.finditer(r'<button\b[\s\S]*?</button>', source)):
        block = m.group(0)
        if re.search(rf'<span class="tool-number">0?{number}</span>', block):
            new_block = patch_button(block, attrs, title, subtitle, svg)
            return source[:m.start()] + new_block + source[m.end():]
    raise SystemExit(f"❌ دکمه شماره {number} در frontend/index.html پیدا نشد.")


html = patch_numbered_button(
    html,
    8,
    {
        "data-tool": "product-sleep-analysis",
        "data-title": "خواب کالا",
        "data-endpoint": "/upload-sleep-analysis",
        "data-file-mode": "fixed",
        "data-file-count": "3",
        "data-file-one": "اکسل سایت",
        "data-file-two": "اکسل محصول",
        "data-file-three": "اکسل تاریخ تعریف",
    },
    "خواب کالا",
    "تحلیل سرعت فروش، موجودی و سن محصول",
    MOON_SVG,
)

html = patch_numbered_button(
    html,
    10,
    {
        "data-tool": "sales-percentage",
        "data-title": "درصد فروش محصولات",
        "data-endpoint": "/upload-sales-percentage",
        "data-file-mode": "fixed",
        "data-file-count": "2",
        "data-file-one": "گزارش تعریف کالا",
        "data-file-two": "فایل انتقال روز مورد نظر",
    },
    "درصد فروش محصولات",
    "محاسبه درصد فروش و تطبیق بارکد با انتقال روز",
    PERCENT_SVG,
)

# Remove CSS for the old custom modal if it still exists.
style_path = root / "frontend" / "style.css"
if style_path.exists():
    css = style_path.read_text(encoding="utf-8")
    css = re.sub(
        r'\n?/\* === SALES_PERCENTAGE_STYLE_V1 === \*/.*?/\* === /SALES_PERCENTAGE_STYLE_V1 === \*/\n?',
        "\n",
        css,
        flags=re.S,
    )
    style_path.write_text(css, encoding="utf-8")

# Bust JS cache every install.
stamp = str(int(time.time()))
html = re.sub(r'/static/app\.js\?v=[^"\']+', f'/static/app.js?v={stamp}_v6', html)
index_path.write_text(html, encoding="utf-8")
PY

PYTHON_BIN="python"
if [[ -x "$ROOT/.venv/bin/python" ]]; then
  PYTHON_BIN="$ROOT/.venv/bin/python"
fi
UVICORN_BIN="uvicorn"
if [[ -x "$ROOT/.venv/bin/uvicorn" ]]; then
  UVICORN_BIN="$ROOT/.venv/bin/uvicorn"
fi

"$PYTHON_BIN" -m py_compile "$ROOT/backend/api.py" "$ROOT/backend/sales_percentage_report.py"
if command -v node >/dev/null 2>&1; then
  node --check "$ROOT/frontend/app.js"
fi

echo "✅ کد جدید از نظر syntax سالم است."

# Stop old server(s) on port 8000.
if [[ -f "$ROOT/uvicorn.pid" ]]; then
  OLD_PID="$(cat "$ROOT/uvicorn.pid" 2>/dev/null || true)"
  if [[ -n "${OLD_PID:-}" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
  fi
fi
if command -v fuser >/dev/null 2>&1; then
  fuser -k 8000/tcp >/dev/null 2>&1 || true
  sleep 1
elif command -v pkill >/dev/null 2>&1; then
  pkill -f 'uvicorn.*api:app.*--port[ =]8000' 2>/dev/null || true
  sleep 1
fi

rm -f "$ROOT/uvicorn.log" "$ROOT/uvicorn.pid"
(
  cd "$ROOT/backend"
  nohup "$UVICORN_BIN" api:app --host 0.0.0.0 --port 8000 > "$ROOT/uvicorn.log" 2>&1 &
  echo $! > "$ROOT/uvicorn.pid"
)

SERVER_PID="$(cat "$ROOT/uvicorn.pid")"
SERVER_OK=0
for _ in $(seq 1 40); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    break
  fi
  if command -v curl >/dev/null 2>&1 && curl -fsS http://127.0.0.1:8000/health >/dev/null 2>&1; then
    SERVER_OK=1
    break
  fi
  sleep 0.25
done

if [[ "$SERVER_OK" != "1" ]]; then
  echo "❌ سرور بالا نیامد. آخرین لاگ:"
  tail -100 "$ROOT/uvicorn.log" 2>/dev/null || true
  exit 1
fi

# Build two sample files and test the real HTTP endpoint automatically.
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT
"$PYTHON_BIN" - "$TEST_DIR" <<'PY'
from openpyxl import Workbook
from pathlib import Path
import sys

p = Path(sys.argv[1])

wb = Workbook(); ws = wb.active
ws.append(["بارکد", "تاریخ تعریف", "تعداد فروش", "موجودی اولیه", "شناسه راهکاران", "قیمت", "تاریخ ویرایش"])
ws.append(["1001", "1405/06/16", 5, 10, "x", 100, "1405/06/01"])
ws.append(["1002", "1405/06/17", 1, 6, "y", 200, "1405/06/01"])
ws.append(["1004", "1405/06/17", 3, 10, "w", 250, "1405/06/01"])
ws.append(["1003", "1405/06/18", 1, 10, "z", 300, "1405/06/01"])
wb.save(p / "definition.xlsx")

wb = Workbook(); ws = wb.active
ws.append(["صادر کننده", "مشخصات فنی", "تاریخ سند"])
ws.append(["کاربر عادی", "1001", "1405/06/16"])
ws.append(["کاربر دوم", "1002", "1405/06/16"])
ws.append(["آقای ابوالفضل فلاح - انبار", "1004", "1405/06/16"])
ws.append(["کاربر سوم", "9999", "1405/06/16"])
wb.save(p / "transfer.xlsx")
PY

if command -v curl >/dev/null 2>&1; then
  HTTP_CODE="$(curl -sS -o "$TEST_DIR/out.xlsx" -w '%{http_code}' \
    -F "files=@$TEST_DIR/definition.xlsx" \
    -F "files=@$TEST_DIR/transfer.xlsx" \
    http://127.0.0.1:8000/upload-sales-percentage || true)"
  if [[ "$HTTP_CODE" != "200" ]]; then
    echo "❌ تست واقعی endpoint شکست خورد (HTTP $HTTP_CODE). پاسخ سرور:"
    cat "$TEST_DIR/out.xlsx" 2>/dev/null || true
    echo
    echo "آخرین لاگ:"
    tail -100 "$ROOT/uvicorn.log" 2>/dev/null || true
    exit 1
  fi

  "$PYTHON_BIN" - "$TEST_DIR/out.xlsx" <<'PY'
from openpyxl import load_workbook
import sys
wb = load_workbook(sys.argv[1])
ws = wb.active
headers = [c.value for c in ws[1]]
assert "درصد فروش" in headers, headers
assert "شناسه راهکاران" not in headers, headers
assert "قیمت" not in headers, headers
assert "تاریخ ویرایش" not in headers, headers
# Only the barcode that also exists in non-blocked transfer rows must survive.
assert ws.max_row == 3, f"expected header + 2 matched rows, got {ws.max_row}"
barcode_col = headers.index("بارکد") + 1
technical_col = headers.index("مشخصات فنی") + 1
percentage_col = headers.index("درصد فروش") + 1
assert [str(ws.cell(r, barcode_col).value) for r in (2, 3)] == ["1001", "1002"]
assert [str(ws.cell(r, technical_col).value) for r in (2, 3)] == ["1001", "1002"]
# Plain numbers: 5/10*100=50 and 1/6*100 rounds to 17; no % sign/decimals.
assert [ws.cell(r, percentage_col).value for r in (2, 3)] == [50, 17]
assert all(ws.cell(r, percentage_col).number_format == "0" for r in (2, 3))
# All surviving matched barcode/technical cells must be red.
assert all(ws.cell(r, barcode_col).fill.fgColor.rgb == "FFFF0000" for r in (2, 3))
assert all(ws.cell(r, technical_col).fill.fgColor.rgb == "FFFF0000" for r in (2, 3))
print("✅ تست خودکار V6 پاس شد: فقط مشابهات باقی ماندند و درصد فروش عدد صحیح است.")
PY
fi

echo
echo "✅ نسخه V6 نصب شد و endpoint با دو فایل واقعیِ تستی هم تست شد."
echo "✅ فرمت‌های xlsx / xlsm / xls برای این ابزار پذیرفته می‌شوند."
echo "✅ خطای واقعی سرور از این به بعد داخل خود پنجره نمایش داده می‌شود."
echo "✅ فقط ردیف‌های دارای تطابق بارکد/مشخصات فنی در خروجی باقی می‌مانند."
echo "✅ درصد فروش عدد صحیح است؛ بدون اعشار و بدون علامت %."
echo "✅ برای فایل‌های بزرگ، حذف ردیف‌ها به‌صورت بلوکی بهینه شده است."
echo
echo "حالا صفحه را Ctrl+Shift+R کن و دوباره گزارش را بساز."
echo "اگر باز هم خطا شد، متن خطا را همینجا بفرست؛ جزئیات دقیق خواهد بود."
echo "لاگ اختصاصی این گزارش هم در صورت خطا: sales_percentage_error.log"
