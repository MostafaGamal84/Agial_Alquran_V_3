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

const PRICE_ORDER: ReadonlyArray<{ field: keyof SubscribePricingSource; audience: SubscribeAudience }> = [
  { field: 'leprice', audience: SubscribeAudience.Egyptian },
  { field: 'sarprice', audience: SubscribeAudience.Gulf },
  { field: 'usdprice', audience: SubscribeAudience.NonArab }
];

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

function coerceAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function inferSubscribeAudience(source: SubscribePricingSource): SubscribeAudience | null {
  const normalized = coerceSubscribeAudience(source?.subscribeFor);
  if (normalized !== null) {
    return normalized;
  }

  const currencyAudience = inferAudienceFromCurrency(source?.currencyCode);
  if (currencyAudience !== null) {
    return currencyAudience;
  }

  const populatedFields = PRICE_ORDER.filter(({ field }) => coerceAmount(source?.[field]) !== null);

  if (populatedFields.length === 1) {
    return populatedFields[0].audience;
  }

  const positiveAmount = populatedFields.find(({ field }) => {
    const amount = coerceAmount(source?.[field]);
    return typeof amount === 'number' && amount > 0;
  });

  if (positiveAmount) {
    return positiveAmount.audience;
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
  subscribeFor?: SubscribeAudience | string | number | null;
  leprice?: number | null;
  sarprice?: number | null;
  usdprice?: number | null;
  currencyCode?: string | null;
  price?: number | null;
}

export interface SubscribePricingResult {
  currencyCode: string;
  amount: number | null;
}

export function resolveSubscribePricing(
  source: SubscribePricingSource
): SubscribePricingResult | null {
  const explicitCurrency = (source.currencyCode ?? '').toString().trim();
  if (explicitCurrency) {
    const amount = source.price ?? null;
    return {
      currencyCode: explicitCurrency,
      amount
    };
  }

  const audience = inferSubscribeAudience(source);
  const currencyCode = getSubscribeAudienceCurrencyCode(audience);

  if (!currencyCode) {
    return null;
  }

  switch (audience) {
    case SubscribeAudience.Egyptian:
      return { currencyCode, amount: source.leprice ?? null };
    case SubscribeAudience.Gulf:
      return { currencyCode, amount: source.sarprice ?? null };
    case SubscribeAudience.NonArab:
      return { currencyCode, amount: source.usdprice ?? null };
    default:
      return null;
  }
}
