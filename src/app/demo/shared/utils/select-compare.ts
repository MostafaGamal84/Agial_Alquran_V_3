// دالة مقارنة عامة لكل الـ mat-select في المشروع
export function normalizeSelectCompare(option: any, value: any): boolean {
  // نفس null؟
  if (option == null && value == null) return true;
  if (option == null || value == null) return false;

  const normalize = (x: any): any => {
    if (x == null) return x;

    // لو object حاول نطلع id أو value أو key
    if (typeof x === 'object') {
      const possible =
        (x as any).id ??
        (x as any).value ??
        (x as any).key ??
        (x as any)._id ??
        x;

      return normalize(possible);
    }

    // حوّل الأرقام/السترينج لنص موحّد (عشان 1 و "1")
    if (typeof x === 'number' || typeof x === 'string') {
      return String(x).trim();
    }

    return x;
  };

  const left = normalize(option);
  const right = normalize(value);

  return left === right;
}
