#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
REPORT="$ROOT/backend/sales_percentage_report.py"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$ROOT/.patch_backups/sales_percentage_v7_$STAMP"

if [[ ! -f "$REPORT" || ! -f "$ROOT/backend/api.py" ]]; then
  echo "❌ این فایل را از ریشه پروژه اجرا کن؛ همان‌جایی که backend و frontend قرار دارند."
  exit 1
fi

mkdir -p "$BACKUP_DIR/backend"
cp "$REPORT" "$BACKUP_DIR/backend/sales_percentage_report.py"
cp "$ROOT/backend/api.py" "$BACKUP_DIR/backend/api.py"
echo "✅ بکاپ ساخته شد: $BACKUP_DIR"

PYTHON_BIN="python"
if [[ -x "$ROOT/.venv/bin/python" ]]; then
  PYTHON_BIN="$ROOT/.venv/bin/python"
fi

"$PYTHON_BIN" - "$REPORT" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

helper = r'''
def _find_initial_stock_col_ws(ws, header_row: int) -> int:
    """Find ONLY the initial-stock column; never confuse it with plain «موجودی»."""
    max_col = min(ws.max_column, MAX_HEADER_SCAN_COLS)

    # Important: matching is one-way.  «موجودی» must NOT match
    # «موجودی اولیه» merely because it is a substring of the alias.
    for col in range(1, max_col + 1):
        value = ws.cell(header_row, col).value
        value_norm = _norm_text(value)
        value_compact = _compact_text(value)
        if not value_norm:
            continue

        for alias in INITIAL_STOCK_ALIASES:
            alias_norm = _norm_text(alias)
            alias_compact = _compact_text(alias)

            if value_norm == alias_norm or value_compact == alias_compact:
                return col

            # Allow harmless suffixes such as «موجودی اولیه کالا», while still
            # refusing the shorter/current-stock header «موجودی».
            if value_norm.startswith(alias_norm + " "):
                return col
            if value_compact.startswith(alias_compact) and len(value_compact) > len(alias_compact):
                return col

    visible = [
        str(ws.cell(header_row, col).value)
        for col in range(1, max_col + 1)
        if ws.cell(header_row, col).value not in (None, "")
    ]
    raise ValueError(
        "ستون «موجودی اولیه» پیدا نشد. برای محاسبه درصد فروش، "
        "ستون «موجودی» به‌جای آن استفاده نمی‌شود. ستون‌های موجود: "
        + ", ".join(visible[:60])
    )

'''

if "def _find_initial_stock_col_ws(" not in text:
    marker = "def create_sales_percentage_report(definition_path, transfer_path, output_path):"
    if marker not in text:
        raise SystemExit("❌ تابع create_sales_percentage_report در فایل گزارش پیدا نشد.")
    text = text.replace(marker, helper + marker, 1)

old = "_find_col_ws(ws_definition, definition_header, INITIAL_STOCK_ALIASES)"
new = "_find_initial_stock_col_ws(ws_definition, definition_header)"
count = text.count(old)
text = text.replace(old, new)

# A second pattern may exist in future formatting variants.
old_multiline = """_find_col_ws(\n            ws_definition, definition_header, INITIAL_STOCK_ALIASES\n        )"""
if old_multiline in text:
    text = text.replace(old_multiline, new)

if new not in text:
    raise SystemExit("❌ هیچ محل محاسبه‌ای برای موجودی اولیه پیدا نشد؛ فایل تغییر نکرد.")

# Guard against accidentally reverting to the ambiguous lookup in this report.
if "initial_stock_col = _find_col_ws(ws_definition, definition_header, INITIAL_STOCK_ALIASES)" in text:
    raise SystemExit("❌ هنوز یک lookup مبهم برای موجودی اولیه باقی مانده است.")

path.write_text(text, encoding="utf-8")
print(f"✅ lookup موجودی اولیه اصلاح شد ({count} جای مستقیم جایگزین شد).")
PY

"$PYTHON_BIN" -m py_compile "$ROOT/backend/sales_percentage_report.py" "$ROOT/backend/api.py"

# Unit-test the exact header selection without touching user Excel files.
PYTHONPATH="$ROOT/backend" "$PYTHON_BIN" - <<'PY'
from sales_percentage_report import _find_initial_stock_col_ws

class Cell:
    def __init__(self, value):
        self.value = value

class Sheet:
    def __init__(self, headers):
        self.headers = headers
        self.max_column = len(headers)
    def cell(self, row, col):
        return Cell(self.headers[col - 1])

# This reproduces the bug: «موجودی» appears BEFORE «موجودی اولیه».
ws = Sheet(["بارکد", "موجودی", "موجودی اولیه", "موجودی نهایی", "تعداد فروش"])
selected = _find_initial_stock_col_ws(ws, 1)
assert selected == 3, f"wrong column selected: {selected}"

# Common spelling variant should also work.
ws2 = Sheet(["موجودی", "موجودي اوليه", "تعداد فروش"])
assert _find_initial_stock_col_ws(ws2, 1) == 2

print("✅ تست انتخاب ستون پاس شد: «موجودی اولیه» انتخاب می‌شود، نه «موجودی».")
PY

# Restart the same Codespaces server on port 8000.
echo "🔄 راه‌اندازی مجدد سرور..."
pkill -f "uvicorn api:app" 2>/dev/null || true
sleep 1

cd "$ROOT/backend"
nohup "$PYTHON_BIN" -m uvicorn api:app --host 0.0.0.0 --port 8000 > "$ROOT/uvicorn.log" 2>&1 &
SERVER_PID=$!
cd "$ROOT"

SERVER_OK=0
for _ in $(seq 1 40); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    break
  fi
  if command -v curl >/dev/null 2>&1; then
    if curl -fsS http://127.0.0.1:8000/health >/dev/null 2>&1; then
      SERVER_OK=1
      break
    fi
  else
    # If curl is unavailable, a live process after a short delay is enough here.
    sleep 1
    if kill -0 "$SERVER_PID" 2>/dev/null; then
      SERVER_OK=1
      break
    fi
  fi
  sleep 0.25
done

if [[ "$SERVER_OK" != "1" ]]; then
  echo "❌ سرور بالا نیامد. آخرین لاگ:"
  tail -100 "$ROOT/uvicorn.log" 2>/dev/null || true
  exit 1
fi

echo
echo "✅ V7 نصب شد."
echo "✅ درصد فروش فقط از «موجودی اولیه» محاسبه می‌شود: تعداد فروش ÷ موجودی اولیه × 100."
echo "✅ ستون ساده «موجودی» دیگر به‌هیچ‌وجه جای موجودی اولیه انتخاب نمی‌شود."
echo "✅ خروجی درصد همچنان عدد صحیح ساده است؛ بدون اعشار و بدون علامت %."
echo "✅ سرور روی پورت 8000 دوباره بالا آمد."
