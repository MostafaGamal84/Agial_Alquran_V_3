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

export function getSubscribeAudienceTranslationKey(
  audience: SubscribeAudience | null | undefined
): string {
  const entry = SUBSCRIBE_AUDIENCE_OPTIONS.find((option) => option.value === audience);
  return entry?.translationKey ?? 'Unknown';
}

export function getSubscribeAudienceCurrencyCode(
  audience: SubscribeAudience | null | undefined
): string | null {
  const entry = SUBSCRIBE_AUDIENCE_OPTIONS.find((option) => option.value === audience);
  return entry?.currencyCode ?? null;
}

export interface SubscribePricingSource {
  subscribeFor?: SubscribeAudience | null;
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

  const audience = source.subscribeFor ?? null;
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
