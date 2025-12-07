export type Comparable = string | number | boolean | null | undefined;

const COMMON_KEYS = ['id', '_id', 'value', 'key', 'uuid'];

function normalizePrimitive(value: unknown): Comparable {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? (value as Comparable) : numeric;
}

function extractComparable(value: unknown): Comparable {
  if (typeof value === 'object' && value !== null) {
    for (const key of COMMON_KEYS) {
      if (key in (value as Record<string, unknown>)) {
        const candidate = (value as Record<string, unknown>)[key];
        if (candidate !== undefined) {
          return normalizePrimitive(candidate);
        }
      }
    }
    return JSON.stringify(value) as Comparable;
  }

  return normalizePrimitive(value);
}

export function normalizeSelectCompare(option: unknown, value: unknown): boolean {
  if (option === value) {
    return true;
  }

  if (option == null || value == null) {
    return option === value;
  }

  const normalizedOption = extractComparable(option);
  const normalizedValue = extractComparable(value);

  return normalizedOption === normalizedValue;
}
