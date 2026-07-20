# خطة تنفيذ نظام المتاجر لسوقلي (Stores System)

الهدف: إضافة نظام متاجر متكامل للشركات فوق البنية الحالية دون كسر أي صفحة أو ميزة. سنعتمد على جداول `companies` و`listings` و`wholesale_orders` و`wallets` و`notifications` الحالية، ونضيف فقط ما ينقص.

## 1) نتيجة الـAudit السريع

- لا يوجد أي جدول `stores*` حاليًا → النظام سيُبنى من الصفر لكن معتمدًا على `companies` (كل شركة = مالك محتمل لمتجر).
- `listings` يحتوي بالفعل على المنتجات وربطها بـ`company_id` → لن نكرر جدول منتجات.
- `wholesale_orders` + `payment_proofs` + `wallets` = دورة الطلب والدفع الحالية → سنضيف حقول متجر وكوبون بدلًا من نظام موازٍ.
- `notifications` و`favorites` و`reviews` موجودة → سنُعيد استخدامها.
- الرفع عبر Supabase Storage bucket `listing-media` موجود بمكون `ImageUploader` → نعيد استخدامه لصور المتجر والبانر واللوجو.

## 2) الـMigrations الجديدة (SQL واحد، إضافي فقط)

جداول جديدة:
- `stores` (owner_id, company_id, slug UNIQUE, name_ar/en, description, logo_url, banner_url, colors JSONB, city, governorate, shipping_policy, return_policy, socials JSONB, business_hours JSONB, status enum draft|pending_review|published|suspended|rejected, is_featured, is_verified, followers_count, products_count, review_avg)
- `store_categories` (store_id, name, slug, sort_order)
- `store_coupons` (store_id, code, type percent|fixed, value, min_order, max_discount, starts_at, ends_at, usage_limit_total, usage_limit_per_user, active, applies_to JSONB)
- `store_coupon_usage` (coupon_id, user_id, order_id)
- `store_followers` (store_id, user_id)
- `store_reviews` (store_id, user_id, order_id, rating, body, seller_reply, status)
- `store_staff` (store_id, user_id, role, permissions JSONB)

توسعة الجداول القائمة (إضافة أعمدة فقط، Nullable):
- `listings`: `store_id uuid`, `store_category_id uuid`, `visible_in_marketplace bool default true`, `visible_in_store bool default true`, `sale_price numeric`, `sku text`, `weight_grams int`, `dimensions jsonb`, `variants jsonb`
- `wholesale_orders`: `store_id uuid`, `coupon_code text`, `discount_amount numeric default 0`, `subtotal numeric`, `shipping_amount numeric default 0`, `idempotency_key text`

كل الجداول: GRANTs + RLS + Policies + Triggers `updated_at`. المتجر لا يظهر للعامة (`SELECT TO anon`) إلا حيث `status='published'`.

## 3) الصفحات والمسارات الجديدة

عامة:
- `/stores` — قائمة المتاجر المنشورة (SSR + ranking).
- `/stores/$slug` — صفحة المتجر (بانر/لوجو/أقسام/منتجات/تقييمات/سياسة/متابعة/مشاركة + SEO + JSON-LD).

Wizard وإدارة (تحت `_authenticated`):
- `/store/open` — Wizard إنشاء المتجر (اسم/slug/نشاط/محافظة/لوجو/بانر/سياسات/معاينة/إرسال للمراجعة).
- `/store` — Dashboard المتجر (Overview).
- `/store/products` — قائمة منتجات المتجر + إضافة/تعديل باستخدام تدفق `listings` الحالي مع `store_id`.
- `/store/categories` — أقسام المتجر.
- `/store/orders` — طلبات المتجر (من `wholesale_orders`).
- `/store/coupons` — الكوبونات.
- `/store/analytics` — تحليلات من البيانات الفعلية.
- `/store/settings` — إعدادات + شحن + دفع + معاينة.
- `/store/reviews` — التقييمات والردود.

Admin:
- `/_authenticated/admin-stores` — قائمة/مراجعة/توثيق/إيقاف.

## 4) Server Functions (createServerFn, باستخدام requireSupabaseAuth)

`src/lib/stores.functions.ts`:
- `createStore`, `updateStore`, `submitStoreForReview`, `getMyStore`
- `listPublicStores`, `getStoreBySlug`
- `followStore`, `unfollowStore`
- `listStoreOrders`, `listStoreProducts`, `getStoreAnalytics`

`src/lib/store-coupons.functions.ts`:
- `createCoupon`, `updateCoupon`, `deleteCoupon`, `listCoupons`
- `validateCoupon({code, store_id, subtotal, items})` → يرجع خصمًا محسوبًا على السيرفر.

`src/lib/store-admin.functions.ts`:
- `adminListStores`, `adminApproveStore`, `adminRejectStore`, `adminSuspendStore`, `adminVerifyStore`, `adminFeatureStore`.

Checkout (تحديث `src/lib/orders.functions.ts` بلا حذف):
- إعادة حساب `subtotal/discount/shipping/total` على السيرفر من `listings.price` الفعلي.
- تطبيق الكوبون والتحقق من (min_order, usage_limit, per_user, active, dates, applies_to, store match).
- تجميع الطلبات لكل `store_id` منفصلًا.
- Idempotency Key لمنع التكرار.
- تسجيل `store_coupon_usage` بعد نجاح إنشاء الطلب.

## 5) رفع الصور

إعادة استخدام `ImageUploader` مع مجلدات:
- `stores/{store_id}/logo`, `stores/{store_id}/banner`, `stores/{store_id}/gallery`
- Storage RLS يضمن ownership.

## 6) الأمان

- كل mutation على السيرفر يتحقق من `owner_id = auth.uid()` أو `has_role(admin)`.
- Zod validation لكل input.
- منع تعديل السعر/الشركة من العميل (Triggers `protect_*` مماثلة لما هو موجود).
- Policy جديدة على `listings`: النشر يتطلب `store.status='published'` عند وجود `store_id`.

## 7) الاختبارات النهائية

- `bunx tsgo --noEmit` نظيف.
- Build نظيف.
- Playwright E2E: فتح متجر → اعتماد Admin → إضافة منتج → إضافة للسلة → كوبون → طلب → دفع → تحديث الحالة.

## 8) ما لن يُغيَّر

- لن تُلمس `client.ts`, `types.ts`, `auth-middleware.ts`, أي Migration قديمة.
- لن تُحذف صفحات `orders`, `checkout`, `cart`, `dashboard`, `admin-*` الحالية.
- كل تعديل على ملف حالي = إضافة حقول أو خيار جديد فقط.

## 9) الترتيب التنفيذي

1. Migration واحد إضافي (جداول + أعمدة + RLS + GRANT + Triggers).
2. Server functions (stores, coupons, admin, checkout patch).
3. Wizard `/store/open` + Dashboard `/store`.
4. صفحة المتجر العامة `/stores/$slug` + قائمة `/stores`.
5. لوحة Admin `/admin-stores`.
6. Patch لـ Checkout + Cart لدعم `store_id` والكوبون.
7. تحليلات وتقييمات ومتابعة.
8. Typecheck + Build + Smoke tests + تقرير نهائي.

## 10) ملاحظات

- الحجم: ~15–20 ملف جديد + migration واحد + تعديلات جراحية على 4–6 ملفات قائمة.
- لا نضيف بوابة دفع جديدة. نستخدم `payment_methods` و`payment_proofs` الحاليتين، وندعم الربط الخارجي لاحقًا عبر Webhook route جاهزة البنية.
- سأنفذ على Branch `stores-system` وأفتح PR بعد نجاح البناء والاختبار.

بمجرد الموافقة على هذه الخطة سأبدأ فورًا بالـMigration ثم باقي المراحل بلا توقف.