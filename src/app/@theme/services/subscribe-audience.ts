export enum SubscribeAudience {
  Egyptian = 1,
  Gulf = 2,
  NonArab = 3
}

export interface SubscribeAudienceOption {
  value: SubscribeAudience;
  translationKey: string;
  currencyCode: string;
}

export const SUBSCRIBE_AUDIENCE_OPTIONS: readonly SubscribeAudienceOption[] = [
  { value: SubscribeAudience.Egyptian, translationKey: 'Egyptian', currencyCode: 'LE' },
  { value: SubscribeAudience.Gulf, translationKey: 'Gulf', currencyCode: 'SAR' },
  { value: SubscribeAudience.NonArab, translationKey: 'Non Arab', currencyCode: 'USD' }
];

const AUDIENCE_CURRENCY_IDS: Record<SubscribeAudience, number> = {
  [SubscribeAudience.Egyptian]: 1,
  [SubscribeAudience.Gulf]: 2,
  [SubscribeAudience.NonArab]: 3
};

const CURRENCY_CODE_BY_ID: Record<number, string> = {
  1: 'LE',
  2: 'SAR',
  3: 'USD'
};

const SUBSCRIBE_AUDIENCE_VALUE_SET = new Set<number>(
  Object.values(SubscribeAudience).filter((value): value is number => typeof value === 'number')
);

export function coerceSubscribeAudience(value: unknown): SubscribeAudience | null {
  if (value === null || value === undefined) {
    return null;
  }

  const tryParseNumeric = (candidate: unknown): SubscribeAudience | null => {
    if (typeof candidate === 'number' && SUBSCRIBE_AUDIENCE_VALUE_SET.has(candidate)) {
      return candidate as SubscribeAudience;
    }

    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && SUBSCRIBE_AUDIENCE_VALUE_SET.has(parsed)) {
      return parsed as SubscribeAudience;
    }

    return null;
  };

  const numericValue = tryParseNumeric(value);
  if (numericValue !== null) {
    return numericValue;
  }

  if (typeof value === 'string') {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');

    switch (normalized) {
      case 'egyptian':
      case 'egyptians':
      case 'المصري':
      case 'المصريين':
      case 'مصري':
      case 'مصريون':
      case 'مصريين':
        return SubscribeAudience.Egyptian;
      case 'gulf':
      case 'gulfcountries':
      case 'الخليج':
      case 'الخليجي':
      case 'الخليجيين':
      case 'خليجي':
      case 'خليجيون':
      case 'خليجيين':
        return SubscribeAudience.Gulf;
      case 'nonarab':
      case 'nonarabs':
      case 'nonarabic':
      case 'nonarabian':
      case 'غيرالعرب':
      case 'غيرعرب':
      case 'اجنبي':
      case 'اجانب':
      case 'الاجنبي':
      case 'الاجانب':
        return SubscribeAudience.NonArab;
      default:
        return null;
    }
  }

  return null;
}

const AUDIENCE_CURRENCY_CODES: Record<SubscribeAudience, readonly string[]> = {
  [SubscribeAudience.Egyptian]: ['EGP', 'LE', 'L.E', 'جنيه', 'ج.م', 'جنيه مصري'],
  [SubscribeAudience.Gulf]: ['SAR', 'ر.س', 'ريال', 'ريال سعودي'],
  [SubscribeAudience.NonArab]: ['USD', 'US$', 'دولار', 'دولار أمريكي', 'دولار امريكي']
};

const CURRENCY_AUDIENCE_MAP = new Map<string, SubscribeAudience>(
  Object.entries(AUDIENCE_CURRENCY_CODES).flatMap(([audienceKey, codes]) => {
    const audience = Number(audienceKey) as SubscribeAudience;
    return codes
      .map((code) => normalizeCurrencyCode(code))
      .filter((code): code is string => Boolean(code))
      .map((code) => [code, audience] as const);
  })
);

const CURRENCY_ID_AUDIENCE_MAP = new Map<number, SubscribeAudience>(
  Object.entries(AUDIENCE_CURRENCY_IDS).map(([audience, currencyId]) => [currencyId, Number(audience) as SubscribeAudience])
);

function normalizeCurrencyCode(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return value
    .toString()
    .trim()
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_.-]+/g, '');
}

export function inferSubscribeAudience(source: SubscribePricingSource): SubscribeAudience | null {
  const audienceFromId = inferAudienceFromCurrencyId(source?.currencyId);
  if (audienceFromId !== null) {
    return audienceFromId;
  }

  const currencyAudience = inferAudienceFromCurrency(source?.currencyCode);
  if (currencyAudience !== null) {
    return currencyAudience;
  }

  const audienceFromGroup = inferAudienceFromSubscribeTypeGroup(source?.subscribeTypeGroup);
  if (audienceFromGroup !== null) {
    return audienceFromGroup;
  }

  return null;
}

function inferAudienceFromCurrency(code: unknown): SubscribeAudience | null {
  const normalizedCode = normalizeCurrencyCode(code);
  if (!normalizedCode) {
    return null;
  }

  return CURRENCY_AUDIENCE_MAP.get(normalizedCode) ?? null;
}

function inferAudienceFromCurrencyId(currencyId: unknown): SubscribeAudience | null {
  const parsed = Number(currencyId);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return CURRENCY_ID_AUDIENCE_MAP.get(parsed) ?? null;
}

function inferAudienceFromSubscribeTypeGroup(group: unknown): SubscribeAudience | null {
  const parsed = Number(group);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  switch (parsed) {
    case 3:
      return SubscribeAudience.Egyptian;
    case 2:
      return SubscribeAudience.Gulf;
    case 1:
      return SubscribeAudience.NonArab;
    default:
      return null;
  }
}

export function getSubscribeAudienceTranslationKey(
  audience: SubscribeAudience | string | number | null | undefined
): string {
  const normalized = coerceSubscribeAudience(audience);
  const entry = SUBSCRIBE_AUDIENCE_OPTIONS.find((option) => option.value === normalized);
  return entry?.translationKey ?? 'Unknown';
}

export function getSubscribeAudienceCurrencyCode(
  audience: SubscribeAudience | string | number | null | undefined
): string | null {
  const normalized = coerceSubscribeAudience(audience);
  const entry = SUBSCRIBE_AUDIENCE_OPTIONS.find((option) => option.value === normalized);
  return entry?.currencyCode ?? null;
}

export interface SubscribePricingSource {
  price?: number | null;
  currencyId?: number | null;
  currencyCode?: string | null;
  subscribeTypeGroup?: number | null;
}

export interface SubscribePricingResult {
  currencyCode: string;
  amount: number | null;
}

export function resolveSubscribePricing(
  source: SubscribePricingSource
): SubscribePricingResult | null {
  const amount = source.price ?? null;
  const currencyCode = resolveCurrencyCode(source);

  if (!currencyCode) {
    return null;
  }

  return {
    currencyCode,
    amount
  };
}

function resolveCurrencyCode(source: SubscribePricingSource): string | null {
  const currencyFromId = CURRENCY_CODE_BY_ID[source.currencyId ?? -1];
  if (currencyFromId) {
    return currencyFromId;
  }

  const explicitCurrency = (source.currencyCode ?? '').toString().trim();
  if (explicitCurrency) {
    return explicitCurrency;
  }

  const audience = inferSubscribeAudience(source);
  const currencyCode = getSubscribeAudienceCurrencyCode(audience);

  return currencyCode;
}
