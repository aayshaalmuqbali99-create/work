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

## الطريقة أ: Vercel (كل شيء من داخل Vercel)

1. **ربط المشروع:** Vercel ← **Add New… ← Project** ← بجانب مستودع `work` اضغط **Import**.
   - في صفحة الإعداد افتح **Environment Variables** وأضف:
     - `ADMIN_EMAIL` = بريدك
     - `ADMIN_PASSWORD` = كلمة مرور قوية (12 حرفاً أو أكثر)
   - اضغط **Deploy**. ستفشل المحاولة الأولى (باللون الأحمر) لأنه لا توجد قاعدة بيانات بعد — هذا طبيعي.
2. **قاعدة البيانات:** في صفحة المشروع ← تبويب **Storage** ← **Create Database** ← اختر **Neon** ← **Continue** ←
   اقبل الخطة المجانية ← **Create** ← تأكد أن المشروع `work` محدد ← **Connect**.
   (هذا يضيف `DATABASE_URL` و `DATABASE_URL_UNPOOLED` تلقائياً.)
3. **إعادة النشر:** تبويب **Deployments** ← على آخر محاولة اضغط **⋯ ← Redeploy**.
   يُنشئ الجداول ويحمّل الأجهزة وحساب المسؤول تلقائياً (آمن للتكرار)، ثم يظهر رابط الموقع.
4. **أول دخول:** `https://<الرابط>/ar/admin` بالبريد وكلمة المرور من الخطوة 1، ثم غيّر كلمة المرور من «حسابي».
5. **رفع الصور وملفات 3D (لاحقاً):** Vercel لا يحفظ الملفات المرفوعة على قرصه. أنشئ bucket في Cloudflare R2
   وأضف المتغيرات `S3_BUCKET`, `S3_REGION=auto`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` ثم أعد النشر.
   عرض الموقع وتعديل البيانات يعمل بدونها؛ فقط الرفع يحتاجها.
6. **الدومين (اختياري):** Settings ← Domains. ثم أضف `SITE_URL` بعنوان موقعك وأعد النشر.

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
