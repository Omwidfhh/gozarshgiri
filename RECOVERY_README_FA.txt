ROYAL REPORT TOOLS - FULL RECOVERY PACKAGE
==========================================

این پوشه نسخه بازیابی‌شده کامل پروژه است و شامل این موارد است:
- backend کامل FastAPI
- frontend کامل
- گزارش درصد فروش محصولات با آخرین تغییرات:
  * فقط ردیف‌های مشترک بارکد / مشخصات فنی باقی می‌مانند
  * محاسبه درصد فروش = تعداد فروش / موجودی اولیه * 100
  * خروجی درصد به صورت عدد صحیح بدون %
  * خروجی اکسل با فونت Peyda، بدنه سفید، هدر خاکستری و موارد مشترک قرمز
- دکمه 08: خواب کالا
- دکمه 10: درصد فروش محصولات
- Intro جین و زیپ با Elfo V3 و فایل‌های تصویری لازم
- RoyalReportTools.spec برای ساخت نسخه ویندوز
- GitHub Actions برای ساخت خروجی ویندوز

اجرای داخل Codespaces/Linux:
  cd backend
  python -m uvicorn api:app --host 0.0.0.0 --port 8000

اگر محیط مجازی داری:
  source .venv/bin/activate
  cd backend
  uvicorn api:app --host 0.0.0.0 --port 8000

ساخت محیط جدید:
  python -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt

ساخت ویندوز از GitHub:
  پروژه را Push کن.
  سپس Actions > BUILD CURRENT ROYAL REPORT TOOLS را اجرا کن.

پوشه _recovery_tools فقط برای بازیابی/نصب مجدد قابلیت‌هاست؛ برای اجرای عادی برنامه لازم نیست.
