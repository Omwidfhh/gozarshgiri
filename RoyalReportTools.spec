from pathlib import Path

from PyInstaller.utils.hooks import collect_all


PROJECT_ROOT = Path(SPECPATH)
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
APP_ICON = FRONTEND_DIR / "royal-jeans-app-icon.ico"


calamine_datas, calamine_binaries, calamine_hiddenimports = (
    collect_all("python_calamine")
)


datas = [
    (
        str(FRONTEND_DIR),
        "frontend",
    ),
    *calamine_datas,
]


binaries = [
    *calamine_binaries,
]


hiddenimports = [
    *calamine_hiddenimports,
    "uvicorn.logging",
    "uvicorn.loops.auto",
    "uvicorn.loops.asyncio",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.protocols.websockets.websockets_impl",
    "uvicorn.lifespan.on",
    "multipart",
    "python_multipart",
]


analysis = Analysis(
    [
        str(BACKEND_DIR / "launcher.py"),
    ],
    pathex=[
        str(BACKEND_DIR),
    ],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)


python_archive = PYZ(
    analysis.pure
)


executable = EXE(
    python_archive,
    analysis.scripts,
    [],
    exclude_binaries=True,
    name="RoyalReportTools",
    icon=str(APP_ICON),
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)


application = COLLECT(
    executable,
    analysis.binaries,
    analysis.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name="RoyalReportTools",
)
