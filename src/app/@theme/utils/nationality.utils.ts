import { NationalityDto } from '../services/lookup.service';
import { ResidencyGroupFilter } from '../types/residency-group';

const EGYPT_TEL_CODE = 20;
const EGYPT_KEYWORDS = ['egypt', 'مصر'];
const ARAB_TEL_CODES = new Set([
  971, // UAE
  966, // Saudi Arabia
  965, // Kuwait
  974, // Qatar
  973, // Bahrain
  968, // Oman
  967, // Yemen
  962, // Jordan
  961, // Lebanon
  963, // Syria
  964, // Iraq
  970, // Palestine
  249, // Sudan
  218, // Libya
  213, // Algeria
  212, // Morocco
  216, // Tunisia
  222, // Mauritania
  252, // Somalia
  253, // Djibouti
  269 // Comoros
]);
const ARAB_KEYWORDS = [
  'saudi',
  'السعود',
  'emirates',
  'الإمارات',
  'kuwait',
  'الكويت',
  'bahrain',
  'البحرين',
  'qatar',
  'قطر',
  'oman',
  'عمان',
  'yemen',
  'اليمن',
  'jordan',
  'الأردن',
  'lebanon',
  'لبنان',
  'syria',
  'سوريا',
  'iraq',
  'العراق',
  'palestine',
  'فلسطين',
  'sudan',
  'السودان',
  'libya',
  'ليبيا',
  'algeria',
  'الجزائر',
  'morocco',
  'المغرب',
  'tunisia',
  'تونس',
  'mauritania',
  'موريتانيا',
  'somalia',
  'الصومال',
  'djibouti',
  'جيبوتي',
  'comoros',
  'جزر القمر'
];

export function isEgyptianNationality(
  nationality: Pick<NationalityDto, 'name' | 'telCode'> | null | undefined
): boolean {
  if (!nationality) {
    return false;
  }

  const telCode = Number((nationality as { telCode?: unknown }).telCode);
  if (Number.isFinite(telCode) && telCode === EGYPT_TEL_CODE) {
    return true;
  }

  const name = String((nationality as { name?: unknown }).name ?? '').toLowerCase();
  return EGYPT_KEYWORDS.some((keyword) => name.includes(keyword));
}

export function isArabNationality(
  nationality: Pick<NationalityDto, 'name' | 'telCode'> | null | undefined
): boolean {
  if (!nationality || isEgyptianNationality(nationality)) {
    return false;
  }

  const telCode = Number((nationality as { telCode?: unknown }).telCode);
  if (Number.isFinite(telCode) && ARAB_TEL_CODES.has(telCode)) {
    return true;
  }

  const name = String((nationality as { name?: unknown }).name ?? '').toLowerCase();
  return ARAB_KEYWORDS.some((keyword) => name.includes(keyword));
}

export function matchesResidencyGroup(
  nationality: Pick<NationalityDto, 'name' | 'telCode'> | null | undefined,
  group: ResidencyGroupFilter
): boolean {
  switch (group) {
    case 'egyptian':
      return isEgyptianNationality(nationality);
    case 'arab':
      return isArabNationality(nationality);
    case 'foreign':
      if (!nationality) {
        return true;
      }
      return !isEgyptianNationality(nationality) && !isArabNationality(nationality);
    default:
      return true;
  }
}
