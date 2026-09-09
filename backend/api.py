from pathlib import Path
from typing import Callable
import json
import re
import shutil
import sys
import tempfile

from fastapi import FastAPI
from fastapi import File
from fastapi import Form
from fastapi import HTTPException
from fastapi import UploadFile
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.background import BackgroundTask
from starlette.concurrency import run_in_threadpool

from barcode_report import create_barcode_comparison_report
from custom_report import create_custom_report
from custom_report import inspect_excel_file
from definition_date_report import create_definition_date_report
from orders_report import create_order_discrepancy_report
from price_report import create_price_comparison_report
from report import create_daily_load_report
from report import create_report
from report import create_three_file_report
from sep_report import create_sep_comparison_report
from sleep_analysis_report import create_sleep_analysis_report
from smart_charge_report import create_smart_charge_report
from sales_percentage_report import create_sales_percentage_report


BASE_DIR = Path(__file__).resolve().parent

if (
    getattr(sys, "frozen", False)
    and hasattr(sys, "_MEIPASS")
):
    PROJECT_DIR = Path(sys._MEIPASS)
else:
    PROJECT_DIR = BASE_DIR.parent

FRONTEND_DIR = PROJECT_DIR / "frontend"

STANDARD_EXTENSIONS = {
    ".xlsx",
    ".xlsm",
}

DAILY_REPORT_EXTENSIONS = {
    ".xlsx",
    ".xlsm",
    ".xls",
}

SALES_PERCENTAGE_EXTENSIONS = {
    ".xlsx",
    ".xlsm",
    ".xls",
}

EXCEL_MEDIA_TYPE = (
    "application/vnd.openxmlformats-officedocument."
    "spreadsheetml.sheet"
)

UPLOAD_CHUNK_SIZE = 1024 * 1024


app = FastAPI(
    title="Royal Jeans Report Tools",
    version="1.0.0",
)


app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static",
)


@app.get("/")
async def home():
    index_file = FRONTEND_DIR / "index.html"

    if not index_file.exists():
        raise HTTPException(
            status_code=404,
            detail="فایل index.html پیدا نشد.",
        )

    return FileResponse(index_file)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "message": "Server is ready",
    }


def remove_temp_directory(directory_path):
    shutil.rmtree(
        directory_path,
        ignore_errors=True,
    )


def validate_files(
    files,
    allowed_extensions,
    expected_count=None,
    minimum_count=None,
    maximum_count=None,
):
    file_count = len(files)

    if expected_count is not None and file_count != expected_count:
        raise HTTPException(
            status_code=400,
            detail=(
                f"باید دقیقاً {expected_count} فایل انتخاب کنید. "
                f"تعداد فایل دریافت‌شده: {file_count}"
            ),
        )

    if minimum_count is not None and file_count < minimum_count:
        raise HTTPException(
            status_code=400,
            detail=(
                f"حداقل باید {minimum_count} فایل انتخاب کنید."
            ),
        )

    if maximum_count is not None and file_count > maximum_count:
        raise HTTPException(
            status_code=400,
            detail=(
                f"حداکثر می‌توانید {maximum_count} فایل انتخاب کنید."
            ),
        )

    for file_number, uploaded_file in enumerate(
        files,
        start=1,
    ):
        filename = uploaded_file.filename or ""
        extension = Path(filename).suffix.lower()

        if extension not in allowed_extensions:
            allowed_text = "، ".join(
                sorted(allowed_extensions)
            )

            raise HTTPException(
                status_code=400,
                detail=(
                    f"فرمت فایل شماره {file_number} مجاز نیست. "
                    f"فرمت‌های مجاز: {allowed_text}"
                ),
            )


async def save_uploaded_file(
    uploaded_file,
    destination_path,
):
    try:
        with destination_path.open("wb") as destination:
            while True:
                chunk = await uploaded_file.read(
                    UPLOAD_CHUNK_SIZE
                )

                if not chunk:
                    break

                destination.write(chunk)

    finally:
        await uploaded_file.close()


async def process_upload(
    files,
    report_builder: Callable,
    download_filename,
    allowed_extensions,
    expected_count=None,
    minimum_count=None,
    maximum_count=None,
):
    validate_files(
        files=files,
        allowed_extensions=allowed_extensions,
        expected_count=expected_count,
        minimum_count=minimum_count,
        maximum_count=maximum_count,
    )

    temp_directory = Path(
        tempfile.mkdtemp(
            prefix="royal_jeans_report_"
        )
    )

    input_paths = []
    output_path = temp_directory / "report.xlsx"

    try:
        for file_number, uploaded_file in enumerate(
            files,
            start=1,
        ):
            original_filename = uploaded_file.filename or ""
            extension = Path(original_filename).suffix.lower()

            input_path = (
                temp_directory
                / f"input_{file_number}{extension}"
            )

            await save_uploaded_file(
                uploaded_file=uploaded_file,
                destination_path=input_path,
            )

            input_paths.append(input_path)

        report_result = await run_in_threadpool(
            report_builder,
            input_paths,
            output_path,
        )

        if not output_path.exists():
            raise RuntimeError(
                "فایل خروجی ساخته نشد."
            )

        response_headers = {
            "Cache-Control": "no-store",
        }

        if isinstance(report_result, dict):
            for key in (
                "matched_count",
                "unmatched_count",
                "row_count",
                "charge_candidate_count",
                "duplicate_row_count",
                "definition_date_matched_count",
                "fast_selling_count",
                "slow_selling_count",
                "review_count",
            ):
                if key in report_result:
                    header_name = (
                        "X-Report-"
                        + key.replace("_", "-").title()
                    )
                    response_headers[header_name] = str(
                        report_result[key]
                    )

        return FileResponse(
            path=output_path,
            media_type=EXCEL_MEDIA_TYPE,
            filename=download_filename,
            headers=response_headers,
            background=BackgroundTask(
                remove_temp_directory,
                temp_directory,
            ),
        )

    except HTTPException:
        remove_temp_directory(temp_directory)
        raise

    except Exception as error:
        remove_temp_directory(temp_directory)

        raise HTTPException(
            status_code=500,
            detail=f"خطا در ساخت گزارش: {error}",
        ) from error


def build_site_charge_report(
    input_paths,
    output_path,
):
    return create_report(
        input_paths[0],
        input_paths[1],
        output_path,
    )


def build_three_inventory_report(
    input_paths,
    output_path,
):
    return create_three_file_report(
        input_paths[0],
        input_paths[1],
        input_paths[2],
        output_path,
    )


def build_daily_report(
    input_paths,
    output_path,
):
    return create_daily_load_report(
        input_paths,
        output_path,
    )


def build_order_discrepancy_report(
    input_paths,
    output_path,
):
    return create_order_discrepancy_report(
        input_paths[0],
        input_paths[1],
        output_path,
    )


def build_barcode_comparison_report(
    input_paths,
    output_path,
):
    return create_barcode_comparison_report(
        input_paths[0],
        input_paths[1],
        input_paths[2],
        output_path,
    )


def build_sep_comparison_report(
    input_paths,
    output_path,
):
    return create_sep_comparison_report(
        input_paths[0],
        input_paths[1],
        output_path,
    )


def build_price_comparison_report(
    input_paths,
    output_path,
):
    return create_price_comparison_report(
        input_paths[0],
        input_paths[1],
        output_path,
    )


def build_definition_date_report(
    input_paths,
    output_path,
):
    return create_definition_date_report(
        input_paths[0],
        input_paths[1],
        input_paths[2],
        output_path,
    )


def build_smart_charge_report(
    input_paths,
    output_path,
):
    return create_smart_charge_report(
        input_paths[0],
        input_paths[1],
        input_paths[2],
        output_path,
    )


def build_sleep_analysis_report(
    input_paths,
    output_path,
):
    return create_sleep_analysis_report(
        input_paths[0],
        input_paths[1],
        input_paths[2],
        input_paths[3],
        output_path,
    )


def safe_custom_download_filename(report_name):
    safe_name = re.sub(
        r"[^\w\u0600-\u06ff-]+",
        "-",
        str(report_name).strip(),
    ).strip("-_")

    if not safe_name:
        safe_name = "custom-report"

    return f"{safe_name}.xlsx"


async def save_inspection_files(files, temp_directory):
    input_paths = []

    for file_number, uploaded_file in enumerate(
        files,
        start=1,
    ):
        original_filename = uploaded_file.filename or ""
        extension = Path(original_filename).suffix.lower()
        input_path = (
            temp_directory
            / f"inspect_{file_number}{extension}"
        )

        await save_uploaded_file(
            uploaded_file=uploaded_file,
            destination_path=input_path,
        )
        input_paths.append(input_path)

    return input_paths


@app.post("/custom-report/inspect")
async def inspect_custom_report_files(
    files: list[UploadFile] = File(...),
):
    validate_files(
        files=files,
        allowed_extensions=STANDARD_EXTENSIONS,
        expected_count=2,
    )

    temp_directory = Path(
        tempfile.mkdtemp(
            prefix="royal_custom_inspect_"
        )
    )

    try:
        input_paths = await save_inspection_files(
            files,
            temp_directory,
        )

        base_info = await run_in_threadpool(
            inspect_excel_file,
            input_paths[0],
            "اکسل مبنا",
        )
        lookup_info = await run_in_threadpool(
            inspect_excel_file,
            input_paths[1],
            "اکسل دوم",
        )

        return JSONResponse({
            "base": base_info,
            "lookup": lookup_info,
        })

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"خطا در بررسی فایل‌ها: {error}",
        ) from error

    finally:
        remove_temp_directory(temp_directory)


@app.post("/custom-report/build")
async def build_custom_report_file(
    files: list[UploadFile] = File(...),
    config: str = Form(...),
):
    try:
        parsed_config = json.loads(config)
    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=400,
            detail="تنظیمات گزارش‌ساز معتبر نیست.",
        ) from error

    if not isinstance(parsed_config, dict):
        raise HTTPException(
            status_code=400,
            detail="ساختار تنظیمات گزارش‌ساز معتبر نیست.",
        )

    def custom_builder(input_paths, output_path):
        return create_custom_report(
            input_paths[0],
            input_paths[1],
            parsed_config,
            output_path,
        )

    return await process_upload(
        files=files,
        report_builder=custom_builder,
        download_filename=safe_custom_download_filename(
            parsed_config.get("name", "custom-report")
        ),
        allowed_extensions=STANDARD_EXTENSIONS,
        expected_count=2,
    )


@app.post("/upload")
async def upload_site_charge_files(
    files: list[UploadFile] = File(...),
):
    return await process_upload(
        files=files,
        report_builder=build_site_charge_report,
        download_filename="site-charge-report.xlsx",
        allowed_extensions=STANDARD_EXTENSIONS,
        expected_count=2,
    )


@app.post("/upload-three")
async def upload_three_inventory_files(
    files: list[UploadFile] = File(...),
):
    return await process_upload(
        files=files,
        report_builder=build_three_inventory_report,
        download_filename="three-inventory-report.xlsx",
        allowed_extensions=STANDARD_EXTENSIONS,
        expected_count=3,
    )


@app.post("/upload-smart-charge")
async def upload_smart_charge_files(
    files: list[UploadFile] = File(...),
):
    return await process_upload(
        files=files,
        report_builder=build_smart_charge_report,
        download_filename="smart-site-charge-report.xlsx",
        allowed_extensions=STANDARD_EXTENSIONS,
        expected_count=3,
    )


@app.post("/upload-sleep-analysis")
async def upload_sleep_analysis_files(
    files: list[UploadFile] = File(...),
):
    return await process_upload(
        files=files,
        report_builder=build_sleep_analysis_report,
        download_filename="product-sleep-analysis-report.xlsx",
        allowed_extensions=STANDARD_EXTENSIONS,
        expected_count=4,
    )






# === SALES_PERCENTAGE_INTEGRATION_V6 ===

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



@app.post("/upload-daily")
async def upload_daily_files(
    files: list[UploadFile] = File(...),
):
    return await process_upload(
        files=files,
        report_builder=build_daily_report,
        download_filename="daily-load-report.xlsx",
        allowed_extensions=DAILY_REPORT_EXTENSIONS,
        minimum_count=1,
        maximum_count=100,
    )


@app.post("/upload-orders")
async def upload_order_files(
    files: list[UploadFile] = File(...),
):
    return await process_upload(
        files=files,
        report_builder=build_order_discrepancy_report,
        download_filename="order-discrepancy-report.xlsx",
        allowed_extensions=STANDARD_EXTENSIONS,
        expected_count=2,
    )


@app.post("/upload-barcodes")
async def upload_barcode_files(
    files: list[UploadFile] = File(...),
):
    return await process_upload(
        files=files,
        report_builder=build_barcode_comparison_report,
        download_filename="barcode-comparison-report.xlsx",
        allowed_extensions=STANDARD_EXTENSIONS,
        expected_count=3,
    )


@app.post("/upload-sep")
async def upload_sep_files(
    files: list[UploadFile] = File(...),
):
    return await process_upload(
        files=files,
        report_builder=build_sep_comparison_report,
        download_filename="sep-comparison-report.xlsx",
        allowed_extensions=STANDARD_EXTENSIONS,
        expected_count=2,
    )


@app.post("/upload-prices")
async def upload_price_files(
    files: list[UploadFile] = File(...),
):
    return await process_upload(
        files=files,
        report_builder=build_price_comparison_report,
        download_filename="product-price-review-report.xlsx",
        allowed_extensions=STANDARD_EXTENSIONS,
        expected_count=2,
    )


@app.post("/upload-definition-dates")
async def upload_definition_date_files(
    files: list[UploadFile] = File(...),
):
    return await process_upload(
        files=files,
        report_builder=build_definition_date_report,
        download_filename="definition-date-report.xlsx",
        allowed_extensions=STANDARD_EXTENSIONS,
        expected_count=3,
    )
