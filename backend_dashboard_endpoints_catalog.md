# دليل واجهات برمجية لتغذية لوحة التحكم

هذا الدليل يوضح نقاط النهاية المطلوبة لتغذية جميع عناصر لوحة التحكم (البطاقات الإحصائية، الرسوم البيانية، قوائم المعاملات والحلقات القادمة). كل الاستجابات بصيغة JSON ويُفضل توثيقها في Swagger.

## 1) نظرة عامة ولوحة الإحصاءات
- **الطريقة**: `GET`
- **المسار المقترح**: `/api/dashboard/overview`
- **وسائط اختيارية للاستعلام**
  - `range`: نطاق زمني مثل `monthly` | `last30d` | تاريخين ISO (مثال: `range=2024-01-01,2024-01-31`).
  - `role`: اختياري للتجريب فقط، في الإنتاج يعتمد على هوية المستخدم (JWT).
- **الاستجابة المتوقعة**:
  ```json
  {
    "isSuccess": true,
    "data": {
      "role": "admin",
      "rangeLabel": "آخر 30 يومًا",
      "rangeStart": "2024-05-01",
      "rangeEnd": "2024-05-30",
      "metrics": {
        "earnings": 120000,
        "earningsCurrencyCode": "SAR",
        "earningsPercentChange": 5.2,
        "newStudents": 48,
        "newStudentsPercentChange": -2.1,
        "circleReports": 320,
        "circleReportsPercentChange": 1.6,
        "netIncome": 87000,
        "netIncomeCurrencyCode": "SAR",
        "netIncomePercentChange": 3.5,

        "branchManagersCount": 6,
        "supervisorsCount": 18,
        "teachersCount": 75,
        "studentsCount": 1085,
        "circlesCount": 113,
        "reportsCount": 1240,

        "outgoing": 25000,
        "outgoingCurrencyCode": "SAR",
        "incomingEgp": 150000,
        "incomingEgpCurrencyCode": "EGP",
        "incomingSar": 98000,
        "incomingSarCurrencyCode": "SAR",
        "incomingUsd": 12000,
        "incomingUsdCurrencyCode": "USD",
        "netProfit": 83000,
        "netProfitCurrencyCode": "SAR",
        "currencyCode": "SAR"
      },
      "charts": {
        "monthlyRevenue": [
          { "month": "Jan", "earnings": 11000, "netIncome": 8400, "reports": 120 },
          { "month": "Feb", "earnings": 13000, "netIncome": 9100, "reports": 133 }
        ],
        "transactions": [
          { "id": 1, "student": "أحمد محمد", "amount": 350, "currency": "SAR", "date": "2024-05-20", "status": "completed" },
          { "id": 2, "student": "سارة علي", "amount": 500, "currency": "SAR", "date": "2024-05-18", "status": "pending" }
        ]
      }
    },
    "errors": []
  }
  ```
- **ملاحظات ربط بالواجهة**
  - مفاتيح `earnings`, `newStudents`, `circleReports`, `netIncome` تغذي بطاقات الملخص العلوية مع نسب التغير إن وُجدت.
  - مفاتيح العدّ (`branchManagersCount` ... `reportsCount`) تغذي بطاقات "إحصائيات الأدوار".
  - المفاتيح المالية (`outgoing`, `incomingEgp`...) تغذي بطاقات "المعاملات المالية" والرسم البياني الدائري/العمودي.
  - `charts.monthlyRevenue` يستخدم للمخطط الخطي الشهري، ويُعتبر الحقل موجودًا إذا كانت هناك قيمة واحدة على الأقل غير صفرية.
  - `charts.transactions` تغذي جدول "المعاملات الأخيرة". الحقول المطلوبة: `student`, `amount`, `currency`, `date`, `status` (`completed|pending|failed`).

## 2) الحلقات القادمة
- **الطريقة**: `GET`
- **المسار المقترح**: `/api/dashboard/upcoming-circles`
- **الوسائط** (اختيارية):
  - `limit`: عدد السجلات المطلوب (افتراضي 5).
- **الاستجابة المتوقعة**:
  ```json
  {
    "isSuccess": true,
    "data": [
      {
        "id": 101,
        "name": "حلقة نور البيان",
        "day": "monday",
        "startTime": "14:00",
        "endTime": "16:00",
        "managers": ["محمد سعيد", "ليلى أحمد"],
        "teacher": "خالد يوسف"
      }
    ],
    "errors": []
  }
  ```
- **الملاحظات**: قيم `day` يجب أن تطابق القيم المعتمدة في الواجهة (`saturday|sunday|...`)، و`startTime/endTime` بصيغة 24 ساعة `HH:mm`.

## 3) معالجات الأخطاء
- في حالة فشل الطلب يجب أن تعاد بنية: `{ "isSuccess": false, "errors": [{ "message": "سبب الفشل" }] }`.
- يمكن ترك الحقول غير المتاحة بـ `null` أو حذفها، لكن الحفاظ على وجود كائن `metrics` و`charts` لتجنب كسر الواجهة.

## 4) ملاحظات الأداء والأمان
- يعتمد تحديد الدور والنطاق على الـ JWT الخاص بالمستخدم الحالي؛ لا حاجة لتمرير معرفات إضافية من الواجهة.
- ينصح بتخزين نتائج الإحصاءات قصيرة الأجل في كاش لمدة 1-5 دقائق لتخفيف الضغط على قواعد البيانات.
- يجب احترام صلاحيات الدور: المعلم يرى بيانات حلقاته فقط، المشرف يرى بيانات فرقته، مدير الفرع يرى بيانات فرعه، والمدير العام يرى النظام كاملًا.
