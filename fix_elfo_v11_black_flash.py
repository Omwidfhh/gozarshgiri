#!/usr/bin/env python3
from __future__ import annotations
import re
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

OLD_FUNC = r'''  function setSpritePair(frameA, frameB, blend) {
    sheetA.style.transform=frameTransform(frameA);
    sheetB.style.transform=frameTransform(frameB);
    const b=clamp(blend,0,1);
    sheetA.style.opacity=String(1-b);
    sheetB.style.opacity=String(b);
  }'''

NEW_FUNC = r'''  function setSpritePair(frameA, frameB, blend) {
    sheetA.style.transform=frameTransform(frameA);
    sheetB.style.transform=frameTransform(frameB);
    const b=clamp(blend,0,1);

    // Coverage-preserving crossfade:
    // one sprite is always fully opaque, so the character can never dim/flash black.
    if (b <= .5) {
      sheetA.style.opacity='1';
      sheetB.style.opacity=String(b * 2);
    } else {
      sheetA.style.opacity=String((1 - b) * 2);
      sheetB.style.opacity='1';
    }
  }'''

CSS_EXTRA = r'''

/* V11.1 black-flash compositor fix */
.elfo-v3-sheet,
.elfo-v11-sheet-b {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: flat;
}
.elfo-v3-frame-window {
  isolation: isolate;
  background: transparent !important;
}
'''


def fail(msg: str, code: int = 1) -> None:
    print(f'ERROR: {msg}')
    raise SystemExit(code)


def main() -> None:
    root = Path.cwd()
    frontend = root / 'frontend'
    if not frontend.is_dir():
        fail('این فایل را داخل ریشه پروژه اجرا کن؛ پوشه frontend پیدا نشد.')

    js_path = frontend / 'elfo-intro-v3.js'
    css_path = frontend / 'elfo-intro-v3.css'
    index_path = frontend / 'index.html'
    for p in (js_path, css_path, index_path):
        if not p.exists():
            fail(f'فایل مورد نیاز پیدا نشد: {p}')

    js = js_path.read_text(encoding='utf-8')
    if OLD_FUNC not in js:
        # Flexible fallback for spacing differences.
        pattern = re.compile(
            r"  function setSpritePair\(frameA, frameB, blend\) \{\s*"
            r"sheetA\.style\.transform=frameTransform\(frameA\);\s*"
            r"sheetB\.style\.transform=frameTransform\(frameB\);\s*"
            r"const b=clamp\(blend,0,1\);\s*"
            r"sheetA\.style\.opacity=String\(1-b\);\s*"
            r"sheetB\.style\.opacity=String\(b\);\s*"
            r"\}", re.M
        )
        m = pattern.search(js)
        if not m:
            fail('تابع crossfade نسخه V11 پیدا نشد. اول V11 را نصب کن یا فایل پروژه فعلی را بفرست.')
        js = js[:m.start()] + NEW_FUNC + js[m.end():]
    else:
        js = js.replace(OLD_FUNC, NEW_FUNC, 1)

    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = root / f'_backup_elfo_blackflash_{stamp}'
    backup_dir.mkdir(parents=True, exist_ok=True)
    for p in (js_path, css_path, index_path):
        shutil.copy2(p, backup_dir / p.name)

    js_path.write_text(js, encoding='utf-8', newline='\n')

    css = css_path.read_text(encoding='utf-8')
    if 'V11.1 black-flash compositor fix' not in css:
        css = css.rstrip() + CSS_EXTRA + '\n'
        css_path.write_text(css, encoding='utf-8', newline='\n')

    index = index_path.read_text(encoding='utf-8')
    index = re.sub(r'(/static/elfo-intro-v3\.css\?v=)([^"\']+)', r'\g<1>11_1', index)
    index = re.sub(r'(/static/elfo-intro-v3\.js\?v=)([^"\']+)', r'\g<1>11_1', index)
    index_path.write_text(index, encoding='utf-8', newline='\n')

    try:
        result = subprocess.run(['node', '--check', str(js_path)], capture_output=True, text=True)
        if result.returncode != 0:
            fail('JS بعد از اصلاح syntax error دارد:\n' + result.stderr)
    except FileNotFoundError:
        print('NOTE: node پیدا نشد؛ syntax check انجام نشد.')

    print('DONE: black/dark millisecond flash fixed.')
    print('500 walk / 200 jump / 500 zipper virtual states are unchanged.')
    print(f'Backup: {backup_dir}')


if __name__ == '__main__':
    main()
