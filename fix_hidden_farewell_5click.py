#!/usr/bin/env python3
from __future__ import annotations
import re, shutil, subprocess
from datetime import datetime
from pathlib import Path

JS_SOURCE = Path('/mnt/data/hidden-farewell-fixed-v3.js') if False else None
JS_CONTENT = '(() => {\n  \'use strict\';\n  if (window.__royalFarewellInstalled) return;\n  window.__royalFarewellInstalled = true;\n\n  const LOGO_SELECTOR = \'.brand-logo, .brand-logo img, img[alt*=\\"Royal Jeans\\"], img[src*=\\"royal-jeans-logo\\"]\';\n\n  const unlock = document.createElement(\'div\');\n  unlock.id = \'farewellUnlock\';\n  unlock.hidden = true;\n  unlock.innerHTML = `\n    <button class="farewell-unlock-close" type="button" aria-label="بستن">×</button>\n    <div class="farewell-unlock-card" role="dialog" aria-modal="true" aria-labelledby="farewellUnlockTitle">\n      <div class="farewell-unlock-mark" aria-hidden="true"></div>\n      <h2 class="farewell-unlock-title" id="farewellUnlockTitle">بخش خصوصی</h2>\n      <p class="farewell-unlock-subtitle">کد دسترسی را وارد کنید</p>\n      <form id="farewellUnlockForm" autocomplete="off">\n        <div class="farewell-code-wrap">\n          <input id="farewellCodeInput" name="code" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="8" aria-label="کد دسترسی">\n          <button id="farewellUnlockButton" type="submit">ورود</button>\n        </div>\n      </form>\n    </div>`;\n\n  const deniedToast = document.createElement(\'div\');\n  deniedToast.id = \'farewellDeniedToast\';\n  deniedToast.setAttribute(\'role\', \'status\');\n  deniedToast.setAttribute(\'aria-live\', \'polite\');\n  deniedToast.textContent = \'دسترسی ندارید\';\n\n  const scene = document.createElement(\'section\');\n  scene.id = \'farewellScene\';\n  scene.hidden = true;\n  scene.setAttribute(\'aria-label\', \'پیام خداحافظی\');\n  scene.innerHTML = `\n    <div class="farewell-stars" aria-hidden="true"></div>\n    <button class="farewell-scene-close" type="button" aria-label="بستن">×</button>\n    <div class="farewell-scene-inner">\n      <div class="farewell-scene-kicker">ROYAL JEANS · PRIVATE NOTE</div>\n      <div class="farewell-scene-rule" aria-hidden="true"></div>\n      <h2 id="farewellTitle"></h2>\n      <p id="farewellMessage"></p>\n      <div id="farewellSignature"></div>\n      <div class="farewell-scene-date" id="farewellDate"></div>\n    </div>`;\n\n  document.body.append(unlock, deniedToast, scene);\n\n  const form = unlock.querySelector(\'#farewellUnlockForm\');\n  const input = unlock.querySelector(\'#farewellCodeInput\');\n  const button = unlock.querySelector(\'#farewellUnlockButton\');\n  const unlockClose = unlock.querySelector(\'.farewell-unlock-close\');\n  const sceneClose = scene.querySelector(\'.farewell-scene-close\');\n  let taps = [];\n  let busy = false;\n  let deniedTimer = 0;\n\n  function openUnlock() {\n    unlock.hidden = false;\n    input.value = \'\';\n    requestAnimationFrame(() => input.focus());\n  }\n  function closeUnlock() {\n    unlock.hidden = true;\n    input.value = \'\';\n  }\n  function showDenied() {\n    clearTimeout(deniedTimer);\n    deniedToast.classList.remove(\'is-visible\');\n    void deniedToast.offsetWidth;\n    deniedToast.classList.add(\'is-visible\');\n    deniedTimer = setTimeout(() => deniedToast.classList.remove(\'is-visible\'), 1900);\n  }\n  function closeScene() {\n    scene.hidden = true;\n    document.documentElement.style.overflow = \'\';\n  }\n  function makeStars() {\n    const box = scene.querySelector(\'.farewell-stars\');\n    if (box.childElementCount) return;\n    for (let i = 0; i < 34; i += 1) {\n      const star = document.createElement(\'i\');\n      star.className = \'farewell-star\';\n      star.style.left = `${5 + ((i * 37) % 90)}%`;\n      star.style.top = `${7 + ((i * 53) % 84)}%`;\n      star.style.setProperty(\'--dur\', `${2.8 + (i % 7) * .45}s`);\n      star.style.setProperty(\'--delay\', `${-(i % 9) * .31}s`);\n      star.style.transform = `scale(${.65 + (i % 4) * .22})`;\n      box.appendChild(star);\n    }\n  }\n  function openScene(payload) {\n    closeUnlock();\n    scene.querySelector(\'#farewellTitle\').textContent = payload.title || \'\';\n    scene.querySelector(\'#farewellMessage\').textContent = payload.message || \'\';\n    scene.querySelector(\'#farewellSignature\').textContent = payload.signature || \'\';\n    scene.querySelector(\'#farewellDate\').textContent = payload.date || \'\';\n    makeStars();\n    scene.hidden = false;\n    document.documentElement.style.overflow = \'hidden\';\n  }\n\n  function isLogoInteraction(event) {\n    const path = typeof event.composedPath === \'function\' ? event.composedPath() : [];\n    for (const node of path) {\n      if (node && node.nodeType === 1 && typeof node.matches === \'function\' && node.matches(LOGO_SELECTOR)) return true;\n    }\n    const target = event.target;\n    return !!(target && target.nodeType === 1 && (target.matches(LOGO_SELECTOR) || target.closest?.(\'.brand-logo\')));\n  }\n\n  function registerSecretTap() {\n    const now = performance.now();\n    taps.push(now);\n    taps = taps.filter(t => now - t <= 4200);\n    if (taps.length >= 5) {\n      taps = [];\n      openUnlock();\n    }\n  }\n\n  document.querySelectorAll(\'.brand-logo, .brand-logo img\').forEach(node => {\n    node.style.cursor = \'pointer\';\n  });\n\n  document.addEventListener(\'click\', event => {\n    if (!isLogoInteraction(event)) return;\n    registerSecretTap();\n  }, true);\n\n  form.addEventListener(\'submit\', async event => {\n    event.preventDefault();\n    if (busy) return;\n    const code = input.value.trim();\n    if (!code) return;\n    busy = true;\n    button.disabled = true;\n    try {\n      const data = new FormData();\n      data.append(\'code\', code);\n      const response = await fetch(\'/farewell/unlock\', { method: \'POST\', body: data });\n      if (!response.ok) throw new Error(\'denied\');\n      const payload = await response.json();\n      if (!payload || payload.ok !== true) throw new Error(\'denied\');\n      openScene(payload);\n    } catch (_) {\n      closeUnlock();\n      showDenied();\n    } finally {\n      busy = false;\n      button.disabled = false;\n    }\n  });\n\n  unlockClose.addEventListener(\'click\', closeUnlock);\n  sceneClose.addEventListener(\'click\', closeScene);\n  unlock.addEventListener(\'click\', event => {\n    if (event.target === unlock) closeUnlock();\n  });\n  document.addEventListener(\'keydown\', event => {\n    if (event.key !== \'Escape\') return;\n    if (!unlock.hidden) closeUnlock();\n    else if (!scene.hidden) closeScene();\n  });\n})();\n'

def fail(msg):
    print('ERROR:', msg)
    raise SystemExit(1)

def main():
    root = Path.cwd()
    frontend = root / 'frontend'
    index_path = frontend / 'index.html'
    js_path = frontend / 'hidden-farewell.js'
    css_path = frontend / 'hidden-farewell.css'
    if not frontend.is_dir() or not index_path.exists():
        fail('این فایل را داخل ریشه پروژه اجرا کن؛ پوشه frontend پیدا نشد.')
    if not css_path.exists():
        fail('بخش خداحافظی نصب نشده؛ اول install_hidden_farewell_fixed.py را اجرا کن.')

    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup = root / f'_backup_farewell_5click_fix_{stamp}'
    backup.mkdir(parents=True, exist_ok=True)
    for p in (index_path, js_path):
        if p.exists(): shutil.copy2(p, backup / p.name)

    js_path.write_text(JS_CONTENT, encoding='utf-8', newline='\n')

    index = index_path.read_text(encoding='utf-8')
    if '/static/hidden-farewell.js' in index:
        index = re.sub(r'(/static/hidden-farewell\.js\?v=)([^"\']+)', r'\g<1>3', index)
        index = re.sub(r'(/static/hidden-farewell\.css\?v=)([^"\']+)', r'\g<1>3', index)
    else:
        index = index.replace('</body>', '    <script src="/static/hidden-farewell.js?v=3"></script>\n</body>', 1)
    index_path.write_text(index, encoding='utf-8', newline='\n')

    try:
        check = subprocess.run(['node','--check',str(js_path)], capture_output=True, text=True)
        if check.returncode:
            fail('JavaScript syntax error:\n'+check.stderr)
    except FileNotFoundError:
        pass

    print('DONE ✅ فیکس ۵ کلیک روی لوگو اعمال شد.')
    print('حالا کلیک روی خود لوگو یا هر بخش داخل قاب لوگو حساب می‌شود.')
    print('۵ کلیک تا حداکثر ۴.۲ ثانیه فرصت دارد.')
    print('Cache version به v=3 تغییر کرد.')
    print('Backup:', backup)

if __name__ == '__main__':
    main()
