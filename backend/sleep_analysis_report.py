import shutil
from copy import copy
from decimal import Decimal, InvalidOperation
from math import isfinite
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.cell.cell import MergedCell
from openpyxl.styles import PatternFill
from openpyxl.utils import get_column_letter

from report import DIGIT_TRANSLATION
from report import PEYDA_BODY_FONT
from report import PEYDA_HEADER_FONT
from report import calculate_visual_width
from report import find_column_by_aliases
from report import normalize_header_compact
from report import normalize_code


SITE_CODE_ALIASES = (
    "کد کالا",
    "کدکالا",
    "كد کالا",
)

SITE_STOCK_ALIASES = (
    "موجودی قابل فروش",
    "موجودي قابل فروش",
)

TECHNICAL_CODE_ALIASES = (
    "مشخصه فنی کالا",
    "مشخصات فنی کالا",
    "مشخصه فنی",
    "مشخصات فنی",
)

PRODUCT_CODE_ALIASES = (
    "کد کالا",
    "کد محصول",
    "کدکالا",
    "کدمحصول",
)

PRODUCT_STOCK_ALIASES = (
    "موجودی قابل فروش",
    "موجودي قابل فروش",
)

BARCODE_ALIASES = (
    "بارکد",
    "بار کد",
    "کد بارکد",
)

DEFINITION_DATE_ALIASES = (
    "تاریخ تعریف",
    "تاريخ تعريف",
    "تاریخ ثبت",
    "تاريخ ثبت",
)

PRODUCT_STOCK_HEADER = "موجودی محصول"
DEFINITION_DATE_HEADER = "تاریخ تعریف"

# ستون‌هایی که نباید در خروجی دکمه ۸ باقی بمانند.
DROP_COLUMN_ALIASES = (
    (
        "ماهیت کالا کالا",
        "ماهيت کالا کالا",
        "ماهیتکالاکالا",
        "ماهیت کالا",
        "ماهيت کالا",
        "ماهیتکالا",
    ),
    (
        "موجودی تعدادی",
        "موجودي تعدادي",
    ),
    (
        "موجودی رزرو کالا",
        "موجودي رزرو کالا",
    ),
    (
        "سایر مشخصات کالا",
        "ساير مشخصات کالا",
        "سایر مشخصات كالا",
    ),
    (
        "سایز کالا",
        "سايز کالا",
    ),
    (
        "category کالا",
        "categoryکالا",
        "کالا category",
        "کالاcategory",
        "دسته بندی کالا",
        "دسته‌بندی کالا",
    ),
)

# خروجی‌های قدیمی دکمه ۸؛ اگر ورودی قبلاً یک خروجی قدیمی بوده باشد حذف می‌شوند.
LEGACY_OUTPUT_ALIASES = (
    ("مقدار فروش",),
    ("موجودی کل",),
    ("نرخ گردش",),
    ("سن محصول (روز)",),
    ("تحلیل خواب کالا",),
)

# قرمز متوسط و زرد برای رنگ کل ردیف.
MEDIUM_RED_FILL = PatternFill(
    fill_type="solid",
    fgColor="E06666",
)

YELLOW_FILL = PatternFill(
    fill_type="solid",
    fgColor="FFD966",
)


def get_headers(worksheet, file_label):
    try:
        return next(
            worksheet.iter_rows(
                min_row=1,
                max_row=1,
                values_only=True,
            )
        )
    except StopIteration as error:
        raise ValueError(f"{file_label} خالی است.") from error


def find_required_column(headers, aliases, readable_name, file_label):
    column_index = find_column_by_aliases(headers, aliases)

    if column_index is None:
        raise ValueError(
            f"ستون «{readable_name}» در {file_label} پیدا نشد."
        )

    return column_index + 1


def normalize_key(value):
    normalized = normalize_code(value)

    if normalized is None:
        return ""

    return "".join(
        str(normalized)
        .translate(DIGIT_TRANSLATION)
        .replace("ي", "ی")
        .replace("ك", "ک")
        .replace("\u200c", " ")
        .replace("\u200e", "")
        .replace("\u200f", "")
        .replace("\xa0", " ")
        .split()
    )


def to_decimal(value):
    if value is None or isinstance(value, bool):
        return None

    if isinstance(value, Decimal):
        return value

    if isinstance(value, int):
        return Decimal(value)

    if isinstance(value, float):
        if not isfinite(value):
            return None
        return Decimal(str(value))

    normalized = (
        str(value)
        .translate(DIGIT_TRANSLATION)
        .replace(",", "")
        .replace("٬", "")
        .replace("،", "")
        .replace(" ", "")
        .strip()
    )

    if normalized.casefold() in {"", "n/a", "na", "none", "null", "-"}:
        return None

    if normalized.startswith("(") and normalized.endswith(")"):
        normalized = f"-{normalized[1:-1].strip()}"

    try:
        return Decimal(normalized)
    except InvalidOperation:
        return None


def excel_number(value):
    number = to_decimal(value)

    if number is None:
        return 0

    if number == number.to_integral_value():
        return int(number)

    return float(number)


def read_product_stock(file_path):
    workbook = load_workbook(
        filename=file_path,
        read_only=True,
        data_only=True,
    )
    worksheet = workbook.active

    try:
        headers = get_headers(worksheet, "اکسل انبار محصول")
        code_column = find_required_column(
            headers,
            PRODUCT_CODE_ALIASES,
            "کد کالا",
            "اکسل انبار محصول",
        )
        stock_column = find_required_column(
            headers,
            PRODUCT_STOCK_ALIASES,
            "موجودی قابل فروش",
            "اکسل انبار محصول",
        )
        required_column = max(code_column, stock_column)
        product_stock = {}

        for row in worksheet.iter_rows(min_row=2, values_only=True):
            if len(row) < required_column:
                continue

            product_code = normalize_key(row[code_column - 1])
            if not product_code:
                continue

            stock = to_decimal(row[stock_column - 1])
            product_stock[product_code] = (
                stock if stock is not None else Decimal("0")
            )

        return product_stock
    finally:
        workbook.close()


def read_definition_dates(file_path):
    workbook = load_workbook(
        filename=file_path,
        read_only=True,
        data_only=True,
    )
    worksheet = workbook.active

    try:
        headers = get_headers(worksheet, "فایل تعریف بارکد ادمین")
        barcode_column = find_required_column(
            headers,
            BARCODE_ALIASES,
            "بارکد",
            "فایل تعریف بارکد ادمین",
        )
        date_column = find_required_column(
            headers,
            DEFINITION_DATE_ALIASES,
            "تاریخ تعریف",
            "فایل تعریف بارکد ادمین",
        )
        required_column = max(barcode_column, date_column)
        definition_dates = {}

        for row in worksheet.iter_rows(min_row=2, values_only=False):
            if len(row) < required_column:
                continue

            barcode = normalize_key(row[barcode_column - 1].value)
            if not barcode:
                continue

            # اولین رکورد هر بارکد مبنا قرار می‌گیرد؛ اگر تاریخ آن خالی باشد
            # اولین رکورد بعدیِ غیرخالی جایگزینش می‌شود.
            date_cell = row[date_column - 1]
            candidate = {
                "value": date_cell.value,
                "number_format": date_cell.number_format,
            }
            existing = definition_dates.get(barcode)

            if existing is None or (
                existing.get("value") in (None, "")
                and candidate["value"] not in (None, "")
            ):
                definition_dates[barcode] = candidate

        return definition_dates
    finally:
        workbook.close()


def copy_cell_style(source_cell, target_cell):
    if source_cell.has_style:
        target_cell._style = copy(source_cell._style)

    target_cell.alignment = copy(source_cell.alignment)
    target_cell.border = copy(source_cell.border)
    target_cell.protection = copy(source_cell.protection)
    target_cell.number_format = source_cell.number_format


def get_last_header_column(worksheet):
    return max(
        (
            cell.column
            for cell in worksheet[1]
            if cell.value not in (None, "")
        ),
        default=worksheet.max_column,
    )


def append_output_column(worksheet, header, after_column):
    output_column = after_column + 1
    source_header = worksheet.cell(row=1, column=max(after_column, 1))
    output_header = worksheet.cell(row=1, column=output_column)

    if not isinstance(source_header, MergedCell):
        copy_cell_style(source_header, output_header)

    output_header.value = header
    output_header.font = copy(PEYDA_HEADER_FONT)
    return output_column


def collect_drop_columns(worksheet, alias_groups):
    headers = get_headers(worksheet, "اکسل خروجی")
    normalized_groups = [
        {normalize_header_compact(alias).casefold() for alias in aliases}
        for aliases in alias_groups
    ]
    columns = []

    for column_index, header in enumerate(headers, start=1):
        normalized = normalize_header_compact(header).casefold()
        if any(normalized in group for group in normalized_groups):
            columns.append(column_index)

    return sorted(set(columns), reverse=True)


def delete_columns_by_aliases(worksheet, alias_groups):
    for column_index in collect_drop_columns(worksheet, alias_groups):
        worksheet.delete_cols(column_index, 1)


def remove_existing_generated_columns(worksheet):
    # اگر فایل مبنا قبلاً از دکمه ۸ خروجی گرفته باشد، ستون‌های تولیدی را پاک می‌کنیم
    # تا نسخه جدید همیشه دقیقاً دو ستون جدید در انتهای فایل داشته باشد.
    generated_aliases = (
        (PRODUCT_STOCK_HEADER,),
        (DEFINITION_DATE_HEADER,),
    ) + LEGACY_OUTPUT_ALIASES
    delete_columns_by_aliases(worksheet, generated_aliases)


def fill_entire_row(worksheet, row_number, fill):
    last_column = get_last_header_column(worksheet)

    for column_number in range(1, last_column + 1):
        cell = worksheet.cell(row=row_number, column=column_number)
        if not isinstance(cell, MergedCell):
            cell.fill = copy(fill)


def set_output_width(worksheet, column_number, minimum_width):
    maximum_width = calculate_visual_width(
        worksheet.cell(row=1, column=column_number).value
    )

    for row_number in range(2, worksheet.max_row + 1):
        maximum_width = max(
            maximum_width,
            calculate_visual_width(
                worksheet.cell(row=row_number, column=column_number).value
            ),
        )

    column_letter = get_column_letter(column_number)
    worksheet.column_dimensions[column_letter].width = min(
        max(maximum_width + 3, minimum_width),
        28,
    )
    worksheet.column_dimensions[column_letter].bestFit = True


def create_sleep_analysis_report(
    site_file_path,
    product_file_path,
    definition_file_path,
    output_path,
):
    """
    منطق دکمه ۸:
      1) اکسل انبار سایت فایل مبناست.
      2) کد کالا با اکسل انبار محصول مچ می‌شود و «موجودی قابل فروش» آن
         با نام «موجودی محصول» به انتهای فایل مبنا اضافه می‌شود.
      3) «مشخصه فنی کالا» با «بارکد» فایل تعریف بارکد ادمین مچ می‌شود
         و «تاریخ تعریف» به انتهای فایل اضافه می‌شود.
      4) ستون‌های مشخص‌شده از خروجی حذف می‌شوند.
      5) رنگ‌گذاری ردیف‌ها فقط بر اساس اختلاف موجودی انجام می‌شود.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    product_stock = read_product_stock(product_file_path)
    definition_dates = read_definition_dates(definition_file_path)

    shutil.copy2(site_file_path, output_path)

    workbook = load_workbook(
        filename=output_path,
        read_only=False,
        data_only=False,
    )
    worksheet = workbook.active

    try:
        # ابتدا ستون‌های تولیدی قدیمی احتمالی حذف می‌شوند تا ورودی تمیز شود.
        remove_existing_generated_columns(worksheet)

        headers = get_headers(worksheet, "اکسل انبار سایت")
        site_code_column = find_required_column(
            headers,
            SITE_CODE_ALIASES,
            "کد کالا",
            "اکسل انبار سایت",
        )
        site_stock_column = find_required_column(
            headers,
            SITE_STOCK_ALIASES,
            "موجودی قابل فروش",
            "اکسل انبار سایت",
        )
        technical_column = find_required_column(
            headers,
            TECHNICAL_CODE_ALIASES,
            "مشخصه فنی کالا",
            "اکسل انبار سایت",
        )

        last_column = get_last_header_column(worksheet)
        product_stock_column = append_output_column(
            worksheet,
            PRODUCT_STOCK_HEADER,
            last_column,
        )
        definition_date_column = append_output_column(
            worksheet,
            DEFINITION_DATE_HEADER,
            product_stock_column,
        )

        # مقادیر مقایسه را نگه می‌داریم تا بعد از حذف ستون‌ها رنگ‌گذاری کنیم.
        row_comparisons = {}
        product_match_count = 0
        definition_match_count = 0

        for row_number in range(2, worksheet.max_row + 1):
            product_code = normalize_key(
                worksheet.cell(row=row_number, column=site_code_column).value
            )
            technical_code = normalize_key(
                worksheet.cell(row=row_number, column=technical_column).value
            )
            site_stock = to_decimal(
                worksheet.cell(row=row_number, column=site_stock_column).value
            )
            if site_stock is None:
                site_stock = Decimal("0")

            matched_product_stock = product_stock.get(
                product_code,
                Decimal("0"),
            )
            if product_code and product_code in product_stock:
                product_match_count += 1

            product_cell = worksheet.cell(
                row=row_number,
                column=product_stock_column,
            )
            product_source_cell = worksheet.cell(
                row=row_number,
                column=max(product_stock_column - 1, 1),
            )
            if not isinstance(product_source_cell, MergedCell):
                copy_cell_style(product_source_cell, product_cell)
            product_cell.value = excel_number(matched_product_stock)
            product_cell.font = copy(PEYDA_BODY_FONT)

            definition_cell = worksheet.cell(
                row=row_number,
                column=definition_date_column,
            )
            definition_source_cell = worksheet.cell(
                row=row_number,
                column=max(definition_date_column - 1, 1),
            )
            if not isinstance(definition_source_cell, MergedCell):
                copy_cell_style(definition_source_cell, definition_cell)

            matched_definition = definition_dates.get(technical_code)
            if matched_definition is not None:
                definition_match_count += 1
                definition_cell.value = matched_definition["value"]
                if matched_definition.get("number_format"):
                    definition_cell.number_format = matched_definition[
                        "number_format"
                    ]
            definition_cell.font = copy(PEYDA_BODY_FONT)

            row_comparisons[row_number] = (
                site_stock,
                matched_product_stock,
            )

        # ستون‌های درخواستی کاربر از فایل نهایی حذف می‌شوند.
        delete_columns_by_aliases(worksheet, DROP_COLUMN_ALIASES)

        # بعد از حذف ستون‌ها، ردیف‌ها را رنگ می‌کنیم تا تمام ستون‌های باقی‌مانده
        # (از جمله موجودی محصول و تاریخ تعریف) رنگ یکدست داشته باشند.
        red_count = 0
        yellow_count = 0

        for row_number, (site_stock, matched_product_stock) in row_comparisons.items():
            if site_stock != 0 and matched_product_stock == 0:
                fill_entire_row(worksheet, row_number, MEDIUM_RED_FILL)
                red_count += 1
            elif site_stock > matched_product_stock:
                fill_entire_row(worksheet, row_number, YELLOW_FILL)
                yellow_count += 1

        # محل نهایی ستون‌های افزوده‌شده بعد از حذف ستون‌های قبلی را دوباره پیدا می‌کنیم.
        final_headers = get_headers(worksheet, "اکسل خروجی")
        final_product_index = find_column_by_aliases(
            final_headers,
            (PRODUCT_STOCK_HEADER,),
        )
        final_definition_index = find_column_by_aliases(
            final_headers,
            (DEFINITION_DATE_HEADER,),
        )

        if final_product_index is not None:
            set_output_width(
                worksheet,
                final_product_index + 1,
                15,
            )
        if final_definition_index is not None:
            set_output_width(
                worksheet,
                final_definition_index + 1,
                16,
            )

        last_column = get_last_header_column(worksheet)
        last_letter = get_column_letter(last_column)
        worksheet.auto_filter.ref = f"A1:{last_letter}{worksheet.max_row}"
        worksheet.freeze_panes = "A2"
        worksheet.sheet_view.rightToLeft = True

        workbook.save(output_path)

        return {
            "output_path": str(output_path),
            "row_count": max(worksheet.max_row - 1, 0),
            "product_stock_matched_count": product_match_count,
            "definition_date_matched_count": definition_match_count,
            "red_row_count": red_count,
            "yellow_row_count": yellow_count,
        }
    finally:
        workbook.close()
