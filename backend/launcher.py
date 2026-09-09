import ctypes
import multiprocessing
import os
import socket
import subprocess
import threading
import time
from pathlib import Path

import uvicorn

from api import app


APP_TITLE = "Royal Jeans Report Tools"
HOST = "127.0.0.1"
PREFERRED_PORT = 8000
STARTUP_TIMEOUT_SECONDS = 30


def get_app_data_directory():
    local_app_data = os.environ.get("LOCALAPPDATA")
    app_data = os.environ.get("APPDATA")

    if local_app_data:
        base_directory = Path(local_app_data)
    elif app_data:
        base_directory = Path(app_data)
    else:
        base_directory = Path.home() / "AppData" / "Local"

    app_directory = base_directory / "RoyalReportTools"
    app_directory.mkdir(
        parents=True,
        exist_ok=True,
    )
    return app_directory


def show_error(message):
    try:
        ctypes.windll.user32.MessageBoxW(
            None,
            str(message),
            APP_TITLE,
            0x10,
        )
    except Exception:
        pass


def port_is_available(port):
    with socket.socket(
        socket.AF_INET,
        socket.SOCK_STREAM,
    ) as test_socket:
        try:
            test_socket.bind((HOST, port))
            return True
        except OSError:
            return False


def find_available_port():
    if port_is_available(PREFERRED_PORT):
        return PREFERRED_PORT

    with socket.socket(
        socket.AF_INET,
        socket.SOCK_STREAM,
    ) as test_socket:
        test_socket.bind((HOST, 0))
        return test_socket.getsockname()[1]


def wait_for_server(
    port,
    server_thread,
    server_errors,
):
    deadline = time.monotonic() + STARTUP_TIMEOUT_SECONDS

    while time.monotonic() < deadline:
        if server_errors or not server_thread.is_alive():
            return False

        try:
            with socket.create_connection(
                (HOST, port),
                timeout=0.5,
            ):
                return True
        except OSError:
            time.sleep(0.25)

    return False


def create_server(port):
    config = uvicorn.Config(
        app=app,
        host=HOST,
        port=port,
        loop="asyncio",
        http="h11",
        ws="none",
        lifespan="off",
        log_level="critical",
        log_config=None,
        access_log=False,
    )
    server = uvicorn.Server(config)
    server.install_signal_handlers = lambda: None
    return server


def run_server(server, server_errors):
    try:
        server.run()
    except BaseException as error:
        server_errors.append(error)


def browser_candidates():
    program_files = os.environ.get("PROGRAMFILES")
    program_files_x86 = os.environ.get("PROGRAMFILES(X86)")
    local_app_data = os.environ.get("LOCALAPPDATA")

    candidates = []

    for root in (
        program_files,
        program_files_x86,
        local_app_data,
    ):
        if root:
            candidates.append(
                (
                    "Google Chrome",
                    Path(root)
                    / "Google"
                    / "Chrome"
                    / "Application"
                    / "chrome.exe",
                )
            )

    for root in (
        program_files,
        program_files_x86,
    ):
        if root:
            candidates.append(
                (
                    "Microsoft Edge",
                    Path(root)
                    / "Microsoft"
                    / "Edge"
                    / "Application"
                    / "msedge.exe",
                )
            )

    return candidates


def find_browser():
    checked_paths = set()

    for browser_name, browser_path in browser_candidates():
        normalized_path = str(browser_path).lower()

        if normalized_path in checked_paths:
            continue

        checked_paths.add(normalized_path)

        if browser_path.is_file():
            return browser_name, browser_path

    return None, None


def open_dashboard(
    browser_path,
    dashboard_url,
    profile_directory,
):
    creation_flags = getattr(
        subprocess,
        "CREATE_NO_WINDOW",
        0,
    )

    command = [
        str(browser_path),
        f"--app={dashboard_url}",
        f"--user-data-dir={profile_directory}",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-mode",
        "--disable-component-update",
        "--disable-sync",
        "--start-maximized",
    ]

    return subprocess.Popen(
        command,
        creationflags=creation_flags,
    )


def main():
    multiprocessing.freeze_support()

    browser_name, browser_path = find_browser()

    if browser_path is None:
        show_error(
            "برای اجرای برنامه باید Google Chrome یا "
            "Microsoft Edge روی ویندوز نصب باشد."
        )
        return

    port = find_available_port()
    dashboard_url = f"http://{HOST}:{port}/"
    server = create_server(port)
    server_errors = []
    browser_process = None
    profile_directory = (
        get_app_data_directory()
        / "BrowserProfile"
    )
    profile_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    server_thread = threading.Thread(
        target=run_server,
        args=(server, server_errors),
        name="royal-report-server",
        daemon=True,
    )
    server_thread.start()

    if not wait_for_server(
        port=port,
        server_thread=server_thread,
        server_errors=server_errors,
    ):
        server.should_exit = True
        server_thread.join(timeout=5)
        if server_errors:
            error = server_errors[0]
            show_error(
                "سرور داخلی برنامه اجرا نشد.\n\n"
                f"جزئیات خطا:\n{type(error).__name__}: {error}"
            )
        else:
            show_error(
                "برنامه نتوانست سرور محلی را اجرا کند. "
                "لطفاً برنامه را ببندید و دوباره اجرا کنید."
            )
        return

    try:
        browser_process = open_dashboard(
            browser_path=browser_path,
            dashboard_url=dashboard_url,
            profile_directory=profile_directory,
        )
        browser_process.wait()

    except Exception as error:
        show_error(
            f"برنامه با {browser_name} باز نشد.\n\n"
            f"جزئیات خطا:\n{error}"
        )

    finally:
        server.should_exit = True
        server_thread.join(timeout=5)

        if (
            browser_process is not None
            and browser_process.poll() is None
        ):
            browser_process.terminate()



if __name__ == "__main__":
    main()
