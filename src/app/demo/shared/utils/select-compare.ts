type Comparable = string | number | boolean | null | undefined;

const COMMON_KEYS = ['id', '_id', 'value', 'key', 'uuid'];

const keyCandidates = (input: Record<string, unknown>): (string | undefined)[] => [
  ...COMMON_KEYS,
  ...Object.keys(input).filter((k) => /id$/i.test(k))
];

function normalizePrimitive(value: unknown): Comparable {
  if (value instanceof Date) {
    return value.getTime();
  }

  const numeric = Number(value);
  if (typeof value === 'boolean') {
    return value;
  }

  if (!Number.isNaN(numeric) && value !== '' && value !== null && value !== undefined && value !== false && value !== true) {
    return numeric;
  }

  return (value as Comparable) ?? null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeObject(value: Record<string, unknown>): Comparable | Record<string, unknown> | unknown[] {
  for (const key of keyCandidates(value)) {
    if (key && key in value && value[key] !== undefined) {
      return normalizePrimitive(value[key]);
    }
  }

  const normalizedEntries = Object.keys(value)
    .sort()
    .map((k) => [k, normalizeValue(value[k])]);

  return Object.fromEntries(normalizedEntries);
}

function normalizeArray(value: unknown[]): unknown[] {
  return value.map((item) => normalizeValue(item));
}

function normalizeValue(value: unknown): Comparable | Record<string, unknown> | unknown[] {
  if (value == null) {
    return value as null | undefined;
  }

  if (Array.isArray(value)) {
    return normalizeArray(value);
  }

  if (isObject(value)) {
    return normalizeObject(value);
  }

  return normalizePrimitive(value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (a == null || b == null) {
    return a === b;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  }

  if (isObject(a) && isObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false;
    }

    return aKeys.every((key) => deepEqual(a[key], b[key]));
  }

  return normalizePrimitive(a) === normalizePrimitive(b);
}

export function normalizeSelectCompare(option: unknown, value: unknown): boolean {
  if (option === value) {
    return true;
  }

  if (option == null || value == null) {
    return option === value;
  }

  const normalizedOption = normalizeValue(option);
  const normalizedValue = normalizeValue(value);

  return deepEqual(normalizedOption, normalizedValue);
}
