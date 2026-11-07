# Business Management System & BI Dashboard

> هذا README مبدئي يغطي تشغيل المرحلة الحالية فقط. التوثيق الكامل
> (SRS, API docs, User Guide) سيُضاف في مرحلة التوثيق (Phase 15).

## المتطلبات
- Node.js >= 18
- PostgreSQL >= 14 يعمل محليًا أو على سيرفر

## خطوات التشغيل

```bash
# 1. ثبّت الاعتماديات
npm install

# 2. انسخ ملف البيئة واملأ القيم الحقيقية
cp .env.example .env
# عدّل DATABASE_URL و SESSION_SECRET داخل .env

# 3. ولّد Prisma Client
npx prisma generate

# 4. أنشئ أول Migration على قاعدة بيانات PostgreSQL حقيقية
npx prisma migrate dev --name init

# 5. شغّل السيرفر في وضع التطوير
npm run dev
```

بعد التشغيل، تحقق من أن السيرفر يعمل عبر:
```
GET http://localhost:3000/api/v1/health
```

## حالة المشروع الحالية (بعد Phase 2)
- ✅ هيكل المشروع الكامل
- ✅ إعداد Express + الأمان الأساسي (helmet, cors, sessions في PostgreSQL)
- ✅ Prisma schema كامل لكل الكيانات المتفق عليها
- ⏳ المصادقة والصلاحيات → Phase 3
- ⏳ باقي الوحدات (منتجات، مبيعات، مصروفات...) → المراحل التالية
