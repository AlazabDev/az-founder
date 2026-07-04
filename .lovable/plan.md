# خطة: AI Gateway إنتاجي + مخازن سحابية

## 1) الأسرار المطلوبة (Supabase Secrets)

Azure OpenAI (مباشر):
- `AZURE_OPENAI_ENDPOINT` — مثل `https://<resource>.openai.azure.com`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION` — افتراضي `2024-10-21`

Azure APIM (للتوجيه الإنتاجي):
- `AZURE_APIM_ENDPOINT` — مثل `https://<apim>.azure-api.net`
- `AZURE_APIM_SUBSCRIPTION_KEY`

Azure Content Safety (فلترة محتوى):
- `AZURE_CONTENT_SAFETY_ENDPOINT`
- `AZURE_CONTENT_SAFETY_KEY`

مخازن سحابية:
- Azure Blob: `AZURE_STORAGE_CONNECTION_STRING`
- AWS S3: عبر Lovable Connector (`AWS_S3_API_KEY`) — تشغيل من الـ Connectors panel
- Google Drive: متصل بالفعل
- Supabase Storage: bucket ينشأ داخل المشروع

## 2) قاعدة البيانات — Migration واحدة

جداول جديدة (كلها RLS مع سياسات admin/self):

- **ai_endpoints** — سجل نقاط الخدمة (Azure/OpenAI): `name`, `provider` (azure_openai/openai/lovable), `base_url`, `deployment_name`, `model`, `api_version`, `is_default`, `enabled`, `created_by`.
- **apim_policies** — سياسات APIM: `name`, `policy_type` (rate_limit/quota/content_filter/cost_cap/circuit_breaker), `config` jsonb, `enabled`, `applies_to_endpoint_id`.
- **ai_usage_logs** — كل استدعاء: `user_id`, `endpoint_id`, `model`, `prompt_tokens`, `completion_tokens`, `total_cost_usd`, `latency_ms`, `status`, `error`, `flagged` (content-safety), `request_id`.
- **ai_conversations** + **ai_messages** — محادثات الشات مع threads.
- **storage_providers** — تسجيل وتفعيل: `provider` (azure_blob/s3/gdrive/supabase), `config` jsonb (بدون أسرار)، `enabled`, `is_default`.
- **rate_limit_counters** — عداد فترة زمنية `user_id + window_start + endpoint_id + count`.

الصلاحيات: يدير الـ Endpoints و Policies و Storage Providers الـ **admin** فقط. الاستخدام والمحادثات مقيّدة بالمالك.

## 3) طبقة الخادم (TanStack Server Functions + Routes)

- `src/lib/ai-gateway.server.ts` — مُوجِّه ذكي:
  1. يختار endpoint نشط.
  2. يطبّق policies (rate-limit من `rate_limit_counters`, quota يومي, cost-cap).
  3. يمرّر عبر Azure Content Safety قبل الإرسال.
  4. يستدعي Azure APIM إذا مفعّل، وإلا Azure OpenAI مباشرة.
  5. Retry + circuit-breaker (memory-scoped).
  6. يسجّل في `ai_usage_logs`.

- `src/routes/api/chat.ts` — streaming عبر AI SDK (`streamText`) موجّه لهذه الطبقة.
- `src/lib/endpoints.functions.ts`, `src/lib/policies.functions.ts`, `src/lib/usage.functions.ts` — CRUD محمي بـ admin.
- `src/lib/storage.functions.ts` — توليد signed URLs (S3, Azure Blob SAS, Supabase) + listing.

## 4) واجهات المستخدم (تحت `_authenticated`)

- `/chat` — واجهة شات جاهزة (streaming, markdown, code blocks, نسخ، تعديل، ثريدز).
- `/ai-gateway` — لوحة تحكم: الحالة، الاستخدام، التكلفة، آخر الأخطاء، رسوم بيانية.
- `/ai-gateway/endpoints` — CRUD لـ endpoints مع اختبار الاتصال.
- `/ai-gateway/policies` — إدارة APIM policies (rate-limit/quota/content-safety/cost-cap) بواجهة form-based.
- `/ai-gateway/logs` — سجل استدعاءات مع فلترة.
- `/storage` — تبويبات لكل موفّر (Azure Blob, S3, Google Drive, Supabase). لكل تبويب: حالة الاتصال + متصفح ملفات + رفع/تنزيل.

## 5) ملاحظات إنتاجية

- Rate limiting: عبر جدول `rate_limit_counters` (نافذة زمنية 1 دقيقة/1 ساعة/1 يوم) — الحد الأدنى المقبول بدون Redis.
- Content Safety: كل رسالة تُمرَّر عبر Azure Content Safety `text:analyze`؛ ما يتخطى العتبة يُحجب ويُسجّل `flagged=true`.
- Cost tracking: نحسب من `usage` الذي يعيده Azure/OpenAI (prompt+completion tokens × سعر الموديل من جدول ثابت).
- APIM: نستخدم `Ocp-Apim-Subscription-Key` header عند التوجيه عبر APIM؛ الـ policies الحقيقية (rate-limit, jwt-validate, content-filter) تُدار في بوابة Azure نفسها — واجهتنا تعرض حالتها وتخزّن سياسات إضافية على مستوى التطبيق.

## 6) ما تحتاج فعله يدوياً بعد الموافقة

1. تجهيز مورد Azure OpenAI + deployment (مثل `gpt-4o`).
2. (اختياري لكن موصى به) تجهيز Azure APIM instance يشير للـ OpenAI backend.
3. تجهيز Azure Content Safety resource.
4. تجهيز Azure Storage Account (Blob) — سنعطيك connection string field.
5. ربط Lovable AWS S3 Connector من Connectors panel.
6. سأطلب منك الأسرار عبر add_secret بعد الموافقة.

## الترتيب

1. Migration للجداول والصلاحيات.
2. طلب الأسرار.
3. طبقة الخادم + الشات.
4. صفحات الإدارة.
5. صفحة المخازن.

هل أبدأ؟
