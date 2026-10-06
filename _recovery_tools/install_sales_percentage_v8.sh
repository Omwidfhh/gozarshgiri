#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
REPORT="$ROOT/backend/sales_percentage_report.py"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$ROOT/.patch_backups/sales_percentage_v8_$STAMP"

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

# Expand openpyxl style imports.
old_import = "from openpyxl.styles import PatternFill"
new_import = "from openpyxl.styles import Alignment, Border, Font, PatternFill, Side"
if old_import in text:
    text = text.replace(old_import, new_import, 1)
elif new_import not in text:
    raise SystemExit("❌ خط import مربوط به openpyxl.styles پیدا نشد.")

# Make the existing duplicate highlight softer while keeping it clearly red.
text = text.replace(
    'RED_FILL = PatternFill(fill_type="solid", fgColor="FFFF0000")',
    'RED_FILL = PatternFill(fill_type="solid", fgColor="FFFFC7CE")',
)

helper = r'''

# Final Excel visual style requested by the user.
PEYDA_FONT_NAME = "Peyda"
WHITE_FILL = PatternFill(fill_type="solid", fgColor="FFFFFFFF")
HEADER_FILL = PatternFill(fill_type="solid", fgColor="FFD9D9D9")
GRID_SIDE = Side(style="thin", color="FFD0D0D0")
GRID_BORDER = Border(left=GRID_SIDE, right=GRID_SIDE, top=GRID_SIDE, bottom=GRID_SIDE)


def _cell_has_duplicate_red_fill(cell) -> bool:
    """Keep the red similarity markers when normalizing the rest of the sheet."""
    if cell.fill is None or cell.fill.fill_type != "solid":
        return False
    color = cell.fill.fgColor
    rgb = getattr(color, "rgb", None)
    if isinstance(rgb, str):
        return rgb.upper() in {"FFFF0000", "FFFFC7CE", "00FF0000", "00FFC7CE"}
    return False


def _apply_final_output_style(ws, header_row: int) -> None:
    """Apply Peyda + clean white/gray styling to the final used table."""
    max_row = ws.max_row
    max_col = ws.max_column

    # Persian workbook usability.
    try:
        ws.sheet_view.rightToLeft = True
    except Exception:
        pass

    # Header row: gray, bold, black, Peyda.
    for col in range(1, max_col + 1):
        cell = ws.cell(header_row, col)
        cell.font = Font(
            name=PEYDA_FONT_NAME,
            size=11,
            bold=True,
            color="FF000000",
        )
        cell.fill = HEADER_FILL
        cell.border = GRID_BORDER
        cell.alignment = Alignment(
            horizontal="center",
            vertical="center",
            wrap_text=True,
        )

    ws.row_dimensions[header_row].height = 26

    # Data area: white background + black Peyda font.
    # The two matched cells (barcode/technical) keep their red fill.
    for row in range(header_row + 1, max_row + 1):
        ws.row_dimensions[row].height = max(ws.row_dimensions[row].height or 0, 20)
        for col in range(1, max_col + 1):
            cell = ws.cell(row, col)
            keep_red = _cell_has_duplicate_red_fill(cell)
            cell.font = Font(
                name=PEYDA_FONT_NAME,
                size=10.5,
                bold=False,
                color="FF000000",
            )
            if keep_red:
                cell.fill = RED_FILL
            else:
                cell.fill = WHITE_FILL
            cell.border = GRID_BORDER
            cell.alignment = Alignment(
                horizontal="center",
                vertical="center",
                wrap_text=True,
            )

'''

if "def _apply_final_output_style(" not in text:
    marker = "def create_sales_percentage_report(definition_path, transfer_path, output_path):"
    if marker not in text:
        raise SystemExit("❌ تابع create_sales_percentage_report پیدا نشد.")
    text = text.replace(marker, helper + "\n" + marker, 1)

# Insert final styling right before saving the workbook.
style_call = "        _apply_final_output_style(ws_definition, definition_header)\n"
if style_call not in text:
    save_marker = "        output_path.parent.mkdir(parents=True, exist_ok=True)\n        wb_definition.save(output_path)"
    replacement = (
        "        # Normalize the final workbook appearance after all filtering/deletions.\n"
        + style_call
        + "\n"
        + save_marker
    )
    if save_marker not in text:
        raise SystemExit("❌ محل ذخیره خروجی در فایل گزارش پیدا نشد.")
    text = text.replace(save_marker, replacement, 1)

path.write_text(text, encoding="utf-8")
print("✅ استایل نهایی Peyda / سفید / خاکستری به گزارش اضافه شد.")
PY

"$PYTHON_BIN" -m py_compile "$ROOT/backend/sales_percentage_report.py" "$ROOT/backend/api.py"

# Small style regression test.
PYTHONPATH="$ROOT/backend" "$PYTHON_BIN" - <<'PY'
from pathlib import Path
from tempfile import TemporaryDirectory
from openpyxl import Workbook, load_workbook
from sales_percentage_report import _apply_final_output_style, RED_FILL

with TemporaryDirectory() as td:
    out = Path(td) / "style_test.xlsx"
    wb = Workbook()
    ws = wb.active
    ws.append(["بارکد", "تعداد فروش", "موجودی اولیه", "درصد فروش", "مشخصات فنی"])
    ws.append(["123", 20, 40, 50, "123"])
    ws.append(["456", 10, 20, 50, "456"])
    ws["A2"].fill = RED_FILL
    ws["E2"].fill = RED_FILL

    _apply_final_output_style(ws, 1)
    wb.save(out)

    check = load_workbook(out)
    s = check.active

    assert (s["A1"].font.name or "").lower() == "peyda"
    assert (s["B2"].font.name or "").lower() == "peyda"
    assert s["A1"].fill.fill_type == "solid"
    assert s["A1"].fill.fgColor.rgb in {"FFD9D9D9", "00D9D9D9"}
    assert s["B2"].fill.fgColor.rgb in {"FFFFFFFF", "00FFFFFF"}
    assert s["B2"].font.color.type == "rgb" and s["B2"].font.color.rgb in {"FF000000", "00000000"}
    assert s["A2"].fill.fgColor.rgb in {"FFFFC7CE", "00FFC7CE"}
    assert s["E2"].fill.fgColor.rgb in {"FFFFC7CE", "00FFC7CE"}

print("✅ تست ظاهر پاس شد: Peyda، بدنه سفید، سرفصل خاکستری و تطابق قرمز حفظ شد.")
PY

# Restart Codespaces server on port 8000.
echo "🔄 راه‌اندازی مجدد سرور..."
OLD_PIDS="$(pgrep -f "[u]vicorn api:app" 2>/dev/null || true)"
if [[ -n "$OLD_PIDS" ]]; then
  kill $OLD_PIDS 2>/dev/null || true
  sleep 1
fi

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
echo "✅ V8 نصب شد."
echo "✅ فونت تمام سلول‌های خروجی: Peyda"
echo "✅ بدنه جدول: سفید + فونت مشکی"
echo "✅ سرفصل‌ها: خاکستری + بولد + فونت مشکی"
echo "✅ تطابق‌های بارکد / مشخصات فنی همچنان قرمز باقی می‌مانند."
echo "✅ خطوط ظریف بین سلول‌ها برای خوانایی اضافه شد."
echo "✅ سرور روی پورت 8000 دوباره بالا آمد."
