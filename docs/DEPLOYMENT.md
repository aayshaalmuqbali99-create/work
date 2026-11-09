# دليل نشر منصة لاب سوق على الإنترنت

المنصة جاهزة للنشر بطريقتين. اختر طريقة واحدة.

| | **الطريقة أ: Vercel + قاعدة بيانات سحابية** | **الطريقة ب: سيرفر خاص (VPS) بـ Docker** |
|---|---|---|
| مناسبة لـ | البداية السريعة بدون إدارة سيرفر | تحكم كامل، أو استضافة داخل عُمان/الخليج |
| التكلفة التقريبية | تبدأ مجاناً (خطط مجانية) ثم حسب الاستخدام | سعر السيرفر الشهري (عادةً 5–20 دولار) |
| من يدير السيرفر | Vercel | أنت (التحديثات، النسخ الاحتياطي) |
| HTTPS | تلقائي | تلقائي عبر Caddy |
| تخزين الصور وملفات 3D | **لازم** تخزين سحابي (Cloudflare R2 أو S3) | على قرص السيرفر (أو سحابي اختيارياً) |

> كل الإعدادات السرية (كلمات المرور والمفاتيح) تُكتب في إعدادات الاستضافة فقط، ولا تُرفع إلى GitHub أبداً.

---

## الطريقة أ: Vercel + Neon (قاعدة بيانات) + Cloudflare R2 (ملفات)

### 1) قاعدة البيانات — Neon
1. أنشئ حساباً في neon.tech ثم مشروعاً جديداً (اختر أقرب منطقة، مثل Frankfurt).
2. انسخ رابطين من صفحة الاتصال:
   - **Pooled connection** ← سيكون `DATABASE_URL`
   - **Direct connection** ← سيكون `DIRECT_URL`

### 2) تخزين الملفات — Cloudflare R2
1. في لوحة Cloudflare: R2 ← Create bucket (مثلاً `labsouq-media`).
2. R2 ← Manage API tokens ← Create token بصلاحية **Object Read & Write** على هذا الـ bucket.
3. احتفظ بـ: Access Key ID، Secret Access Key، و endpoint بالشكل `https://<account-id>.r2.cloudflarestorage.com`.
   (لا حاجة لجعل الـ bucket عاماً: المنصة تعرض الملفات عبر `/media/...`.)

### 3) Vercel
1. في vercel.com: Add New ← Project ← اختر مستودع GitHub `work` والفرع المطلوب.
2. **Build Command**: `npm run vercel-build` (ينشئ الجداول، ويحمّل الأجهزة وحساب المسؤول الأول، ثم يبني الموقع. التحميل آمن للتكرار ولا يكرر البيانات ولا يمسح تعديلاتك).
3. **Environment Variables** — أضف:

| المتغير | القيمة |
|---|---|
| `DATABASE_URL` | رابط Neon (Pooled) |
| `DIRECT_URL` | رابط Neon (Direct) |
| `SITE_URL` | عنوان موقعك، مثل `https://labsouq.om` |
| `ADMIN_EMAIL` | بريد حساب المسؤول الأول |
| `ADMIN_PASSWORD` | كلمة مرور قوية (12 حرفاً أو أكثر) — تُستخدم فقط لإنشاء الحساب أول مرة |
| `S3_BUCKET` | `labsouq-media` |
| `S3_REGION` | `auto` |
| `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` | من R2 |
| `S3_SECRET_ACCESS_KEY` | من R2 |

4. اضغط Deploy.

### 4) أول دخول
البيانات وحساب المسؤول تُحمَّل تلقائياً أثناء النشر. افتح `https://<موقعك>/ar/admin` وسجّل الدخول بـ `ADMIN_EMAIL` و `ADMIN_PASSWORD`.
**غيّر كلمة المرور من «حسابي» بعد أول دخول.**

### 5) الدومين
Vercel ← Project ← Settings ← Domains ← أضف الدومين (مثل `labsouq.om`) واتبع تعليمات DNS. ثم حدّث `SITE_URL` وأعد النشر.

---

## الطريقة ب: سيرفر خاص (Ubuntu) بـ Docker

يحتاج: سيرفر Ubuntu 22.04+ بذاكرة 2GB على الأقل، ودومين يشير إلى عنوان IP الخاص بالسيرفر.

```bash
# 1) تثبيت Docker
curl -fsSL https://get.docker.com | sh

# 2) تنزيل المشروع
git clone <رابط المستودع> labsouq && cd labsouq

# 3) الإعدادات
cp .env.example .env
nano .env     # املأ: POSTGRES_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD, DOMAIN, SITE_URL

# 4) البناء ثم إنشاء الجداول وتحميل البيانات (آمن للتكرار)
docker compose build
docker compose run --rm setup

# 5) التشغيل
docker compose up -d
```
- الموقع يعمل على `https://<DOMAIN>` مع شهادة HTTPS تلقائية.
- فحص الحالة: `curl https://<DOMAIN>/api/health` ← `{"status":"ok"}`
- الصور وملفات 3D تُحفظ في Docker volume اسمه `uploads`.

### التحديث إلى نسخة جديدة
```bash
git pull
docker compose build
docker compose run --rm setup   # يطبّق أي تغييرات على قاعدة البيانات
docker compose up -d
```

### النسخ الاحتياطي (يومياً مثلاً)
```bash
docker compose exec -T db pg_dump -U labsouq -Fc labsouq > labsouq-$(date +%F).dump
docker run --rm -v labsouq_uploads:/data -v "$PWD":/backup alpine tar czf /backup/uploads-$(date +%F).tgz -C /data .
```
الاسترجاع:
```bash
docker compose exec -T db pg_restore -U labsouq -d labsouq --clean --if-exists < labsouq-YYYY-MM-DD.dump
```

---

## بعد النشر — قائمة تحقق
- [ ] `/<ar|en>` تفتح، و `/api/health` يرجع `ok`.
- [ ] تسجيل الدخول إلى `/ar/admin` يعمل، وتم تغيير كلمة المرور.
- [ ] رفع صورة تجريبية لجهاز يعمل ويظهر في الموقع.
- [ ] `/sitemap.xml` و `/robots.txt` يظهران بعنوان الموقع الصحيح.
- [ ] جدولة النسخ الاحتياطي لقاعدة البيانات والملفات.
